# Tab 2 "Meine Routen" - Quick Reference

## Dateistruktur

```
src/app/
├── tab1/
│   ├── tab1.page.ts         ← saveCompletedTour() hier
│   ├── tab1.page.html       ← Recording/Navigation FABs
│   └── tab1.page.scss
├── tab2/
│   ├── tab2.page.ts         ← NEUE KOMPLETTE IMPLEMENTIERUNG
│   ├── tab2.page.html       ← Filter + Tour-Karten
│   └── tab2.page.scss
└── services/
    └── tour.service.ts      ← saveCompletedTour() + Filter-Queries
```

---

## Kontrollfluss: Route Speichern

```
USER in Tab1
  ↓
[Recording startet] oder [Navigation startet]
  ↓
Pac-Man Effekt: recordedTrack[] wächst
  ↓
[User stoppt Recording/Navigation]
  ↓
stopRecording() / stopNavigation() aufgerufen
  ↓
Bedingungen prüfen:
  - recordedTrack.length > 1? ✓
  - duration > 30 Sekunden? ✓
  ↓
saveCompletedTour(durationSecs) aufgerufen
  ↓
TourService.saveCompletedTour(
  distance,
  duration,
  recordedTrack,
  recordingStartTime
)
  ↓
Berechnet:
  - avg_speed = distance / (duration/3600)
  - Konvertiert RecordedTrack zu RoutePoints mit Timestamps
  - Setzt year = 2024, month = 12 (aktuell)
  ↓
INSERT INTO supabase.tours
  ↓
Tour in DB gespeichert ✓
  ↓
Tab 2 wird aktualisiert wenn User dorthin navigiert
```

---

## Komponenten-Lifecycle: Tab2

```
User öffnet Tab2
  ↓
ngOnInit()
  - initializeYears() → [2024, 2023, ...]
  - loadTours() → TourService.getAllTours()
  - filterToursByYearAndMonth()
  - startYearCheckInterval() → alle 30 Min prüfen
  ↓
ngAfterViewInit()
  - initializeMiniMaps() → Erstelle Leaflet Maps
  ↓
[User wechselt Jahr/Monat]
  ↓
onYearChange(year) / onMonthChange(month)
  - filterToursByYearAndMonth()
  - Re-initialize Mini-Maps
  ↓
[Zeige filterte Tours]
```

---

## API: Tour Service

### Enum für Monat Werte
```typescript
// WICHTIG: 1-12, NICHT 0-11!
1 = Januar
2 = Februar
...
12 = Dezember
```

### Hauptfunktionen

#### saveCompletedTour()
```typescript
tourService.saveCompletedTour(
  distance: 2.5,              // km
  duration: 300,              // Sekunden
  recordedTrack: [             // {lat, lng}[]
    {lat: 47.123, lng: 8.456},
    {lat: 47.124, lng: 8.457},
    ...
  ],
  recordingStartTime: 1702300000000  // ms
): Promise<Tour | null>

// Returns:
{
  id: 'uuid-xxx',
  created_at: '2024-12-11T09:48:00Z',
  distance: 2.5,
  duration: 300,
  avg_speed: 30.0,
  route_points: [{lat, lng, timestamp}, ...],
  year: 2024,
  month: 12
}
```

#### getAllTours()
```typescript
const tours = await tourService.getAllTours();
// Returns: Tour[] sorted by created_at DESC
```

#### getToursByYearAndMonth()
```typescript
const tours = await tourService.getToursByYearAndMonth(2024, 12);
// Returns: Tour[] für Dezember 2024
```

#### deleteTour()
```typescript
const success = await tourService.deleteTour('uuid-xxx');
// Returns: true/false
```

---

## HTML-Template Patterns

### Jahr-Filter
```html
<div class="year-selector">
  <ion-button 
    *ngFor="let year of availableYears" 
    [fill]="selectedYear === year ? 'solid' : 'outline'"
    [color]="selectedYear === year ? 'primary' : 'medium'"
    (click)="onYearChange(year)"
    size="small">
    {{ year }}
  </ion-button>
</div>
```

