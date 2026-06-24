import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type SpotRow = {
  id: string;
  name: string;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit ?? 30), 100);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (!supabaseUrl || !serviceRoleKey || !cronSecret) {
      return new Response(
        JSON.stringify({ error: 'Required secrets are missing' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const { data: spots, error: spotsError } = await supabaseAdmin
      .from('spots')
      .select('id, name')
      .eq('status', 'approved')
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (spotsError) {
      return new Response(JSON.stringify({ error: spotsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    for (const spot of (spots ?? []) as SpotRow[]) {
      const response = await fetch(`${supabaseUrl}/functions/v1/fetch-external-content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spotId: spot.id }),
      });

      const result = await response.json().catch(() => ({}));

      results.push({
        spotId: spot.id,
        spotName: spot.name,
        ok: response.ok,
        status: response.status,
        result,
      });

      await sleep(350);
    }

    const okCount = results.filter((item) => item.ok).length;
    const failCount = results.length - okCount;

    return new Response(
      JSON.stringify({
        total: results.length,
        okCount,
        failCount,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('[refresh-external-contents] unexpected error', error);

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