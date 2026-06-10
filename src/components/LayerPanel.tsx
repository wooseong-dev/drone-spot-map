import { Database, ExternalLink, Layers } from 'lucide-react';
import { ZoneType } from '../types';
import { getZoneColor, zoneLabel } from '../utils';
import { VWorldLayerType, vworldLayers } from '../data/vworldLayers';

interface LayerPanelProps {
  visibleLayers: Record<ZoneType, boolean>;
  visibleVWorldLayers: Record<VWorldLayerType, boolean>;
  vworldEnabled: boolean;
  onToggle: (type: ZoneType) => void;
  onToggleAll: (value: boolean) => void;
  onToggleVWorld: (type: VWorldLayerType) => void;
  onToggleAllVWorld: (value: boolean) => void;
}

const zoneTypes: ZoneType[] = ['noFly', 'restricted', 'control', 'danger', 'nationalPark', 'heritage'];

export default function LayerPanel({
  visibleLayers,
  visibleVWorldLayers,
  vworldEnabled,
  onToggle,
  onToggleAll,
  onToggleVWorld,
  onToggleAllVWorld,
}: LayerPanelProps) {
  return (
    <section className="layerPanel">
      <div className="layerHeader">
        <div><Layers size={17} /> 샘플 참고 레이어</div>
        <div className="layerActions">
          <button onClick={() => onToggleAll(true)}>전체</button>
          <button onClick={() => onToggleAll(false)}>해제</button>
        </div>
      </div>

      <div className="layerList">
        {zoneTypes.map((type) => (
          <label key={type} className="layerItem">
            <input type="checkbox" checked={visibleLayers[type]} onChange={() => onToggle(type)} />
            <span className="layerSwatch" style={{ borderColor: getZoneColor(type), backgroundColor: `${getZoneColor(type)}24` }} />
            {zoneLabel[type]}
          </label>
        ))}
      </div>

      <div className="layerDivider" />

      <div className="layerHeader">
        <div><Database size={17} /> 브이월드 공공데이터</div>
        <div className="layerActions">
          <button onClick={() => onToggleAllVWorld(true)}>전체</button>
          <button onClick={() => onToggleAllVWorld(false)}>해제</button>
        </div>
      </div>

      {!vworldEnabled && (
        <div className="apiNotice">
          `.env`에 <strong>VITE_VWORLD_KEY</strong>를 넣으면 실제 WMS 레이어가 표시돼.
        </div>
      )}

      <div className="layerList">
        {vworldLayers.map((layer) => (
          <label key={layer.id} className={vworldEnabled ? 'layerItem' : 'layerItem disabled'}>
            <input
              type="checkbox"
              disabled={!vworldEnabled}
              checked={visibleVWorldLayers[layer.id]}
              onChange={() => onToggleVWorld(layer.id)}
            />
            <span className="layerSwatch publicLayer" />
            {layer.label}
          </label>
        ))}
      </div>

      <div className="officialLinks">
        <a href="https://drone.onestop.go.kr/" target="_blank" rel="noreferrer">
          <ExternalLink size={14} /> 드론원스톱
        </a>
        <a href="https://fly-safe.dji.com/" target="_blank" rel="noreferrer">
          <ExternalLink size={14} /> DJI Fly Safe
        </a>
        <a href="https://www.vworld.kr/dev/v4dv_wmsguide2_s001.do" target="_blank" rel="noreferrer">
          <ExternalLink size={14} /> 브이월드 WMS
        </a>
      </div>
    </section>
  );
}
