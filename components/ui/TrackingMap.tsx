"use client"

import { useState } from "react"
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"

const ICON_MAP: Record<string, string> = {
  orders: "/icons/marker-order.png",
  rider: "/icons/marker-active.png",
}

export interface TrackingMarker {
  id: string
  lat: number
  lng: number
  label: string
  type: "orders" | "rider"
}

export function TrackingMap({ markers }: { markers: TrackingMarker[] }) {
  const [popup, setPopup] = useState<TrackingMarker | null>(null)
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

  return (
    <div className="relative h-full w-full">
      <Map
        mapboxAccessToken={token}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        initialViewState={{
          latitude: markers[0]?.lat ?? 25.2,
          longitude: markers[0]?.lng ?? 55.3,
          zoom: markers.length > 0 ? 13 : 9,
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        {markers.map((m) => (
          <Marker key={m.id} latitude={m.lat} longitude={m.lng} onClick={() => setPopup(m)}>
            <img
              src={ICON_MAP[m.type]}
              alt="marker"
              className="cursor-pointer"
              style={{ width: 36, height: 44, objectFit: "contain" }}
            />
          </Marker>
        ))}
        {popup && (
          <Popup
            latitude={popup.lat}
            longitude={popup.lng}
            onClose={() => setPopup(null)}
            closeButton
            anchor="top"
            offset={25}
          >
            <p className="text-sm font-medium text-neutral-900">{popup.label}</p>
          </Popup>
        )}
      </Map>
    </div>
  )
}
