import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonFabButton, IonIcon } from '@ionic/angular/standalone';
import { Geolocation } from '@capacitor/geolocation';
import { MapService } from '../services/map.service';
import { addIcons } from 'ionicons';
import { locate } from 'ionicons/icons';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonFabButton, IonIcon],
})
export class Tab1Page implements AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  private currentLat: number = 47.3769;
  private currentLon: number = 8.5472;

  constructor(private mapService: MapService) {
    addIcons({ locate });
  }

  ngAfterViewInit(): void {
    console.log('Tab1: ngAfterViewInit called');
    // Warte kurz, bis das DOM wirklich ready ist
    setTimeout(() => {
      console.log('Tab1: Starting map initialization');
      this.initializeMap();
    }, 200);
  }

  private async initializeMap(): Promise<void> {
    try {
      console.log('Tab1: Initializing map...');
      // Initialisiere die Karte
      const map = this.mapService.initMap('map');
      console.log('Tab1: Map initialized', map);
      
      // Force invalidate size, damit die Karte richtig rendert
      setTimeout(() => {
        map.invalidateSize();
        console.log('Tab1: Map size invalidated');
      }, 200);

      // Hole aktuelle Position
      try {
        const coordinates = await Geolocation.getCurrentPosition();
        this.currentLat = coordinates.coords.latitude;
        this.currentLon = coordinates.coords.longitude;
        console.log('Tab1: Got position', this.currentLat, this.currentLon);
        this.mapService.setCurrentPosition(this.currentLat, this.currentLon);
      } catch (error) {
        console.log('Geolocation error:', error);
        // Fallback: Zürich
        this.mapService.setCurrentPosition(this.currentLat, this.currentLon);
      }
    } catch (error) {
      console.error('Tab1: Error initializing map:', error);
    }
  }

  async goToMyLocation(): Promise<void> {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      this.currentLat = coordinates.coords.latitude;
      this.currentLon = coordinates.coords.longitude;
      this.mapService.setCurrentPosition(this.currentLat, this.currentLon);
    } catch (error) {
      console.log('Geolocation error:', error);
      // Fallback auf letzte bekannte Position
      this.mapService.setCurrentPosition(this.currentLat, this.currentLon);
    }
  }
}
