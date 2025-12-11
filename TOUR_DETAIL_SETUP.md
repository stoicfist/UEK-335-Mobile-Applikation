# Tour Detail Page - Komplette Dokumentation

## 📋 Überblick

Die **Tour Detail Page** ist eine vollständig ausgearbeitete Ionic + Angular Detailseite für gespeicherte Motorradrouten. Sie zeigt eine interaktive Leaflet-Karte, umfangreiche Statistiken und Routenpunkte in einer benutzerfreundlichen Tabelle.

## 🎯 Features

### 1. **Interaktive Leaflet-Karte**
- Responsive Kartengröße (350px Höhe, 280px auf Mobile)
- Vollbreite Anzeige
- OpenStreetMap Tile Layer
- **Startpunkt-Marker** (grün, ✓)
- **Endpunkt-Marker** (rot, ✗)
- **Route als Polyline** (blau, 4px Dicke)
- Automatische Zoom-Anpassung mit `fitBounds()`
- Zoom-Controls aktiviert (user interaction)
- Popups für Start/End-Marker

### 2. **Statistik-Übersicht**
In einer professionell gestalteten Karte:
- 📏 **Gesamtdistanz** (km, 2 Dezimalstellen)
- ⏱️ **Dauer** (Minuten)
- 🚴 **Durchschnittsgeschwindigkeit** (km/h)
- 🕐 **Startzeit – Endzeit** (HH:mm Format, Swiss Locale)
- 📅 **Datum** (vollständig formatiert mit Wochentag)

Responsive 2-Spalten-Layout mit ion-grid.

### 3. **Routenpunkte-Tabelle**
- Zeigt die **ersten 10 Routenpunkte**
- Spalten: Index, Koordinaten (5 Dezimalstellen), Timestamp (HH:mm:ss)
- Dark Mode Unterstützung
- "... und X weitere Punkte" Hinweis wenn mehr als 10

### 4. **Export-Funktion**
```typescript
onExport(): Promise<void>
```
- Exportiert die komplette Tour als **JSON-Datei**
- Dateiname: `tour-{id}-{timestamp}.json`
- Nutzt Browser Blob API + File Download
- Toast-Feedback nach Export

### 5. **Lösch-Funktion**
```typescript
onDelete(): Promise<void>
async deleteTour(): Promise<void>
```
- Alert Dialog zur Bestätigung
- Löscht Tour aus Supabase
- Navigation zurück zu Tab2 nach erfolgreicher Löschung
- Toast-Feedback (Erfolg oder Fehler)

### 6. **Footer mit Action Buttons**
```html
<ion-footer>
  <ion-toolbar>
    <ion-button expand="full" (click)="onExport()">
      <ion-icon slot="start" name="download"></ion-icon>
      Exportieren
    </ion-button>
    <ion-button expand="full" color="danger" (click)="onDelete()">
      <ion-icon slot="start" name="trash"></ion-icon>
      Löschen
    </ion-button>
  </ion-toolbar>
</ion-footer>
```

## 🗂️ Dateistruktur

```
src/app/tab2/tour-detail/
├── tour-detail.page.ts       (Component Logic - 277 Zeilen)
├── tour-detail.page.html     (Template - 132 Zeilen)
└── tour-detail.page.scss     (Styles - optimiert, ~230 Zeilen)
```

## 🚀 Navigation

### Route Registration (bereits in `tabs.routes.ts`)
```typescript
{
  path: 'tab2/tour-detail/:id',
  loadComponent: () =>
    import('../tab2/tour-detail/tour-detail.page').then((m) => m.TourDetailPage),
}
```

### Von Tab2 aus aufrufen:
```typescript
this.router.navigate(['/tabs/tab2/tour-detail', tourId]);
```

## 💻 Component API

### Properties
```typescript
tour: Tour | null                          // Geladene Route
isLoading: boolean                         // Ladestate
isDark: boolean                            // Dark Mode Flag
private map: L.Map | null                  // Leaflet Map Instance
private darkModeSubscription: Subscription  // RxJS Subscription
```

### Public Methods
```typescript
getTourDurationMinutes(tour: Tour | null): number
getStartTime(tour: Tour | null): string
getEndTime(tour: Tour | null): string
getFormattedDate(dateString: string | undefined): string
onExport(): Promise<void>
onDelete(): Promise<void>
```

### Lifecycle Hooks
```typescript
ngOnInit(): void           // Subscriptions, Tour laden
ngOnDestroy(): void        // Cleanup (Map, Subscriptions)
```

## 🎨 Styling & Responsive Design

### CSS Classes
- `.map-container` - Leaflet Map Wrapper
- `.statistics-card` - Statistik Ion-Card
- `.stat-row`, `.stat-col`, `.stat-item` - Grid Layout
- `.route-points-card` - Routenpunkte Tabelle
- `.points-table`, `.table-header`, `.table-row` - Tabellenelemente
- `.loading-container`, `.error-container` - States
- `.spacer` - Footer Padding

### Dark Mode Support
Alle Farben nutzen CSS Custom Properties und `:host-context(html.ion-palette-dark)` Selektoren.

### Breakpoints
```scss
@media (max-width: 576px)           // Mobile
  - Map: 280px Höhe
  - Font sizes angepasst
  - Table columns schmaler

@media (min-width: 577px) and (max-width: 992px)  // Tablet
  - Map: 320px Höhe
```

