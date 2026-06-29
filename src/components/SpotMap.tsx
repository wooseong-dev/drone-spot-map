import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { AirspaceZone, Spot, ZoneType } from '../types';
import { categoryLabel, cautionLabel, zoneLabel } from '../utils';
import { vworldLayers, VWorldLayerType } from '../data/vworldLayers';
import {
  fetchSpotPostPreviews,
  SpotPost,
} from '../services/spotPosts';

type SpotMapProps = {
  spots: Spot[];
  zones: AirspaceZone[];
  visibleLayers: Record<ZoneType, boolean>;
  visibleVWorldLayers: Record<VWorldLayerType, boolean>;
  vworldKey?: string;
  vworldDomain?: string;
  selectedSpot?: Spot;
  onSelectSpot: (spot: Spot) => void;
  onMapContextAdd: (lat: number, lng: number) => void;
};

type FlexibleZone = AirspaceZone & {
  lat?: number;
  lng?: number;
  radius?: number;
  center?: {
    lat: number;
    lng: number;
  };
  coordinates?: Array<[number, number]> | Array<{ lat: number; lng: number }>;
  points?: Array<[number, number]> | Array<{ lat: number; lng: number }>;
};

type FlexibleVWorldLayer = {
  id: VWorldLayerType;
  name?: string;
  label?: string;
  title?: string;
  layer?: string;
  layerName?: string;
  code?: string;
  tileUrl?: string;
  url?: string;
};

const DEFAULT_CENTER: LatLngExpression = [37.5665, 126.978];
const DEFAULT_ZOOM = 9;

const DEFAULT_VWORLD_LAYER_NAMES: Record<VWorldLayerType, string> = {
  noFly: 'LT_C_AISPRHC',
  restricted: 'LT_C_AISRESC',
  control: 'LT_C_AISCTRC',
  military: 'LT_C_AISMOA',
  danger: 'LT_C_AISDNGC',
  droneZone: 'LT_C_DRONEZONE',
};

const zoneColors: Record<ZoneType, string> = {
  noFly: '#ef4444',
  restricted: '#f97316',
  control: '#3b82f6',
  danger: '#a855f7',
  nationalPark: '#22c55e',
  heritage: '#b45309',
};

