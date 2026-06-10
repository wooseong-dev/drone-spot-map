export type VWorldLayerType =
  | 'noFly'
  | 'restricted'
  | 'control'
  | 'military'
  | 'danger'
  | 'droneZone';

export interface VWorldLayer {
  id: VWorldLayerType;
  label: string;
  layerName: string;
  description: string;
}

export const vworldLayers: VWorldLayer[] = [
  {
    id: 'noFly',
    label: '비행금지구역',
    layerName: 'lt_c_aisprhc',
    description: '항공교통 안전을 위해 비행이 금지된 공역',
  },
  {
    id: 'restricted',
    label: '비행제한구역',
    layerName: 'lt_c_aisresc',
    description: '항공안전 등을 위해 비행이 제한되는 공역',
  },
  {
    id: 'control',
    label: '관제권',
    layerName: 'lt_c_aisctrc',
    description: '공항 주변 관제권',
  },
  {
    id: 'military',
    label: '군작전구역',
    layerName: 'lt_c_aismoac',
    description: '군 작전 관련 공역',
  },
  {
    id: 'danger',
    label: '위험구역',
    layerName: 'lt_c_aisdngc',
    description: '항공 활동상 위험이 있을 수 있는 공역',
  },
  {
    id: 'droneZone',
    label: '드론시범사업구역',
    layerName: 'lt_c_aisdronezone',
    description: '드론 관련 시범사업 구역',
  },
];
