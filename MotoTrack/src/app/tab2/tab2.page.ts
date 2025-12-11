import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonCard,
  IonRefresher,
  IonRefresherContent,
  IonItemOptions,
  IonItemOption,
  IonButton,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { interval, Subscription } from 'rxjs';
import { TourService, Tour } from '../services/tour.service';
import { ThemeService } from '../services/theme.service';

interface MonthOption {
  value: number;
  label: string;
}

@Component({
  selector: 'app-tab2',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonCard,
    IonRefresher,
    IonRefresherContent,
    IonItemOptions,
    IonItemOption,
    IonButton,
  ],
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
})
export class Tab2Page implements OnInit, AfterViewInit, OnDestroy {
  tours: Tour[] = [];
  filteredTours: Tour[] = [];
  selectedMonth: number = 0; // Start with January
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];
  months: MonthOption[] = [
    { value: 0, label: 'Jan' },
    { value: 1, label: 'Feb' },
    { value: 2, label: 'Mär' },
    { value: 3, label: 'Apr' },
    { value: 4, label: 'Mai' },
    { value: 5, label: 'Jun' },
    { value: 6, label: 'Jul' },
    { value: 7, label: 'Aug' },
    { value: 8, label: 'Sep' },
    { value: 9, label: 'Okt' },
    { value: 10, label: 'Nov' },
    { value: 11, label: 'Dez' },
  ];

  private mapInstances: Map<string, L.Map> = new Map();
  isDarkMode = false;
  private yearCheckSubscription: Subscription | null = null;
  private lastCheckedYear = new Date().getFullYear();

  constructor(
    private tourService: TourService,
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });
    this.loadTours();
    this.initializeYears();
    this.startYearCheckInterval();
  }

  private startYearCheckInterval(): void {
    // Check every 30 minutes if the year has changed
    // Also triggers in December to prepare for next year
    this.yearCheckSubscription = interval(30 * 60 * 1000).subscribe(() => {
      this.checkAndUpdateYears();
    });
  }

  private checkAndUpdateYears(): void {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Update if: year has changed OR we're in December (prepare for next year)
    if (currentYear !== this.lastCheckedYear || currentMonth === 11) {
      this.lastCheckedYear = currentYear;
      this.initializeYears();
      // Trigger UI update
      this.selectedYear = currentYear;
      this.filterTours();
    }
  }

  private initializeYears(): void {
    const currentYear = new Date().getFullYear();
    // Create array of current year + last 4 years
    this.availableYears = [];
    for (let i = currentYear; i >= currentYear - 4; i--) {
      this.availableYears.push(i);
    }
  }

  ngAfterViewInit(): void {
    this.initializeMiniMaps();
  }

  ngOnDestroy(): void {
    // Cleanup subscriptions
    if (this.yearCheckSubscription) {
      this.yearCheckSubscription.unsubscribe();
    }
    // Cleanup maps
    this.mapInstances.forEach((map) => map.remove());
    this.mapInstances.clear();
  }

  async loadTours(): Promise<void> {
    try {
      this.tours = await this.tourService.getAllTours();
      this.filterTours();
    } catch (err) {
      console.error('Error loading tours:', err);
    }
  }

  filterTours(): void {
    this.filteredTours = this.tours.filter((tour) => {
      if (!tour.created_at) return false;
      const tourDate = new Date(tour.created_at);
      return tourDate.getMonth() === this.selectedMonth && tourDate.getFullYear() === this.selectedYear;
    });

    // Re-initialize mini maps after filtering
    setTimeout(() => {
      this.initializeMiniMaps();
    }, 100);
  }

  onMonthChange(): void {
    this.filterTours();
  }

  onYearChange(year: number): void {
    this.selectedYear = year;
    this.filterTours();
  }

  onRefresh(event: RefresherCustomEvent): void {
    this.loadTours().then(() => {
      event.detail.complete();
    });
  }

  initializeMiniMaps(): void {
    this.filteredTours.forEach((tour) => {
      const mapId = `map-${tour.id}`;
      const mapContainer = document.getElementById(mapId);

      if (mapContainer && !this.mapInstances.has(mapId)) {
        try {
          // Initialize Leaflet map
          const map = L.map(mapId, {
            zoom: 12,
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
          });

          // Add tile layer
          const tileUrl = this.isDarkMode
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

          L.tileLayer(tileUrl, {
            attribution: '',
          }).addTo(map);

          // Draw route polyline
          if (tour.route_points && tour.route_points.length > 0) {
            const routeCoordinates = tour.route_points.map((p) => [p.lat, p.lng] as L.LatLngTuple);

            // Draw polyline
            L.polyline(routeCoordinates, {
              color: '#ff0000',
              weight: 3,
              opacity: 0.7,
            }).addTo(map);

            // Fit bounds to route
            const bounds = L.latLngBounds(routeCoordinates as L.LatLngTuple[]);
            map.fitBounds(bounds, { padding: [20, 20] });

            // Add markers for start and end
            L.circleMarker([routeCoordinates[0][0], routeCoordinates[0][1]], {
              radius: 5,
              fillColor: '#00aa00',
              color: '#fff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8,
            }).addTo(map);

            L.circleMarker(
              [routeCoordinates[routeCoordinates.length - 1][0], routeCoordinates[routeCoordinates.length - 1][1]],
              {
                radius: 5,
                fillColor: '#ff0000',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8,
              }
            ).addTo(map);
          }

          this.mapInstances.set(mapId, map);
        } catch (err) {
          console.error(`Error initializing map ${mapId}:`, err);
        }
      }
    });
  }

  getTourDurationMinutes(tour: Tour): number {
    return Math.round(tour.duration / 60000); // Convert ms to minutes
  }

  getStartTime(tour: Tour): string {
    if (!tour.route_points || tour.route_points.length === 0) {
      if (!tour.created_at) return '';
      return new Date(tour.created_at).toLocaleTimeString('de-CH', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return new Date(tour.route_points[0].timestamp).toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getEndTime(tour: Tour): string {
    if (!tour.route_points || tour.route_points.length === 0) {
      if (!tour.created_at) return '';
      const endDate = new Date(
        new Date(tour.created_at).getTime() + tour.duration
      );
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
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  goToDetail(tourId?: string): void {
    if (tourId) {
      this.router.navigate(['/tabs/tab2/tour-detail', tourId]);
    }
  }

  async deleteTour(tourId?: string, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    if (!tourId) return;

    try {
      await this.tourService.deleteTour(tourId);
      // Remove from local array and re-filter
      this.tours = this.tours.filter((t) => t.id !== tourId);
      this.filterTours();
      console.log('Tour deleted successfully');
    } catch (err) {
      console.error('Error deleting tour:', err);
    }
  }
}
