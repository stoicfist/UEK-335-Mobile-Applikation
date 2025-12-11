import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { TourService, Tour } from '../../services/tour.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-tour-detail',
  standalone: true,
  imports: [
    CommonModule,
    IonBackButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './tour-detail.page.html',
  styleUrls: ['./tour-detail.page.scss'],
})
export class TourDetailPage implements OnInit, AfterViewInit {
  tour: Tour | null = null;
  private detailMap: L.Map | null = null;
  isDarkMode = false;

  constructor(
    private route: ActivatedRoute,
    private tourService: TourService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe((isDark: boolean) => {
      this.isDarkMode = isDark;
    });

    // Get tour ID from route params
    const tourId = this.route.snapshot.paramMap.get('id');
    if (tourId) {
      this.loadTour(tourId);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.tour) {
        this.initializeDetailMap();
      }
    }, 100);
  }

  async loadTour(tourId: string): Promise<void> {
    try {
      this.tour = await this.tourService.getTourById(tourId);
    } catch (err) {
      console.error('Error loading tour:', err);
    }
  }

  initializeDetailMap(): void {
    if (this.detailMap) {
      this.detailMap.remove();
    }

    if (!this.tour || !this.tour.route_points || this.tour.route_points.length === 0) {
      return;
    }

    // Initialize map
    this.detailMap = L.map('detail-map', {
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    // Add tile layer
    const tileUrl = this.isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      attribution: '',
    }).addTo(this.detailMap);

    // Draw route
    const routeCoordinates = this.tour.route_points.map((p) => [p.lat, p.lng] as L.LatLngTuple);

    // Draw polyline
    L.polyline(routeCoordinates, {
      color: '#ff0000',
      weight: 3,
      opacity: 0.8,
    }).addTo(this.detailMap!);

    // Add start marker (green)
    L.circleMarker([routeCoordinates[0][0], routeCoordinates[0][1]], {
      radius: 8,
      fillColor: '#00aa00',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    })
      .bindPopup('Start')
      .addTo(this.detailMap);

    // Add end marker (red)
    L.circleMarker(
      [
        routeCoordinates[routeCoordinates.length - 1][0],
        routeCoordinates[routeCoordinates.length - 1][1],
      ],
      {
        radius: 8,
        fillColor: '#ff0000',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      }
    )
      .bindPopup('Ende')
      .addTo(this.detailMap);

    // Fit bounds
    const bounds = L.latLngBounds(routeCoordinates as L.LatLngTuple[]);
    this.detailMap!.fitBounds(bounds, { padding: [50, 50] });
  }

  getTourDuration(tour?: Tour): string {
    if (!tour) return '';
    const totalMinutes = Math.floor(tour.duration / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  getStartTime(tour?: Tour): string {
    if (!tour) return '';
    if (!tour.route_points || tour.route_points.length === 0) {
      return new Date(tour.created_at!).toLocaleTimeString('de-CH', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return new Date(tour.route_points[0].timestamp).toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getEndTime(tour?: Tour): string {
    if (!tour) return '';
    if (!tour.route_points || tour.route_points.length === 0) {
      const endDate = new Date(new Date(tour.created_at!).getTime() + tour.duration);
      return endDate.toLocaleTimeString('de-CH', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    const lastPoint = tour.route_points[tour.route_points.length - 1];
    return new Date(lastPoint.timestamp).toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getFormattedDate(createdAt?: string): string {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    return date.toLocaleDateString('de-CH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getPointTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
