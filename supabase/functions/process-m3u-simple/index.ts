import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para detectar tipo baseado no nome
function detectType(name: string, group?: string): string {
  const nameUpper = name.toUpperCase();
  const groupUpper = (group || '').toUpperCase();
  
  // Verificar se é série
  if (nameUpper.includes('T0') || nameUpper.includes('S0') || nameUpper.includes('EP') || 
      nameUpper.includes('TEMP') || nameUpper.includes('SERIE') || groupUpper.includes('SERIE')) {
    return 'serie';
  }
  
  // Verificar se é filme
  if (nameUpper.includes('FILME') || groupUpper.includes('FILME') || 
      nameUpper.includes('MOVIE') || groupUpper.includes('MOVIE')) {
    return 'filme';
  }
  
  // Se contém indicadores de qualidade ou palavras de canal, é canal
  if (nameUpper.includes('HD') || nameUpper.includes('FHD') || nameUpper.includes('4K') || 
      nameUpper.includes('SD') || nameUpper.includes('TV') || nameUpper.includes('CANAL') ||
      groupUpper.includes('CANAL') || groupUpper.includes('TV')) {
    return 'canal';
  }
  
  // Por padrão, se não conseguir identificar, considera filme
  return 'filme';
}

// Função para extrair qualidade
function extractQuality(name: string): string {
  const nameUpper = name.toUpperCase();
  if (nameUpper.includes('4K')) return '4K';
  if (nameUpper.includes('FHD') || nameUpper.includes('FULLHD')) return 'FHD';
  if (nameUpper.includes('HD')) return 'HD';
  return 'SD';
}

// Função para extrair região (UF)
function extractRegion(name: string): string {
  const ufs = ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'GO', 'DF', 'CE', 'PE', 'PB', 'RN', 'AL', 'SE', 'PI', 'MA', 'PA', 'AP', 'AC', 'RO', 'RR', 'AM', 'TO', 'MT', 'MS', 'ES'];
  const nameUpper = name.toUpperCase();
  
  for (const uf of ufs) {
    if (nameUpper.includes(` ${uf} `) || nameUpper.includes(`-${uf}-`) || nameUpper.includes(`_${uf}_`)) {
      return uf;
    }
  }
  return '';
}

// Função para enriquecer com TMDB
async function enrichWithTMDB(item: any, tmdbToken: string) {
  try {
    if (!tmdbToken || item.tipo === 'canal') return {};
    
    const cleanName = item.nome.replace(/\(.*?\)|\[.*?\]/g, '').trim();
    const searchType = item.tipo === 'serie' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/search/${searchType}?query=${encodeURIComponent(cleanName)}&language=pt-BR`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${tmdbToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) return {};
    
    const data = await response.json();
    const result = data.results?.[0];
    
    if (!result) return {};
    
    return {
      tmdb_id: result.id,
      nome_original: result.original_title || result.original_name,
      descricao: result.overview,
      poster_url: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null,
      backdrop_url: result.backdrop_path ? `https://image.tmdb.org/t/p/w1280${result.backdrop_path}` : null,
      ano: parseInt((result.release_date || result.first_air_date || '').slice(0, 4)) || null,
      classificacao: result.vote_average || 0,
      generos: result.genre_ids ? result.genre_ids.map((id: number) => id.toString()) : []
    };
  } catch (error) {
    console.warn('Erro ao buscar TMDB para:', item.nome, error);
    return {};
  }
}

