import { supabase } from '../lib/supabase';
import { SavedStatus } from '../types';

export async function fetchUserBookmarks(userId: string) {
  const { data, error } = await supabase
    .from('user_bookmarks')
    .select('spot_id, status')
    .eq('user_id', userId);

  if (error) {
    console.error('[Supabase] Failed to fetch bookmarks:', error);
    return {};
  }

  const result: Record<string, SavedStatus[]> = {};

  for (const row of data ?? []) {
    const spotId = row.spot_id as string;
    const status = row.status as SavedStatus;

    if (!result[spotId]) result[spotId] = [];
    result[spotId].push(status);
  }

  return result;
}

export async function addUserBookmark(
  userId: string,
  spotId: string,
  status: SavedStatus
) {
  const { error } = await supabase.from('user_bookmarks').insert({
    user_id: userId,
    spot_id: spotId,
    status,
  });

  if (error) {
    console.error('[Supabase] Failed to add bookmark:', error);
    throw error;
  }
}

export async function removeUserBookmark(
  userId: string,
  spotId: string,
  status: SavedStatus
) {
  const { error } = await supabase
    .from('user_bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('spot_id', spotId)
    .eq('status', status);

  if (error) {
    console.error('[Supabase] Failed to remove bookmark:', error);
    throw error;
  }
}