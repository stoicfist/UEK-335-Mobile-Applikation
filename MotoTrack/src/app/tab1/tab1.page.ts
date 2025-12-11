import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { 
  IonContent, IonFabButton, IonIcon, IonFab,
  IonItem, IonInput, IonButton, IonLabel,
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonList, IonListHeader, IonChip
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { MapService } from '../services/map.service';
import { GeocodingService } from '../services/geocoding.service';
import { RoutingService, LatLng } from '../services/routing.service';
import { LocationService } from '../services/location.service';
import { TourService } from '../services/tour.service';
import { addIcons } from 'ionicons';
import { locate, location, flag, search, closeCircle, navigate, close, radioButtonOnOutline, squareOutline, navigateOutline, stopCircleOutline } from 'ionicons/icons';

interface RouteInfo {
  distance: string;
  duration: string;
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonContent, IonFabButton, IonIcon, IonFab,
    IonItem, IonInput, IonButton, IonLabel,
    IonModal, IonHeader, IonToolbar, IonTitle, IonButtons,
    IonList, IonListHeader, IonChip
  ],
})
export class Tab1Page implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  
  // Modal state
  isSearchModalOpen = false;

  // Recording/Navigation state
  isRecording = false;
  recordedTrack: LatLng[] = [];
  recordingPolyline: L.Polyline | null = null;
  private recordingWatchId: string | null = null;
  private recordingStartTime: number | null = null;
  private lastRecordedPoint: LatLng | null = null;
  private totalDistanceMeters = 0;

  // Navigation state
  isNavigating = false;
  navigationWatchId: string | null = null;
  userMarker: L.Marker | null = null;

  // Route state
  fullRoute: LatLng[] = [];
  remainingRoute: LatLng[] = [];
  remainingRoutePolyline: L.Polyline | null = null;
  
  // Input fields
  startInput: string = '';
  endInput: string = '';
  
  // Coordinates
  private startCoords: LatLng | null = null;
  private endCoords: LatLng | null = null;
  
  // Route info
  routeInfo: RouteInfo | null = null;
  
  constructor(
    private mapService: MapService,
    private geocodingService: GeocodingService,
    private routingService: RoutingService,
    private locationService: LocationService,
    private tourService: TourService
  ) {
    addIcons({ locate, location, flag, search, closeCircle, navigate, close, radioButtonOnOutline, squareOutline, navigateOutline, stopCircleOutline });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeMap();
    }, 200);
  }

  ngOnDestroy(): void {
    this.locationService.stopWatchPosition();
  }

  private async initializeMap(): Promise<void> {
    try {
      const map = this.mapService.initMap('map');
      
      setTimeout(() => {
        map.invalidateSize();
      }, 200);

      // Wait a bit for Capacitor plugins to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Request location permission at startup
      await this.requestLocationPermission();

      // Start watching position with error handling
      try {
        await this.locationService.startWatchPosition();
        
        // Subscribe to position updates
        this.locationService.currentPosition$.subscribe(position => {
          if (position) {
            this.mapService.updateUserPosition(position.latitude, position.longitude);
          }
        });

        // Get initial position
        const position = await this.locationService.getCurrentPosition();
        if (position) {
          this.mapService.setCurrentPosition(position.latitude, position.longitude);
        }
      } catch (locationError) {
        console.warn('Location service not available:', locationError);
        // Continue without location - map will still work
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  private async requestLocationPermission(): Promise<void> {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const permission = await Geolocation.checkPermissions();
      
      if (permission.location === 'denied') {
        // Permission was previously denied, request it again
        const result = await Geolocation.requestPermissions();
        if (result.location !== 'granted') {
          console.warn('Location permission denied by user');
        }
      }
    } catch (error) {
      console.warn('Could not check location permission:', error);
    }
  }

  async goToMyLocation(): Promise<void> {
    try {
      await this.requestLocationPermission();
      const position = await this.locationService.getCurrentPosition();
      if (position) {
        this.mapService.panToPosition(position.latitude, position.longitude);
      } else {
        console.warn('Could not get location');
      }
    } catch (error) {
      console.warn('Could not get location:', error);
    }
  }

  async useCurrentLocation(): Promise<void> {
    try {
      await this.requestLocationPermission();
      const position = await this.locationService.getCurrentPosition();
      if (position) {
        this.startCoords = { lat: position.latitude, lng: position.longitude };
        this.startInput = 'Aktueller Standort';
        this.mapService.setStartMarker(position.latitude, position.longitude);
      
        // If end is set, calculate route
        if (this.endCoords) {
          await this.calculateRoute();
        }
      }
    } catch (error) {
      console.warn('Could not use current location:', error);
    }
  }

  async searchStart(): Promise<void> {
    if (!this.startInput || this.startInput === 'Aktueller Standort') return;
    
    const result = await this.geocodingService.geocode(this.startInput);
    if (result) {
      this.startCoords = { lat: result.lat, lng: result.lon };
      this.mapService.setStartMarker(result.lat, result.lon);
      
      // If end is set, calculate route
      if (this.endCoords) {
        await this.calculateRoute();
      }
    }
  }

  async searchEnd(): Promise<void> {
    if (!this.endInput) return;
    
    const result = await this.geocodingService.geocode(this.endInput);
    if (result) {
      this.endCoords = { lat: result.lat, lng: result.lon };
      this.mapService.setEndMarker(result.lat, result.lon);
      
      // If start is set, calculate route
      if (this.startCoords) {
        await this.calculateRoute();
      }
    }
  }

  async searchEndAndCalculate(): Promise<void> {
    // Ensure start is set first
    if (!this.startCoords && this.startInput && this.startInput !== 'Aktueller Standort') {
      await this.searchStart();
    }
    
    // Search for end destination
    if (this.endInput) {
      await this.searchEnd();
    }
    
    // Close modal if we have both coordinates (route should be calculated)
    if (this.startCoords && this.endCoords) {
      setTimeout(() => {
        this.closeSearchModal();
      }, 500);
    }
  }

  // Input change handlers (for potential autocomplete in future)
  onStartInput(): void {
    // Could add autocomplete suggestions here later
  }

  onEndInput(): void {
    // Could add autocomplete suggestions here later
  }

  private async calculateRoute(): Promise<void> {
    if (!this.startCoords || !this.endCoords) return;
    
    console.log('Calculating route from', this.startCoords, 'to', this.endCoords);
    
    const route = await this.routingService.getRoute(this.startCoords, this.endCoords);
    if (route) {
      console.log('Route received:', route);
      this.fullRoute = route.coordinates.map(([lng, lat]) => ({ lat, lng }));
      this.remainingRoute = [...this.fullRoute];
      this.recordedTrack = [];
      console.log('Route points:', this.remainingRoute.length);
      
      // Update route info
      this.routeInfo = {
        distance: (route.distance / 1000).toFixed(1), // Convert to km
        duration: Math.round(route.duration / 60).toString() // Convert to minutes
      };
      
      console.log('Route info:', this.routeInfo);

      const map = this.mapService.getMap();
      if (map) {
        // Entferne alte Polyline falls vorhanden
        if (this.remainingRoutePolyline) {
          map.removeLayer(this.remainingRoutePolyline);
          this.remainingRoutePolyline = null;
        }

        // Erstelle neue blaue Polyline für remaining route
        const remainingLatLngs = this.remainingRoute.map(c => [c.lat, c.lng] as L.LatLngExpression);
        console.log('Creating polyline with', remainingLatLngs.length, 'points');
        
        this.remainingRoutePolyline = L.polyline(remainingLatLngs, {
          color: '#0066cc',
          weight: 4,
          opacity: 0.8,
          interactive: true,
          dashArray: undefined,
          lineCap: 'round',
          lineJoin: 'round',
        });
        
        // Add to map DANN bringToFront
        this.remainingRoutePolyline.addTo(map);
        this.remainingRoutePolyline.bringToFront();
        
        console.log('Remaining polyline points:', this.remainingRoutePolyline.getLatLngs().length);
        console.log('Polyline color:', this.remainingRoutePolyline.options.color);

        // Erstelle oder leere recording polyline
        if (this.recordingPolyline) {
          this.recordingPolyline.setLatLngs([]);
        } else {
          this.recordingPolyline = this.mapService.createRecordingPolyline();
        }

        // Fit bounds zur Route
        if (this.remainingRoute.length) {
          const bounds = L.latLngBounds(this.remainingRoute.map(c => [c.lat, c.lng] as L.LatLngExpression));
          console.log('Bounds:', bounds.toBBoxString());
          map.fitBounds(bounds, { padding: [50, 50] });
          
          // Extra setTimeout um sicherzustellen dass die Map vollständig gerendert ist
          setTimeout(() => {
            this.remainingRoutePolyline?.bringToFront();
            console.log('Called bringToFront() again after fitBounds');
          }, 100);
        }
      } else {
        console.error('Map not found in calculateRoute');
      }
    } else {
      console.error('No route received');
    }
  }

  clearRoute(): void {
    this.startInput = '';
    this.endInput = '';
    this.startCoords = null;
    this.endCoords = null;
    this.routeInfo = null;
    this.remainingRoute = [];
    this.fullRoute = [];
    this.recordedTrack = [];
    
    // Remove remaining route polyline if exists
    const map = this.mapService.getMap();
    if (map && this.remainingRoutePolyline) {
      map.removeLayer(this.remainingRoutePolyline);
      this.remainingRoutePolyline = null;
    }
    
    if (map && this.recordingPolyline) {
      map.removeLayer(this.recordingPolyline);
      this.recordingPolyline = null;
    }
    
    this.mapService.clearRoute();
  }

  // Recording mode
  async toggleRecording(): Promise<void> {
    if (this.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  private async startRecording(): Promise<void> {
    if (this.isRecording) return;

    const map = this.mapService.getMap();
    if (!map) {
      console.error('Map not initialized');
      return;
    }

    this.isRecording = true;
    this.recordedTrack = [];
    this.totalDistanceMeters = 0;
    this.recordingStartTime = Date.now();
    this.lastRecordedPoint = null;

    // Prepare recording polyline (red line grows with GPS points)
    if (this.recordingPolyline) {
      this.recordingPolyline.setLatLngs([]);
    } else {
      this.recordingPolyline = this.mapService.createRecordingPolyline();
    }

    // Initialize remaining route polyline from the full OSRM route (blue line shrinks)
    if (this.fullRoute.length > 0) {
      const routeLatLngs = this.fullRoute.map(c => [c.lat, c.lng] as L.LatLngExpression);
      if (this.remainingRoutePolyline) {
        this.remainingRoutePolyline.setLatLngs(routeLatLngs);
      } else {
        this.remainingRoutePolyline = L.polyline(routeLatLngs, {
          color: '#0066cc',
          weight: 4,
          opacity: 0.8,
        }).addTo(map);
      }
      this.remainingRoutePolyline.bringToFront();
    }

    // Seed with current position if available
    const current = await this.locationService.getCurrentPosition();
    if (current) {
      const seedPoint: LatLng = { lat: current.latitude, lng: current.longitude };
      this.onGpsUpdate(seedPoint);
    }

    // Start dedicated watch for recording
    this.recordingWatchId = await this.locationService.watchPosition(
      (pos) => {
        const nextPoint: LatLng = { lat: pos.latitude, lng: pos.longitude };
        this.onGpsUpdate(nextPoint);
      },
      (err) => {
        console.error('Recording watch error', err);
      }
    );

    if (!this.recordingWatchId) {
      console.error('Recording watch could not start');
      this.isRecording = false;
    }
  }

  private async stopRecording(): Promise<void> {
    if (!this.isRecording) return;

    this.isRecording = false;

    if (this.recordingWatchId) {
      await this.locationService.clearWatch(this.recordingWatchId);
      this.recordingWatchId = null;
    }

    const startTime = this.recordingStartTime; // Speichere den Startzeitstempel BEVOR du ihn auf null setzt
    const durationSecs = startTime ? (Date.now() - startTime) / 1000 : 0;
    this.recordingStartTime = null;

    // Speichere Tour nur wenn wirklich eine Route aufgezeichnet wurde
    if (this.recordedTrack.length > 1 && durationSecs > 1) {
      console.log('Speichere abgeschlossene Recording-Tour mit startTime:', startTime);
      await this.saveCompletedTour(durationSecs, startTime);
    } else {
      console.log('Zu kurze oder leere Recording-Route. Nicht gespeichert.');
    }

    // Keep remaining route polyline layer but clear points
    if (this.remainingRoutePolyline) {
      this.remainingRoutePolyline.setLatLngs([]);
    }
  }

  private onGpsUpdate(point: LatLng): void {
    // A) Red line grows (recorded track)
    this.recordedTrack.push(point);
    if (this.lastRecordedPoint) {
      this.totalDistanceMeters += this.calculateDistanceMeters(this.lastRecordedPoint, point);
    }
    this.lastRecordedPoint = point;

    if (this.recordingPolyline) {
      this.recordingPolyline.addLatLng([point.lat, point.lng]);
    }

    // B) Find closest route index
    if (this.fullRoute.length) {
      const closestIndex = this.findClosestRouteIndex(point, this.fullRoute);
      this.remainingRoute = this.fullRoute.slice(closestIndex);

      // C/D) Update blue remaining route polyline (keep layer, just update points)
      if (this.remainingRoutePolyline) {
        const remainingCoords = this.remainingRoute.map(c => [c.lat, c.lng] as L.LatLngExpression);
        this.remainingRoutePolyline.setLatLngs(remainingCoords);
      }
    }

    // E) Move marker (aber nicht automatisch zoomen - User soll frei zoomen können)
    if (this.userMarker) {
      this.userMarker.setLatLng([point.lat, point.lng]);
    }
    this.mapService.updateUserPosition(point.lat, point.lng);
    // Kein automatisches panToPosition() hier - nur im Navigation Mode oder "My Location" Button!
  }

  private saveRoute(durationMs: number): void {
    if (!this.recordedTrack.length) return;

    const route = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2),
      date: new Date().toISOString(),
      points: this.recordedTrack,
      distanceMeters: this.totalDistanceMeters,
      durationMs,
    };

    try {
      const existingRaw = localStorage.getItem('recordedRoutes');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      existing.push(route);
      localStorage.setItem('recordedRoutes', JSON.stringify(existing));
      console.log('Route saved locally', route);
    } catch (error) {
      console.error('Failed to save route', error);
    }
  }

  /**
   * Speichert eine abgeschlossene Tour in Supabase
   * Wird von stopRecording() und stopNavigation() aufgerufen
   */
  private async saveCompletedTour(durationSecs: number, recordingStartTime: number | null = null): Promise<void> {
    if (this.recordedTrack.length < 2) {
      console.log('Zu wenige Trackingpunkte zum Speichern');
      return;
    }

    // Berechne Distanz in km
    const distanceKm = this.totalDistanceMeters / 1000;

    // Berechne Durchschnittsgeschwindigkeit (km/h)
    const avgSpeedKmh = durationSecs > 0 ? (distanceKm / (durationSecs / 3600)) : 0;

    console.log('Speichere Tour zu Supabase:', {
      distance: distanceKm,
      duration: durationSecs,
      avg_speed: avgSpeedKmh,
      points: this.recordedTrack.length,
      startTime: recordingStartTime,
    });

    try {
      const result = await this.tourService.saveCompletedTour(
        distanceKm,
        durationSecs,
        this.recordedTrack,
        recordingStartTime || Date.now()
      );

      if (result) {
        console.log('Tour erfolgreich gespeichert:', result);
        // Optional: Toast/Notification anzeigen
      } else {
        console.error('Fehler beim Speichern der Tour');
      }
    } catch (err) {
      console.error('Fehler beim Speichern zu Supabase:', err);
    }
  }

  /**
   * Berechnet Distanz zwischen zwei Punkten in Metern (Haversine)
   */
  private calculateDistanceMeters(a: LatLng, b: LatLng): number {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const hav = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
    return R * c;
  }

  /**
   * Findet den Index des nächsten Punktes auf der Route
   */
  private findClosestRouteIndex(userPos: LatLng, routeCoords: LatLng[]): number {
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < routeCoords.length; i++) {
      const dist = this.calculateDistanceMeters(userPos, routeCoords[i]);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  // Modal methods
  openSearchModal(): void {
    this.isSearchModalOpen = true;
  }

  closeSearchModal(): void {
    this.isSearchModalOpen = false;
  }

  async calculateAndShowRoute(): Promise<void> {
    // Search both if not already done
    if (this.startInput && !this.startCoords) {
      await this.searchStart();
    }
    if (this.endInput && !this.endCoords) {
      await this.searchEnd();
    }
    
    // Calculate route
    if (this.startCoords && this.endCoords) {
      await this.calculateRoute();
      // Close modal and show route
      this.closeSearchModal();
    }
  }

  /* Navigation Mode */
  async toggleNavigation(): Promise<void> {
    if (this.isNavigating) {
      await this.stopNavigation();
    } else {
      await this.startNavigation();
    }
  }

  private async startNavigation(): Promise<void> {
    if (this.isNavigating) return;
    const map = this.mapService.getMap();
    if (!map) return;

    if (!this.fullRoute.length) {
      console.warn('Navigation: no planned route');
      return;
    }

    // Request location permission before navigation
    await this.requestLocationPermission();

    this.isNavigating = true;

    // Reset tracks/polyline state
    this.recordedTrack = [];
    this.remainingRoute = [...this.fullRoute];
    this.lastRecordedPoint = null;
    this.totalDistanceMeters = 0;
    if (this.recordingPolyline) {
      this.recordingPolyline.setLatLngs([]);
    } else {
      this.recordingPolyline = this.mapService.createRecordingPolyline();
    }
    const remainingLatLngs = this.remainingRoute.map(c => [c.lat, c.lng] as L.LatLngExpression);
    if (this.remainingRoutePolyline) {
      this.remainingRoutePolyline.setLatLngs(remainingLatLngs);
    } else {
      this.remainingRoutePolyline = L.polyline(remainingLatLngs, {
        color: '#0066cc',
        weight: 4,
        opacity: 0.8,
      }).addTo(map);
    }
    this.remainingRoutePolyline.bringToFront();

    const pos = await this.locationService.getCurrentPosition();
    if (!pos) {
      console.error('Navigation: no position');
      this.isNavigating = false;
      return;
    }

    // create or update user marker
    if (!this.userMarker) {
      this.userMarker = L.marker([pos.latitude, pos.longitude], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        })
      }).addTo(map);
    } else {
      this.userMarker.setLatLng([pos.latitude, pos.longitude]);
    }

    map.panTo([pos.latitude, pos.longitude], { animate: true });

    // Seed with current position
    this.onGpsUpdate({ lat: pos.latitude, lng: pos.longitude });

    // start watch
    this.navigationWatchId = await this.locationService.watchPosition(
      (p) => {
        if (!p) return;
        const { latitude, longitude } = p;
        this.onGpsUpdate({ lat: latitude, lng: longitude });
        if (this.fullRoute.length) {
          this.checkDeviationFromRoute(latitude, longitude);
        }
      },
      (err) => {
        console.error('Navigation watch error', err);
      }
    );

    if (!this.navigationWatchId) {
      this.isNavigating = false;
    }
  }

  private async stopNavigation(): Promise<void> {
    if (!this.isNavigating) return;
    this.isNavigating = false;
    if (this.navigationWatchId) {
      await this.locationService.clearWatch(this.navigationWatchId);
      this.navigationWatchId = null;
    }

    // Speichere Navigation-Route wenn User sich bewegt hat
    if (this.recordedTrack.length > 1 && this.recordingStartTime) {
      const startTime = this.recordingStartTime;
      const durationSecs = (Date.now() - startTime) / 1000;
      this.recordingStartTime = null;
      if (durationSecs > 1) {
        console.log('Speichere abgeschlossene Navigation-Tour mit startTime:', startTime);
        await this.saveCompletedTour(durationSecs, startTime);
      }
    }
  }

  private checkDeviationFromRoute(lat: number, lng: number): void {
    if (!this.fullRoute.length) return;
    const userPoint: LatLng = { lat, lng };
    let minDist = Number.MAX_VALUE;
    for (let i = 1; i < this.fullRoute.length; i++) {
      const a = this.fullRoute[i - 1];
      const b = this.fullRoute[i];
      const dist = this.distancePointToSegment(userPoint, a, b);
      if (dist < minDist) minDist = dist;
    }
    // Threshold 30m
    if (minDist > 30) {
      console.warn('Route deviation detected', minDist);
    }
  }

  // Distance from point P to segment AB in meters
  private distancePointToSegment(p: LatLng, a: LatLng, b: LatLng): number {
    const distAB = this.calculateDistanceMeters(a, b);
    if (distAB === 0) return this.calculateDistanceMeters(p, a);

    // project point onto segment
    const toRad = (v: number) => (v * Math.PI) / 180;
    const lat1 = toRad(a.lat);
    const lon1 = toRad(a.lng);
    const lat2 = toRad(b.lat);
    const lon2 = toRad(b.lng);
    const latP = toRad(p.lat);
    const lonP = toRad(p.lng);

    const A = [Math.cos(lat1) * Math.cos(lon1), Math.cos(lat1) * Math.sin(lon1), Math.sin(lat1)];
    const B = [Math.cos(lat2) * Math.cos(lon2), Math.cos(lat2) * Math.sin(lon2), Math.sin(lat2)];
    const P = [Math.cos(latP) * Math.cos(lonP), Math.cos(latP) * Math.sin(lonP), Math.sin(latP)];

    const AB = B.map((v, idx) => v - A[idx]);
    const AP = P.map((v, idx) => v - A[idx]);
    const ab2 = AB.reduce((s, v) => s + v * v, 0);
    const ap_ab = AP.reduce((s, v, idx) => s + v * AB[idx], 0);
    let t = ap_ab / ab2;
    t = Math.max(0, Math.min(1, t));

    const proj = A.map((v, idx) => v + t * AB[idx]);
    const projLat = Math.atan2(proj[2], Math.sqrt(proj[0] * proj[0] + proj[1] * proj[1]));
    const projLon = Math.atan2(proj[1], proj[0]);

    const projPoint: LatLng = { lat: projLat * 180 / Math.PI, lng: projLon * 180 / Math.PI };
    return this.calculateDistanceMeters(p, projPoint);
  }
}
