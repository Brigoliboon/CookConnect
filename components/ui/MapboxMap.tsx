"use client"

import { useState, useMemo } from "react"
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"

const ICON_MAP: Record<string, string> = {
  today: "/icons/marker-active.png",
  delivered: "/icons/marker-delivered.png",
  skip: "/icons/marker-skip.png",
}

interface MarkerData {
  id: string
  lat: number
  lng: number
  label: string
  type?: string
  color?: string
}

type MapStyleKey = "streets" | "light" | "dark" | "satellite"

const MAP_STYLES: { label: string; value: string; key: MapStyleKey }[] = [
  { label: "Street", key: "streets", value: "mapbox://styles/mapbox/streets-v12" },
  { label: "Light", key: "light", value: "mapbox://styles/mapbox/light-v11" },
  { label: "Dark", key: "dark", value: "mapbox://styles/mapbox/dark-v11" },
  { label: "Satellite", key: "satellite", value: "mapbox://styles/mapbox/satellite-streets-v12" },
]

const DEFAULT_STYLE: MapStyleKey = "light"

interface MapboxMapProps {
  markers: MarkerData[]
  className?: string
  height?: "default" | "full"
  defaultStyle?: MapStyleKey
}

export function MapboxMap({ markers, className = "", height = "default", defaultStyle = DEFAULT_STYLE }: MapboxMapProps) {
  const [popup, setPopup] = useState<MarkerData | null>(null)
  const [mapStyle, setMapStyle] = useState(() => {
    const found = MAP_STYLES.find((s) => s.key === defaultStyle)
    return found ? found.value : MAP_STYLES[1].value
  })
  const [showStyle, setShowStyle] = useState(false)
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

  const pins = useMemo(
    () =>
      markers.map((m) => (
        <Marker key={m.id} latitude={m.lat} longitude={m.lng} onClick={() => setPopup(m)}>
          <img
            src={m.type ? ICON_MAP[m.type] : ICON_MAP.today}
            alt="marker"
            className="cursor-pointer"
            style={{ width: 32, height: 40, objectFit: "contain" }}
          />
        </Marker>
      )),
    [markers]
  )

  const legendItems = [
    { type: "today", label: "Today" },
    { type: "skip", label: "Skip" },
    { type: "delivered", label: "Delivered" },
  ]

  return (
    <div className={`relative rounded-xl border border-border-light overflow-hidden ${height === "full" ? "flex-1 min-h-0" : "h-96"} ${className}`}>
      <div className="absolute left-3 top-3 z-10 flex items-center gap-3 rounded-lg bg-white/90 px-3 py-1.5 shadow-sm">
        {legendItems.map((item) => (
          <div key={item.type} className="flex items-center gap-1.5">
            <img src={ICON_MAP[item.type]} alt="" className="h-5 w-4 object-contain" />
            <span className="text-xs font-medium text-text-secondary">{item.label}</span>
          </div>
        ))}
        <div className="h-4 w-px bg-border-light" />
        <div className="relative">
          <button
            onClick={() => setShowStyle(!showStyle)}
            className="rounded bg-brand-900 px-2 py-0.5 text-xs font-medium text-white hover:bg-brand-700"
          >
            {MAP_STYLES.find((s) => s.value === mapStyle)?.label}
          </button>
          {showStyle && (
            <div className="absolute left-0 top-full mt-1 w-28 rounded-lg border border-border-light bg-white shadow-lg z-10">
              {MAP_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setMapStyle(s.value); setShowStyle(false) }}
                  className={`w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-brand-400/10 ${
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
      <Map
        mapboxAccessToken={token}
        mapStyle={mapStyle}
        initialViewState={{
          latitude: 25.2,
          longitude: 55.3,
          zoom: 9,
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        {pins}
        {popup && (
          <Popup
            latitude={popup.lat}
            longitude={popup.lng}
            onClose={() => setPopup(null)}
            closeButton
            anchor="top"
            offset={25}
          >
            <p className="text-sm font-medium text-brand-900">{popup.label}</p>
          </Popup>
        )}
      </Map>
    </div>
  )
}
