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

    const { m3uContent, userId } = await req.json();

    console.log('Processing M3U content for user:', userId);

    // Verificar se o usuário é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (profile?.role !== 'admin') {
      throw new Error('Acesso negado. Apenas administradores podem processar M3U.');
    }

    // Parse M3U content
    const lines = m3uContent.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
    const channels = [];
    let currentChannel: any = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('#EXTINF:')) {
        // Parse EXTINF line
        const extinfData = parseEXTINF(line);
        currentChannel = { ...extinfData };
      } else if (line.startsWith('http') || line.includes('://')) {
        // URL line
        if (Object.keys(currentChannel).length > 0) {
          currentChannel.url = line;
          
          // Determinar tipo baseado no grupo ou nome
          let tipo = 'canal';
          if (currentChannel.group_title) {
            const grupo = currentChannel.group_title.toLowerCase();
            if (grupo.includes('filme') || grupo.includes('movie')) {
              tipo = 'filme';
            } else if (grupo.includes('serie') || grupo.includes('tv') || grupo.includes('show')) {
              tipo = 'serie';
            }
          }
          
          // Extrair qualidade do nome
          let qualidade = 'SD';
          const nome = currentChannel.name?.toLowerCase() || '';
          if (nome.includes('4k')) qualidade = '4K';
          else if (nome.includes('fhd') || nome.includes('fullhd')) qualidade = 'FHD';
          else if (nome.includes('hd')) qualidade = 'HD';
          
          // Extrair região
          let regiao = '';
          const regiaoMatch = nome.match(/(sp|rj|mg|rs|pr|sc|ba|go|df|ce|pe|pb|rn|al|se|pi|ma|pa|ap|ac|ro|rr|am|to|mt|ms|es)/i);
          if (regiaoMatch) regiao = regiaoMatch[1].toUpperCase();

          channels.push({
            nome: currentChannel.name || 'Sem nome',
            grupo: currentChannel.group_title || 'Outros',
            tvg_id: currentChannel.tvg_id || '',
            tvg_logo: currentChannel.tvg_logo || '',
            url: currentChannel.url,
            tipo,
            qualidade,
            regiao,
            metadata: currentChannel
          });
          currentChannel = {};
        }
      }
    }

    console.log(`Processados ${channels.length} canais`);

    // Limpar catálogo anterior
    await supabase.from('catalogo_m3u').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Inserir novos dados em lotes
    const batchSize = 100;
    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize);
      const { error } = await supabase.from('catalogo_m3u').insert(batch);
      if (error) {
        console.error('Erro ao inserir lote:', error);
      }
    }

    // Atualizar contadores no conteudos
    await updateContentCounts(supabase, channels);

    console.log('M3U processado com sucesso');

    return new Response(JSON.stringify({ 
      success: true, 
      totalChannels: channels.length,
      stats: {
        filmes: channels.filter(c => c.tipo === 'filme').length,
        series: channels.filter(c => c.tipo === 'serie').length,
        canais: channels.filter(c => c.tipo === 'canal').length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no processamento M3U:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseEXTINF(line: string) {
  const channel: any = {};
  
  // Extract channel name (after last comma)
  const nameMatch = line.match(/,([^,]+)$/);
  if (nameMatch) {
    channel.name = nameMatch[1].trim();
  }

  // Extract attributes
  const attributeRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
  let match;
  while ((match = attributeRegex.exec(line)) !== null) {
    const key = match[1].replace(/-/g, '_');
    channel[key] = match[2];
  }

  return channel;
}

async function updateContentCounts(supabase: any, channels: any[]) {
  // Agrupar por tipo para inserir/atualizar na tabela conteudos
  const conteudos = channels
    .filter(c => c.tipo !== 'canal')
    .map(c => ({
      nome: c.nome,
      tipo: c.tipo,
      poster_url: c.tvg_logo,
      generos: c.grupo ? [c.grupo] : [],
      disponivel: true
    }));

  if (conteudos.length > 0) {
    // Inserir conteúdos únicos
    const uniqueContent = conteudos.filter((content, index, self) => 
      index === self.findIndex(c => c.nome === content.nome && c.tipo === content.tipo)
    );

    const { error } = await supabase.from('conteudos').upsert(uniqueContent, {
      onConflict: 'nome,tipo'
    });
    
    if (error) {
      console.error('Erro ao atualizar conteúdos:', error);
    }
  }
}