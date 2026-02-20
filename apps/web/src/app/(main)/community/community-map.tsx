"use client";

import { useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ---------------------------------------------------------------------------
// Types (mirrored from page.tsx)
// ---------------------------------------------------------------------------

type Category =
  | "Restaurants"
  | "Auto Services"
  | "Beauty & Barber"
  | "Health & Wellness"
  | "Legal Services"
  | "Real Estate"
  | "Education"
  | "Churches"
  | "Entertainment"
  | "Home Services";

interface Business {
  id: string;
  name: string;
  category: Category;
  address: string;
  phone: string;
  description: string;
  website?: string;
  featured?: boolean;
  lat: number;
  lng: number;
}

interface CommunityMapProps {
  businesses: Business[];
  selectedBusiness: Business | null;
  onMarkerClick: (business: Business) => void;
  center: [number, number];
  categoryColors: Record<string, { badge: string; marker: string }>;
}

// ---------------------------------------------------------------------------
// Custom colored circle marker icons using SVG data URI
// ---------------------------------------------------------------------------

function createMarkerIcon(color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 32 : 24;
  const borderWidth = isSelected ? 3 : 2;
  const pulseRing = isSelected
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${color};opacity:0.4;animation:marker-pulse 1.5s ease-out infinite;"></div>`
    : "";

  return L.divIcon({
    className: "custom-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${pulseRing}
        <div style="
          width:${size}px;
          height:${size}px;
          border-radius:50%;
          background:${color};
          border:${borderWidth}px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.4);
          transition:transform 0.2s;
          ${isSelected ? "transform:scale(1.1);" : ""}
        "></div>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// WCCG branded marker for the station location
// ---------------------------------------------------------------------------

const WCCG_LOCATION: [number, number] = [35.0527, -78.8785]; // 115 Gillespie St
const WCCG_ICON = L.divIcon({
  className: "wccg-marker",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -24],
  html: `
    <div style="
      width:40px;height:40px;border-radius:50%;
      background:linear-gradient(135deg,rgba(116,221,199,1),rgba(116,1,223,1));
      border:3px solid white;box-shadow:0 2px 12px rgba(116,221,199,0.5);
      display:flex;align-items:center;justify-content:center;
      font-weight:900;font-size:10px;color:white;letter-spacing:-0.5px;
      font-family:system-ui;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"></path>
        <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"></path>
        <circle cx="12" cy="12" r="2"></circle>
        <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"></path>
        <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"></path>
      </svg>
    </div>
  `,
});

// ---------------------------------------------------------------------------
// Map controller: fly to selected marker
// ---------------------------------------------------------------------------

function MapController({
  selectedBusiness,
  businesses,
}: {
  selectedBusiness: Business | null;
  businesses: Business[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedBusiness) {
      map.flyTo([selectedBusiness.lat, selectedBusiness.lng], 15, {
        duration: 0.5,
      });
    } else if (businesses.length > 0) {
      const bounds = L.latLngBounds(
        businesses.map((b) => [b.lat, b.lng] as [number, number])
      );
      bounds.extend(WCCG_LOCATION);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [selectedBusiness, businesses, map]);

  return null;
}

// ---------------------------------------------------------------------------
// Main map component
// ---------------------------------------------------------------------------

export default function CommunityMap({
  businesses,
  selectedBusiness,
  onMarkerClick,
  center,
  categoryColors,
}: CommunityMapProps) {
  return (
    <>
      {/* Inject the pulse animation keyframes */}
      <style>{`
        @keyframes marker-pulse {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .custom-marker { background: none !important; border: none !important; }
        .wccg-marker { background: none !important; border: none !important; }
        .leaflet-container {
          background: #0f172a !important;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .leaflet-popup-content-wrapper {
          background: #1e293b !important;
          border: 1px solid #334155 !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        }
        .leaflet-popup-content {
          color: #e2e8f0 !important;
          margin: 12px 16px !important;
          font-size: 13px !important;
          line-height: 1.5 !important;
        }
        .leaflet-popup-tip {
          background: #1e293b !important;
          border: 1px solid #334155 !important;
        }
        .leaflet-popup-close-button {
          color: #94a3b8 !important;
          font-size: 18px !important;
        }
        .leaflet-popup-close-button:hover {
          color: #e2e8f0 !important;
        }
        .leaflet-control-zoom a {
          background: #1e293b !important;
          color: #e2e8f0 !important;
          border-color: #334155 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #334155 !important;
        }
        .leaflet-control-attribution {
          background: rgba(15,23,42,0.8) !important;
          color: #64748b !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a {
          color: #94a3b8 !important;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        {/* Dark tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &middot; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* WCCG Station marker */}
        <Marker position={WCCG_LOCATION} icon={WCCG_ICON}>
          <Popup>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#74ddc7", marginBottom: 4 }}>
                WCCG 104.5 FM
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Carson Communications
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                115 Gillespie St<br />
                Fayetteville, NC 28301
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                (910) 483-6111
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Business markers */}
        {businesses.map((business) => {
          const color = categoryColors[business.category]?.marker || "#14b8a6";
          const isSelected = selectedBusiness?.id === business.id;
          const icon = createMarkerIcon(color, isSelected);

          return (
            <Marker
              key={business.id}
              position={[business.lat, business.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onMarkerClick(business),
              }}
            >
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {business.category}
                    </span>
                    {business.featured && (
                      <span
                        style={{
                          fontSize: 10,
                          background: "rgba(245,158,11,0.2)",
                          color: "#fbbf24",
                          padding: "1px 6px",
                          borderRadius: 8,
                          marginLeft: "auto",
                        }}
                      >
                        Featured
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9", marginBottom: 4 }}>
                    {business.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, lineHeight: 1.4 }}>
                    {business.description.length > 100
                      ? business.description.slice(0, 100) + "…"
                      : business.description}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>
                    {business.address}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                    {business.phone}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11,
                        color: "#14b8a6",
                        textDecoration: "none",
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(20,184,166,0.3)",
                        background: "rgba(20,184,166,0.1)",
                      }}
                    >
                      Get Directions
                    </a>
                    {business.website && (
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          textDecoration: "none",
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid rgba(148,163,184,0.2)",
                        }}
                      >
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapController selectedBusiness={selectedBusiness} businesses={businesses} />
      </MapContainer>
    </>
  );
}
