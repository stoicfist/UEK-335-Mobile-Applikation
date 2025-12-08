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

   // Recording state
  isRecording = false;
  recordedPath: LatLng[] = [];
  recordingPolyline: L.Polyline | null = null;
  private recordingWatchId: string | null = null;
  private recordingStartTime: number | null = null;
  private lastRecordedPoint: LatLng | null = null;
  private totalDistanceMeters = 0;

  // Navigation state
  isNavigating = false;
  navigationWatchId: string | null = null;
  userMarker: L.Marker | null = null;
  routeCoordinates: LatLng[] = [];
  
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
    private locationService: LocationService
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

      // Start watching position
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
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  async goToMyLocation(): Promise<void> {
    const position = await this.locationService.getCurrentPosition();
    if (position) {
      this.mapService.panToPosition(position.latitude, position.longitude);
    }
  }

  async useCurrentLocation(): Promise<void> {
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
      this.mapService.drawRoute(route.coordinates);

      // keep route coords for navigation deviation checks
      this.routeCoordinates = route.coordinates.map(([lng, lat]) => ({ lat, lng }));
      
      // Update route info
      this.routeInfo = {
        distance: (route.distance / 1000).toFixed(1), // Convert to km
        duration: Math.round(route.duration / 60).toString() // Convert to minutes
      };
      
      console.log('Route info:', this.routeInfo);
      
      // Fit map to route
      this.mapService.fitBoundsToRoute();
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
    this.recordedPath = [];
    this.totalDistanceMeters = 0;
    this.recordingStartTime = Date.now();
    this.lastRecordedPoint = null;

    // Create or reset recording polyline
    if (this.recordingPolyline) {
      map.removeLayer(this.recordingPolyline);
    }
    this.recordingPolyline = this.mapService.createRecordingPolyline();

    // Seed with current position if available
    const current = await this.locationService.getCurrentPosition();
    if (current) {
      const seedPoint: LatLng = { lat: current.latitude, lng: current.longitude };
      this.pushRecordingPoint(seedPoint);
      this.mapService.updateUserPosition(seedPoint.lat, seedPoint.lng);
      this.mapService.panToPosition(seedPoint.lat, seedPoint.lng);
    }

    // Start dedicated watch for recording
    this.recordingWatchId = await this.locationService.watchPosition(
      (pos) => {
        const nextPoint: LatLng = { lat: pos.latitude, lng: pos.longitude };
        this.pushRecordingPoint(nextPoint);
        this.mapService.updateUserPosition(nextPoint.lat, nextPoint.lng);
        this.mapService.panToPosition(nextPoint.lat, nextPoint.lng);
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

    const durationMs = this.recordingStartTime ? Date.now() - this.recordingStartTime : 0;
    this.recordingStartTime = null;

    // Persist recorded route
    this.saveRoute(durationMs);
  }

  private pushRecordingPoint(point: LatLng): void {
    this.recordedPath.push(point);

    // Distance accumulation
    if (this.lastRecordedPoint) {
      this.totalDistanceMeters += this.calculateDistanceMeters(this.lastRecordedPoint, point);
    }
    this.lastRecordedPoint = point;

    // Update polyline
    if (this.recordingPolyline) {
      this.recordingPolyline.addLatLng([point.lat, point.lng]);
    }
  }

  private saveRoute(durationMs: number): void {
    if (!this.recordedPath.length) return;

    const route = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2),
      date: new Date().toISOString(),
      points: this.recordedPath,
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

    this.isNavigating = true;

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

    // start watch
    this.navigationWatchId = await this.locationService.watchPosition(
      (p) => {
        if (!p) return;
        const { latitude, longitude } = p;
        if (this.userMarker) {
          this.userMarker.setLatLng([latitude, longitude]);
        }
        if (this.isNavigating) {
          this.mapService.panToPosition(latitude, longitude);
        }
        if (this.routeCoordinates.length) {
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
  }

  private checkDeviationFromRoute(lat: number, lng: number): void {
    if (!this.routeCoordinates.length) return;
    const userPoint: LatLng = { lat, lng };
    let minDist = Number.MAX_VALUE;
    for (let i = 1; i < this.routeCoordinates.length; i++) {
      const a = this.routeCoordinates[i - 1];
      const b = this.routeCoordinates[i];
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
