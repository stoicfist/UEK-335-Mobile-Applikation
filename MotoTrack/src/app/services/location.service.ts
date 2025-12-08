import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LocationPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private currentPositionSubject = new BehaviorSubject<LocationPosition | null>(null);
  public currentPosition$: Observable<LocationPosition | null> = this.currentPositionSubject.asObservable();
  private watchId: string | null = null;

  async getCurrentPosition(): Promise<LocationPosition | null> {
    try {
      const position: Position = await Geolocation.getCurrentPosition();
      const locationPos: LocationPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      this.currentPositionSubject.next(locationPos);
      return locationPos;
    } catch (error) {
      console.error('Error getting current position:', error);
      return null;
    }
  }

  async startWatchPosition(): Promise<void> {
    if (this.watchId) {
      return; // Already watching
    }

    try {
      this.watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        (position, err) => {
          if (err) {
            console.error('Watch position error:', err);
            return;
          }
          if (position) {
            const locationPos: LocationPosition = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
            this.currentPositionSubject.next(locationPos);
          }
        }
      );
    } catch (error) {
      console.error('Error starting watch position:', error);
    }
  }

  async stopWatchPosition(): Promise<void> {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
  }
}
