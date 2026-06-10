export type SpotCategory = 'river' | 'sea' | 'mountain' | 'city' | 'night' | 'sunset';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type CautionLevel = 'easy' | 'caution' | 'approval' | 'unknown';
export type Parking = 'good' | 'normal' | 'bad' | 'unknown';
export type TakeoffSpace = 'wide' | 'normal' | 'narrow' | 'unknown';
export type CrowdLevel = 'low' | 'normal' | 'high' | 'unknown';
export type SavedStatus = 'favorite' | 'want' | 'visited' | 'disliked';

export interface Review {
  id: string;
  nickname: string;
  rating: number;
  content: string;
  createdAt: string;
}

export interface Spot {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: SpotCategory;
  difficulty: Difficulty;
  cautionLevel: CautionLevel;
  parking: Parking;
  takeoffSpace: TakeoffSpace;
  crowdLevel: CrowdLevel;
  bestTime: string[];
  viewPoints: string[];
  cautions: string[];
  tags: string[];
  description: string;
  takeoffPoint: string;
  officialCheckUrl: string;
  imageUrl?: string;
  reviews: Review[];
}

export type ZoneType = 'noFly' | 'restricted' | 'control' | 'danger' | 'nationalPark' | 'heritage';

export interface AirspaceZone {
  id: string;
  name: string;
  type: ZoneType;
  description: string;
  source: string;
  center: [number, number];
  radiusKm?: number;
  polygon?: [number, number][];
}
