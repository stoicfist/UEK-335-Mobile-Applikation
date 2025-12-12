# Tab 2 "Meine Routen" - Vollständige Implementierung

## Übersicht
Diese Dokumentation beschreibt die komplette Implementierung von Tab 2 "Meine Routen" mit folgenden Funktionen:
- Speichern von abgeschlossenen Routen (Recording & Navigation)
- Anzeigen aller Routen mit Jahr/Monat Filter
- Mini-Karten-Thumbnails für jede Route
- Löschen von Routen

---

## 1. TOUR SPEICHERN (Backend)

### A) Recording Mode
Wenn der Benutzer eine Recording-Session stoppt:
1. `stopRecording()` wird aufgerufen
2. Es wird geprüft ob mindestens 1+ Punkt aufgezeichnet wurde UND die Aufnahme > 30 Sekunden dauerte
3. Wenn ja: `saveCompletedTour()` wird mit folgenden Daten aufgerufen:
   - `distance` (km)
   - `duration` (Sekunden)
   - `recordedTrack` (Array von {lat, lng})
   - `recordingStartTime` (Zeitstempel)

### B) Navigation Mode
Wenn der Benutzer eine Navigation stoppt:
1. `stopNavigation()` wird aufgerufen
2. Es wird geprüft ob mindestens 1+ Punkt aufgezeichnet wurde (Pac-Man Effekt)
3. Wenn ja: `saveCompletedTour()` wird aufgerufen mit den gesammelten Daten

### saveCompletedTour() Implementation
Die Funktion in `tab1.page.ts`:

```typescript
private async saveCompletedTour(durationSecs: number): Promise<void> {
  if (this.recordedTrack.length < 2) return;
  
  const distanceKm = this.totalDistanceMeters / 1000;
  const avgSpeedKmh = durationSecs > 0 ? (distanceKm / (durationSecs / 3600)) : 0;
  
  const result = await this.tourService.saveCompletedTour(
    distanceKm,
    durationSecs,
    this.recordedTrack,
    this.recordingStartTime || Date.now()
  );
}
```

---

## 2. SUPABASE DATENSTRUKTUR

### Tabelle: `tours`

| Spalte | Typ | Bemerkung |
|--------|-----|----------|
| `id` | UUID | Primary Key (auto) |
| `created_at` | TIMESTAMP | Default: now() |
| `distance` | NUMERIC | In Kilometern |
| `duration` | INTEGER | In Sekunden |
| `avg_speed` | NUMERIC | In km/h |
| `route_points` | JSONB | Array von {lat, lng, timestamp} |
| `year` | INTEGER | Extracted aus created_at |
| `month` | INTEGER | Extracted aus created_at (1-12) |

### SQL Create Table:
```sql
create table public.tours (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp default now(),
  distance numeric not null,
  duration integer not null,
  avg_speed numeric not null,
  route_points jsonb not null,
  year integer generated always as (extract(year from created_at)) stored,
  month integer generated always as (extract(month from created_at)) stored
);
```

### Wichtig: Jahr und Monat
- `month` ist 1-12 (nicht 0-11 wie in JavaScript!)
- Dies wird in `tour.service.ts` mit `new Date().getMonth() + 1` konvertiert

---

## 3. TOUR SERVICE FUNKTIONEN

### `saveCompletedTour()`
Speichert eine fertiggestellte Tour mit allen Daten:

```typescript
async saveCompletedTour(
  distance: number,        // km
  duration: number,        // Sekunden
  recordedTrack: Array,    // {lat, lng}[]
  recordingStartTime: number
): Promise<Tour | null>
```

### `getAllTours()`
Lädt alle Touren aus der Datenbank (gecacht lokal in Tab2):
```typescript
async getAllTours(): Promise<Tour[]>
```

### `getToursByYearAndMonth()`
Lädt Touren für ein spezifisches Jahr und Monat:
```typescript
async getToursByYearAndMonth(year: number, month: number): Promise<Tour[]>
```

### `deleteTour()`
Löscht eine Tour:
```typescript
async deleteTour(id: string): Promise<boolean>
```

---

## 4. TAB 2 FRONTEND FEATURES

### Filter-System
- **Jahr-Auswahl**: 5 Buttons für aktuelle Jahr + 4 vorherige Jahre
- **Monat-Auswahl**: 12 Buttons (JAN - DEZ) horizontal scrollbar
- **Standard**: Aktuelles Jahr + Aktueller Monat beim ersten Laden

