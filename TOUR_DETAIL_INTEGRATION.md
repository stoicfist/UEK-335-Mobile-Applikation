// INTEGRATION EXAMPLE - Wie man Tour Detail Page mit Tab2 verbindet

// ================================================================================
// 1️⃣  In tab2.page.ts - Navigation hinzufügen
// ================================================================================

import { Router } from '@angular/router';

export class Tab2Page implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    private router: Router,
    // ... andere Injectables
  ) {}

  // Navigiere zu Tour Detail
  goToDetail(tourId?: string): void {
    if (tourId) {
      this.router.navigate(['/tabs/tab2/tour-detail', tourId]);
    }
  }

  // Optional: Delete und zurück zu Liste
  async onTourDeleted(): Promise<void> {
    // Wird aufgerufen wenn User eine Tour löscht
    // (falls du zwei-Wege Kommunikation willst)
  }
}

// ================================================================================
// 2️⃣  In tab2.page.html - Tour Card als Link machen
// ================================================================================

<ion-card 
  class="tour-card"
  (click)="goToDetail(tour.id)"
  button>
  
  <!-- Vorschau-Karte -->
  <div class="tour-preview-map" [id]="'map-' + tour.id"></div>
  
  <!-- Tour Info -->
  <ion-card-content>
    <h3>{{ tour.distance | number: '1.2-2' }} km</h3>
    <p>{{ getTourDurationMinutes(tour) }} min</p>
    <p>{{ getFormattedDate(tour.created_at) }}</p>
  </ion-card-content>
  
</ion-card>

// ================================================================================
// 3️⃣  Optionale: Mit ion-item swipe actions (für Vorschau)
// ================================================================================

<ion-item-sliding *ngFor="let tour of filteredTours">
  
  <!-- Hauptinhalt -->
  <ion-item (click)="goToDetail(tour.id)" button detail>
    <ion-label>
      <h2>{{ tour.distance | number: '1.2-2' }} km</h2>
      <p>{{ getTourDurationMinutes(tour) }} min</p>
    </ion-label>
  </ion-item>
  
  <!-- Swipe Actions -->
  <ion-item-options side="end">
    <ion-item-option color="danger" (click)="deleteTour(tour.id, $event)">
      <ion-icon name="trash"></ion-icon>
      Löschen
    </ion-item-option>
  </ion-item-options>
  
</ion-item-sliding>

// ================================================================================
// 4️⃣  Vollständiges Tour Card Beispiel
// ================================================================================

<ion-card 
  class="tour-card"
  (click)="goToDetail(tour.id)"
  button
  [attr.aria-label]="'Route vom ' + getFormattedDate(tour.created_at)">
  
  <!-- Map Preview -->
  <div class="map-preview" [id]="'map-preview-' + tour.id"></div>
  
  <!-- Stats Bar -->
  <div class="tour-stats">
    <div class="stat">
      <ion-icon name="navigate"></ion-icon>
      <span>{{ tour.distance | number: '1.1-1' }} km</span>
    </div>
    <div class="stat">
      <ion-icon name="timer"></ion-icon>
      <span>{{ getTourDurationMinutes(tour) }} min</span>
    </div>
    <div class="stat">
      <ion-icon name="speedometer"></ion-icon>
      <span>{{ tour.average_speed | number: '1.0-0' }} km/h</span>
    </div>
  </div>
  
  <!-- Tour Info -->
  <ion-card-content>
    <h3>{{ getFormattedDate(tour.created_at) }}</h3>
    <p class="tour-times">
      {{ getStartTime(tour) }} – {{ getEndTime(tour) }}
    </p>
  </ion-card-content>
  
</ion-card>

// ================================================================================
// 5️⃣  SCSS für Tour Card
// ================================================================================

