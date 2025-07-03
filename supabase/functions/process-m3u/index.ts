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
    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Variáveis de ambiente não configuradas:', { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey });
      return new Response(JSON.stringify({ 
        error: 'Configuração do servidor incorreta. Variáveis de ambiente não encontradas.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Criar cliente com service role para operações admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extrair token JWT do header Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: 'Token de autorização não fornecido.' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Criar cliente com token do usuário para verificação
    const userSupabase = createClient(
      supabaseUrl, 
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    // Extrair usuário do JWT
    const { data: { user }, error: userError } = await userSupabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      console.error('Erro de autenticação:', userError);
      return new Response(JSON.stringify({ 
        error: 'Token de autorização inválido.' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      console.error('Erro ao fazer parse do JSON:', e);
      return new Response(JSON.stringify({ 
        error: 'Formato de dados inválido. JSON malformado.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { m3uContent } = requestBody;

    if (!m3uContent) {
      return new Response(JSON.stringify({ 
        error: 'Conteúdo M3U não fornecido.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing M3U content for user:', user.id);

    // Verificar se o usuário é admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      console.error('Acesso negado:', profileError);
      return new Response(JSON.stringify({ 
        error: 'Acesso negado. Apenas administradores podem processar M3U.' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // Criar JSON estruturado
    const catalogJson = {
      metadata: {
        generated_at: new Date().toISOString(),
        total_channels: channels.length,
        converter: "TELEBOX M3U Converter",
        version: "1.0"
      },
      channels: channels
    };

    // Salvar JSON no Storage
    const jsonFileName = `catalog-${Date.now()}.json`;
    const { error: uploadError } = await supabase.storage
      .from('catalog-json')
      .upload(jsonFileName, JSON.stringify(catalogJson, null, 2), {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      console.error('Erro ao fazer upload do JSON:', uploadError);
      throw new Error('Erro ao salvar catálogo no storage');
    }

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

    // Salvar referência do arquivo JSON nas configurações
    await supabase.rpc('upsert_admin_setting', {
      key: 'catalog_json_file',
      value: jsonFileName,
      description_text: 'Arquivo JSON do catálogo atual'
    });

    console.log('M3U processado com sucesso, JSON salvo:', jsonFileName);

    return new Response(JSON.stringify({ 
      success: true, 
      totalChannels: channels.length,
      jsonFile: jsonFileName,
      stats: {
        filmes: channels.filter(c => c.tipo === 'filme').length,
        series: channels.filter(c => c.tipo === 'serie').length,
        canais: channels.filter(c => c.tipo === 'canal').length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro detalhado no processamento M3U:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });
    
    let errorMessage = 'Erro interno do servidor';
    let statusCode = 500;
    
    if (error.message?.includes('fetch')) {
      errorMessage = 'Erro de conexão ao processar dados';
      statusCode = 502;
    } else if (error.message?.includes('JSON')) {
      errorMessage = 'Erro no formato dos dados';
      statusCode = 400;
    } else if (error.message?.includes('permission') || error.message?.includes('auth')) {
      errorMessage = 'Erro de permissões no banco de dados';
      statusCode = 403;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: statusCode,
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