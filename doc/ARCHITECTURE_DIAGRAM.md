# Architecture Diagram: Tab 2 "Meine Routen"

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TAB 1: Aufnahme/Navigation          TAB 2: Meine Routen       │
│  ┌──────────────────────┐           ┌────────────────────┐     │
│  │  Recording Mode      │           │ Jahr Filter (5)    │     │
│  │  [START] ▶ [STOP]    │           │ [2024] [2023] ...  │     │
│  │                      │           │                    │     │
│  │  Navigation Mode     │           │ Monat Filter (12)  │     │
│  │  [NAVIGATE] ▶ [STOP] │           │ [JAN] [FEB] ... [DEC]    │
│  │                      │           │                    │     │
│  │  recordedTrack[]     │           │ Tour-Karten:       │     │
│  │  - wächst mit GPS    │           │ ┌──────────────┐   │     │
│  │  - rot & blau        │           │ │  [Mini-Map]  │   │     │
│  └──────────────────────┘           │ │ 2.2 km, 5min │   │     │
│           │                         │ │ 54 km/h      │   │     │
│           │ (Bei STOP)              │ └──────────────┘   │     │
│           ▼                         └────────────────────┘     │
│  saveCompletedTour()                       ▲                   │
│                                            │                   │
│                                    (Zeige gefilterte Tours)    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ (Daten speichern)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TOUR SERVICE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  saveCompletedTour(distance, duration, track, timestamp)       │
│    ├─ Berechne avg_speed                                       │
│    ├─ Konvertiere Track zu RoutePoints mit Timestamps          │
│    ├─ Setze year + month                                       │
│    └─ INSERT in Supabase                                       │
│                                                                 │
│  getAllTours()                                                  │
│    ├─ SELECT * FROM tours ORDER BY created_at DESC            │
│    └─ Fallback: year/month von created_at                      │
│                                                                 │
│  getToursByYearAndMonth(year, month)                           │
│    └─ SELECT * WHERE year = ? AND month = ?                    │
│                                                                 │
│  deleteTour(id)                                                 │
│    └─ DELETE WHERE id = ?                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ (Supabase Client)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SUPABASE DATABASE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TABLE: tours                                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ id (UUID)          [Primary Key]                         │ │
│  │ created_at         [TIMESTAMP DEFAULT now()]             │ │
│  │ distance (km)      [NUMERIC]                             │ │
│  │ duration (sec)     [INTEGER]                             │ │
│  │ avg_speed (km/h)   [NUMERIC]                             │ │
│  │ route_points []    [JSONB] {lat, lng, timestamp}         │ │
│  │ year (2024)        [INT, GENERATED from created_at]      │ │
│  │ month (1-12)       [INT, GENERATED from created_at]      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Indices:                                                       │
│  - created_at (for sorting)                                     │
│  - (year, month) (for filtering)                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

```
APP
├── TAB1 (Navigation & Recording)
│   └── MapService
│       ├── Leaflet Map Instance
│       ├── L.Polyline (Blue: remainingRoute)
│       ├── L.Polyline (Red: recordingTrack)
│       └── L.Circle (Current Position)
│
├── TAB2 (Route History) ⭐ NEW
│   ├── TourService
│   │   └── Supabase Client
│   │
│   ├── FilterLogic
│   │   ├── selectedYear: number
│   │   ├── selectedMonth: number
│   │   └── filteredTours: Tour[]
│   │
│   └── Mini-Maps (Leaflet)
│       ├── mapInstances: Map<string, L.Map>
│       └── Per Tour: L.Polyline + L.CircleMarkers
│
└── Services
    ├── LocationService (GPS)
    ├── RoutingService (OSRM)
    ├── GeocodingService (Nominatim)
    ├── MapService (Leaflet)
    └── TourService (Supabase) ⭐ EXTENDED
```

---

## State Management Flow

```
TAB1: Recording/Navigation State
────────────────────────────────

isRecording: boolean
recordingStartTime: number (ms)
recordedTrack: LatLng[]
recordingPolyline: L.Polyline

isNavigating: boolean
fullRoute: LatLng[]
remainingRoute: LatLng[]
remainingRoutePolyline: L.Polyline

        │ (User stoppt)
        ▼
saveCompletedTour()
  ├─ Sammle Daten:
  │  ├─ distance (berechnet aus totalDistanceMeters)
  │  ├─ duration (berechnet aus recordingStartTime)
  │  ├─ recordedTrack (array)
  │  └─ recordingStartTime
  │
  └─ Rufe auf: tourService.saveCompletedTour()
       │
       └─ INSERT in Supabase.tours
            │
            └─ Tour gespeichert ✓


TAB2: Filter & Display State
─────────────────────────────

tours: Tour[]                  [Alle Touren von Supabase]
filteredTours: Tour[]          [Nach Jahr/Monat gefiltert]
selectedYear: 2024             [5 Jahre verfügbar]
selectedMonth: 12              [1-12]
availableYears: number[]       [Auto-calculated]

        │ (User wählt Jahr/Monat)
        ▼
filterToursByYearAndMonth()
  ├─ filteredTours = tours.filter(t =>
  │    t.year === selectedYear &&
  │    t.month === selectedMonth
  │  )
  │
  └─ initializeMiniMaps()
       ├─ Für jede Tour:
       │  ├─ Erstelle Leaflet Map
       │  ├─ Zeichne Polyline
       │  └─ Speichere Map-Instanz
       │
       └─ Zeige UI an ✓
```

