"use client";

import { MapContainer, Marker, Popup, TileLayer, Tooltip, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { HomeWithDetails, PointOfInterest } from "@/lib/types";
import { formatBedsBaths, formatCurrency } from "@/lib/utils";

function rankIcon(rank: number | null) {
  return L.divIcon({
    className: "custom-rank-icon",
    html: `<div style="display:flex;height:42px;width:42px;align-items:center;justify-content:center;border-radius:999px;background:#034078;color:#fffffc;font-weight:700;border:3px solid rgba(255,255,252,0.96);box-shadow:0 10px 25px rgba(3,64,120,0.28)">${rank ?? "-"}</div>`,
  });
}

function poiIcon(label: string) {
  return L.divIcon({
    className: "custom-poi-icon",
    html: `<div style="display:flex;align-items:center;gap:8px"><div style="height:14px;width:14px;border-radius:999px;background:#f6ae2d;border:2px solid #fffffc;box-shadow:0 4px 14px rgba(0,0,0,0.18)"></div><div style="border-radius:999px;background:#fffffc;padding:6px 10px;font-size:12px;font-weight:600;color:#034078;box-shadow:0 6px 14px rgba(3,64,120,0.12)">${label}</div></div>`,
    iconAnchor: [12, 12],
  });
}

export function RentalMap({
  homes,
  pois,
  mapboxToken,
}: {
  homes: HomeWithDetails[];
  pois: PointOfInterest[];
  mapboxToken: string | null;
}) {
  const homesWithCoordinates = homes.filter(
    (home) => home.latitude !== null && home.longitude !== null,
  );

  if (!mapboxToken) {
    return (
      <div className="rounded-[2rem] border border-dashed border-[rgba(124,144,160,0.36)] bg-[rgba(255,255,252,0.72)] p-8 text-sm text-[#5d7287]">
        Add `NEXT_PUBLIC_MAPBOX_TOKEN` to render the live map tiles. The ranking data and list view
        still work without it.
      </div>
    );
  }

  return (
    <MapContainer
      center={[37.06, -121.75]}
      zoom={9}
      scrollWheelZoom
      className="h-[640px] w-full rounded-[2rem]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        tileSize={512}
        zoomOffset={-1}
        url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}?access_token=${mapboxToken}`}
      />
      {pois.map((poi) =>
        poi.enabled && poi.latitude !== null && poi.longitude !== null ? (
          <div key={poi.id}>
            <Marker position={[poi.latitude, poi.longitude]} icon={poiIcon(poi.label)}>
              <Tooltip>{poi.label}</Tooltip>
            </Marker>
            <Circle
              center={[poi.latitude, poi.longitude]}
              radius={poi.radiusMiles * 1609.34}
              pathOptions={{ color: "#034078", fillColor: "#7c90a0", fillOpacity: 0.1 }}
            />
          </div>
        ) : null,
      )}
      {homesWithCoordinates.map((home) => (
        <Marker
          key={home.id}
          position={[home.latitude!, home.longitude!]}
          icon={rankIcon(home.score?.overallRank ?? null)}
        >
          <Popup>
            <div className="space-y-1">
              <div className="font-semibold">{home.displayName}</div>
              <div>{formatCurrency(home.rent)}</div>
              <div>{formatBedsBaths(home.beds, home.baths)}</div>
              <div className="text-xs text-[#6f8498]">{home.normalizedAddress}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
