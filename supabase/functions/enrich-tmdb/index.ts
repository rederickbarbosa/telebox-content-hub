import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar token TMDB
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'tmdb_token')
      .single();

    const tmdbToken = settings?.setting_value;
    if (!tmdbToken) {
      throw new Error('Token TMDB não configurado');
    }

    const { contentId, title, type } = await req.json();

    console.log(`Enriquecendo conteúdo: ${title} (${type})`);

    // Buscar no TMDB
    const searchUrl = type === 'filme' 
      ? `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&language=pt-BR`
      : `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(title)}&language=pt-BR`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${tmdbToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`Erro na busca TMDB: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const results = searchData.results || [];

    if (results.length === 0) {
      console.log(`Nenhum resultado encontrado para: ${title}`);
      return new Response(JSON.stringify({ success: false, message: 'Não encontrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const item = results[0];
    const itemId = item.id;

    // Buscar detalhes completos
    const detailsUrl = type === 'filme'
      ? `https://api.themoviedb.org/3/movie/${itemId}?language=pt-BR&append_to_response=videos,credits`
      : `https://api.themoviedb.org/3/tv/${itemId}?language=pt-BR&append_to_response=videos,credits`;

    const detailsResponse = await fetch(detailsUrl, {
      headers: {
        'Authorization': `Bearer ${tmdbToken}`,
        'Content-Type': 'application/json'
      }
    });

    const details = await detailsResponse.json();

    // Extrair informações
    const posterUrl = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null;
    const backdropUrl = details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : null;
    
    // Trailer (YouTube)
    const trailer = details.videos?.results?.find((v: any) => 
      v.type === 'Trailer' && v.site === 'YouTube'
    );
    const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

    // Gêneros
    const generos = details.genres?.map((g: any) => g.name) || [];

    // Atualizar no banco
    const updateData = {
      tmdb_id: itemId,
      nome_original: details.original_title || details.original_name,
      descricao: details.overview,
      poster_url: posterUrl,
      backdrop_url: backdropUrl,
      trailer_url: trailerUrl,
      generos,
      ano: new Date(details.release_date || details.first_air_date || '').getFullYear() || null,
      classificacao: details.vote_average,
      pais: details.origin_country?.[0] || details.production_countries?.[0]?.iso_3166_1 || 'BR'
    };

    const { error } = await supabase
      .from('conteudos')
      .update(updateData)
      .eq('id', contentId);

    if (error) {
      throw new Error(`Erro ao atualizar conteúdo: ${error.message}`);
    }

    console.log(`Conteúdo enriquecido: ${title}`);

    return new Response(JSON.stringify({ 
      success: true, 
      tmdb_id: itemId,
      title: details.title || details.name,
      poster_url: posterUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no enriquecimento TMDB:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});