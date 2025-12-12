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

  private async ensurePermission(): Promise<boolean> {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location === 'granted') return true;
      const result = await Geolocation.requestPermissions();
      return result.location === 'granted';
    } catch (err) {
      // On web this may throw in some contexts; treat as not granted
      console.warn('Geolocation permission check/request failed:', err);
      return false;
    }
  }

  async getCurrentPosition(): Promise<LocationPosition | null> {
    try {
      const granted = await this.ensurePermission();
      if (!granted) {
        console.warn('Location permission not granted');
        return null;
      }
      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      });
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
      const granted = await this.ensurePermission();
      if (!granted) {
        console.warn('Location permission not granted for watch');
        return;
      }
      this.watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
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

  /**
   * Dedicated watchPosition for features like recording.
   * Returns the watchId so callers can clear it independently.
   */
  async watchPosition(
    callback: (pos: LocationPosition) => void,
    onError?: (err: any) => void
  ): Promise<string | null> {
    try {
      const granted = await this.ensurePermission();
      if (!granted) {
        console.warn('Location permission not granted for custom watch');
        return null;
      }
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
        (position, err) => {
          if (err) {
            console.error('Watch position error:', err);
            if (onError) onError(err);
            return;
          }
          if (position) {
            const locationPos: LocationPosition = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
            callback(locationPos);
          }
        }
      );
      return typeof id === 'string' ? id : null;
    } catch (error) {
      console.error('Error starting custom watch position:', error);
      return null;
    }
  }

  async clearWatch(id: string | null | undefined): Promise<void> {
    if (!id) return;
    try {
      await Geolocation.clearWatch({ id });
    } catch (error) {
      console.error('Error clearing watch position:', error);
    }
  }
}
