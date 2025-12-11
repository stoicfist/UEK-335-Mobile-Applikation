import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonButton,
  IonFooter,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonSpinner,
  IonButtons,
  IonBackButton,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, download, trash } from 'ionicons/icons';
import * as L from 'leaflet';
import { TourService, Tour } from '../../services/tour.service';
import { ThemeService } from '../../services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tour-detail',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonButton,
    IonFooter,
    IonGrid,
    IonRow,
    IonCol,
    IonText,
    IonSpinner,
    IonButtons,
    IonBackButton,
  ],
  templateUrl: './tour-detail.page.html',
  styleUrls: ['./tour-detail.page.scss'],
})
export class TourDetailPage implements OnInit, OnDestroy {
  tour: Tour | null = null;
  isLoading = true;
  isDark = false;
  private map: L.Map | null = null;
  private darkModeSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tourService: TourService,
    private themeService: ThemeService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({ arrowBack, download, trash });
  }

  ngOnInit(): void {
    this.darkModeSubscription = this.themeService.darkMode$.subscribe((dark) => {
      this.isDark = dark;
    });
    this.loadTour();
  }

  private loadTour(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading = false;
      this.showToast('Route nicht gefunden', 'danger');
      return;
    }

    this.tourService.getTourById(id).then((tour) => {
      this.tour = tour;
      this.isLoading = false;
      if (tour) {
        setTimeout(() => this.initializeMap(), 100);
      }
    });
  }

  private initializeMap(): void {
    if (!this.tour || !this.tour.route_points || this.tour.route_points.length === 0) {
      return;
    }

    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    if (this.map) {
      this.map.remove();
    }

    this.map = L.map('map', {
      zoomControl: true,
      attributionControl: true,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
    }).setView([47.5, 8.2], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    const routeLatLngs = this.tour!.route_points!.map((p) => [p.lat, p.lng] as L.LatLngExpression);
    if (routeLatLngs.length > 0) {
      const polyline = L.polyline(routeLatLngs, {
        color: '#0066cc',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1.0,
      }).addTo(this.map);

      const startPoint = this.tour!.route_points![0];
      L.circleMarker([startPoint.lat, startPoint.lng], {
        color: '#4CAF50',
        radius: 8,
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
      })
        .addTo(this.map)
        .bindPopup('Start', { autoClose: false });

      const endPoint = this.tour!.route_points![this.tour!.route_points!.length - 1];
      L.circleMarker([endPoint.lat, endPoint.lng], {
        color: '#f44336',
        radius: 8,
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
      })
        .addTo(this.map)
        .bindPopup('Ende', { autoClose: false });

      this.map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  }

  getTourDurationMinutes(tour: Tour | null): number {
    if (!tour) return 0;
    return Math.round(tour.duration / 60);
  }

  getStartTime(tour: Tour | null): string {
    if (!tour || !tour.route_points || tour.route_points.length === 0) {
      return '–';
    }
    const timestamp = tour.route_points[0].timestamp;
    return new Date(timestamp).toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getEndTime(tour: Tour | null): string {
    if (!tour || !tour.route_points || tour.route_points.length === 0) {
      return '–';
    }
    const timestamp = tour.route_points[tour.route_points.length - 1].timestamp;
    return new Date(timestamp).toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getFormattedDate(dateString: string | undefined): string {
    if (!dateString) return '–';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-CH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  async onExport(): Promise<void> {
    if (!this.tour) return;

    try {
      const tourData = JSON.stringify(this.tour, null, 2);
      const blob = new Blob([tourData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tour-${this.tour.id}-${Date.now()}.json`;
      link.click();
      window.URL.revokeObjectURL(url);

      await this.showToast('Route exportiert', 'success');
    } catch (error) {
      console.error('Export error:', error);
      await this.showToast('Fehler beim Exportieren', 'danger');
    }
  }

  async onDelete(): Promise<void> {
    if (!this.tour) return;

    const alert = await this.alertController.create({
      header: 'Route löschen?',
      message: `Möchtest du die Route vom ${this.getFormattedDate(this.tour.created_at)} wirklich löschen?`,
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
        },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: async () => {
            await this.deleteTour();
          },
        },
      ],
    });

    await alert.present();
  }

  private async deleteTour(): Promise<void> {
    if (!this.tour || !this.tour.id) return;

    const success = await this.tourService.deleteTour(this.tour.id);

    if (success) {
      await this.showToast('Route gelöscht', 'success');
      this.router.navigate(['/tabs/tab2']);
    } else {
      await this.showToast('Fehler beim Löschen', 'danger');
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
    if (this.darkModeSubscription) {
      this.darkModeSubscription.unsubscribe();
    }
  }
}
