
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
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ 
        error: 'Arquivo não fornecido',
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const startTime = Date.now();
    const logs: string[] = [];
    
    const addLog = (level: string, message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      logs.push(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    };

    addLog('info', `Iniciando processamento servidor: ${file.name} (${Math.round(file.size / 1024)} KB)`);
    
    // Ler conteúdo do arquivo
    const fileContent = await file.text();
    addLog('info', 'Arquivo lido com sucesso, iniciando parsing M3U...');
    
    // Parse M3U content
    const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);
    const channels = [];
    let currentChannel: any = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('#EXTINF:')) {
        currentChannel = parseEXTINF(line);
      } else if (line.startsWith('http') || line.includes('://')) {
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

          channels.push({
            nome: currentChannel.name || 'Sem nome',
            tipo,
            poster_url: currentChannel.tvg_logo || null,
            m3u_url: currentChannel.url,
            generos: currentChannel.group_title ? [currentChannel.group_title] : [],
            disponivel: true,
            classificacao: null,
            ano: null,
            descricao: null,
            nome_original: null,
            pais: 'BR',
            tmdb_id: null,
            trailer_url: null,
            backdrop_url: null
          });
          currentChannel = {};
        }
      }
    }

    addLog('success', `Parsing concluído: ${channels.length} canais encontrados`);
    
    // Configuração de chunks
    const chunkSize = 1000; // Otimizado para modo servidor
    const totalChunks = Math.ceil(channels.length / chunkSize);
    
    addLog('info', `Iniciando inserção em ${totalChunks} blocos de ${chunkSize} canais cada`);
    
    // Limpar catálogo anterior (opcional - pode ser configurado)
    const { error: deleteError } = await supabase
      .from('conteudos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError && !deleteError.message.includes('no rows')) {
      addLog('warning', `Aviso ao limpar catálogo anterior: ${deleteError.message}`);
    } else {
      addLog('info', 'Catálogo anterior limpo com sucesso');
    }

    let successCount = 0;
    let failedChunks = 0;
    
    // Processar em blocos
    for (let i = 0; i < totalChunks; i++) {
      const chunk = channels.slice(i * chunkSize, (i + 1) * chunkSize);
      let attempts = 0;
      let success = false;
      
      // Tentar até 3 vezes por bloco
      while (attempts < 3 && !success) {
        attempts++;
        addLog('info', `Bloco ${i + 1}/${totalChunks} - Tentativa ${attempts} (${chunk.length} canais)`);
        
        try {
          const { error: insertError } = await supabase
            .from('conteudos')
            .insert(chunk);

          if (insertError) {
            if (attempts === 3) {
              addLog('error', `Bloco ${i + 1} falhou definitivamente: ${insertError.message}`);
              failedChunks++;
            } else {
              addLog('warning', `Bloco ${i + 1} falhou na tentativa ${attempts}, tentando novamente...`);
              await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Delay exponencial
            }
          } else {
            addLog('success', `✓ Bloco ${i + 1} inserido com sucesso (${chunk.length} canais)`);
            successCount += chunk.length;
            success = true;
          }
        } catch (error: any) {
          if (attempts === 3) {
            addLog('error', `Bloco ${i + 1} erro crítico: ${error.message}`);
            failedChunks++;
          } else {
            addLog('warning', `Bloco ${i + 1} erro na tentativa ${attempts}: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
          }
        }
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Resultado final
    const finalMessage = failedChunks === 0 
      ? `✅ Importação concluída com 100% de sucesso!`
      : `⚠️ Importação parcial: ${failedChunks} blocos falharam`;
    
    addLog('info', finalMessage);
    addLog('info', `Estatísticas: ${successCount}/${channels.length} canais inseridos em ${duration}s`);
    addLog('info', `Blocos processados: ${totalChunks - failedChunks}/${totalChunks} com sucesso`);

    // Gerar JSON para download
    const catalogJson = {
      metadata: {
        generated_at: new Date().toISOString(),
        total_channels: channels.length,
        successful_inserts: successCount,
        failed_chunks: failedChunks,
        processing_time: `${duration}s`,
        converter: "TELEBOX Server M3U Converter",
        version: "2.0"
      },
      channels: channels.slice(0, 100) // Prévia dos primeiros 100 para download
    };

    return new Response(JSON.stringify({ 
      success: failedChunks === 0,
      processed: successCount,
      total: channels.length,
      failed_chunks: failedChunks,
      duration: `${duration}s`,
      logs,
      preview_json: catalogJson,
      stats: {
        filmes: channels.filter(c => c.tipo === 'filme').length,
        series: channels.filter(c => c.tipo === 'serie').length,
        canais: channels.filter(c => c.tipo === 'canal').length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erro crítico na importação servidor:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      logs: [`[${new Date().toLocaleTimeString()}] CRITICAL: ${error.message}`],
      timestamp: new Date().toISOString()
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
