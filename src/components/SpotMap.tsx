import L from 'leaflet';
import { Circle, MapContainer, Marker, Polygon, Popup, TileLayer, WMSTileLayer, useMap, useMapEvents } from 'react-leaflet';
import { AirspaceZone, Spot, ZoneType } from '../types';
import { categoryLabel, cautionLabel, getCautionColor, getZoneColor, zoneLabel } from '../utils';
import { useEffect, useState } from 'react';
import { VWorldLayerType, vworldLayers } from '../data/vworldLayers';
import { Crosshair } from 'lucide-react';

interface SpotMapProps {
  spots: Spot[];
  zones: AirspaceZone[];
  visibleLayers: Record<ZoneType, boolean>;
  visibleVWorldLayers: Record<VWorldLayerType, boolean>;
  vworldKey?: string;
  vworldDomain?: string;
  selectedSpot?: Spot;
  onSelectSpot: (spot: Spot) => void;
  onMapContextAdd: (lat: number, lng: number) => void;
}

const MIN_VWORLD_ZOOM = 10;

function createIcon(color: string) {
  return L.divIcon({
    className: 'customMarker',
    html: `<div style="background:${color}" class="markerDot"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const currentLocationIcon = L.divIcon({
  className: 'currentLocationMarker',
  html: '<div class="currentLocationDot"><span></span></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MapContextAdd({ onMapContextAdd }: { onMapContextAdd: (lat: number, lng: number) => void }) {
  useMapEvents({
    contextmenu(event) {
      onMapContextAdd(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

function ZoomWatcher({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  useMapEvents({
    zoomend(event) {
      onZoomChange(event.target.getZoom());
    },
  });
  return null;
}

function FlyToSelected({ spot }: { spot?: Spot }) {
  const map = useMap();
  useEffect(() => {
    if (!spot) return;
    map.flyTo([spot.lat, spot.lng], 13, { duration: 0.7 });
  }, [map, spot]);
  return null;
}

function CurrentLocationControl() {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  function moveToCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus('error');
      alert('현재 위치 기능을 지원하지 않는 브라우저야.');
      return;
    }

    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const next: [number, number] = [Number(result.coords.latitude.toFixed(6)), Number(result.coords.longitude.toFixed(6))];
        setPosition(next);
        setStatus('idle');
        map.flyTo(next, Math.max(map.getZoom(), 15), { duration: 0.8 });
      },
      () => {
        setStatus('error');
        alert('현재 위치를 가져오지 못했어. 브라우저 위치 권한을 허용했는지 확인해줘.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }

  return (
    <>
      <div className="locationControl leaflet-top leaflet-right">
        <button type="button" onClick={moveToCurrentLocation} title="현재 위치로 이동">
          <Crosshair size={18} />
          <span>{status === 'loading' ? '위치 확인 중' : '현재 위치'}</span>
        </button>
      </div>
      {position && (
        <Marker position={position} icon={currentLocationIcon}>
          <Popup>
            <strong>내 현재 위치</strong>
            <p>{position[0]}, {position[1]}</p>
          </Popup>
        </Marker>
      )}
    </>
  );
}

export default function SpotMap({
  spots,
  zones,
  visibleLayers,
  visibleVWorldLayers,
  vworldKey,
  vworldDomain,
  selectedSpot,
  onSelectSpot,
  onMapContextAdd,
}: SpotMapProps) {
  const [zoom, setZoom] = useState(9);
  const enabledVWorldLayers = vworldLayers.filter((layer) => visibleVWorldLayers[layer.id]);
  const hasVWorldKey = Boolean(vworldKey);
  const shouldShowVWorldLayers = hasVWorldKey && zoom >= MIN_VWORLD_ZOOM;
  const hasActiveVWorldLayer = enabledVWorldLayers.length > 0;

  return (
    <div className="mapShell">
      {hasVWorldKey && hasActiveVWorldLayer && !shouldShowVWorldLayers && (
        <div className="zoomNotice">
          브이월드 공공데이터 레이어는 지도가 너무 복잡해지는 걸 막으려고 줌 {MIN_VWORLD_ZOOM} 이상에서 표시돼.
        </div>
      )}
      <MapContainer center={[37.47, 127.05]} zoom={9} scrollWheelZoom className="map">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
        <ZoomWatcher onZoomChange={setZoom}/>
        <FlyToSelected spot={selectedSpot}/>
        <MapContextAdd onMapContextAdd={onMapContextAdd}/>
        <CurrentLocationControl/>

        {zones.filter((z)=>visibleLayers[z.type]).map((zone) => {
          const color = getZoneColor(zone.type);
          if (zone.radiusKm) {
            return (
              <Circle key={zone.id} center={zone.center} radius={zone.radiusKm * 1000}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 2, dashArray: '6 6' }}>
                <Popup><strong>{zone.name}</strong><p>{zoneLabel[zone.type]}</p><p>{zone.description}</p></Popup>
              </Circle>
            );
          }
          if (zone.polygon) {
            return (
              <Polygon key={zone.id} positions={zone.polygon}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.13, weight: 2, dashArray: '8 6' }}>
                <Popup><strong>{zone.name}</strong><p>{zoneLabel[zone.type]}</p><p>{zone.description}</p></Popup>
              </Polygon>
            );
          }
          return null;
        })}

        {shouldShowVWorldLayers && enabledVWorldLayers.map((layer) => (
          <WMSTileLayer
            key={layer.id}
            url="https://api.vworld.kr/req/wms"
            layers={layer.layerName}
            styles={layer.layerName}
            format="image/png"
            transparent
            version="1.3.0"
            params={{
              key: vworldKey,
              domain: vworldDomain || window.location.origin,
              tiled: true,
              exceptions: 'text/xml',
            } as any}
            opacity={0.62}
          />
        ))}

        {spots.map((spot) => (
          <Marker key={spot.id} position={[spot.lat, spot.lng]} icon={createIcon(getCautionColor(spot.cautionLevel))}
            eventHandlers={{ click: () => onSelectSpot(spot) }}>
            <Popup>
              <div className="popup">
                <strong>{spot.name}</strong>
                <p>{categoryLabel[spot.category]} · {cautionLabel[spot.cautionLevel]}</p>
                <button onClick={() => onSelectSpot(spot)}>상세 보기</button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
