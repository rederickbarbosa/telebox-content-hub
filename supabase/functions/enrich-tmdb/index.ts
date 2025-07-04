import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get TMDB token from admin settings
    const { data: settingData } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'tmdb_token')
      .single();

    const tmdbToken = settingData?.setting_value;
    
    if (!tmdbToken) {
      throw new Error('TMDB token not configured in admin settings');
    }

    const { batchSize = 10 } = await req.json().catch(() => ({}));

    // Get pending items for enrichment
    const { data: pendingItems, error: fetchError } = await supabase
      .from('tmdb_pending')
      .select('id, nome, tipo')
      .eq('status', 'pending')
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch pending items: ${fetchError.message}`);
    }

    if (!pendingItems || pendingItems.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No pending items to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${pendingItems.length} items for TMDB enrichment`);

    let processedCount = 0;
    let enrichedCount = 0;

    for (const item of pendingItems) {
      try {
        // Mark as processing
        await supabase
          .from('tmdb_pending')
          .update({ status: 'processing' })
          .eq('id', item.id);

        // Search TMDB
        const tmdbData = await searchTMDB(item.nome, item.tipo, tmdbToken);
        
        if (tmdbData) {
          // Update catalog with TMDB data
          const { error: updateError } = await supabase
            .from('catalogo_m3u_live')
            .update({
              poster_url: tmdbData.poster_url,
              backdrop_url: tmdbData.backdrop_url,
              tmdb_id: tmdbData.tmdb_id,
              ano: tmdbData.ano,
              classificacao: tmdbData.classificacao,
              descricao: tmdbData.descricao,
              updated_at: new Date().toISOString()
            })
            .eq('nome', item.nome)
            .eq('tipo', item.tipo);

          if (updateError) {
            console.error('Failed to update catalog item:', updateError);
          } else {
            enrichedCount++;
          }
        }

        // Mark as completed
        await supabase
          .from('tmdb_pending')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        processedCount++;

        // Rate limiting: 40 requests per minute
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('tmdb_pending')
          .update({ 
            status: 'failed',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);
      }
    }

    // Log operation
    await supabase
      .from('system_logs')
      .insert({
        level: 'info',
        message: 'TMDB enrichment batch completed',
        context: {
          processed: processedCount,
          enriched: enrichedCount,
          batchSize
        }
      });

    return new Response(JSON.stringify({ 
      success: true,
      processed: processedCount,
      enriched: enrichedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enrich-tmdb:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function searchTMDB(nome: string, tipo: string, token: string) {
  try {
    // Clean the name for search
    const cleanName = nome
      .replace(/\(.*\)|\bHD\b|\bFHD\b|\b4K\b|\bSD\b/gi, '')
      .trim();

    const searchType = tipo === 'serie' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/search/${searchType}?query=${encodeURIComponent(cleanName)}&language=pt-BR`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    
    return {
      tmdb_id: result.id,
      poster_url: result.poster_path ? `https://image.tmdb.org/t/p/w342${result.poster_path}` : null,
      backdrop_url: result.backdrop_path ? `https://image.tmdb.org/t/p/w780${result.backdrop_path}` : null,
      ano: parseInt((result.release_date || result.first_air_date || '').slice(0, 4)) || null,
      classificacao: result.vote_average || null,
      descricao: result.overview || null
    };

  } catch (error) {
    console.error('TMDB search error:', error);
    return null;
  }
}