"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Delivery, DeliveryIntent } from "@/constants"

const MAP_STYLES = [
  { label: "Street", value: "mapbox://styles/mapbox/streets-v12" },
  { label: "Light", value: "mapbox://styles/mapbox/light-v11" },
  { label: "Dark", value: "mapbox://styles/mapbox/dark-v11" },
  { label: "Satellite", value: "mapbox://styles/mapbox/satellite-streets-v12" },
]

const ICON_MAP: Record<string, string> = {
  today: "/icons/marker-active.png",
  delivered: "/icons/marker-delivered.png",
  skip: "/icons/marker-skip.png",
}

interface RiderMapProps {
  deliveries: Delivery[]
  onUpdateIntent: (id: string, intent: DeliveryIntent) => void
}

export function RiderMap({ deliveries, onUpdateIntent }: RiderMapProps) {
  const [popup, setPopup] = useState<Delivery | null>(null)
  const [mapStyle, setMapStyle] = useState(MAP_STYLES[1].value)
  const [showStyle, setShowStyle] = useState(false)
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null)
  const mapRef = useRef<{ flyTo: (opts: { center: [number, number]; zoom?: number; duration?: number }) => void } | null>(null)
  const watchId = useRef<number | null>(null)
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

  useEffect(() => {
    if (!navigator.geolocation) return
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setRiderPos((prev) => {
          if (!prev) {
            mapRef.current?.flyTo({ center: [lng, lat], zoom: 12, duration: 1000 })
          }
          return { lat, lng }
        })
      },
      (err) => console.warn("Geolocation error:", err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [])

  const markers = useMemo(
    () =>
      deliveries
        .filter((d) => d.location)
        .map((d) => (
          <Marker key={d.id} latitude={d.location!.lat} longitude={d.location!.lng} onClick={() => setPopup(d)}>
            <img
              src={ICON_MAP[d.intent] ?? ICON_MAP.today}
              alt="marker"
              className="cursor-pointer"
              style={{ width: 32, height: 40, objectFit: "contain" }}
            />
          </Marker>
        )),
    [deliveries]
  )

  return (
    <div className="relative h-full w-full">
      <Map
        mapboxAccessToken={token}
        mapStyle={mapStyle}
        initialViewState={{ latitude: 14.6, longitude: 121.0, zoom: 10 }}
        onLoad={(e) => { mapRef.current = e.target }}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        {markers}
        {riderPos && (
          <Marker latitude={riderPos.lat} longitude={riderPos.lng}>
            <div className="relative flex h-6 w-6 items-center justify-center">
              <div className="absolute h-6 w-6 animate-ping rounded-full bg-blue-400 opacity-60" />
              <div className="h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-md" />
            </div>
          </Marker>
        )}
        {popup && (
          <Popup
            latitude={popup.location!.lat}
            longitude={popup.location!.lng}
            onClose={() => setPopup(null)}
            closeButton
            anchor="top"
            offset={25}
          >
            <div className="min-w-44 space-y-2">
              <p className="font-medium text-brand-900">{popup.customerName}</p>
              <p className="text-xs text-text-secondary">{popup.customerAddress}</p>
              {popup.note && <p className="text-xs italic text-text-secondary">📝 {popup.note}</p>}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-medium capitalize text-text-secondary">{popup.intent}</span>
                <div className="ml-auto flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onUpdateIntent(popup.id, "delivered"); setPopup(null) }}
                    className="rounded bg-brand-900 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-brand-700"
                  >
                    Done
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onUpdateIntent(popup.id, "skip"); setPopup(null) }}
                    className="rounded border border-red-200 px-2 py-0.5 text-[11px] font-medium text-red-500 hover:bg-red-50"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      <div className="absolute left-3 top-3 z-10 flex items-center gap-3 rounded-lg bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {(["today", "skip", "delivered"] as const).map((t) => (
            <div key={t} className="flex items-center gap-1">
              <img src={ICON_MAP[t]} alt="" className="h-4 w-3 object-contain" />
              <span className="text-[10px] font-medium capitalize text-text-secondary">{t}</span>
            </div>
          ))}
        </div>
        <div className="h-4 w-px bg-border-light" />
        <div className="relative">
          <button
            onClick={() => setShowStyle(!showStyle)}
            className="rounded bg-brand-900 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-brand-700"
          >
            {MAP_STYLES.find((s) => s.value === mapStyle)?.label}
          </button>
          {showStyle && (
            <div className="absolute left-0 top-full mt-1 w-24 rounded-lg border border-border-light bg-white shadow-lg z-10">
              {MAP_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setMapStyle(s.value); setShowStyle(false) }}
                  className={`w-full px-2 py-1 text-left text-[10px] transition-colors hover:bg-brand-400/10 ${
                    mapStyle === s.value ? "font-semibold text-brand-900" : "text-text-secondary"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
