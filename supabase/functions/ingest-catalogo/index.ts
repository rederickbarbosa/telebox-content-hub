import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedChannel {
  duration: string;
  name: string;
  tvg_id?: string;
  tvg_name?: string;
  tvg_logo?: string;
  group_title?: string;
  url: string;
}

interface ConvertedData {
  metadata: {
    generated_at: string;
    total_channels: number;
    converter: string;
    version: string;
  };
  channels: ParsedChannel[];
}

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
    
    const data: ConvertedData = await req.json();
    
    if (!data.channels || !Array.isArray(data.channels)) {
      throw new Error('Invalid data format: channels array is required');
    }

    console.log(`Processing ${data.channels.length} channels`);

    // Generate import UUID
    const importUuid = crypto.randomUUID();
    
    // Function to determine content type
    const determineType = (groupTitle: string, name: string): string => {
      const group = groupTitle.toLowerCase();
      const itemName = name.toLowerCase();
      
      if (group.includes('filme') || group.includes('movie')) return 'filme';
      if (group.includes('série') || group.includes('series') || group.includes('tv show')) return 'serie';
      if (group.includes('canal') || group.includes('channel') || 
          group.includes('esporte') || group.includes('sport') ||
          group.includes('noticia') || group.includes('news')) return 'canal';
      
      // Check URL patterns
      if (itemName.includes('/movie/') || itemName.includes('filme')) return 'filme';
      if (itemName.includes('/series/') || itemName.includes('série')) return 'serie';
      
      return 'canal'; // Default
    };

    // Function to determine quality
    const determineQuality = (name: string, groupTitle: string): string => {
      const text = `${name} ${groupTitle}`.toLowerCase();
      
      if (text.includes('4k') || text.includes('uhd')) return '4K';
      if (text.includes('fhd') || text.includes('1080p')) return 'FHD';
      if (text.includes('hd') || text.includes('720p')) return 'HD';
      if (text.includes('sd') || text.includes('480p')) return 'SD';
      
      return 'SD'; // Default
    };

    // Process channels in batches
    const batchSize = 1000;
    let processedCount = 0;
    
    for (let i = 0; i < data.channels.length; i += batchSize) {
      const batch = data.channels.slice(i, i + batchSize);
      
      const records = batch.map(channel => ({
        import_uuid: importUuid,
        tvg_id: channel.tvg_id || '',
        nome: channel.name || '',
        grupo: channel.group_title || '',
        logo: channel.tvg_logo || '',
        tipo: determineType(channel.group_title || '', channel.name || ''),
        qualidade: determineQuality(channel.name || '', channel.group_title || ''),
        url: channel.url || '',
        ativo: true
      }));

      // Upsert batch
      const { error: upsertError } = await supabase
        .from('catalogo_m3u_live')
        .upsert(records, {
          onConflict: 'tvg_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('Batch upsert error:', upsertError);
        throw new Error(`Failed to upsert batch: ${upsertError.message}`);
      }

      processedCount += batch.length;
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}, total: ${processedCount}`);
    }

    // Run cleanup after all batches
    const { error: cleanupError } = await supabase
      .rpc('cleanup_m3u', { current_import_uuid: importUuid });

    if (cleanupError) {
      console.error('Cleanup error:', cleanupError);
      // Don't throw here, just log
    }

    // Add items to TMDB pending queue
    const { error: tmdbError } = await supabase
      .from('tmdb_pending')
      .upsert(
        data.channels
          .filter(ch => {
            const type = determineType(ch.group_title || '', ch.name || '');
            return type === 'filme' || type === 'serie';
          })
          .map(ch => ({
            nome: ch.name || '',
            tipo: determineType(ch.group_title || '', ch.name || ''),
            status: 'pending'
          })),
        { onConflict: 'nome,tipo', ignoreDuplicates: true }
      );

    if (tmdbError) {
      console.error('TMDB queue error:', tmdbError);
      // Don't throw here, just log
    }

    // Log operation
    await supabase
      .from('system_logs')
      .insert({
        level: 'info',
        message: 'Catalog import completed',
        context: {
          import_uuid: importUuid,
          total_channels: data.channels.length,
          processed: processedCount
        }
      });

    return new Response(JSON.stringify({ 
      success: true,
      import_uuid: importUuid,
      total_channels: data.channels.length,
      processed: processedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ingest-catalogo:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});