### Daten-Architektur
```typescript
tours: Tour[] = [];           // Alle Touren
filteredTours: Tour[] = [];   // Nach Jahr/Monat gefiltert
selectedYear: number;         // 2025, 2024, ...
selectedMonth: number;        // 1-12
```

### Filterlogik
```typescript
filterToursByYearAndMonth(): void {
  this.filteredTours = this.tours.filter((tour) => {
    const year = tour.year || new Date(tour.created_at).getFullYear();
    const month = tour.month || new Date(tour.created_at).getMonth() + 1;
    return year === this.selectedYear && month === this.selectedMonth;
  });
}
```

---

## 5. TOUR-KARTE LAYOUT

Jede Route wird als Karte angezeigt mit:

```
┌────────────────────────────┐
│  [Mini-Map mit Polyline]   │
│  (Rot, Start grün/End rot) │
├────────────────────────────┤
│ 2.2 km     5 min           │
│ ⏱ 54 km/h (Durchschnitt)   │
│ 09:48 – 09:52              │
│ 2024-12-11                 │
└────────────────────────────┘
[Swipe right zum Löschen]
```

### Mini-Map Implementation
- **Leaflet** mit OSM/Dark-Mode Tiles
- **Polyline** (rot, weight 3)
- **Circle Markers**: Start (grün), Ende (rot)
- **Fit Bounds** mit 20px Padding
- **Interaktionen deaktiviert** (drag, zoom, tap, etc.)

---

## 6. HILFSFUNKTIONEN

### Formatierung
```typescript
formatDistance(distance: number): string
formatSpeed(speed: number): string
formatDuration(durationSeconds: number): number
```

### Zeit & Datum
```typescript
getStartTime(tour: Tour): string         // HH:MM
getEndTime(tour: Tour): string           // HH:MM
getFormattedDate(createdAt: string): string  // YYYY-MM-DD
```

### Navigation
```typescript
goToDetail(tourId: string): void         // Zur Detailseite
deleteTour(tourId: string): Promise<void> // Mit Confirmation Dialog
```

---

## 7. PERFORMANCE & UX

### Caching
- Touren werden einmal beim OnInit geladen
- Keine wiederholten Supabase-Queries
- Lokaler Filter mit `filterToursByYearAndMonth()`

### Mini-Maps
- Lazy-initialized nach Render
- Nur für sichtbare (gefilterte) Touren erstellt
- Cleanup beim `OnDestroy`

### Dark Mode Support
- TileLayer wechselt zwischen OSM und CartoDB Dark

### Pull-to-Refresh
- Funktion `onRefresh()` lädt Touren neu

---

## 8. EDGE CASES

### Zu kurze Aufnahmen
- **Problem**: User startet Recording/Navigation, stoppt sofort wieder
- **Lösung**: Speichern nur wenn `duration > 30` Sekunden
- **Message**: "Zu kurze oder leere Recording-Route. Nicht gespeichert."

### Keine Daten für Monat
- **Anzeige**: "Keine Routen vorhanden" mit Map-Icon

### Jahr wechsel um Mitternacht
- **Intervall**: Prüft alle 30 Min. ob Jahr gewechselt hat
- **Auto-Update**: Stellt `availableYears` neu zusammen

### Fehler beim Speichern
- **Fallback**: Console.error geloggt, User-Notification optional
- **Keine Blockade**: App läuft weiter, Route nicht gespeichert

---

## 9. TESTING CHECKLIST

- [ ] Recording starten → 30+ Sekunden fahren → Stoppen → Route in Tab2 sichtbar?
- [ ] Navigation starten → Pac-Man Effekt sehen → Stoppen → Route gespeichert?
- [ ] Jahr-Filter wechseln → Routen für das Jahr angezeigt?
- [ ] Monat-Filter wechseln → Routen für den Monat angezeigt?
- [ ] Tour anklicken → Navigiert zur Detailseite?
- [ ] Swipe-Delete → Confirmation Dialog? → Route gelöscht?
- [ ] Pull-to-Refresh → Neue Routen geladen?
- [ ] Dark Mode toggle → Mini-Maps wechseln zu Dark Tiles?
- [ ] Zu kurze Route (<30sec) → Nicht gespeichert?

---

## 10. ZUKÜNFTIGE ERWEITERUNGEN

- [ ] Tour-Detailseite mit vollständiger Karte + Stats
- [ ] Export zu GPX/GeoJSON
- [ ] Vergleich mehrerer Routen
- [ ] Kalender-View statt Buttons
- [ ] Statistiken (Total km, Total Zeit, Avg Speed)
- [ ] Favoriten markieren