serve(async (req) => {
  console.log('🚀 M3U SIMPLE FUNCTION CALLED - Method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Starting M3U Simple processing...');
    
    // Environment check
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      const error = 'Missing environment variables';
      console.error('❌', error);
      return new Response(JSON.stringify({ 
        error,
        debug: { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      console.log('⚠️ No JSON body or parsing error:', e.message);
      requestBody = {};
    }

    // Get TMDB token for enrichment
    const { data: tmdbSetting } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'tmdb_token')
      .single();
    
    const tmdbToken = tmdbSetting?.setting_value;
    console.log('🎬 TMDB Token available:', !!tmdbToken);

    // Process M3U content
    const { m3uContent } = requestBody;
    
    if (!m3uContent) {
      console.log('📄 No M3U content provided, using test M3U');
      
      // Use a test M3U content
      const testM3U = `#EXTM3U
#EXTINF:-1 tvg-id="globo-sp" tvg-name="Globo SP" tvg-logo="https://logoeps.com/wp-content/uploads/2013/03/globo-vector-logo.png" group-title="TV Aberta",Globo SP HD
http://exemplo.com/globo-sp.m3u8
#EXTINF:-1 tvg-id="sbt-sp" tvg-name="SBT SP" tvg-logo="https://logoeps.com/wp-content/uploads/2013/03/sbt-vector-logo.png" group-title="TV Aberta",SBT SP HD
http://exemplo.com/sbt-sp.m3u8
#EXTINF:-1 tvg-id="filme1" tvg-name="Vingadores Ultimato" tvg-logo="" group-title="Filmes",Vingadores Ultimato (2019)
http://exemplo.com/vingadores.m3u8
#EXTINF:-1 tvg-id="serie1" tvg-name="Breaking Bad" tvg-logo="" group-title="Séries",Breaking Bad T01 EP01
http://exemplo.com/breaking-bad.m3u8
#EXTINF:-1 tvg-id="serie2" tvg-name="The Office" tvg-logo="" group-title="Séries",The Office (US)
http://exemplo.com/the-office.m3u8
#EXTINF:-1 tvg-id="filme2" tvg-name="John Wick" tvg-logo="" group-title="Filmes",John Wick (2014)
http://exemplo.com/john-wick.m3u8`;
      
      return await processM3UContent(testM3U, supabase, tmdbToken);
    }

    console.log('✅ M3U content provided, processing real content...');
    return await processM3UContent(m3uContent, supabase, tmdbToken);

  } catch (error) {
    console.error('💥 CRITICAL ERROR in M3U Simple function:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(JSON.stringify({ 
      error: 'Critical error in M3U Simple function',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processM3UContent(m3uContent: string, supabase: any, tmdbToken: string) {
  console.log('📄 Processing M3U content...');
  
  // Parse M3U content
  const lines = m3uContent.split('\n').map(line => line.trim()).filter(line => line);
  const channels = [];
  let currentChannel: any = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('#EXTINF:')) {
      // Parse EXTINF line
      const nameMatch = line.match(/,(.*)$/);
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/);
      
      currentChannel = {
        nome: nameMatch?.[1] || 'Canal sem nome',
        tvg_id: tvgIdMatch?.[1] || '',
        tvg_name: tvgNameMatch?.[1] || '',
        tvg_logo: tvgLogoMatch?.[1] || '',
        grupo: groupTitleMatch?.[1] || 'Outros'
      };
    } else if (line.startsWith('http') || line.includes('://')) {
      // URL line
      if (Object.keys(currentChannel).length > 0) {
        currentChannel.url = line;
        
        // Determine type, quality, and region
        currentChannel.tipo = detectType(currentChannel.nome, currentChannel.grupo);
        currentChannel.qualidade = extractQuality(currentChannel.nome);
        currentChannel.regiao = extractRegion(currentChannel.nome);
        
        channels.push(currentChannel);
        currentChannel = {};
      }
    }
  }
  
  console.log(`📺 Parsed ${channels.length} channels from M3U`);
  
  // Enrich channels with TMDB data for movies and series (first 10 for performance)
  const enrichedChannels = [];
  const contentToEnrich = channels.filter(c => c.tipo === 'filme' || c.tipo === 'serie').slice(0, 10);
  
  for (const channel of channels) {
    let enrichedChannel = { ...channel };
    
    if (contentToEnrich.includes(channel) && tmdbToken) {
      console.log(`🔍 Enriching ${channel.tipo}: ${channel.nome}`);
      const tmdbData = await enrichWithTMDB(channel, tmdbToken);
      enrichedChannel = { ...enrichedChannel, ...tmdbData };
    }
    
    enrichedChannels.push(enrichedChannel);
  }
  
  // Clear existing catalog and insert new data
  console.log('🗑️ Clearing existing catalog...');
  await supabase.from('catalogo_m3u').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Insert enriched channels into catalogo_m3u
  if (enrichedChannels.length > 0) {
    console.log(`💾 Inserting ${enrichedChannels.length} channels into catalogo_m3u...`);
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < enrichedChannels.length; i += batchSize) {
      const batch = enrichedChannels.slice(i, i + batchSize);
      const catalogBatch = batch.map(channel => ({
        nome: channel.nome,
        tipo: channel.tipo,
        grupo: channel.grupo,
        tvg_id: channel.tvg_id,
        tvg_logo: channel.tvg_logo,
        url: channel.url,
        qualidade: channel.qualidade,
        regiao: channel.regiao,
        ativo: true
      }));
      
      const { error: catalogError } = await supabase
        .from('catalogo_m3u')
        .insert(catalogBatch);
      
      if (catalogError) {
        console.error('❌ Error inserting batch into catalogo_m3u:', catalogError);
      } else {
        insertedCount += batch.length;
        console.log(`✅ Inserted batch ${i / batchSize + 1} into catalogo_m3u`);
      }
    }
  }
  
  // Also insert enriched content into conteudos table for better functionality
  const contentItems = enrichedChannels
    .filter(channel => (channel.tipo === 'filme' || channel.tipo === 'serie') && channel.tmdb_id)
    .map(channel => ({
      nome: channel.nome,
      nome_original: channel.nome_original,
      tipo: channel.tipo,
      descricao: channel.descricao,
      poster_url: channel.poster_url,
      backdrop_url: channel.backdrop_url,
      tmdb_id: channel.tmdb_id,
      ano: channel.ano,
      classificacao: channel.classificacao,
      generos: channel.generos,
      m3u_url: channel.url,
      disponivel: true
    }));
  
  if (contentItems.length > 0) {
    console.log(`💾 Inserting ${contentItems.length} content items into conteudos...`);
    const { error: contentError } = await supabase
      .from('conteudos')
      .upsert(contentItems, { onConflict: 'm3u_url' });
    
    if (contentError) {
      console.error('❌ Error inserting into conteudos:', contentError);
    } else {
      console.log('✅ Successfully inserted into conteudos');
    }
  }
  
  const stats = {
    totalChannels: channels.length,
    filmes: channels.filter(c => c.tipo === 'filme').length,
    series: channels.filter(c => c.tipo === 'serie').length,
    canais: channels.filter(c => c.tipo === 'canal').length
  };
  
  console.log('✅ M3U SIMPLE PROCESSING COMPLETED SUCCESSFULLY');
  console.log('📊 Final stats:', stats);
  
  return new Response(JSON.stringify({ 
    success: true,
    message: 'M3U processado com sucesso!',
    timestamp: new Date().toISOString(),
    stats,
    channels: channels.slice(0, 3) // Return first 3 channels as sample
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}