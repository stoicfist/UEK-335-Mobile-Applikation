import { Injectable } from '@angular/core';
import { NetworkService } from './network.service';
import { supabase } from './supabase.client';
import type { Tour } from './tour.service';
import { ToastController } from '@ionic/angular';

const STORAGE_KEY = 'pendingTours';

@Injectable({ providedIn: 'root' })
export class OfflineStorageService {
  constructor(private networkService: NetworkService, private toastCtrl: ToastController) {
    // when we go online, attempt to sync pending tours
    this.networkService.isOnline$.subscribe((online) => {
      if (online) {
        void this.syncPendingTours();
      }
    });
  }

  private readStorage(): Tour[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Tour[];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('OfflineStorageService read error', err);
      return [];
    }
  }

  private writeStorage(tours: Tour[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tours));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('OfflineStorageService write error', err);
    }
  }

  public async addPendingTour(tour: Tour): Promise<void> {
    const current = this.readStorage();
    current.push(tour);
    this.writeStorage(current);
  }

  public async getPendingTours(): Promise<Tour[]> {
    return this.readStorage();
  }

  public async clearPendingTours(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('OfflineStorageService clear error', err);
    }
  }

  /**
   * Try to sync pending tours to Supabase. Successfully uploaded tours will be removed locally.
   */
  public async syncPendingTours(): Promise<{ synced: number; failed: number }> {
    const pending = this.readStorage();
    if (!pending || pending.length === 0) return { synced: 0, failed: 0 };

    const remaining: Tour[] = [];
    let synced = 0;
    let failed = 0;

    for (const t of pending) {
      try {
        const { data, error } = await supabase.from('tours').insert(t).select().single();
        if (error || !data) {
          // keep for retry
          remaining.push(t);
          failed++;
        } else {
          synced++;
        }
      } catch (err) {
        // network or other error - keep for retry
        // eslint-disable-next-line no-console
        console.warn('OfflineStorageService sync error for tour', err);
        remaining.push(t);
        failed++;
      }
    }

    // write remaining back
    this.writeStorage(remaining);
    // show user feedback via toast
    try {
      if (synced > 0 && failed === 0) {
        const t = await this.toastCtrl.create({
          message: `${synced} Tour${synced > 1 ? 'en' : ''} synchronisiert`,
          duration: 3000,
          position: 'top',
          cssClass: 'network-toast-online',
        });
        await t.present();
      } else if (synced > 0 && failed > 0) {
        const t = await this.toastCtrl.create({
          message: `${synced} synchronisiert, ${failed} fehlgeschlagen (wird erneut versucht)`,
          duration: 4000,
          position: 'top',
          cssClass: 'network-toast-offline',
        });
        await t.present();
      } else if (failed > 0 && synced === 0) {
        const t = await this.toastCtrl.create({
          message: `Synchronisation fehlgeschlagen – wird automatisch erneut versucht`,
          duration: 4000,
          position: 'top',
          cssClass: 'network-toast-offline',
        });
        await t.present();
      }
    } catch (err) {
      // ignore toast failures
    }

    return { synced, failed };
  }
}
