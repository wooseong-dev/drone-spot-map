import { supabase } from '../lib/supabase';

export type ExternalContentSource = 'naver_blog' | 'tistory' | 'web' | 'youtube';

export type ExternalContent = {
  id: string;
  spot_id: string;
  source: ExternalContentSource;
  title: string;
  url: string;
  description: string | null;
  author: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  query: string | null;
  relevance_score: number;
  status: 'visible' | 'hidden' | 'rejected';
  is_owner_content: boolean;
  display_priority: number;
  owner_label: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchExternalContents(spotId: string) {
  const { data, error } = await supabase
    .from('external_contents')
    .select('*')
    .eq('spot_id', spotId)
    .eq('status', 'visible')
    .order('display_priority', { ascending: false })
    .order('is_owner_content', { ascending: false })
    .order('relevance_score', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(24);

  if (error) {
    console.error('[ExternalContents] fetch failed:', error);
    return [];
  }

  return (data ?? []) as ExternalContent[];
}