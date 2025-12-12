import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonRefresher,
  IonRefresherContent,
  IonItemOptions,
  IonItemOption,
  IonItem,
  IonButton,
  IonLabel,
  RefresherCustomEvent,
  IonText,
} from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { interval, Subscription } from 'rxjs';
import { TourService, Tour } from '../services/tour.service';
import { ThemeService } from '../services/theme.service';
import { addIcons } from 'ionicons';
import { trash, mapOutline, layersOutline, speedometerOutline } from 'ionicons/icons';

interface MonthOption {
  value: number;
  label: string;
}

@Component({
  selector: 'app-tab2',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonContent,
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
  // Daten
  tours: Tour[] = [];
  filteredTours: Tour[] = [];

  // Filter
  selectedMonth: number = new Date().getMonth() + 1; // 1-12
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];

  // Monate mit deutschen Labels
  months: MonthOption[] = [
    { value: 1, label: 'JAN' },
    { value: 2, label: 'FEB' },
    { value: 3, label: 'MÄR' },
    { value: 4, label: 'APR' },
    { value: 5, label: 'MAI' },
    { value: 6, label: 'JUN' },
    { value: 7, label: 'JUL' },
    { value: 8, label: 'AUG' },
    { value: 9, label: 'SEP' },
    { value: 10, label: 'OKT' },
    { value: 11, label: 'NOV' },
    { value: 12, label: 'DEZ' },
  ];

  // Mini-Map Instanzen
  private mapInstances: Map<string, L.Map> = new Map();
  isDarkMode = false;

  // Subscriptions
  private yearCheckSubscription: Subscription | null = null;
  private lastCheckedYear = new Date().getFullYear();

  constructor(
    private tourService: TourService,
    private router: Router,
    private themeService: ThemeService
  ) {
    addIcons({layersOutline,mapOutline,speedometerOutline,trash});
  }

  ngOnDestroy(): void {
    if (this.yearCheckSubscription) {
      this.yearCheckSubscription.unsubscribe();
      this.yearCheckSubscription = null;
    }
    this.destroyMiniMaps();
  }

  ngOnInit(): void {
    // Dark Mode abonnieren
    this.themeService.darkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });

    // Initiale Daten laden
    this.initializeYears();
    // Erste Ladung im Lifecycle-Hook (ionViewWillEnter)

    // Jedes Jahr überprüfen ob Jahr gewechselt hat
    this.startYearCheckInterval();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.loadTours();
  }

  ionViewDidLeave(): void {
    this.destroyMiniMaps();
  }

  /**
   * Lädt alle Touren aus Supabase
   */
  private async loadTours(): Promise<void> {
    try {
      console.log('Lade alle Touren...');
      // Alte Mini-Maps räumen, bevor neue Daten kommen
      this.destroyMiniMaps();

      this.tours = await this.tourService.getAllTours();
      console.log('Touren geladen:', this.tours.length);

      // Filtere nach aktuellen Jahr/Monat
      this.filterToursByYearAndMonth();
    } catch (err) {
      console.error('Fehler beim Laden der Touren:', err);
    }
  }

  /**
   * Filtert Touren nach Jahr und Monat
   */
  filterToursByYearAndMonth(): void {
    // Vor Neuaufbau erst alle Mini-Maps entsorgen
    this.destroyMiniMaps();

    this.filteredTours = this.tours.filter((tour) => {
      // Berechne Jahr und Monat aus created_at falls nicht vorhanden
      const year = tour.year || (tour.created_at ? new Date(tour.created_at).getFullYear() : 0);
      const month = tour.month || (tour.created_at ? new Date(tour.created_at).getMonth() + 1 : 0);

      return year === this.selectedYear && month === this.selectedMonth;
    });

    console.log(`Gefilterte Touren für ${this.selectedMonth}/${this.selectedYear}:`, this.filteredTours.length);

    // Re-initialize Mini-Maps on next frame
    requestAnimationFrame(() => {
      this.initializeMiniMaps();
    });
  }

  /**
   * Initialisiert verfügbare Jahre (aktuell + letzte 4 Jahre)
   */
  private initializeYears(): void {
    const currentYear = new Date().getFullYear();
    this.availableYears = [];
    for (let i = currentYear; i >= currentYear - 4; i--) {
      this.availableYears.push(i);
    }
  }

  /**
   * Startet Intervall zum Überprüfen von Jahreswechsel
   */
  private startYearCheckInterval(): void {
    this.yearCheckSubscription = interval(30 * 60 * 1000).subscribe(() => {
      const currentYear = new Date().getFullYear();
      if (currentYear !== this.lastCheckedYear) {
        this.lastCheckedYear = currentYear;
        this.initializeYears();
        this.selectedYear = currentYear;
        this.selectedMonth = new Date().getMonth() + 1;
        this.filterToursByYearAndMonth();
      }
    });
  }

  /**
   * Wechselt den ausgewählten Monat
   */
  onMonthChange(month: number): void {
    this.selectedMonth = month;
    this.filterToursByYearAndMonth();
  }

  /**
   * Wechselt das ausgewählte Jahr
   */
  onYearChange(year: number): void {
    this.selectedYear = year;
    this.filterToursByYearAndMonth();
  }

  /**
   * Refresh-Handler
   */
  async onRefresh(event: RefresherCustomEvent): Promise<void> {
    await this.loadTours();
    event.detail.complete();
  }

  ngAfterViewInit(): void {
    // Erste Initialisierung wird von ionViewWillEnter angestoßen
  }

  /**
   * Initialisiert Mini-Maps für gefilterte Touren
   */
  private initializeMiniMaps(): void {
    this.filteredTours.forEach((tour) => {
      if (!tour.id) return;

      const mapId = `map-${tour.id}`;
      const mapContainer = document.getElementById(mapId);

      // Skip wenn Map bereits existiert
      if (this.mapInstances.has(mapId)) return;

      if (!mapContainer || mapContainer.offsetHeight === 0) {
        console.warn(`Map container ${mapId} not found or has zero height`);
        return;
      }

      try {
        // Erstelle Leaflet Map
        const map = L.map(mapId, {
          zoom: 12,
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          boxZoom: false,
          doubleClickZoom: false,
          keyboard: false,
        } as any);

        // Tile Layer basierend auf Dark Mode
        const tileUrl = this.isDarkMode
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        L.tileLayer(tileUrl, {
          attribution: '',
        }).addTo(map);

        // Zeichne Route
        if (tour.route_points && tour.route_points.length > 0) {
          const routeCoordinates = tour.route_points.map((p) => [p.lat, p.lng] as L.LatLngTuple);

          // Rote Polyline für Route
          L.polyline(routeCoordinates, {
            color: '#ff0000',
            weight: 3,
            opacity: 0.8,
          }).addTo(map);

          // Start-Marker (grün)
          L.circleMarker([routeCoordinates[0][0], routeCoordinates[0][1]], {
            radius: 5,
            fillColor: '#00aa00',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          }).addTo(map);

          // End-Marker (rot)
          const lastCoord = routeCoordinates[routeCoordinates.length - 1];
          L.circleMarker([lastCoord[0], lastCoord[1]], {
            radius: 5,
            fillColor: '#ff0000',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          }).addTo(map);

          // Fit bounds
          const bounds = L.latLngBounds(routeCoordinates);
          map.fitBounds(bounds, { padding: [20, 20] });
        }

        this.mapInstances.set(mapId, map);
        console.log(`Mini-map ${mapId} initialized`);
      } catch (err) {
        console.error(`Fehler beim Initialisieren von Map ${mapId}:`, err);
      }
    });
  }

  private destroyMiniMaps(): void {
    this.mapInstances.forEach((map) => {
      try {
        map.remove();
      } catch (err) {
        console.warn('Fehler beim Entfernen einer Mini-Map:', err);
      }
    });
    this.mapInstances.clear();
  }

  /**
   * Gibt formatierte Start-Zeit zurück
   */
  getStartTime(tour: Tour): string {
    if (!tour.route_points || tour.route_points.length === 0) {
      if (!tour.created_at) return '--:--';
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

  /**
   * Gibt formatierte End-Zeit zurück
   */
  getEndTime(tour: Tour): string {
    if (!tour.route_points || tour.route_points.length === 0) {
      if (!tour.created_at) return '--:--';
      const endDate = new Date(new Date(tour.created_at).getTime() + tour.duration * 1000);
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

  /**
   * Gibt formatiertes Datum zurück
   */
  getFormattedDate(createdAt?: string): string {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    return date.toLocaleDateString('de-CH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  /**
   * Formatiert Distanz (km mit 1 Dezimalstelle)
   */
  formatDistance(distance: number): string {
    return distance.toFixed(1);
  }

  /**
   * Formatiert Durchschnittsgeschwindigkeit
   */
  formatSpeed(speed: number): string {
    return speed.toFixed(0);
  }

  /**
   * Konvertiert Sekunden zu Minuten
   */
  formatDuration(durationSeconds: number): number {
    return Math.round(durationSeconds / 60);
  }

  /**
   * Navigiert zur Tour-Detailseite
   */
  goToDetail(tourId?: string): void {
    if (tourId) {
      this.router.navigate(['/tabs/tab2/tour-detail', tourId]);
    }
  }

  /**
   * Löscht eine Tour
   */
  async deleteTour(tourId?: string, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    if (!tourId) return;

    // Bestätigung vor Löschen
    const confirmed = confirm('Diese Route wirklich löschen?');
    if (!confirmed) return;

    try {
      console.log('Lösche Tour:', tourId);
      await this.tourService.deleteTour(tourId);
      // Liste sauber neu laden (inkl. Filter) und Mini-Maps neu aufbauen
      await this.loadTours();
      console.log('Tour erfolgreich gelöscht');
    } catch (err) {
      console.error('Fehler beim Löschen der Tour:', err);
    }
  }
}
