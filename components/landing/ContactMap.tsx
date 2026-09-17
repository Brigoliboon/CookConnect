"use client"

import Map, { Marker } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

export function ContactMap() {
  return (
    <Map
      mapboxAccessToken={token}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      longitude={55.5220053}
      latitude={25.3969036}
      zoom={16}
      style={{ width: "100%", height: 360 }}
      attributionControl={false}
      scrollZoom={false}
      dragPan={false}
      dragRotate={false}
      doubleClickZoom={false}
      touchZoomRotate={false}
    >
      <Marker longitude={55.5220053} latitude={25.3969036} anchor="bottom">
        <img src="/icons/marker-skip.png" alt="" width={32} height={32} loading="lazy" decoding="async" className="size-8" />
      </Marker>
    </Map>
  )
}