function createSpotIcon(_spot: Spot, selected: boolean) {
  const size = selected ? 26 : 22;
  const color = selected ? '#111827' : '#f59e0b';
  const shadow = selected
    ? '0 0 0 5px rgba(17, 24, 39, 0.18), 0 10px 28px rgba(15, 23, 42, 0.35)'
    : '0 8px 24px rgba(15, 23, 42, 0.28)';

  return L.divIcon({
    className: 'droneSpotMarkerShell',
    html: `
      <div
        style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 999px;
          background: ${color};
          border: 4px solid #ffffff;
          box-shadow: ${shadow};
          box-sizing: border-box;
        "
      ></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const currentLocationIcon = L.divIcon({
  className: 'currentLocationMarkerShell',
  html: `
    <div
      style="
        width: 22px;
        height: 22px;
        border-radius: 999px;
        background: #2563eb;
        border: 4px solid #ffffff;
        box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.18), 0 10px 28px rgba(15, 23, 42, 0.28);
        box-sizing: border-box;
      "
    ></div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function getVWorldLayerLabel(layer: FlexibleVWorldLayer) {
  return layer.name ?? layer.label ?? layer.title ?? layer.id;
}

function buildVWorldTileUrl(
  layer: FlexibleVWorldLayer,
  vworldKey: string,
  vworldDomain?: string
) {
  const rawUrl = layer.tileUrl ?? layer.url;

  if (rawUrl) {
    return rawUrl
  .split('{key}')
  .join(vworldKey)
  .split('{apiKey}')
  .join(vworldKey)
  .split('{domain}')
  .join(vworldDomain ?? '');
  }

  const layerName =
    layer.layer ??
    layer.layerName ??
    layer.code ??
    DEFAULT_VWORLD_LAYER_NAMES[layer.id];

  return `https://api.vworld.kr/req/wmts/1.0.0/${vworldKey}/${layerName}/{z}/{y}/{x}.png`;
}

function getZoneCenter(zone: FlexibleZone): LatLngExpression | null {
  if (zone.center?.lat && zone.center?.lng) {
    return [zone.center.lat, zone.center.lng];
  }

  if (typeof zone.lat === 'number' && typeof zone.lng === 'number') {
    return [zone.lat, zone.lng];
  }

  return null;
}

function normalizeZonePoints(
  points?: Array<[number, number]> | Array<{ lat: number; lng: number }>
): LatLngExpression[] {
  if (!points || points.length === 0) return [];

  return points
    .map((point) => {
      if (Array.isArray(point)) {
        return [point[0], point[1]] as LatLngExpression;
      }

      return [point.lat, point.lng] as LatLngExpression;
    })
    .filter(Boolean);
}

function renderZone(zone: AirspaceZone) {
  const flexibleZone = zone as FlexibleZone;
  const color = zoneColors[zone.type] ?? '#64748b';

  const polygonPoints = normalizeZonePoints(
    flexibleZone.coordinates ?? flexibleZone.points
  );

  if (polygonPoints.length >= 3) {
    return (
      <Polygon
        key={zone.id}
        positions={polygonPoints}
        pathOptions={{
          color,
          weight: 2,
          opacity: 0.75,
          fillColor: color,
          fillOpacity: 0.12,
        }}
      >
        <Tooltip sticky>
          {zoneLabel[zone.type]} · {zone.name}
        </Tooltip>
      </Polygon>
    );
  }

  const center = getZoneCenter(flexibleZone);

  if (center && flexibleZone.radius) {
    return (
      <Circle
        key={zone.id}
        center={center}
        radius={flexibleZone.radius}
        pathOptions={{
          color,
          weight: 2,
          opacity: 0.75,
          fillColor: color,
          fillOpacity: 0.12,
        }}
      >
        <Tooltip sticky>
          {zoneLabel[zone.type]} · {zone.name}
        </Tooltip>
      </Circle>
    );
  }

  return null;
}

function MapContextHandler({
  onMapContextAdd,
}: {
  onMapContextAdd: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    contextmenu(event) {
      onMapContextAdd(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function SelectedSpotEffect({ selectedSpot }: { selectedSpot?: Spot }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedSpot) return;

    map.flyTo([selectedSpot.lat, selectedSpot.lng], Math.max(map.getZoom(), 12), {
      duration: 0.65,
    });
  }, [map, selectedSpot?.id]);

  return null;
}

function CurrentLocationControl({
  onFound,
}: {
  onFound: (position: [number, number]) => void;
}) {
  const map = useMap();

  useEffect(() => {
    function handleLocationFound(event: L.LocationEvent) {
      const position: [number, number] = [
        event.latlng.lat,
        event.latlng.lng,
      ];

      onFound(position);
      map.flyTo(position, Math.max(map.getZoom(), 13), {
        duration: 0.65,
      });
    }

    function handleLocationError() {
      alert('현재 위치를 가져오지 못했습니다. 브라우저 위치 권한을 확인해주세요.');
    }

    map.on('locationfound', handleLocationFound);
    map.on('locationerror', handleLocationError);

    return () => {
      map.off('locationfound', handleLocationFound);
      map.off('locationerror', handleLocationError);
    };
  }, [map, onFound]);

  function moveToCurrentLocation() {
    map.locate({
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000,
    });
  }

  return (
    <button
      type="button"
      className="currentLocationButton"
      onClick={moveToCurrentLocation}
    >
      현재 위치
    </button>
  );
}

function SpotPopupPostPreview({ post }: { post?: SpotPost }) {
  if (!post) return null;

  return (
    <div className="spotPopupPostPreview">
      {post.image_url && (
        <img src={post.image_url} alt="" loading="lazy" />
      )}

      <p>
        {post.content ||
          '이 스팟에 현장 사진이 등록되어 있습니다.'}
      </p>
    </div>
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
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(
    null
  );

  const [postPreviewBySpotId, setPostPreviewBySpotId] = useState<
    Record<string, SpotPost>
  >({});

  const mapCenter = useMemo<LatLngExpression>(() => {
    if (selectedSpot) {
      return [selectedSpot.lat, selectedSpot.lng];
    }

    if (spots[0]) {
      return [spots[0].lat, spots[0].lng];
    }

    return DEFAULT_CENTER;
  }, [selectedSpot, spots]);

  const spotIds = useMemo(() => spots.map((spot) => spot.id), [spots]);

  const loadPostPreviews = useCallback(async () => {
    const previews = await fetchSpotPostPreviews(spotIds);
    setPostPreviewBySpotId(previews);
  }, [spotIds]);

  useEffect(() => {
    loadPostPreviews();
  }, [loadPostPreviews]);

  useEffect(() => {
    function handleSpotPostCreated() {
      loadPostPreviews();
    }

    window.addEventListener('spot-post-created', handleSpotPostCreated);

    return () => {
      window.removeEventListener('spot-post-created', handleSpotPostCreated);
    };
  }, [loadPostPreviews]);

  const visibleZones = useMemo(
    () => zones.filter((zone) => visibleLayers[zone.type]),
    [zones, visibleLayers]
  );

  const activeVWorldLayers = useMemo(
    () =>
      (vworldLayers as FlexibleVWorldLayer[]).filter(
        (layer) => visibleVWorldLayers[layer.id]
      ),
    [visibleVWorldLayers]
  );

  return (
    <MapContainer
      className="map"
      center={mapCenter}
      zoom={selectedSpot ? 12 : DEFAULT_ZOOM}
      scrollWheelZoom
      doubleClickZoom
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {vworldKey &&
        activeVWorldLayers.map((layer, index) => (
          <TileLayer
            key={layer.id}
            url={buildVWorldTileUrl(layer, vworldKey, vworldDomain)}
            opacity={0.58}
            zIndex={430 + index}
            attribution="VWorld"
          />
        ))}

      {visibleZones.map((zone) => renderZone(zone))}

      {spots.map((spot) => {
        const isSelected = selectedSpot?.id === spot.id;
        const postPreview = postPreviewBySpotId[spot.id];

        return (
          <Marker
            key={spot.id}
            position={[spot.lat, spot.lng]}
            icon={createSpotIcon(spot, isSelected)}
            eventHandlers={{
              click: () => onSelectSpot(spot),
            }}
          >
            <Popup>
              <div className="spotPopup">
                <strong>{spot.name}</strong>

                <p>
                  {categoryLabel[spot.category]} · {cautionLabel[spot.cautionLevel]}
                </p>

                <SpotPopupPostPreview post={postPreview} />

                <button type="button" onClick={() => onSelectSpot(spot)}>
                  상세 보기
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {currentPosition && (
        <Marker position={currentPosition} icon={currentLocationIcon}>
          <Popup>
            <div className="spotPopup">
              <strong>현재 위치</strong>
              <p>브라우저에서 확인한 현재 위치입니다.</p>
            </div>
          </Popup>
        </Marker>
      )}

      <CurrentLocationControl onFound={setCurrentPosition} />
      <SelectedSpotEffect selectedSpot={selectedSpot} />
      <MapContextHandler onMapContextAdd={onMapContextAdd} />
    </MapContainer>
  );
}