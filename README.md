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
