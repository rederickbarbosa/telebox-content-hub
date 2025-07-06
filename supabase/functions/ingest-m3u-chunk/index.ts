
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
      
      // Se é o primeiro chunk, limpar dados antigos
      if (metadata) {
        console.log('First chunk detected - cleaning old data');
        const { error: cleanError } = await supabase
          .from('catalogo_m3u_live')
          .update({ ativo: false })
          .eq('ativo', true);
        
        if (cleanError) {
          console.log('Warning: Error cleaning old data:', cleanError);
        }
      }
    }

    const normalizedChannels = channels.map(channel => {
      return {
        tvg_id: channel.tvg_id || '',
        nome: channel.name || channel.nome || 'Sem nome',
        grupo: channel.group_title || channel.grupo || 'Sem grupo',
        logo: channel.tvg_logo || channel.logo || '',
        url: '', // Campo obrigatório mas vazio conforme solicitado
        tipo: detectType(channel),
        qualidade: extractQuality(channel.name || channel.nome || ''),
        import_uuid: importUuid,
        ativo: true
      };
    }).filter(Boolean);

    console.log(`Normalized ${normalizedChannels.length} channels from chunk`);

    // Batch insert in groups of 500 for better performance
    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < normalizedChannels.length; i += batchSize) {
      const batch = normalizedChannels.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('catalogo_m3u_live')
        .insert(batch);

      if (insertError) {
        console.error('Batch insert error:', insertError);
        
        // Try individual inserts for problematic batch
        for (const item of batch) {
          try {
            const { error: singleError } = await supabase
              .from('catalogo_m3u_live')
              .insert([item]);
            
            if (!singleError) {
              insertedCount++;
            }
          } catch (singleException) {
            // Continue with next item
          }
        }
      } else {
        insertedCount += batch.length;
        console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}, total: ${insertedCount}`);
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
          hasMetadata: !!metadata,
          totalReceived: normalizedChannels.length
        }
      });

    return new Response(JSON.stringify({ 
      success: true,
      processed: insertedCount,
      importUuid,
      hasMetadata: !!metadata,
      totalReceived: normalizedChannels.length
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
