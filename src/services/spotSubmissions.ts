import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Spot } from '../types';

const OWNER_EMAILS = ['ww0547@naver.com'];

export type SpotRequest = {
  id: string;
  requester_id: string | null;
  requester_email: string | null;
  status: 'pending' | 'approved' | 'rejected';
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: Spot['category'];
  difficulty: Spot['difficulty'];
  cautionLevel: Spot['cautionLevel'];
  parking: Spot['parking'];
  takeoffSpace: Spot['takeoffSpace'];
  crowdLevel: Spot['crowdLevel'];
  bestTime: string[];
  viewPoints: string[];
  cautions: string[];
  tags: string[];
  description: string;
  takeoffPoint: string;
  officialCheckUrl: string;
  imageUrl?: string | null;
  admin_note?: string | null;
  approved_spot_id?: string | null;
  createdAt: string;
  updatedAt: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  return 'Unknown error';
}

export async function fetchIsAdmin(user: User | null) {
  if (!user) return false;

  const email = user.email?.toLowerCase() ?? '';

  if (OWNER_EMAILS.includes(email)) {
    return true;
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc('is_admin');

  if (!rpcError && rpcData === true) {
    return true;
  }

  if (rpcError) {
    console.warn('[Admin] RPC admin check failed:', rpcError);
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[Admin] Failed to check admin:', error);
    return false;
  }

  return Boolean(data);
}

export async function createApprovedSpot(spot: Spot) {
  const payload = {
    ...spot,
    imageUrl: spot.imageUrl ?? null,
    status: 'approved',
    createdAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('spots')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('[Spot] createApprovedSpot failed:', error);
    throw new Error(getErrorMessage(error));
  }

  return data as Spot;
}

export async function createSpotRequest(spot: Spot, user: User) {
  const { data, error } = await supabase
    .from('spot_requests')
    .insert({
      requester_id: user.id,
      requester_email: user.email,
      name: spot.name,
      address: spot.address,
      lat: spot.lat,
      lng: spot.lng,
      category: spot.category,
      difficulty: spot.difficulty,
      cautionLevel: spot.cautionLevel,
      parking: spot.parking,
      takeoffSpace: spot.takeoffSpace,
      crowdLevel: spot.crowdLevel,
      bestTime: spot.bestTime,
      viewPoints: spot.viewPoints,
      cautions: spot.cautions,
      tags: spot.tags,
      description: spot.description,
      takeoffPoint: spot.takeoffPoint,
      officialCheckUrl: spot.officialCheckUrl,
      imageUrl: spot.imageUrl ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[SpotRequest] createSpotRequest failed:', error);
    throw new Error(getErrorMessage(error));
  }

  return data as SpotRequest;
}

export async function fetchPendingSpotRequests() {
  const { data, error } = await supabase
    .from('spot_requests')
    .select('*')
    .eq('status', 'pending')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[SpotRequest] fetchPendingSpotRequests failed:', error);
    throw new Error(getErrorMessage(error));
  }

  return (data ?? []) as SpotRequest[];
}

export async function approveSpotRequest(requestId: string) {
  const { data, error } = await supabase.rpc('approve_spot_request', {
    target_request_id: requestId,
  });

  if (error) {
    console.error('[SpotRequest] approveSpotRequest failed:', error);
    throw new Error(getErrorMessage(error));
  }

  return data as { ok: boolean; spotId?: string; message?: string };
}

export async function rejectSpotRequest(requestId: string, note?: string) {
  const { data, error } = await supabase.rpc('reject_spot_request', {
    target_request_id: requestId,
    note: note ?? null,
  });

  if (error) {
    console.error('[SpotRequest] rejectSpotRequest failed:', error);
    throw new Error(getErrorMessage(error));
  }

  return data as { ok: boolean };
}