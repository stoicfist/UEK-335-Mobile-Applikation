import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';

export interface Tour {
  id?: string;
  created_at?: string;
  duration: number;
  distance: number;
  average_speed: number;
  route_points: { lat: number; lng: number; timestamp: number }[];
}

@Injectable({ providedIn: 'root' })
export class TourService {
  private table = 'tours';

  async saveTour(tour: Tour): Promise<Tour | null> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .insert(tour)
        .select()
        .single();

      if (error) throw error;
      return data as Tour;
    } catch (err) {
      console.error('saveTour error', err);
      return null;
    }
  }

  async getAllTours(): Promise<Tour[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Tour[]) || [];
    } catch (err) {
      console.error('getAllTours error', err);
      return [];
    }
  }

  async getTourById(id: string): Promise<Tour | null> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Tour;
    } catch (err) {
      console.error('getTourById error', err);
      return null;
    }
  }

  async deleteTour(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('deleteTour error', err);
      return false;
    }
  }

  async testConnection(): Promise<void> {
    const tours = await this.getAllTours();
    console.log('Supabase test getAllTours:', tours);
  }
}
