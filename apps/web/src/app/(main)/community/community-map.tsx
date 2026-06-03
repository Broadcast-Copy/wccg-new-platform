"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ---------------------------------------------------------------------------
// Types (mirrored from page.tsx)
// ---------------------------------------------------------------------------

type Category =
  | "Police & Sheriff"
  | "Fire & EMS"
  | "Utilities"
  | "Transportation"
  | "Government Offices"
  | "Courts & Legal"
  | "Health Services"
  | "Hospitals"
  | "Senior & Social Services"
  | "Libraries & Education"
  | "Parks & Recreation"
  | "Waste Management"
  | "Animal Services"
  | "Agriculture"
  | "Military"
  | "Veteran Services";

interface ServiceListing {
  id: string;
  name: string;
  category: Category;
  address: string;
  city: string;
  county: string;
  phone: string;
  description: string;
  website?: string;
  featured?: boolean;
  claimed?: boolean;
  lat: number;
  lng: number;
}

interface CommunityMapProps {
  businesses: ServiceListing[];
  selectedBusiness: ServiceListing | null;
  onMarkerClick: (business: ServiceListing) => void;
  center: [number, number];
  categoryColors: Record<string, { badge: string; marker: string }>;
  /** When set, the map fits/flies to this county's listings (closer zoom). */
  selectedCounty?: string | null;
}

// ---------------------------------------------------------------------------
// Category icon markup — inner SVG elements for each lucide icon used in the
// directory (Shield, Flame, Hospital, HeartPulse, Users, Zap, Trash2, Bus,
// Landmark, Scale, PawPrint, Wheat, BookOpen, Trees, Swords, Medal).
// These mirror lucide-react@0.574 path data so map pins show the same glyph
// as the list/category icons. Rendered white inside a colored teardrop pin.
// ---------------------------------------------------------------------------

const CATEGORY_ICON_SVG: Record<Category, string> = {
  "Police & Sheriff":
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  "Fire & EMS":
    '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>',
  Hospitals:
    '<path d="M12 7v4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M14 9h-4"/><path d="M18 11h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 21V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16"/>',
  "Health Services":
    '<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/><path d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  "Senior & Social Services":
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  Utilities:
    '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  "Waste Management":
    '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  Transportation:
    '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>',
  "Government Offices":
    '<path d="M10 18v-7"/><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>',
  "Courts & Legal":
    '<path d="M12 3v18"/><path d="m19 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1"/><path d="m5 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M7 21h10"/>',
  "Animal Services":
    '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
  Agriculture:
    '<path d="M2 22 16 8"/><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"/><path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/><path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/><path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>',
  "Libraries & Education":
    '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  "Parks & Recreation":
    '<path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/>',
  Military:
    '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="7" x2="4" y1="17" y2="20"/><line x1="3" x2="5" y1="19" y2="21"/>',
  "Veteran Services":
    '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>',
};

// ---------------------------------------------------------------------------
// Custom marker icons — colored map-pin/teardrop holding a white category icon
// ---------------------------------------------------------------------------

