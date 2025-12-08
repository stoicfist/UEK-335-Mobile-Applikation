import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private map: L.Map | null = null;
  private currentPositionMarker: L.Marker | null = null;

  initMap(mapContainer: string): L.Map {
    // Erstelle die Karte
    this.map = L.map(mapContainer).setView([47.3769, 8.5472], 13); // Zürich als Standard

    // OpenStreetMap Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    return this.map;
  }

  setCurrentPosition(latitude: number, longitude: number): void {
    if (!this.map) return;

    // Entferne alten Marker falls vorhanden
    if (this.currentPositionMarker) {
      this.map.removeLayer(this.currentPositionMarker);
    }

    // Erstelle neuen Position Marker
    const customIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    this.currentPositionMarker = L.marker([latitude, longitude], {
      icon: customIcon,
    })
      .addTo(this.map)
      .bindPopup(`Aktuelle Position<br>Lat: ${latitude.toFixed(4)}<br>Lon: ${longitude.toFixed(4)}`);

    // Zentriere auf die Position
    this.map.setView([latitude, longitude], 15);
  }

  getMap(): L.Map | null {
    return this.map;
  }
}