.tour-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin: 12px;
  border-radius: 12px;
  overflow: hidden;

  &:active {
    transform: scale(0.98);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .map-preview {
    width: 100%;
    height: 120px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    position: relative;

    ion-spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }

  .tour-stats {
    display: flex;
    justify-content: space-around;
    padding: 12px 0;
    background: var(--ion-color-step-50);
    border-bottom: 1px solid var(--ion-color-step-150);

    :host-context(html.ion-palette-dark) & {
      background: var(--ion-color-step-700);
      border-bottom-color: var(--ion-color-step-600);
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      color: var(--ion-color-step-600);

      ion-icon {
        font-size: 16px;
        color: var(--ion-color-primary);
      }

      :host-context(html.ion-palette-dark) & {
        color: var(--ion-color-step-400);
      }
    }
  }

  ion-card-content {
    padding: 12px;

    h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
    }

    .tour-times {
      margin: 0;
      font-size: 12px;
      color: var(--ion-color-step-600);

      :host-context(html.ion-palette-dark) & {
        color: var(--ion-color-step-400);
      }
    }
  }
}

// ================================================================================
// 6️⃣  Im Browser debuggen
// ================================================================================

// Öffne Dev Console und teste die Navigation:

// Simuliere Click auf Tour:
// document.querySelector('[id="map-preview-tour-123"]').closest('ion-card').click()

// Oder direkte Navigation:
// this.router.navigate(['/tabs/tab2/tour-detail', 'tour-123'])

// ================================================================================
// 7️⃣  User Flow
// ================================================================================

/*
  USER FLOW:
  
  1. User ist in Tab2 (Routenliste)
     ↓
  2. User sieht Liste von Motorrad-Routen
     - Jede Route zeigt: Distanz, Dauer, Geschwindigkeit, Datum
     - Vorschau-Karte mit Route
     ↓
  3. User klickt auf eine Route (ion-card oder ion-item)
     ↓
  4. Navigation: /tabs/tab2/tour-detail/{tourId}
     ↓
  5. Tour Detail Page lädt:
     - Holt Tour-Daten von Supabase
     - Initialisiert Leaflet Karte
     - Zeigt Statistiken
     - Zeigt Routenpunkte-Tabelle
     ↓
  6. User kann:
     - Mit Karte interagieren (Zoom, Pan)
     - Route exportieren (JSON)
     - Route löschen (mit Bestätigung)
     - Zurück zu Tab2 gehen (Back Button)
     ↓
  7. Wenn gelöscht:
     - Tour wird aus Supabase entfernt
     - Navigation zurück zu Tab2
     - Liste wird aktualisiert
*/

// ================================================================================
// 8️⃣  Fehlerbehandlung
// ================================================================================

// Falls Tour nicht gefunden oder Fehler:

async navigateToTour(tourId?: string): Promise<void> {
  if (!tourId) {
    await this.showToast('Tour ID nicht gefunden', 'danger');
    return;
  }

  try {
    const tour = await this.tourService.getTourById(tourId);
    if (!tour) {
      await this.showToast('Route nicht gefunden', 'danger');
      return;
    }

    this.router.navigate(['/tabs/tab2/tour-detail', tourId]);
  } catch (error) {
    console.error('Navigation error:', error);
    await this.showToast('Fehler beim Laden der Route', 'danger');
  }
}

// ================================================================================
// 9️⃣  Performance Tipp: Mini-Maps cachen
// ================================================================================

private mapInstances: Map<string, L.Map> = new Map();

initializeMapForTour(tourId: string, tour: Tour): void {
  // Check if already initialized
  if (this.mapInstances.has(tourId)) {
    return;
  }

  const mapElement = document.getElementById(`map-preview-${tourId}`);
  if (!mapElement) return;

  const map = L.map(mapElement, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    touchZoom: false,
    doubleClickZoom: false,
    scrollWheelZoom: false,
  });

  // Vereinfachte Route
  const coordinates = tour.route_points
    .filter((_, i) => i % 5 === 0) // Every 5th point
    .map((p) => [p.lat, p.lng] as L.LatLngExpression);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  L.polyline(coordinates, { color: '#0066cc', weight: 2 }).addTo(map);

  const bounds = L.latLngBounds(coordinates as L.LatLngTuple[]);
  map.fitBounds(bounds, { padding: [20, 20] });

  this.mapInstances.set(tourId, map);
}

ngOnDestroy(): void {
  // Clean up all map instances
  this.mapInstances.forEach((map) => map.remove());
  this.mapInstances.clear();
}

// ================================================================================
// Fertig! 🎉 Die Tour Detail Page ist ready to use.
// ================================================================================
