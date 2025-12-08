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
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          coordinates: route.geometry.coordinates,
          distance: route.distance,
          duration: route.duration,
        };
      }
      return null;
    } catch (error) {
      console.error('Routing error:', error);
      return null;
    }
  }
}
