import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private map: L.Map | null = null;
  private currentPositionMarker: L.Marker | null = null;
  private startMarker: L.Marker | null = null;
  private endMarker: L.Marker | null = null;
  private routePolyline: L.Polyline | null = null;

  initMap(mapContainer: string): L.Map {
    // Erstelle die Karte ohne Zoom Controls
    this.map = L.map(mapContainer, {
      zoomControl: false,
    }).setView([47.3769, 8.5472], 13); // Zürich als Standard

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

    // Erstelle neuen Position Marker (blau)
    const blueIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    this.currentPositionMarker = L.marker([latitude, longitude], {
      icon: blueIcon,
    })
      .addTo(this.map)
      .bindPopup(`Aktuelle Position<br>Lat: ${latitude.toFixed(4)}<br>Lon: ${longitude.toFixed(4)}`);

    // Zentriere auf die Position
    this.map.setView([latitude, longitude], 15);
  }

  updateUserPosition(latitude: number, longitude: number): void {
    if (!this.map) return;

    // Entferne alten Marker falls vorhanden
    if (this.currentPositionMarker) {
      this.map.removeLayer(this.currentPositionMarker);
    }

    // Erstelle neuen Position Marker (blau)
    const blueIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    this.currentPositionMarker = L.marker([latitude, longitude], {
      icon: blueIcon,
    })
      .addTo(this.map);
  }

  panToPosition(latitude: number, longitude: number): void {
    if (!this.map) return;
    this.map.setView([latitude, longitude], 15);
  }

  setStartMarker(latitude: number, longitude: number): void {
    if (!this.map) return;

    // Entferne alten Start-Marker
    if (this.startMarker) {
      this.map.removeLayer(this.startMarker);
    }

    // Grüner Marker für Start
    const greenIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    this.startMarker = L.marker([latitude, longitude], {
      icon: greenIcon,
    })
      .addTo(this.map)
      .bindPopup('Start');
  }

  setEndMarker(latitude: number, longitude: number): void {
    if (!this.map) return;

    // Entferne alten End-Marker
    if (this.endMarker) {
      this.map.removeLayer(this.endMarker);
    }

    // Roter Marker für Ziel
    const redIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    this.endMarker = L.marker([latitude, longitude], {
      icon: redIcon,
    })
      .addTo(this.map)
      .bindPopup('Ziel');
  }

  drawRoute(coordinates: [number, number][]): void {
    if (!this.map) return;

    // Entferne alte Route
    if (this.routePolyline) {
      this.map.removeLayer(this.routePolyline);
    }

    // Konvertiere [lng, lat] zu [lat, lng] für Leaflet
    const latLngs: [number, number][] = coordinates.map(coord => [coord[1], coord[0]]);

    // Zeichne neue Route
    this.routePolyline = L.polyline(latLngs, {
      color: '#3880ff',
      weight: 5,
      opacity: 0.7,
    }).addTo(this.map);
  }

  fitBoundsToRoute(): void {
    if (!this.map || !this.routePolyline) return;
    
    const bounds = this.routePolyline.getBounds();
    this.map.fitBounds(bounds, { padding: [50, 50] });
  }

  clearRoute(): void {
    if (!this.map) return;

    // Entferne alle Marker und Route
    if (this.startMarker) {
      this.map.removeLayer(this.startMarker);
      this.startMarker = null;
    }
    if (this.endMarker) {
      this.map.removeLayer(this.endMarker);
      this.endMarker = null;
    }
    if (this.routePolyline) {
      this.map.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }
  }

  createRecordingPolyline(options?: L.PolylineOptions): L.Polyline | null {
    if (!this.map) return null;
    const polyline = L.polyline([], {
      color: 'red',
      weight: 5,
      ...options,
    }).addTo(this.map);
    return polyline;
  }

  addPointToPolyline(polyline: L.Polyline, latitude: number, longitude: number): void {
    polyline.addLatLng([latitude, longitude]);
  }

  getMap(): L.Map | null {
    return this.map;
  }
}