---

## Mini-Map Lifecycle

```
Tour in filteredTours
        │
        ▼
<div id="map-{tourId}" class="map-container">

        │
        │ initializeMiniMaps()
        ▼
Check: map bereits initialisiert?
        │
        ├─ JA: Skip
        │
        └─ NEIN:
            │
            ├─ L.map(mapId, options)
            │
            ├─ L.tileLayer().addTo(map)
            │    (OSM oder CartoDB Dark je nach isDarkMode)
            │
            ├─ tour.route_points.forEach():
            │  ├─ L.polyline() - rote Route
            │  ├─ L.circleMarker() - grüner Start
            │  └─ L.circleMarker() - roter Ende
            │
            ├─ map.fitBounds(bounds)
            │
            └─ mapInstances.set(mapId, map)
                    │
                    └─ Speichern für Cleanup

        │ (onDestroy)
        ▼
mapInstances.forEach(map => map.remove())
        │
        └─ Cleanup ✓
```

---

## Timestamp Format

```
User nimmt Route auf: 11. Dez 2024, 09:48:00 UTC

recordingStartTime = 1702300080000 (ms seit 1970)

route_points[0]:
{
  lat: 47.123456,
  lng: 8.456789,
  timestamp: 1702300080000  // Exact moment in route
}

Supabase INSERT:
{
  created_at: 2024-12-11 09:48:00+00:00  // Auto-set
  year: 2024  // EXTRACT(YEAR FROM created_at)
  month: 12   // EXTRACT(MONTH FROM created_at)
  route_points: [
    {lat, lng, timestamp},
    {lat, lng, timestamp},
    ...
  ]
}
```

---

## Error Handling Flow

```
saveCompletedTour(duration)
        │
        ├─ recordedTrack.length < 2?
        │  └─ RETURN (not enough points)
        │
        ├─ duration < 30 seconds?
        │  └─ RETURN (too short)
        │
        ├─ tourService.saveCompletedTour() call
        │  │
        │  ├─ SUCCESS: result !== null
        │  │  └─ console.log('Tour erfolgreich gespeichert')
        │  │
        │  └─ ERROR: result === null
        │     └─ console.error('Fehler beim Speichern')
        │        (User nicht blockiert, Route einfach nicht gespeichert)
        │
        └─ Catch block
           └─ console.error('Fehler beim Speichern zu Supabase')
              (Network/Supabase Issues)
```

---

## Performance Optimization Points

```
✅ CACHING
───────────
tours: Tour[] = []
  - Loaded ONCE in ngOnInit
  - Reused für alle Filter-Operationen
  - Keine Supabase-Query bei Filter-Wechsel

✅ LAZY INITIALIZATION
───────────────────────
initializeMiniMaps()
  - Nur für sichtbare (gefilterte) Tours
  - Erst nach DOM-Render (ngAfterViewInit)
  - Skip wenn Map bereits exists

✅ CLEANUP
───────────
ngOnDestroy()
  - mapInstances.clear()
  - Alle Leaflet Maps entfernt
  - Subscriptions unsubscribe

✅ FILTERING
───────────────
filter() operation ist O(n)
  - Lokal im Browser (nicht in DB)
  - Supabase wird NICHT query'd
  - Instant response für User
```

---

## Database Indexing Strategy

```sql
-- Primary Key
CREATE UNIQUE INDEX tours_pkey ON public.tours(id);

-- Created At Index (für sorting)
CREATE INDEX tours_created_at_idx ON public.tours(created_at DESC);

-- Compound Index für Filtering
CREATE INDEX tours_year_month_idx ON public.tours(year, month);

-- Analyse für Query Planner
ANALYZE public.tours;
```

**Query Plans:**
```sql
-- getAllTours() - nutzt created_at_idx
SELECT * FROM tours ORDER BY created_at DESC;
└─ Seq Scan on tours (cost=0.00..100.00 rows=1000)
   Sort (cost=100.00..150.00 rows=1000)

-- getToursByYearAndMonth() - nutzt year_month_idx
SELECT * FROM tours WHERE year=2024 AND month=12;
└─ Index Scan using tours_year_month_idx
   (cost=0.00..50.00 rows=50)
```

---

## Integration Points

```
External Services
─────────────────

LocationService
  │
  └─ Capacitor Geolocation
     └─ watchPosition() → GPS Updates → onGpsUpdate()

RoutingService
  │
  └─ OSRM API
     └─ getRoute() → fullRoute -> Pac-Man effect

TourService
  │
  ├─ Supabase
  │  └─ INSERT/SELECT/DELETE tours
  │
  └─ Browser Storage (optional)
     └─ localStorage für offline Fallback

MapService
  │
  ├─ Leaflet
  │  ├─ L.Map (Main map in Tab1)
  │  └─ L.Map (Mini-maps in Tab2)
  │
  └─ Tile Providers
     ├─ OpenStreetMap (Light mode)
     └─ CartoDB Dark (Dark mode)
```

