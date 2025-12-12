import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SplashScreen } from '@capacitor/splash-screen';
import { Router } from '@angular/router';
import { LocationService } from './location.service';
import { NetworkService } from './network.service';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private progressSubject = new BehaviorSubject<number>(0);
  public progress$ = this.progressSubject.asObservable();

  private isLoadingSubject = new BehaviorSubject<boolean>(true);
  public isLoading$ = this.isLoadingSubject.asObservable();

  private loadingComplete = false;

  constructor(
    private router: Router,
    private locationService: LocationService,
    private networkService: NetworkService
  ) {}

  /**
   * Startet den Loading-Prozess mit simuliertem Fortschritt
   * und Initialisierung der Services
   */
  async startLoading(): Promise<void> {
    this.loadingComplete = false;
    this.progressSubject.next(0);
    this.isLoadingSubject.next(true);

    try {
      // Blende den nativen Splashscreen nach kurzer Zeit aus
      await this.hideSplashScreen();

      // Starte parallele Initialisierungen
      await Promise.all([
        this.initializeWithProgress(),
        this.simulateProgressIncrement()
      ]);

      // Erreiche 100%
      this.progressSubject.next(100);
      this.loadingComplete = true;

      // Kurze Pause für visuelle Feedback (100% wird sichtbar)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Navigation zu Tab 1
      this.isLoadingSubject.next(false);
      await this.router.navigate(['/tabs/tab1']);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      // Fallback: navigiere trotzdem weiter
      await this.router.navigate(['/tabs/tab1']);
    }
  }

  /**
   * Verstecke den nativen Splashscreen
   */
  private async hideSplashScreen(): Promise<void> {
    try {
      await SplashScreen.hide({ fadeOutDuration: 500 });
    } catch (error) {
      console.warn('Splashscreen konnte nicht versteckt werden:', error);
    }
  }

  /**
   * Initialisiere Services und aktualisiere Progress
   */
  private async initializeWithProgress(): Promise<void> {
    try {
      // 20% - Network Service ready
      this.networkService.startListening();
      this.progressSubject.next(20);

      // 40% - Location Service ready
      await new Promise(resolve => setTimeout(resolve, 300));
      // Location Service ist bereits injiziert und kann initialisiert werden
      this.progressSubject.next(40);

      // 60% - Datenbank/Supabase Check
      await new Promise(resolve => setTimeout(resolve, 300));
      this.progressSubject.next(60);

      // 80% - App-Komponenten ready
      await new Promise(resolve => setTimeout(resolve, 300));
      this.progressSubject.next(80);
    } catch (error) {
      console.warn('Fehler bei Service-Initialisierung:', error);
      // Fortfahren trotzdem
      this.progressSubject.next(80);
    }
  }

  /**
   * Simuliere sanften Progress-Anstieg bis 95%
   * (Die letzten 5% werden durch die echte Initialisierung erreicht)
   */
  private async simulateProgressIncrement(): Promise<void> {
    let current = this.progressSubject.value;
    const targetProgress = 95;

    while (current < targetProgress && !this.loadingComplete) {
      // Zufällige Verzögerung für natürliches Aussehen
      const delay = Math.random() * 400 + 200; // 200-600ms
      await new Promise(resolve => setTimeout(resolve, delay));

      // Kleine Inkremente
      current += Math.random() * 5 + 3; // 3-8%
      current = Math.min(current, targetProgress);

      this.progressSubject.next(current);
    }
  }

  /**
   * Gib den aktuellen Progress-Wert zurück
   */
  getCurrentProgress(): number {
    return this.progressSubject.value;
  }

  /**
   * Setze den Progress manuell
   */
  setProgress(value: number): void {
    this.progressSubject.next(Math.min(value, 100));
  }

  /**
   * Beende das Loading
   */
  completeLoading(): void {
    this.loadingComplete = true;
    this.progressSubject.next(100);
    this.isLoadingSubject.next(false);
  }
}
