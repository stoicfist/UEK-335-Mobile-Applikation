import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { 
  IonContent, IonFabButton, IonIcon,
  IonCard, IonItem, IonInput, IonButton, IonLabel 
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MapService } from '../services/map.service';
import { GeocodingService } from '../services/geocoding.service';
import { RoutingService, LatLng } from '../services/routing.service';
import { LocationService } from '../services/location.service';
import { addIcons } from 'ionicons';
import { locate, location, flag, search, closeCircle } from 'ionicons/icons';

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
    IonContent, IonFabButton, IonIcon,
    IonCard, IonItem, IonInput, IonButton, IonLabel
  ],
})
export class Tab1Page implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  
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
    addIcons({ locate, location, flag, search, closeCircle });
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

  private async calculateRoute(): Promise<void> {
    if (!this.startCoords || !this.endCoords) return;
    
    const route = await this.routingService.getRoute(this.startCoords, this.endCoords);
    if (route) {
      this.mapService.drawRoute(route.coordinates);
      
      // Update route info
      this.routeInfo = {
        distance: (route.distance / 1000).toFixed(1), // Convert to km
        duration: Math.round(route.duration / 60).toString() // Convert to minutes
      };
      
      // Fit map to route
      this.mapService.fitBoundsToRoute();
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
}