## 📦 Dependencies

Builtin Imports:
```typescript
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Component, OnInit, OnDestroy } from '@angular/core';
```

Ionic Imports:
```typescript
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonIcon, IonButton, IonFooter, IonGrid, IonRow, IonCol,
  IonText, IonSpinner, IonButtons, IonBackButton,
  AlertController, ToastController
} from '@ionic/angular/standalone';
```

RxJS:
```typescript
import { Subscription } from 'rxjs';
```

Maps & Services:
```typescript
import * as L from 'leaflet';
import { TourService, Tour } from '../../services/tour.service';
import { ThemeService } from '../../services/theme.service';
```

## 🔄 Data Flow

```
1. User navigiert zu /tabs/tab2/tour-detail/:id
   ↓
2. ngOnInit() wird aufgerufen
   ├─ Dark Mode Subscription aktiviert
   └─ loadTour() mit ID aus Route
   ↓
3. TourService.getTourById(id) aufgerufen
   ├─ Supabase Query
   └─ Tour Objekt zurückgegeben
   ↓
4. initializeMap() startet
   ├─ Leaflet Map instanziiert
   ├─ Tile Layer (OSM) hinzugefügt
   ├─ Route als Polyline gezeichnet
   ├─ Start/End Marker platziert
   └─ fitBounds() auf Route
   ↓
5. Template rendert Statistiken und Tabelle
   ↓
6. User: Export oder Delete
   ├─ Export: JSON Download generiert
   └─ Delete: Alert bestätigt → TourService.deleteTour() → Navigation
```

## 🧪 Testing

### Lokale Browser-Tests
```bash
# Development Server starten
npm start

# Navigiere zu
http://localhost:4200/tabs/tab2

# Wähle eine Route aus (Klick auf Karte oder Liste)
# Sollte zu /tabs/tab2/tour-detail/{tourId} navigieren
```

### Android Device Testing
```bash
# Mit physischem Device verbunden
ionic capacitor run android

# Oder Emulator
ionic capacitor run android -l --external
```

## 📋 Tour Interface

Aus `tour.service.ts`:
```typescript
export interface Tour {
  id?: string;
  created_at?: string;
  duration: number;              // Sekunden
  distance: number;              // Kilometer
  average_speed: number;         // km/h
  route_points: {
    lat: number;
    lng: number;
    timestamp: number;           // Unix Timestamp (ms)
  }[];
}
```

## 🐛 Error Handling

1. **Tour nicht gefunden**
   - isLoading Flag → False
   - Error Container wird gezeigt
   - Toast: "Route nicht gefunden"

2. **Export fehlgeschlagen**
   - Try-Catch in onExport()
   - Toast: "Fehler beim Exportieren"

3. **Delete fehlgeschlagen**
   - Boolean-Rückgabe von deleteTour()
   - Toast: "Fehler beim Löschen"

## 🎓 Best Practices implementiert

✅ Standalone Components (Angular 14+)
✅ TypeScript Strict Mode
✅ RxJS Subscriptions mit OnDestroy Cleanup
✅ Leaflet Map Lifecycle Management (remove in ngOnDestroy)
✅ Proper Null Safety & Non-null Assertions (!)
✅ Swiss Locale Formatierung (de-CH)
✅ Dark Mode Support durchgehend
✅ Responsive Design (Mobile First)
✅ Loading & Error States
✅ User Feedback (Toast, Alert)
✅ Modular SCSS mit BEM-ähnliche Struktur
✅ Accessibility (button sizes 44px+, proper semantic HTML)

## 🚨 Performance Notes

- **Map Instance Cleanup**: `this.map.remove()` in ngOnDestroy
- **Subscription Cleanup**: `unsubscribe()` in ngOnDestroy
- **Route Polyline**: `smoothFactor: 1.0` für optimierte Rendering
- **Bundle Size**: tour-detail-page lazy-loaded → 15.59 kB
- **SCSS Budget**: 3.30 kB (harmless warning)

## 📱 Device Compatibility

- ✅ iOS (iPad, iPhone)
- ✅ Android (Phones, Tablets)
- ✅ Desktop/Browser
- ✅ Dark Mode (System Preference)
- ✅ Touch & Mouse Input

## 🔗 Integration Checklist

- ✅ Route in `tabs.routes.ts` registriert
- ✅ TourService mit `getTourById()` und `deleteTour()` vorhanden
- ✅ ThemeService mit `darkMode$` Observable vorhanden
- ✅ Leaflet + Ionicons NPM Packages installiert
- ✅ Tour-Detail als lazy-loaded Komponente konfiguriert

## 📝 Beispiel: Mit Tab2 verknüpfen

In `tab2.page.ts`:
```typescript
goToDetail(tourId?: string): void {
  if (tourId) {
    this.router.navigate(['/tabs/tab2/tour-detail', tourId]);
  }
}
```

In `tab2.page.html`:
```html
<ion-card (click)="goToDetail(tour.id)">
  <!-- Tour Preview -->
</ion-card>
```

---

**Version**: 1.0  
**Last Updated**: 2025-12-11  
**Author**: Angular + Ionic MotoTrack App  
**Status**: ✅ Production Ready
