"use client"

import { useState } from "react"
import Map, { Marker } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"
import { Button } from "./Button"
import { MapPin, X } from "lucide-react"

interface LocationDialogProps {
  open: boolean
  onClose: () => void
  lat: number
  lng: number
  onSave: (lat: number, lng: number) => void
}

export function LocationDialog({ open, onClose, lat: initialLat, lng: initialLng, onSave }: LocationDialogProps) {
  const [marker, setMarker] = useState({ lat: initialLat, lng: initialLng })
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-light px-5 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-brand-900">
            <MapPin size={20} />
            Set Delivery Location
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-text-secondary hover:bg-brand-400/10 hover:text-brand-900">
            <X size={18} />
          </button>
        </div>

        <div className="h-80 w-full">
          <Map
            mapboxAccessToken={token}
            mapStyle="mapbox://styles/mapbox/light-v11"
            initialViewState={{ latitude: marker.lat, longitude: marker.lng, zoom: 14 }}
            style={{ width: "100%", height: "100%" }}
            onClick={(e) => setMarker({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
            dragPan
          >
            <Marker latitude={marker.lat} longitude={marker.lng} draggable onDragEnd={(e) => setMarker({ lat: e.lngLat.lat, lng: e.lngLat.lng })}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-900 text-white shadow-lg">
                <MapPin size={16} />
              </div>
            </Marker>
          </Map>
        </div>

        <div className="flex items-center justify-between border-t border-border-light px-5 py-4">
          <div className="text-xs text-text-secondary">
            {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { onSave(marker.lat, marker.lng); onClose() }}>Save Location</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
