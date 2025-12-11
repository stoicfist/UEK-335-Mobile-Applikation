## Offline-Tracking & Synchronisation

Die App unterstützt Offline‑Aufnahme von Touren. Verhalten im Kurzüberblick:
- Wenn das Gerät offline ist, werden abgeschlossene Touren lokal (LocalStorage) unter dem Key `pendingTours` zwischengespeichert.
- Sobald die App wieder online ist, versucht die App automatisch alle `pendingTours` zu Supabase zu synchronisieren.
- Nach erfolgreichem Upload werden die lokal gespeicherten Einträge gelöscht.

So testest du das Feature lokal:

1. Starte den Dev-Server mit Proxy: `npm run start:proxy` und öffne http://localhost:4200
2. Öffne DevTools → Network → wähle `Offline`.
3. Starte und beende eine Aufnahme in der App (Recording). Die Tour wird lokal gespeichert.
4. Prüfe `Application` → `Local Storage` → `pendingTours` in DevTools.
5. Setze Network wieder auf `Online`. Die App zeigt einen Toast mit dem Ergebnis der Synchronisation und entfernt erfolgreich hochgeladene Einträge aus `pendingTours`.

Hinweis: Für sehr große oder viele Tracks ist IndexedDB robuster als LocalStorage; aktuell verwenden wir LocalStorage für Einfachheit. Wenn du größere Datenmengen erwartest, kann ich das auf IndexedDB (z.B. mit `idb`) umstellen.
# MotoTrack – Motorrad Routen-Tracker  
Mobile Hybrid-App (Ionic / Angular / Capacitor)

## 📌 Übersicht
MotoTrack ist eine einfache Mobile Hybrid-App, mit der Motorradtouren per GPS aufgezeichnet und visualisiert werden können.  
Die Anwendung zeigt die aktuelle Position, Fahrtrichtung, die aufgezeichnete Route sowie grundlegende Statistiken wie Distanz und Dauer an.  
Daten können gespeichert, exportiert und gelöscht werden.

Die App läuft als **PWA** sowie als **Android-App**.

---

## 🚀 Technologien
- **Ionic Framework** (UI & App-Struktur)
- **Angular** (Frontend-Framework)
- **Capacitor Plugins**
  - Geolocation
  - Device Motion / Kompass
  - Storage (offline)
- **Supabase** (Datenbank & CRUD-Operationen)
- **Leaflet** oder **Google Maps** (Kartenanzeige, je nach Umsetzung)

---

## 📱 Funktionen
### Navigation / Karte
- Anzeige der aktuellen GPS-Position  
- Richtungspfeil / Kompass  
- Start-Button für Aufzeichnung  

### Live-Tracking
- Aufzeichnung der Route als GPS-Polyline  
- Distanzberechnung in Echtzeit  
- Stop-Button  

### Routen-Statistik
- Distanz (km)  
- Dauer (min)  
- Durchschnittsgeschwindigkeit  
- Speichern in Supabase  
- Export als JSON-Datei  

### Einstellungen
- Manueller Dark Mode  
- App-Informationen  
- Löschen aller gespeicherten Daten  

---

## 🗂 Projektstruktur (Kurzüberblick)

```
.
├── src
│   ├── app
│   │   ├── navigation
│   │   ├── tracking
│   │   ├── stats
│   │   └── settings
│   ├── assets
│   └── theme
├── capacitor.config.ts
├── package.json
└── README.md
```

---
## Entwicklung: OSRM / CORS Hinweis

Beim Entwickeln im Browser kann die OSRM-API CORS-Header vermissen, wodurch Route-Anfragen vom Browser blockiert werden (Fehler "Access-Control-Allow-Origin missing").

Lösung (lokal): nutze einen Dev-Proxy. Ich habe eine `proxy.conf.json` im Projekt hinzugefügt. So startest du den Dev-Server mit Proxy:

```bash
# Angular dev server mit Proxy
npm run start:proxy

# Oder mit Ionic CLI (weiter Arguments werden an ng weitergereicht)
npm run ionic:serve:proxy
```

Der Proxy forwarded `/osrm/*` an `https://router.project-osrm.org/*` und beseitigt das CORS-Problem für lokale Entwicklung. In der App wird automatisch `/osrm/...` verwendet, wenn die Seite auf `localhost` läuft.

## 🗄 Supabase Datenmodell

### Tabelle: `tours`
| Feld            | Typ     | Beschreibung |
|-----------------|----------|--------------|
| `id`            | UUID     | Primärschlüssel |
| `created_at`    | Timestamp | Zeitpunkt der Speicherung |
| `duration`      | Integer  | Dauer der Tour in Sekunden |
| `distance`      | Float    | Distanz in Kilometern |
| `average_speed` | Float    | Durchschnittsgeschwindigkeit |
| `route_points`  | JSON     | Liste aller GPS-Punkte |

Beispiel:
```json
[
  { "lat": 47.12345, "lng": 8.12345, "timestamp": 1681234567890 }
]
