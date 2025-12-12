# MotoTrack Loading Screen Implementation

## 🎯 Übersicht

Die Loading-Screen-Implementierung bietet einen professionellen App-Start mit:
- **Nativer Splashscreen** (Motorrad-Illustration)
- **Custom Loading Screen** mit animiertem Ladebalken
- **Service-Initialisierung** (Network, Location)
- **Dark Mode Support** (Automatische Anpassung)

---

## 📁 Neue Dateien

### 1. **Loading Service**
- **Datei:** `src/app/services/loading.service.ts`
- **Funktion:** 
  - Verwaltet den Loading-Fortschritt (0-100%)
  - Versteckt den nativen Splashscreen
  - Initialisiert Services parallel
  - Simuliert sanften Fortschritt
  - Navigiert automatisch zu Tab 1 bei 100%

### 2. **Loading Page**
- **Datei:** `src/app/loading/loading.page.ts`
- **Datei:** `src/app/loading/loading.page.html`
- **Datei:** `src/app/loading/loading.page.scss`
- **Funktion:**
  - Zeigt das MotoTrack-Logo zentriert
  - Animierter Progress-Balken
  - "MotoTrack wird geladen…" Text
  - Bouncing Dots Animation
  - Dark Mode kompatibel

### 3. **MotoTrack Logo**
- **Datei:** `src/assets/images/mototrack-logo.svg`
- **Format:** SVG (skalierbar, gestochen scharf)
- **Design:** Motorrad + Karte/Marker Kombination

---

## 🔧 Modifizierte Dateien

### 1. **App Routes**
- **Datei:** `src/app/app.routes.ts`
- **Änderung:** Loading-Route hinzugefügt (vor Tabs-Route)
- **Effekt:** Loading wird bei App-Start immer angezeigt

### 2. **App Component**
- **Datei:** `src/app/app.component.ts`
- **Änderung:** Router Navigation zu `/loading` in `ngOnInit()`
- **Zusätzliche Imports:** Router, SplashScreen

---

## 🚀 Ablauf beim App-Start

```
1. App startet → App Component wird geladen
2. ngOnInit() → Router navigiert zu /loading
3. Loading Page wird angezeigt
4. Nativer Splashscreen wird nach 500ms ausgeblendet
5. Progress läuft von 0% → 100%:
   - 0%  → Start
   - 20% → Network Service ready
   - 40% → Location Service ready
   - 60% → Datenbank Check
   - 80% → App-Komponenten ready
   - 95-100% → Sanfter Finish
6. Bei 100% → Navigation zu /tabs/tab1 (Map)
```

**Gesamtdauer:** Ca. 2-3 Sekunden (konfigurierbar)

---

## 🎨 Design-Features

