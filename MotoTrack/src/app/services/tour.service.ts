import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';
import { OfflineStorageService } from './offline-storage.service';
import { NetworkService } from './network.service';

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface Tour {
  id?: string;
  created_at?: string;
  distance: number;
  duration: number;
  avg_speed: number;
  route_points: RoutePoint[];
  year?: number;
  month?: number;
}

@Injectable({ providedIn: 'root' })
export class TourService {
  private table = 'tours';
  constructor(private offlineStorage: OfflineStorageService, private networkService: NetworkService) {}

  /**
   * Speichert eine abgeschlossene Tour in der Datenbank
   * @param distance Distanz in km
   * @param duration Dauer in Sekunden
   * @param recordedTrack Array von {lat, lng}
   * @param recordingStartTime Startzeitstempel in ms
   */
  async saveCompletedTour(
    distance: number,
    duration: number,
    recordedTrack: { lat: number; lng: number }[],
    recordingStartTime: number
  ): Promise<Tour | null> {
    try {
      // Berechne Durchschnittsgeschwindigkeit (km/h)
      const avgSpeed = duration > 0 ? (distance / (duration / 3600)).toFixed(2) : '0';

      // Konvertiere recordedTrack zu RoutePoints mit Timestamps
      const routePoints: RoutePoint[] = recordedTrack.map((point, index) => ({
        lat: point.lat,
        lng: point.lng,
        timestamp: recordingStartTime + (index * (duration * 1000) / recordedTrack.length),
      }));

      // Erstelle Tour Objekt mit Jahr und Monat
      const now = new Date();
      const tour: Tour = {
        distance: parseFloat(distance.toFixed(2)),
        duration: Math.round(duration),
        avg_speed: parseFloat(avgSpeed as string),
        route_points: routePoints,
        year: now.getFullYear(),
        month: now.getMonth() + 1, // 1-12, nicht 0-11
      };

      console.log('Saving tour:', tour);

      // If offline, store locally for later sync
      if (!this.networkService.isOnline()) {
        await this.offlineStorage.addPendingTour(tour);
        console.log('Network offline, saved tour to pending storage');
        return tour;
      }

      // Attempt insert in Supabase
      const { data, error } = await supabase
        .from(this.table)
        .insert(tour)
        .select()
        .single();

      if (error) {
        // on failure, persist locally and return tour object
        await this.offlineStorage.addPendingTour(tour);
        console.warn('Supabase insert failed, saved tour to pending storage', error);
        return tour;
      }

      console.log('Tour saved successfully:', data);
      return data as Tour;
    } catch (err) {
      console.error('saveCompletedTour error:', err);
      return null;
    }
  }

  /**
   * Insert a full Tour object directly (used by sync flows)
   */
  async saveTourObject(tour: Tour): Promise<Tour | null> {
    try {
      const { data, error } = await supabase.from(this.table).insert(tour).select().single();
      if (error) throw error;
      return data as Tour;
    } catch (err) {
      console.error('saveTourObject error:', err);
      return null;
    }
  }

  /**
   * Lädt alle Touren aus der Datenbank
   */
  async getAllTours(): Promise<Tour[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Stelle sicher, dass year und month gesetzt sind
      const tours = (data as Tour[]) || [];
      return tours.map((tour) => {
        if (!tour.year || !tour.month) {
          const date = new Date(tour.created_at || new Date());
          return {
            ...tour,
            year: date.getFullYear(),
            month: date.getMonth() + 1,
          };
        }
        return tour;
      });
    } catch (err) {
      console.error('getAllTours error:', err);
      return [];
    }
  }

  /**
   * Lädt eine spezifische Tour
   */
  async getTourById(id: string): Promise<Tour | null> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const tour = data as Tour;
      if (!tour.year || !tour.month) {
        const date = new Date(tour.created_at || new Date());
        return {
          ...tour,
          year: date.getFullYear(),
          month: date.getMonth() + 1,
        };
      }
      return tour;
    } catch (err) {
      console.error('getTourById error:', err);
      return null;
    }
  }

  /**
   * Löscht eine Tour
   */
  async deleteTour(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from(this.table).delete().eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('deleteTour error:', err);
      return false;
    }
  }

  /**
   * Sucht Touren nach Jahr und Monat
   */
  async getToursByYearAndMonth(year: number, month: number): Promise<Tour[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Tour[]) || [];
    } catch (err) {
      console.error('getToursByYearAndMonth error:', err);
      return [];
    }
  }

  async testConnection(): Promise<void> {
    const tours = await this.getAllTours();
    console.log('Supabase test getAllTours:', tours);
  }
}
