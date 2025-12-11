import { Injectable } from '@angular/core';

export interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
}

export interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  // addressdetails and other fields are available but not required here
}

@Injectable({
  providedIn: 'root',
})
export class GeocodingService {
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org/search';

  async geocode(address: string): Promise<GeocodingResult | null> {
    try {
      const url = `${this.nominatimUrl}?format=json&q=${encodeURIComponent(address)}`;
      const response = await fetch(url);
      const results = await response.json();

      if (results && results.length > 0) {
        const first = results[0];
        return {
          lat: parseFloat(first.lat),
          lon: parseFloat(first.lon),
          display_name: first.display_name,
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Fetch autocomplete suggestions from Nominatim Search API
   * Returns up to `limit` results with display_name, lat and lon
   */
  async fetchAutocompleteSuggestions(query: string, limit = 5): Promise<NominatimResult[]> {
    if (!query || query.trim().length === 0) return [];

    try {
      const url = `${this.nominatimUrl}?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=${limit}`;
      const response = await fetch(url);
      const results = await response.json();
      if (!results || !Array.isArray(results)) return [];

      // Map to typed minimal shape
      return results.map((r: any) => ({
        display_name: r.display_name,
        lat: r.lat,
        lon: r.lon,
      } as NominatimResult));
    } catch (err) {
      console.error('Autocomplete fetch error:', err);
      return [];
    }
  }
}
