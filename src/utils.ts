import { AirspaceZone, CautionLevel, CrowdLevel, Difficulty, Parking, SpotCategory, TakeoffSpace, ZoneType } from './types';

export const categoryLabel: Record<SpotCategory, string> = {
  river: '강/호수', sea: '바다', mountain: '산/숲', city: '도시', night: '야경', sunset: '일몰',
};
export const difficultyLabel: Record<Difficulty, string> = { easy: '쉬움', normal: '보통', hard: '어려움' };
export const cautionLabel: Record<CautionLevel, string> = {
  easy: '비교적 쉬움', caution: '주의 필요', approval: '승인/확인 강력 필요', unknown: '정보 부족',
};
export const parkingLabel: Record<Parking, string> = { good: '가능/쉬움', normal: '보통', bad: '어려움', unknown: '정보 부족' };
export const takeoffSpaceLabel: Record<TakeoffSpace, string> = { wide: '넓음', normal: '보통', narrow: '협소', unknown: '정보 부족' };
export const crowdLevelLabel: Record<CrowdLevel, string> = { low: '적음', normal: '보통', high: '많음', unknown: '정보 부족' };

export const zoneLabel: Record<ZoneType, string> = {
  noFly: '비행금지구역',
  restricted: '비행제한구역',
  control: '관제권',
  danger: '위험지역',
  nationalPark: '국립자연공원',
  heritage: '문화재보호구역',
};

export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
export function averageRating(ratings: number[]) {
  if (!ratings.length) return 0;
  return ratings.reduce((sum, item) => sum + item, 0) / ratings.length;
}
export function getCautionColor(level: CautionLevel) {
  if (level === 'easy') return '#2f9e44';
  if (level === 'caution') return '#f59f00';
  if (level === 'approval') return '#e03131';
  return '#868e96';
}
export function getZoneColor(type: ZoneType) {
  if (type === 'noFly') return '#e03131';
  if (type === 'restricted') return '#f08c00';
  if (type === 'control') return '#1971c2';
  if (type === 'danger') return '#ae3ec9';
  if (type === 'nationalPark') return '#2f9e44';
  return '#0ca678';
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function pointInPolygon(lat: number, lng: number, polygon: [number, number][]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i][0], xi = polygon[i][1];
    const yj = polygon[j][0], xj = polygon[j][1];
    const intersect = xi > lng !== xj > lng && lat < ((yj - yi) * (lng - xi)) / (xj - xi) + yi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function zonesForPoint(lat: number, lng: number, zones: AirspaceZone[]) {
  return zones.filter((zone) => {
    if (zone.radiusKm) {
      return distanceKm(lat, lng, zone.center[0], zone.center[1]) <= zone.radiusKm;
    }
    if (zone.polygon) {
      return pointInPolygon(lat, lng, zone.polygon);
    }
    return false;
  });
}
