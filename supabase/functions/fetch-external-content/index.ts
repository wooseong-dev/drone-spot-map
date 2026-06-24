import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type SpotRow = {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  tags?: string[] | null;
};

type ExternalContentRow = {
  spot_id: string;
  source: 'naver_blog' | 'tistory' | 'web' | 'youtube';
  title: string;
  url: string;
  description: string | null;
  author: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  query: string;
  relevance_score: number;
  status: 'visible';
  raw: unknown;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function isAuthorized(req: Request) {
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('authorization') ?? '';

  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

function stripHtml(value: string | null | undefined) {
  if (!value) return '';

  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .trim();
}

function normalizeDateYYYYMMDD(value: string | null | undefined) {
  if (!value || value.length !== 8) return null;

  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);

  return `${year}-${month}-${day}T00:00:00.000Z`;
}

function getSourceFromWebUrl(url: string): 'tistory' | 'web' {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('tistory.com')) return 'tistory';
    return 'web';
  } catch {
    return 'web';
  }
}

function uniqueByUrl(items: ExternalContentRow[]) {
  const seen = new Set<string>();
  const result: ExternalContentRow[] = [];

  for (const item of items) {
    const key = `${item.source}:${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function buildQueries(spot: SpotRow) {
  const baseName = stripHtml(spot.name);
  const address = stripHtml(spot.address ?? '');
  const shortAddress = address
    .split(' ')
    .slice(0, 3)
    .join(' ')
    .trim();

  const cleanedName = baseName
    .replace(/[·ㆍ|/\\()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const nameParts = cleanedName
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

  const queries = [
    `${cleanedName} 드론 촬영`,
    `${cleanedName} 드론`,
    `${cleanedName} 촬영 포인트`,
  ];

  for (const part of nameParts.slice(0, 3)) {
    queries.push(`${part} 드론 촬영`);
  }

  if (shortAddress) {
    queries.push(`${shortAddress} 드론 촬영`);
  }

  return Array.from(new Set(queries)).slice(0, 5);
}

async function fetchNaver(
  kind: 'blog' | 'webkr',
  query: string,
  display: number,
) {
  const clientId = Deno.env.get('NAVER_CLIENT_ID');
  const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.warn('[fetch-external-content] Naver keys are missing.');
    return [];
  }

  const url = new URL(`https://openapi.naver.com/v1/search/${kind}.json`);
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(display));
  url.searchParams.set('start', '1');

  if (kind === 'blog') {
    url.searchParams.set('sort', 'sim');
  }

  const response = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!response.ok) {
    console.error('[fetch-external-content] Naver API error', kind, response.status);
    return [];
  }

  const json = await response.json();
  return json.items ?? [];
}

async function fetchYoutube(query: string, display: number) {
  const key = Deno.env.get('YOUTUBE_API_KEY');

  if (!key) {
    console.warn('[fetch-external-content] YouTube API key is missing.');
    return [];
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('key', key);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(display));
  url.searchParams.set('q', query);
  url.searchParams.set('order', 'relevance');
  url.searchParams.set('regionCode', 'KR');
  url.searchParams.set('relevanceLanguage', 'ko');

  const response = await fetch(url.toString());

  if (!response.ok) {
    console.error('[fetch-external-content] YouTube API error', response.status);
    return [];
  }

  const json = await response.json();
  return json.items ?? [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { spotId } = await req.json();

    if (!spotId) {
      return new Response(JSON.stringify({ error: 'spotId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Supabase admin secrets are missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const { data: spot, error: spotError } = await supabaseAdmin
      .from('spots')
      .select('id, name, address, category, tags')
      .eq('id', spotId)
      .single();

    if (spotError || !spot) {
      return new Response(JSON.stringify({ error: 'Spot not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetSpot = spot as SpotRow;
    const queries = buildQueries(targetSpot);
    const rows: ExternalContentRow[] = [];

    for (const query of queries) {
      const [naverBlogs, webDocs, youtubeVideos] = await Promise.all([
        fetchNaver('blog', query, 5),
        fetchNaver('webkr', query, 5),
        fetchYoutube(query, 5),
      ]);

      for (const item of naverBlogs) {
        rows.push({
          spot_id: targetSpot.id,
          source: 'naver_blog',
          title: stripHtml(item.title),
          url: item.link,
          description: stripHtml(item.description),
          author: stripHtml(item.bloggername),
          thumbnail_url: null,
          published_at: normalizeDateYYYYMMDD(item.postdate),
          query,
          relevance_score: 80,
          status: 'visible',
          raw: item,
        });
      }

      for (const item of webDocs) {
        rows.push({
          spot_id: targetSpot.id,
          source: getSourceFromWebUrl(item.link),
          title: stripHtml(item.title),
          url: item.link,
          description: stripHtml(item.description),
          author: null,
          thumbnail_url: null,
          published_at: null,
          query,
          relevance_score: 50,
          status: 'visible',
          raw: item,
        });
      }

      for (const item of youtubeVideos) {
        const videoId = item?.id?.videoId;
        const snippet = item?.snippet;

        if (!videoId || !snippet) continue;

        rows.push({
          spot_id: targetSpot.id,
          source: 'youtube',
          title: stripHtml(snippet.title),
          url: `https://www.youtube.com/watch?v=${videoId}`,
          description: stripHtml(snippet.description),
          author: stripHtml(snippet.channelTitle),
          thumbnail_url:
            snippet.thumbnails?.medium?.url ??
            snippet.thumbnails?.default?.url ??
            null,
          published_at: snippet.publishedAt ?? null,
          query,
          relevance_score: 70,
          status: 'visible',
          raw: item,
        });
      }
    }

    const dedupedRows = uniqueByUrl(rows).slice(0, 24);

    if (dedupedRows.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, queries }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: upsertError } = await supabaseAdmin
      .from('external_contents')
      .upsert(dedupedRows, {
        onConflict: 'spot_id,source,url',
      });

    if (upsertError) {
      console.error('[fetch-external-content] upsert error', upsertError);
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        inserted: dedupedRows.length,
        queries,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('[fetch-external-content] unexpected error', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});