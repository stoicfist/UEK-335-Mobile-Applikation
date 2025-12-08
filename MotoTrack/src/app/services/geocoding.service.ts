import { Injectable } from '@angular/core';

export interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
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
}
