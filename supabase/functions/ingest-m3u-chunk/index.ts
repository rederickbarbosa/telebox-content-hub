
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
    
    const body = await req.text();
    const json = JSON.parse(body);
    
    // Generate import UUID if not provided
    const importUuid = crypto.randomUUID();
    
    let channels: any[] = [];
    let metadata: any = null;

    // Detect if body is object with metadata or just array of channels
    if (Array.isArray(json)) {
      // É só lista de canais (chunks subsequentes)
      channels = json;
      console.log(`Processing chunk with ${channels.length} channels (no metadata)`);
    } else {
      // Tem metadata + channels (primeiro chunk)
      channels = json.channels ?? [];
      metadata = json.metadata;
      console.log(`Processing first chunk with metadata and ${channels.length} channels`);
      
      // Log metadata if present
      if (metadata) {
        await supabase
          .from('system_logs')
          .insert({
            level: 'info',
            message: 'Import started with metadata',
            context: {
              importUuid,
              totalChannels: metadata.total_channels,
              generatedAt: metadata.generated_at,
              converter: metadata.converter
            }
          });
      }
    }

    const items = channels.map(channel => {
      return {
        tvg_id: channel.tvg_id || channel.id || null,
        nome: channel.name || channel.nome || 'Sem nome',
        grupo: channel.group_title || channel.grupo || null,
        logo: channel.tvg_logo || channel.logo || null,
        url: channel.url,
        tipo: detectType(channel),
        qualidade: extractQuality(channel.name || channel.nome || ''),
        import_uuid: importUuid,
        ativo: true
      };
    }).filter(Boolean);

    console.log(`Parsed ${items.length} items from chunk`);

    // Batch insert in groups of 1000
    const batchSize = 1000;
    let insertedCount = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('catalogo_m3u_live')
        .upsert(batch, { 
          onConflict: 'tvg_id',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error('Batch insert error:', insertError);
        throw new Error(`Failed to insert batch: ${insertError.message}`);
      }

      insertedCount += batch.length;
      console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}, total: ${insertedCount}`);
    }

    // Add to TMDB enrichment queue (movies and series only)
    const enrichItems = items
      .filter(item => item.tipo === 'filme' || item.tipo === 'serie')
      .map(item => ({
        nome: item.nome,
        tipo: item.tipo,
        status: 'pending'
      }));

    if (enrichItems.length > 0) {
      const { error: queueError } = await supabase
        .from('tmdb_pending')
        .insert(enrichItems);

      if (queueError) {
        console.log('Warning: Failed to queue TMDB enrichment:', queueError);
      } else {
        console.log(`Queued ${enrichItems.length} items for TMDB enrichment`);
      }
    }

    // Log operation
    await supabase
      .from('system_logs')
      .insert({
        level: 'info',
        message: 'M3U chunk processed successfully',
        context: {
          importUuid,
          itemsProcessed: insertedCount,
          enrichmentQueued: enrichItems.length,
          hasMetadata: !!metadata
        }
      });

    return new Response(JSON.stringify({ 
      success: true,
      processed: insertedCount,
      enrichmentQueued: enrichItems.length,
      importUuid,
      hasMetadata: !!metadata
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ingest-m3u-chunk:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function detectType(item: any): string {
  const name = (item.name || item.nome || '').toLowerCase();
  const group = (item.group_title || item.grupo || '').toLowerCase();
  
  if (group.includes('filme') || group.includes('movie')) return 'filme';
  if (group.includes('serie') || group.includes('tv') || group.includes('show')) return 'serie';
  if (name.match(/s\d{2}e\d{2}|temporada|season/i)) return 'serie';
  if (name.match(/\b(hd|fhd|4k|sd)\b/i)) return 'canal';
  
  return 'canal';
}

function extractQuality(name: string): string {
  if (name.match(/4k/i)) return '4K';
  if (name.match(/fhd|fullhd/i)) return 'FHD';
  if (name.match(/\bhd\b/i)) return 'HD';
  return 'SD';
}
