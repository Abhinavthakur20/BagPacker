import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Fix default Leaflet marker icons broken by bundlers ────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom SVG pin icons for source (lime-green) and destination (amber)
const makePin = (color) =>
  L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
      <path fill="${color}" stroke="#fff" stroke-width="2"
        d="M14 0C6.27 0 0 6.27 0 14c0 9.45 14 24 14 24s14-14.55 14-24C28 6.27 21.73 0 14 0z"/>
      <circle fill="#fff" cx="14" cy="14" r="5"/>
    </svg>`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -40],
  });

const SOURCE_ICON = makePin("#4ade80");       // lime-green
const DESTINATION_ICON = makePin("#f59e0b");   // amber

// ─── Auto-fit map bounds to show both markers ────────────────────────────────
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(L.latLngBounds(positions), { padding: [36, 36] });
    }
  }, [map, positions]);
  return null;
}

// ─── Fetch OSRM route geometry ───────────────────────────────────────────────
async function fetchOSRMRoute(srcLat, srcLon, dstLat, dstLon) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/${srcLon},${srcLat};${dstLon},${dstLat}` +
    `?overview=full&geometries=geojson&steps=false`;

  const res = await fetch(url, {
    headers: { "User-Agent": "BagPacker/1.0 (thakurabhinav16160@gmail.com)" },
  });
  const data = await res.json();
  if (data?.code !== "Ok" || !data.routes?.[0]) return null;

  // GeoJSON coordinates are [lon, lat]; Leaflet wants [lat, lon]
  return data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
}

// ─── Main component ───────────────────────────────────────────────────────────
/**
 * RouteMap
 * @param {number} srcLat   Source latitude
 * @param {number} srcLon   Source longitude
 * @param {number} dstLat   Destination latitude
 * @param {number} dstLon   Destination longitude
 * @param {string} srcLabel Source city name (for popup)
 * @param {string} dstLabel Destination city name (for popup)
 * @param {string} [height] CSS height of the map container (default "240px")
 */
export default function RouteMap({
  srcLat,
  srcLon,
  dstLat,
  dstLon,
  srcLabel = "Start",
  dstLabel = "End",
  height = "240px",
}) {
  const [routePoints, setRoutePoints] = useState(null);
  const [loading, setLoading] = useState(true);

  const srcPos = [srcLat, srcLon];
  const dstPos = [dstLat, dstLon];
  const midLat = (srcLat + dstLat) / 2;
  const midLon = (srcLon + dstLon) / 2;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOSRMRoute(srcLat, srcLon, dstLat, dstLon)
      .then((pts) => {
        if (!cancelled) {
          setRoutePoints(pts);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [srcLat, srcLon, dstLat, dstLon]);

  return (
    <div
      style={{ height, borderRadius: "1rem", overflow: "hidden", position: "relative" }}
      className="border border-outline-variant/20 bg-surface-container-low"
    >
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(4px)",
          }}
        >
          <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.15em", color: "#fff" }}>
            LOADING MAP…
          </span>
        </div>
      )}

      <MapContainer
        center={[midLat, midLon]}
        zoom={6}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        dragging={false}
      >
        {/* CartoDB Dark Matter — matches the midnight theme */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <Marker position={srcPos} icon={SOURCE_ICON}>
          <Popup>{srcLabel}</Popup>
        </Marker>

        <Marker position={dstPos} icon={DESTINATION_ICON}>
          <Popup>{dstLabel}</Popup>
        </Marker>

        {/* Actual driving route if available, else dashed straight line */}
        {routePoints ? (
          <Polyline
            positions={routePoints}
            pathOptions={{ color: "#4ade80", weight: 3, opacity: 0.9 }}
          />
        ) : !loading ? (
          <Polyline
            positions={[srcPos, dstPos]}
            pathOptions={{ color: "#4ade80", weight: 2, opacity: 0.6, dashArray: "8 8" }}
          />
        ) : null}

        <FitBounds positions={[srcPos, dstPos]} />
      </MapContainer>

      {/* Attribution — required by OSM/CARTO */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          right: 6,
          zIndex: 999,
          fontSize: "9px",
          color: "rgba(255,255,255,0.4)",
          pointerEvents: "none",
        }}
      >
        © OpenStreetMap · CARTO
      </div>
    </div>
  );
}
