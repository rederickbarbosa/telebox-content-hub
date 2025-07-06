
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
    let isFirstChunk = false;

    // Detect if body is object with metadata or just array of channels
    if (Array.isArray(json)) {
      // É chunk subsequente (só canais)
      channels = json;
      console.log(`Processing subsequent chunk with ${channels.length} channels`);
    } else {
      // É primeiro chunk (tem metadata + channels)
      channels = json.channels ?? [];
      metadata = json.metadata;
      isFirstChunk = true;
      console.log(`Processing FIRST chunk with metadata and ${channels.length} channels`);
      
      // IMPORTANTE: Limpar dados antigos apenas no primeiro chunk
      console.log('FIRST CHUNK - Cleaning old data before processing');
      const { error: cleanError } = await supabase
        .from('catalogo_m3u_live')
        .update({ ativo: false })
        .eq('ativo', true);
      
      if (cleanError) {
        console.log('Warning: Error cleaning old data:', cleanError);
      } else {
        console.log('Successfully deactivated old catalog data');
      }
    }

    // Normalizar canais com validação rigorosa
    const normalizedChannels = channels
      .filter(channel => {
        // Filtrar apenas canais com nome válido
        const hasValidName = channel?.name || channel?.nome;
        if (!hasValidName) {
          console.log('Skipping channel without name:', channel);
          return false;
        }
        return true;
      })
      .map(channel => {
        return {
          tvg_id: channel.tvg_id || channel.id || '',
          nome: channel.name || channel.nome || 'Sem nome',
          grupo: channel.group_title || channel.grupo || 'Sem grupo',
          logo: channel.tvg_logo || channel.logo || '',
          url: '', // Campo obrigatório mas vazio conforme solicitado
          tipo: detectType(channel),
          qualidade: extractQuality(channel.name || channel.nome || ''),
          import_uuid: importUuid,
          ativo: true
        };
      });

    console.log(`Normalized ${normalizedChannels.length} valid channels from chunk`);

    if (normalizedChannels.length === 0) {
      console.log('No valid channels to insert');
      return new Response(JSON.stringify({ 
        success: true,
        processed: 0,
        importUuid,
        hasMetadata: !!metadata,
        totalReceived: channels.length,
        message: 'No valid channels found in chunk'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Inserir em batches menores para melhor performance
    const batchSize = 100; // Reduzido para evitar conflitos
    let insertedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < normalizedChannels.length; i += batchSize) {
      const batch = normalizedChannels.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} with ${batch.length} channels`);
      
      try {
        const { error: insertError, count } = await supabase
          .from('catalogo_m3u_live')
          .insert(batch)
          .select('id', { count: 'exact' });

        if (insertError) {
          console.error('Batch insert error:', insertError);
          errorCount += batch.length;
          
          // Fallback: inserir individualmente para identificar problemas
          for (const item of batch) {
            try {
              const { error: singleError } = await supabase
                .from('catalogo_m3u_live')
                .insert([item]);
              
              if (!singleError) {
                insertedCount++;
              } else {
                console.error('Individual insert error for item:', item.nome, singleError);
              }
            } catch (singleException) {
              console.error('Exception in individual insert:', singleException);
            }
          }
        } else {
          insertedCount += batch.length;
          console.log(`Successfully inserted batch ${Math.floor(i/batchSize) + 1}: ${batch.length} channels`);
        }
      } catch (batchException) {
        console.error('Exception in batch processing:', batchException);
        errorCount += batch.length;
      }
    }

    // Log detalhado da operação
    const logMessage = isFirstChunk 
      ? `M3U first chunk processed - Inserted: ${insertedCount}, Errors: ${errorCount}` 
      : `M3U chunk processed - Inserted: ${insertedCount}, Errors: ${errorCount}`;

    await supabase
      .from('system_logs')
      .insert({
        level: insertedCount > 0 ? 'info' : 'warning',
        message: logMessage,
        context: {
          importUuid,
          itemsProcessed: insertedCount,
          itemsWithErrors: errorCount,
          hasMetadata: !!metadata,
          totalReceived: normalizedChannels.length,
          isFirstChunk
        }
      });

    const response = { 
      success: true,
      processed: insertedCount,
      errors: errorCount,
      importUuid,
      hasMetadata: !!metadata,
      totalReceived: normalizedChannels.length,
      isFirstChunk,
      message: insertedCount > 0 
        ? `Successfully processed ${insertedCount} channels` 
        : `No channels inserted from ${normalizedChannels.length} received`
    };

    console.log('Chunk processing complete:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Critical error in ingest-m3u-chunk:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
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
  
  // Detecção mais específica
  if (group.includes('filme') || group.includes('movie') || group.includes('cinema')) return 'filme';
  if (group.includes('serie') || group.includes('tv') || group.includes('show') || group.includes('temporada')) return 'serie';
  if (name.match(/s\d{2}e\d{2}|temporada|season|episódio|episode/i)) return 'serie';
  if (name.match(/\b(hd|fhd|4k|sd|fullhd)\b/i)) return 'canal';
  
  // Por padrão, considerar como canal
  return 'canal';
}

function extractQuality(name: string): string {
  if (name.match(/4k|uhd/i)) return '4K';
  if (name.match(/fhd|fullhd|1080p/i)) return 'FHD';
  if (name.match(/\bhd\b|720p/i)) return 'HD';
  if (name.match(/sd|480p/i)) return 'SD';
  return 'SD';
}
