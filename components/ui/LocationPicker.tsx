"use client"

import { useRef, useState } from "react"
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"
import { LocateFixed } from "lucide-react"

export interface Coordinates {
  lat: number
  lng: number
}

interface LocationPickerProps {
  value: Coordinates | null
  onChange: (coords: Coordinates) => void
}

const DEFAULT_CENTER: Coordinates = { lat: 25.393622643399027, lng: 55.44532884811787 }

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""
  const mapRef = useRef<{ flyTo: (opts: { center: [number, number]; zoom?: number; duration?: number }) => void } | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState("")

  const center = value ?? DEFAULT_CENTER

  function flyTo(coords: Coordinates) {
    mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 13, duration: 800 })
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser")
      return
    }
    setLocating(true)
    setError("")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        onChange(coords)
        flyTo(coords)
        setLocating(false)
      },
      (err) => {
        setError(err.message || "Unable to fetch your location")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative h-64 overflow-hidden rounded-xl border border-neutral-200">
        <Map
          mapboxAccessToken={token}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          initialViewState={{ latitude: center.lat, longitude: center.lng, zoom: 12 }}
          onLoad={(e) => { mapRef.current = e.target }}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" />
          <Marker
            latitude={center.lat}
            longitude={center.lng}
            draggable
            onDragEnd={(e) => onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
          >
            <div className="flex flex-col items-center">
              <div className="h-6 w-6 rounded-full border-2 border-white bg-[#FA6868] shadow-md" />
              <div className="-mt-0.5 h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-[#FA6868]" />
            </div>
          </Marker>
        </Map>
        <button
          type="button"
          onClick={useMyLocation}
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-md transition-colors hover:bg-white"
        >
          <LocateFixed size={13} className={locating ? "animate-spin" : ""} />
          {locating ? "Locating..." : "My Location"}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Latitude</label>
          <input
            type="number"
            step="any"
            value={value?.lat ?? ""}
            onChange={(e) => {
              const n = parseFloat(e.target.value)
              if (!Number.isNaN(n)) onChange({ lat: n, lng: value?.lng ?? center.lng })
            }}
            onBlur={() => value && flyTo(value)}
            placeholder="25.2048"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Longitude</label>
          <input
            type="number"
            step="any"
            value={value?.lng ?? ""}
            onChange={(e) => {
              const n = parseFloat(e.target.value)
              if (!Number.isNaN(n)) onChange({ lat: value?.lat ?? center.lat, lng: n })
            }}
            onBlur={() => value && flyTo(value)}
            placeholder="55.2708"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