### Progress Bar
- **Farbe:** Orange (#ff9500) mit Gradient
- **Dark Mode:** Heller Orange (#ffb84d-#ffc266)
- **Animation:** Subtile Pulse-Animation

### Text
- **Light Mode:** Schwarz
- **Dark Mode:** Neon Grün (#66ff00) - konsistent mit App-Design

### Dots Animation
- 3 bouncing Dots
- **Light Mode:** Orange
- **Dark Mode:** Neon Grün
- **Verzögerung:** 200ms zwischen jedem Dot

### Übergänge
- Fade-In Animationen (oben nach unten)
- 200ms Verzögerung zwischen Elementen
- Keine abrupten Wechsel

---

## 🌙 Dark Mode Unterstützung

Das Loading Screen reagiert automatisch auf die globale Dark Mode Einstellung:

```css
html.ion-palette-dark {
  /* App wechselt in Dark Mode */
}
```

**Automatische Anpassungen:**
- Hintergund: Schwarz
- Text: Neon Grün (#66ff00)
- Progress Bar: Heller Orange
- Glow-Effekt: Orange Shadow
- Dots: Neon Grün

---

## ⚙️ Konfigurierbare Parameter

### Loading Service

```typescript
// Verzögerung vor Splashscreen-Hide
await this.hideSplashScreen(); // 500ms fadeOut

// Service Initialisierung (mit Delays)
20% - Network Service ready
40% - Location Service ready
60% - Database Check
80% - App-Komponenten ready

// Progress Simulation
Min Delay: 200ms
Max Delay: 600ms
```

### Loading Page

```scss
// Größen
Logo: 150px x 150px (responsive auf 120px bei mobil)
Progress Bar Höhe: 6px
Text Größe: 1.5rem

// Animationsdauer
Logo: 0.6s
Text: 0.6s (verzögert 0.2s)
Progress Bar: 0.6s (verzögert 0.4s)
Dots: 0.6s (verzögert 0.6s)
```

---

## 📱 Responsive Design

| Breakpoint | Änderungen |
|-----------|-----------|
| Mobile (<480px) | Logo: 120px, Padding: 1.5rem, Gap: 1.5rem |
| Tablet+ (≥480px) | Logo: 150px, Padding: 2rem, Gap: 2rem |

---

## 🔌 Abhängigkeiten

- `@capacitor/splash-screen@7` - Nativer Splashscreen (neu installiert)
- `@angular/router` - Navigation
- `rxjs` - Observable für Progress
- Ionic Angular Standalone Components

---

## 🛠️ Verwendung / Anpassungen

### Loading-Dauer ändern

**In `loading.service.ts`:**
```typescript
// Simuliere Progress-Anstieg schneller/langsamer
private async simulateProgressIncrement(): Promise<void> {
  const delay = Math.random() * 400 + 200; // ← Hier anpassen
  // Kleinere Werte = schneller
}
```

### Progress-Schritte ändern

**In `loading.service.ts`:**
```typescript
private async initializeWithProgress(): Promise<void> {
  // Ändere diese Werte für andere Checkpoints
  this.progressSubject.next(20); // ← Neuer Wert
  this.progressSubject.next(40);
  // usw.
}
```

### Logo ändern

**In `loading.page.html`:**
```html
<img src="assets/images/mototrack-logo.svg" alt="MotoTrack Logo" />
<!-- Einfach durch anderes SVG/PNG ersetzen -->
```

### Farben im Dark Mode

**In `loading.page.scss`:**
```scss
html.ion-palette-dark & {
  color: #66ff00; // ← Hauptfarbe für Dark Mode
}
```

---

## ✅ Testing

### Light Mode
- [ ] Logo wird angezeigt
- [ ] Text ist schwarz
- [ ] Progress Bar ist orange
- [ ] Dots sind orange
- [ ] Hintergrund ist hell

### Dark Mode
- [ ] Logo wird angezeigt
- [ ] Text ist neon grün
- [ ] Progress Bar ist heller orange
- [ ] Dots sind neon grün
- [ ] Hintergrund ist schwarz
- [ ] Glow-Effekt sichtbar

### Funktionalität
- [ ] Loading startet automatisch
- [ ] Progress läuft von 0% → 100%
- [ ] Navigation zu Tab 1 erfolgt bei 100%
- [ ] Kein Flackern beim Wechsel
- [ ] Responsive auf mobilen Geräten

---

## 🎯 Best Practices

✅ **Implementiert:**
- Sanfte Übergänge ohne Flackern
- Dark Mode vollständig unterstützt
- Responsive Design
- Services initialisieren sich parallel
- Splashscreen wird sauber versteckt
- Progress wird visuell deutlich

---

## 📝 Notizen

- Der Loading Screen wird IMMER beim App-Start angezeigt (auch bei Reload)
- Die Navigation erfolgt automatisch nach dem Loading
- Alle Animationen sind GPU-beschleunigt (transform/opacity)
- Keine synchronen Blockierungen
- Fehlerbehandlung fallback (navigiert trotzdem weiter)

---

**Gültig für:** MotoTrack v1.0 mit Ionic 8 + Capacitor 7.4.4
