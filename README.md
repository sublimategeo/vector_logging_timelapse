# Logging Timelapse (Vector, Annual Harvest)

A lightweight, embeddable web map show annual consolidated cutblocks a **cumulative timelapse** using **MapLibre GL JS** and a CARTO basemap. Designed for embedding in Esri StoryMaps via iframe.

---

## Data sources & credits

### Basemap
- Basemap tiles/style: **CARTO Positron**
- Basemap data: **© OpenStreetMap contributors**
- Style endpoint: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`

### Consolidated Cutblocks
- Data Provider: **Forest Analysis and Inventory Branch, Province of British Columbia**
- Source URL: `https://catalogue.data.gov.bc.ca/dataset/harvested-areas-of-bc-consolidated-cutblocks`

### Additional attribution
This project was developed with assistance from **OpenAI ChatGPT (GPT-5.2)** for code scaffolding and troubleshooting.

---

## Standards / interoperability notes

- Vector layer is stored as **GeoJSON** intended to comply with **RFC 7946**:
  - Coordinates in **WGS84 lon/lat (EPSG:4326)**
  - No `crs` member included in the GeoJSON
- Web basemap rendering uses **Web Mercator** (EPSG:3857) as typical for slippy-map tiles; MapLibre reprojects GeoJSON client-side.

> Note: This is a static web map app and does not publish an OGC service endpoint (e.g., WMS/WFS/OGC API Features). If you need an OGC API Features service, the GeoJSON can be served via a compliant backend.

---

## How it works

- `main.js` loads the GeoJSON layer
- Extracts unique years from `HARVEST_START_YEAR_CALENDAR`
- Applies a MapLibre filter:
  - **Cumulative mode:** `year <= currentYear`
- UI includes:
  - Play/Pause
  - Playback speed selector
  - Slider scrubbing (snaps to nearest available year)

---

## Repository structure

```text
.
├─ index.html
├─ style.css
├─ main.js
└─ data/
   └─ cutblock_year_timelapse.geojson
