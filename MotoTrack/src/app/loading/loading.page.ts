import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonProgressBar } from '@ionic/angular/standalone';
import { Observable, Subscription } from 'rxjs';
import { LoadingService } from '../services/loading.service';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.page.html',
  styleUrls: ['./loading.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonProgressBar]
})
export class LoadingPage implements OnInit, OnDestroy {
  progress$: Observable<number>;
  isLoading$: Observable<boolean>;
  progressValue: number = 0;
  private subscriptions: Subscription[] = [];

  constructor(private loadingService: LoadingService) {
    this.progress$ = this.loadingService.progress$;
    this.isLoading$ = this.loadingService.isLoading$;
  }

  ngOnInit(): void {
    // Abonniere Progress für lokale Variable (für Display)
    const progressSub = this.progress$.subscribe(value => {
      this.progressValue = value;
    });
    this.subscriptions.push(progressSub);

    // Starte das Loading
    this.loadingService.startLoading();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Berechne Prozent-Wert (0-100) für den Ladebalken
   */
  get progressPercent(): number {
    return Math.min(this.progressValue, 100);
  }

  /**
   * Formate Progress für Anzeige
   */
  get progressText(): string {
    return `${Math.round(this.progressPercent)}%`;
  }
}
