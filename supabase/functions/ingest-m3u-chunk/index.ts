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
    
    const { fileName, importUuid } = await req.json();
    
    if (!fileName || !importUuid) {
      throw new Error('fileName and importUuid are required');
    }

    console.log('Processing chunk:', fileName, 'for import:', importUuid);

    // Download chunk from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('m3u-parts')
      .download(fileName);

    if (downloadError) {
      throw new Error(`Failed to download chunk: ${downloadError.message}`);
    }

    // Decompress and parse JSONL
    const compressed = new Uint8Array(await fileData.arrayBuffer());
    const decompressed = new Response(compressed.stream().pipeThrough(new DecompressionStream('gzip')));
    const text = await decompressed.text();
    
    const lines = text.split('\n').filter(line => line.trim());
    const items = lines.map(line => {
      try {
        const parsed = JSON.parse(line);
        return {
          tvg_id: parsed.tvg_id || null,
          nome: parsed.nome || 'Sem nome',
          grupo: parsed.grupo || null,
          logo: parsed.logo || null,
          url: parsed.url,
          tipo: detectType(parsed),
          qualidade: extractQuality(parsed.nome || ''),
          import_uuid: importUuid,
          ativo: true
        };
      } catch (e) {
        console.error('Failed to parse line:', line, e);
        return null;
      }
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
          fileName,
          importUuid,
          itemsProcessed: insertedCount,
          enrichmentQueued: enrichItems.length
        }
      });

    return new Response(JSON.stringify({ 
      success: true,
      itemsProcessed: insertedCount,
      enrichmentQueued: enrichItems.length,
      fileName
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
  const name = (item.nome || '').toLowerCase();
  const group = (item.grupo || '').toLowerCase();
  
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