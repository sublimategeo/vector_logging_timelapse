// ----- CONFIG -----
const GEOJSON_URL = "./data/cutblock_year_timelapse.geojson";
const YEAR_FIELD = "HARVEST_START_YEAR_CALENDAR";
const CUMULATIVE = true;
const AUTOPLAY_ON_LOAD = true;
const DEFAULT_SPEED_MS = 200; // 1× speed

// ---- URL parameters ----
const params = new URLSearchParams(window.location.search);

// Define hard defaults
const DEFAULT_START_YEAR = 1900;
const DEFAULT_END_YEAR   = 2023;

// Read from URL or fall back
let startYear = parseInt(params.get("startYear")) || DEFAULT_START_YEAR;
let endYear   = parseInt(params.get("endYear"))   || DEFAULT_END_YEAR;

// Safety check
if (startYear > endYear) {
  [startYear, endYear] = [endYear, startYear];
}

// Carto light bsaemap
const BASEMAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
// -------------------

//--------------------
// AOI & map setup
//--------------------

// --- Align with other maps
const swLon = -123.23407668799925;
const swLat = 49.53559929341239;
const neLon = -123.06988635889327;
const neLat = 49.61080514852734;

// --- 2 km buffer around the original box ---
const meanLat = (swLat + neLat) / 2;

const bufferLat = 2 / 111;
const bufferLon = 2 / (111.32 * Math.cos(meanLat * Math.PI / 180));

const maxBounds = new maplibregl.LngLatBounds(
    [swLon - bufferLon, swLat - bufferLat],
    [neLon + bufferLon, neLat + bufferLat]
);

const mapCenter = maxBounds.getCenter();

const map = new maplibregl.Map({
    container: "map",
    style: BASEMAP_STYLE,
    maxBounds: maxBounds,
    maxZoom: 12,
    center: [mapCenter.lng, mapCenter.lat],
    zoom: 10
});

map.scrollZoom.disable();
map.addControl(new maplibregl.NavigationControl(), "top-right");

const yearSlider = document.getElementById("yearSlider");
const yearLabel = document.getElementById("year-label");
const playBtn = document.getElementById("playBtn");
const speedSelect = document.getElementById("speedSelect");

function getNumberParam(name, fallback) {
    const value = new URLSearchParams(window.location.search).get(name);
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

let years = [];
let currentYear = null;
let playing = false;
let timer = null;
let START_YEAR_LIMIT = null;
let END_YEAR_LIMIT = null;

function setYear(y) {
    currentYear = Number(y);
    yearSlider.value = String(currentYear);
    yearLabel.textContent = String(currentYear);

    const filter = CUMULATIVE
        ? ["<=", ["to-number", ["get", YEAR_FIELD]], currentYear]
        : ["==", ["to-number", ["get", YEAR_FIELD]], currentYear];

    map.setFilter("logging-fill", filter);
    map.setFilter("logging-line", filter);
}

function stopPlayback() {
    playing = false;
    playBtn.textContent = "▶";
    if (timer) clearInterval(timer);
    timer = null;
}

function startPlayback() {
    if (years.length === 0) return;

    playing = true;
    playBtn.textContent = "⏸";

    const intervalMs = Number(speedSelect.value || DEFAULT_SPEED_MS);

    timer = setInterval(() => {
        const idx = years.indexOf(currentYear);
        const nextIdx = (idx < 0 || idx === years.length - 1) ? 0 : idx + 1;
        setYear(years[nextIdx]);
    }, intervalMs);
}

speedSelect.addEventListener("change", () => {
    if (!playing) return;
    stopPlayback();
    startPlayback();
});

playBtn.addEventListener("click", () => {
    if (playing) stopPlayback();
    else startPlayback();
});

yearSlider.addEventListener("input", (e) => {
    stopPlayback();

    const raw = Number(e.target.value);
    // find nearest year in years[]
    let nearest = years[0];
    let best = Math.abs(raw - nearest);

    for (const y of years) {
        const d = Math.abs(raw - y);
        if (d < best) { best = d; nearest = y; }
    }

    setYear(nearest);
});


async function loadGeojson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load GeoJSON: ${res.status}`);
    return res.json();
}

map.on("load", async () => {
    const gj = await loadGeojson(GEOJSON_URL);

    const yearSet = new Set();
    for (const f of (gj.features || [])) {
        const y = Number(f?.properties?.[YEAR_FIELD]);
        if (!Number.isNaN(y)) yearSet.add(y);
    }

    years = Array.from(yearSet).sort((a, b) => a - b);

    if (years.length === 0) {
        yearLabel.textContent = "No years";
        return;
    }

    // Apply optional year limits from URL
    START_YEAR_LIMIT = getNumberParam("startYear", years[0]);
    END_YEAR_LIMIT = getNumberParam("endYear", years[years.length - 1]);

    if (START_YEAR_LIMIT > END_YEAR_LIMIT) {
        [START_YEAR_LIMIT, END_YEAR_LIMIT] = [END_YEAR_LIMIT, START_YEAR_LIMIT];
    }

    START_YEAR_LIMIT = Math.max(START_YEAR_LIMIT, years[0]);
    END_YEAR_LIMIT = Math.min(END_YEAR_LIMIT, years[years.length - 1]);

    years = years.filter(y => y >= START_YEAR_LIMIT && y <= END_YEAR_LIMIT);

    console.log("Range params:", { START_YEAR_LIMIT, END_YEAR_LIMIT, search: window.location.search });
    console.log("Years after filter:", years[0], years[years.length - 1], "count:", years.length);

    if (years.length === 0) {
        yearLabel.textContent = "No years in range";
        return;
    }

    yearSlider.min = String(years[0]);
    yearSlider.max = String(years[years.length - 1]);
    yearSlider.step = "1";
    yearSlider.value = String(years[0]); // start at earliest in range

    map.addSource("logging", { type: "geojson", data: gj });

    map.addLayer({
        id: "logging-fill",
        type: "fill",
        source: "logging",
        paint: { "fill-color": "#670000", "fill-opacity": 0.55, "fill-outline-color": "#670000" }
    });

    map.addLayer({
        id: "logging-line",
        type: "line",
        source: "logging",
        paint: { "line-color": "#670000", "line-width": 1 }
    });

    map.setPaintProperty("logging-fill", "fill-opacity-transition", { duration: 250, delay: 0 });

    setYear(years[0]);

    if (AUTOPLAY_ON_LOAD) startPlayback();
});
