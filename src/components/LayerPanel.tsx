import { VWorldLayerType } from '../data/vworldLayers';
import { ZoneType } from '../types';

type LayerPanelProps = {
  visibleLayers: Record<ZoneType, boolean>;
  visibleVWorldLayers: Record<VWorldLayerType, boolean>;
  vworldEnabled: boolean;
  onToggle: (type: ZoneType) => void;
  onToggleAll: (value: boolean) => void;
  onToggleVWorld: (type: VWorldLayerType) => void;
  onToggleAllVWorld: (value: boolean) => void;
};

const officialLayers: { id: VWorldLayerType; label: string }[] = [
  { id: 'noFly', label: '비행금지구역' },
  { id: 'restricted', label: '비행제한구역' },
  { id: 'control', label: '관제권' },
  { id: 'military', label: '군작전구역' },
  { id: 'danger', label: '위험구역' },
  { id: 'droneZone', label: '드론시범사업구역' },
];

export default function LayerPanel({
  visibleVWorldLayers,
  vworldEnabled,
  onToggleVWorld,
  onToggleAllVWorld,
}: LayerPanelProps) {
  const enabledCount = officialLayers.filter((layer) => visibleVWorldLayers[layer.id]).length;

  return (
    <section className="officialLayerPanel compactLayerPanel" aria-label="공식 공역 레이어">
      <div className="officialLayerHeader compactLayerHeader">
        <div>
          <strong>공식 공역</strong>
          <p>비행 전 참고용 공역 레이어입니다.</p>
        </div>

        <div className="layerHeaderActions">
          <button type="button" onClick={() => onToggleAllVWorld(true)}>
            전체
          </button>
          <button type="button" onClick={() => onToggleAllVWorld(false)}>
            해제
          </button>
        </div>
      </div>

      {!vworldEnabled && (
        <div className="layerNotice">
          공식 공역 레이어를 불러올 수 없습니다. 관리자 설정을 확인해주세요.
        </div>
      )}

      <div className="officialLayerList compactLayerList">
        {officialLayers.map((layer) => (
          <label key={layer.id} className="officialLayerItem compactLayerItem">
            <input
              type="checkbox"
              checked={visibleVWorldLayers[layer.id]}
              disabled={!vworldEnabled}
              onChange={() => onToggleVWorld(layer.id)}
            />
            <span className={`vworldLegend ${layer.id}`} />
            <span>{layer.label}</span>
          </label>
        ))}
      </div>

      <div className="officialLayerFooter compactLayerFooter">
        <span>{enabledCount}개 표시 중</span>
        <div>
          <a href="https://drone.onestop.go.kr/" target="_blank" rel="noreferrer">
            드론원스톱
          </a>
          <a href="https://www.dji.com/kr/flysafe" target="_blank" rel="noreferrer">
            DJI Fly Safe
          </a>
          <a href="https://www.vworld.kr/" target="_blank" rel="noreferrer">
            브이월드
          </a>
        </div>
      </div>
    </section>
  );
}