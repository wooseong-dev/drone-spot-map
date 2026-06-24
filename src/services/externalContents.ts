import { supabase } from '../lib/supabase';

export type ExternalContentSource =
  | 'naver_blog'
  | 'tistory'
  | 'web'
  | 'youtube';

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
  relevance_score: number | null;
  status: string;
  created_at: string;
};

export async function fetchExternalContents(spotId: string) {
  const { data, error } = await supabase
    .from('external_contents')
    .select(
      'id, spot_id, source, title, url, description, author, thumbnail_url, published_at, query, relevance_score, status, created_at'
    )
    .eq('spot_id', spotId)
    .eq('status', 'visible')
    .order('source', { ascending: true })
    .order('relevance_score', { ascending: false })
    .limit(24);

  if (error) {
    console.error('[Supabase] Failed to fetch external contents:', error);
    return [];
  }

  return (data ?? []) as ExternalContent[];
}

export async function refreshExternalContents(spotId: string) {
  const { data, error } = await supabase.functions.invoke(
    'fetch-external-content',
    {
      body: { spotId },
    }
  );

  if (error) {
    console.error('[Supabase] Failed to refresh external contents:', error);
    throw error;
  }

  return data as { inserted: number; queries?: string[] };
}