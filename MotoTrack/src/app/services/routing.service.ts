import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteResponse {
  coordinates: [number, number][]; // [lng, lat] format from GeoJSON
  distance: number; // meters
  duration: number; // seconds
}

@Injectable({
  providedIn: 'root',
})
export class RoutingService {
  // Base URL comes from environment to allow proxy/HTTPS toggling per build
  private readonly osrmUrl = environment.osrmBaseUrl;

  async getRoute(start: LatLng, end: LatLng): Promise<RouteResponse | null> {
    try {
      const url = `${this.osrmUrl}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      console.log('OSRM URL:', url);
      
      const response = await fetch(url);
      console.log('OSRM Response status:', response.status);

      // Validate response
      if (!response.ok) {
        console.error(`OSRM error: HTTP ${response.status}`);
        const text = await response.text();
        console.error('OSRM error response:', text.substring(0, 200));
        return null;
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('OSRM did not return JSON. Content-Type:', contentType);
        const text = await response.text();
        console.error('OSRM response text:', text.substring(0, 200));
        return null;
      }

      const data = await response.json();
      console.log('OSRM Data:', data);

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        console.log('Route geometry coordinates count:', route.geometry.coordinates.length);
        return {
          coordinates: route.geometry.coordinates,
          distance: route.distance,
          duration: route.duration,
        };
      }
      console.error('OSRM error code:', data.code);
      return null;
    } catch (error) {
      console.error('Routing fetch error:', error);
      return null;
    }
  }
}
