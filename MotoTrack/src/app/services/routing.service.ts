import { Injectable } from '@angular/core';

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
  private readonly osrmUrl = 'https://router.project-osrm.org/route/v1/driving';

  async getRoute(start: LatLng, end: LatLng): Promise<RouteResponse | null> {
    try {
      const url = `${this.osrmUrl}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      console.log('OSRM URL:', url);
      const response = await fetch(url);
      console.log('OSRM Response status:', response.status);
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