### Monat-Filter
```html
<div class="month-selector">
  <ion-button 
    *ngFor="let month of months" 
    [fill]="selectedMonth === month.value ? 'solid' : 'outline'"
    [color]="selectedMonth === month.value ? 'primary' : 'medium'"
    (click)="onMonthChange(month.value)"
    size="small">
    {{ month.label }}
  </ion-button>
</div>
```

### Tour-Karte
```html
<ion-card 
  *ngFor="let tour of filteredTours" 
  (click)="goToDetail(tour.id!)" 
  class="tour-card">
  
  <div class="map-thumbnail">
    <div [id]="'map-' + tour.id" class="map-container"></div>
  </div>
  
  <div class="tour-info">
    <div class="distance-duration">
      {{ formatDistance(tour.distance) }} km •
      {{ formatDuration(tour.duration) }} min
    </div>
    <div class="tour-times">
      {{ getStartTime(tour) }} – {{ getEndTime(tour) }}
    </div>
  </div>
  
  <ion-item-options side="end">
    <ion-item-option color="danger" (click)="deleteTour(tour.id!, $event)">
      <ion-icon name="trash"></ion-icon>
    </ion-item-option>
  </ion-item-options>
</ion-card>
```

---

## Style: Tour Cards

```scss
.tour-list {
  padding: 16px;
}

.tour-card {
  cursor: pointer;
  margin-bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
  
  &:active {
    opacity: 0.8;
  }
}

.map-thumbnail {
  height: 200px;
  width: 100%;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
}

.tour-info {
  padding: 12px 16px;
  
  .distance-duration {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  
  .tour-times {
    font-size: 14px;
    color: var(--ion-color-medium);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  
  ion-icon {
    color: var(--ion-color-medium);
    margin-bottom: 16px;
  }
  
  p {
    color: var(--ion-color-medium);
    margin: 0;
  }
}
```

---

## Debug-Tipps

### Tour nicht gespeichert?
1. Öffne Browser Console (Tab1)
2. Suche nach "Speichere Tour zu Supabase"
3. Checke ob `duration > 30` Sekunden ist

### Routen nicht in Tab2 sichtbar?
1. Öffne Browser Console (Tab2)
2. Suche nach "Lade alle Touren"
3. Checke ob Tours geladen sind
4. Prüfe `selectedYear` und `selectedMonth` stimmen

### Mini-Map nicht angezeigt?
1. Öffne DevTools Inspector
2. Prüfe ob `<div id="map-{tourId}">` im DOM ist
3. Checke ob Height > 0
4. Öffne Console Logs nach "initialized" oder Fehler

### Daten in Supabase prüfen
```sql
SELECT 
  id, created_at, distance, duration, avg_speed, 
  year, month, 
  jsonb_array_length(route_points) as point_count
FROM public.tours
ORDER BY created_at DESC
LIMIT 10;
```

---

## Best Practices

✅ **DO**
- Route nur speichern wenn User wirklich gefahren ist (>30 sec)
- Jahr und Monat mit 1-basierten Indizes verwenden (1-12)
- Mini-Maps nach Filter neu initialisieren
- Maps cleanen beim Destroy

❌ **DON'T**
- `new Date().getMonth()` direkt in Filterlogik verwenden (gibt 0-11)
- Mehrfach getAllTours() aufrufen (cachen in Komponente)
- Maps in *ngIf loops rendern (ID-Konflikte)
- Async Operationen ohne Error-Handling

---

## Env & Config

### Supabase Credentials
Müssen in `environment.ts` und `environment.prod.ts` sein:
```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key',
};
```

### Features am Startup
```typescript
// In app.component.ts
ngOnInit() {
  this.tourService.testConnection(); // Prüft Supabase
}
```

---

## Neue Tab2-Features Zusammenfassung

| Feature | Status |
|---------|--------|
| Tour speichern (Recording) | ✅ |
| Tour speichern (Navigation) | ✅ |
| Alle Touren laden | ✅ |
| Nach Jahr filtern | ✅ |
| Nach Monat filtern | ✅ |
| Mini-Map anzeigen | ✅ |
| Tour löschen | ✅ |
| Pull-to-refresh | ✅ |
| Dark Mode | ✅ |
| Jahr-Wechsel Detection | ✅ |
| Tour-Detailseite | ⏳ (optional) |
| Statistiken-Dashboard | ⏳ (optional) |