function createMarkerIcon(
  category: Category,
  color: string,
  isSelected: boolean
): L.DivIcon {
  // Pin geometry. The pin is a rounded teardrop (circle head + pointed tail).
  const width = isSelected ? 40 : 32;
  const height = isSelected ? 52 : 42;
  const iconSize = isSelected ? 20 : 16;
  const borderWidth = isSelected ? 3 : 2;
  const glyph = CATEGORY_ICON_SVG[category] ?? "";

  const pulseRing = isSelected
    ? `<div style="position:absolute;left:50%;top:${width / 2}px;width:${width}px;height:${width}px;margin-left:-${width / 2}px;margin-top:-${width / 2}px;border-radius:50%;border:2px solid ${color};opacity:0.45;animation:marker-pulse 1.5s ease-out infinite;"></div>`
    : "";

  // Teardrop: a circle with the bottom-left corner squared off, rotated 45deg
  // so the point faces down. The icon counter-rotates to stay upright.
  return L.divIcon({
    className: "custom-marker",
    iconSize: [width, height],
    // Anchor at the very bottom tip of the pin.
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height + 4],
    html: `
      <div style="position:relative;width:${width}px;height:${height}px;">
        ${pulseRing}
        <div style="
          position:absolute;left:50%;top:0;
          width:${width}px;height:${width}px;margin-left:-${width / 2}px;
          background:${color};
          border:${borderWidth}px solid white;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 3px 8px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
        ">
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none"
               stroke="white" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"
               style="transform:rotate(45deg);">
            ${glyph}
          </svg>
        </div>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// Approximate county seat / centroid coordinates for county-level zoom
// ---------------------------------------------------------------------------

const COUNTY_CENTROIDS: Record<string, [number, number]> = {
  Cumberland: [35.0527, -78.8784],
  Sampson: [34.9962, -78.3705],
  Bladen: [34.6155, -78.5645],
  Hoke: [35.0156, -79.235],
  Lee: [35.4757, -79.1719],
  Scotland: [34.8404, -79.4778],
  Moore: [35.3105, -79.475],
  Robeson: [34.6393, -79.1057],
  Harnett: [35.3777, -78.8689],
  "Fort Liberty": [35.1408, -79.0064],
};

// ---------------------------------------------------------------------------
// WCCG branded marker for the station location
// ---------------------------------------------------------------------------

const WCCG_LOCATION: [number, number] = [35.0527, -78.8785];
const WCCG_ICON = L.divIcon({
  className: "wccg-marker",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -24],
  html: `
    <div style="
      width:40px;height:40px;border-radius:50%;
      background:linear-gradient(135deg,#0d9488,#7c3aed);
      border:3px solid white;box-shadow:0 2px 10px rgba(13,148,136,0.4);
      display:flex;align-items:center;justify-content:center;
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
  selectedCounty,
}: {
  selectedBusiness: ServiceListing | null;
  businesses: ServiceListing[];
  selectedCounty?: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    // 1) A single listing was picked → fly in close (zoom 15).
    if (selectedBusiness) {
      map.flyTo([selectedBusiness.lat, selectedBusiness.lng], 15, {
        duration: 0.5,
      });
      return;
    }

    // 2) A county is selected → fit tightly to just that county's listings
    //    (or fall back to the county centroid) at a closer zoom.
    if (selectedCounty) {
      if (businesses.length > 0) {
        const bounds = L.latLngBounds(
          businesses.map((b) => [b.lat, b.lng] as [number, number])
        );
        // Closer than the all-county view; allow zooming right in for
        // counties whose listings cluster in a single town.
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } else {
        const centroid = COUNTY_CENTROIDS[selectedCounty];
        if (centroid) map.flyTo(centroid, 12, { duration: 0.5 });
      }
      return;
    }

    // 3) No county yet → show the whole coverage area.
    if (businesses.length > 0) {
      const bounds = L.latLngBounds(
        businesses.map((b) => [b.lat, b.lng] as [number, number])
      );
      bounds.extend(WCCG_LOCATION);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [selectedBusiness, businesses, selectedCounty, map]);

  return null;
}

// ---------------------------------------------------------------------------
// Main map component — LIGHT theme
// ---------------------------------------------------------------------------

export default function CommunityMap({
  businesses,
  selectedBusiness,
  onMarkerClick,
  center,
  categoryColors,
  selectedCounty,
}: CommunityMapProps) {
  return (
    <>
      <style>{`
        @keyframes marker-pulse {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .custom-marker { background: none !important; border: none !important; }
        .wccg-marker { background: none !important; border: none !important; }
        .leaflet-container {
          background: #f8fafc !important;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .leaflet-popup-content-wrapper {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12) !important;
        }
        .leaflet-popup-content {
          color: #1e293b !important;
          margin: 12px 16px !important;
          font-size: 13px !important;
          line-height: 1.5 !important;
        }
        .leaflet-popup-tip {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
        }
        .leaflet-popup-close-button {
          color: #94a3b8 !important;
          font-size: 18px !important;
        }
        .leaflet-popup-close-button:hover {
          color: #1e293b !important;
        }
        .leaflet-control-zoom a {
          background: #ffffff !important;
          color: #374151 !important;
          border-color: #e5e7eb !important;
        }
        .leaflet-control-zoom a:hover {
          background: #f3f4f6 !important;
        }
        .leaflet-control-attribution {
          background: rgba(255,255,255,0.85) !important;
          color: #9ca3af !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a {
          color: #6b7280 !important;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={selectedCounty ? 12 : 14}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        {/* Light tile layer — CartoDB Voyager */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &middot; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* WCCG Station marker */}
        <Marker position={WCCG_LOCATION} icon={WCCG_ICON}>
          <Popup>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0d9488", marginBottom: 4 }}>
                WCCG 104.5 FM
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Carson Communications
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                115 Gillespie St<br />
                Fayetteville, NC 28301
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                (910) 483-6111
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Service listing markers */}
        {businesses.map((listing) => {
          const color = categoryColors[listing.category]?.marker || "#14b8a6";
          const isSelected = selectedBusiness?.id === listing.id;
          const icon = createMarkerIcon(listing.category, color, isSelected);

          return (
            <Marker
              key={listing.id}
              position={[listing.lat, listing.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onMarkerClick(listing),
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
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {listing.category}
                    </span>
                    {listing.featured && (
                      <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: 8, marginLeft: "auto" }}>
                        Featured
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>
                    {listing.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6, lineHeight: 1.4 }}>
                    {listing.description.length > 100
                      ? listing.description.slice(0, 100) + "…"
                      : listing.description}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>
                    {listing.address}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                    {listing.phone}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11, color: "#0d9488", textDecoration: "none",
                        padding: "4px 10px", borderRadius: 6,
                        border: "1px solid rgba(13,148,136,0.3)", background: "rgba(13,148,136,0.05)",
                      }}
                    >
                      Get Directions
                    </a>
                    {listing.website && (
                      <a
                        href={listing.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 11, color: "#64748b", textDecoration: "none",
                          padding: "4px 10px", borderRadius: 6,
                          border: "1px solid #e2e8f0",
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
