
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

  const startTime = Date.now();
  const logs: string[] = [];
  
  const addLog = (level: string, message: string) => {
    const timestamp = new Date().toISOString();
    logs.push(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
  };

  try {
    addLog('info', 'Iniciando processamento no modo servidor');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente Supabase não configuradas');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar se é FormData
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      throw new Error('Content-Type deve ser multipart/form-data');
    }
    
    addLog('info', 'Lendo FormData do request...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('Arquivo não encontrado no FormData');
    }

    addLog('info', `Arquivo recebido: ${file.name} (${Math.round(file.size / 1024)} KB)`);
    
    // Verificar se o arquivo não é muito grande (limite de 50MB)
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('Arquivo muito grande. Limite máximo: 50MB');
    }
    
    // Ler conteúdo do arquivo
    addLog('info', 'Lendo conteúdo do arquivo...');
    const fileContent = await file.text();
    
    if (!fileContent || fileContent.trim().length === 0) {
      throw new Error('Arquivo vazio ou não pôde ser lido');
    }
    
    addLog('info', `Conteúdo lido: ${fileContent.length} caracteres`);
    
    // Parse M3U content
    addLog('info', 'Iniciando conversão M3U para JSON...');
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
            duration: currentChannel.duration || '-1',
            name: currentChannel.name || 'Sem nome',
            tvg_id: currentChannel.tvg_id || '',
            tvg_name: currentChannel.tvg_name || '',
            tvg_logo: currentChannel.tvg_logo || '',
            group_title: currentChannel.group_title || '',
            url: currentChannel.url,
            tipo,
            qualidade
          });
          currentChannel = {};
        }
      }
    }

    addLog('success', `Conversão concluída: ${channels.length} canais encontrados`);
    
    // Gerar estatísticas por grupo
    const stats: Record<string, number> = {};
    channels.forEach(channel => {
      const grupo = channel.group_title || 'Sem grupo';
      stats[grupo] = (stats[grupo] || 0) + 1;
    });
    
    // Preparar dados para inserção no banco
    const chunkSize = 1000;
    const totalChunks = Math.ceil(channels.length / chunkSize);
    
    addLog('info', `Iniciando inserção em ${totalChunks} blocos de ${chunkSize} canais cada`);
    
    // Limpar catálogo anterior
    const { error: deleteError } = await supabase
      .from('catalogo_m3u_live')
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
      const chunkData = chunk.map(channel => ({
        nome: channel.name,
        tipo: channel.tipo,
        grupo: channel.group_title,
        logo: channel.tvg_logo,
        qualidade: channel.qualidade,
        tvg_id: channel.tvg_id,
        url: channel.url,
        ativo: true
      }));
      
      let attempts = 0;
      let success = false;
      
      // Tentar até 3 vezes por bloco
      while (attempts < 3 && !success) {
        attempts++;
        addLog('info', `Bloco ${i + 1}/${totalChunks} - Tentativa ${attempts} (${chunk.length} canais)`);
        
        try {
          const { error: insertError } = await supabase
            .from('catalogo_m3u_live')
            .insert(chunkData);

          if (insertError) {
            if (attempts === 3) {
              addLog('error', `Bloco ${i + 1} falhou definitivamente: ${insertError.message}`);
              failedChunks++;
            } else {
              addLog('warning', `Bloco ${i + 1} falhou na tentativa ${attempts}, tentando novamente...`);
              await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
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

    // Gerar JSON para preview
    const previewJson = {
      metadata: {
        generated_at: new Date().toISOString(),
        total_channels: channels.length,
        successful_inserts: successCount,
        failed_chunks: failedChunks,
        processing_time: `${duration}s`,
        converter: "TELEBOX Server M3U Converter",
        version: "2.0"
      },
      channels: channels.slice(0, 50) // Prévia dos primeiros 50
    };

    // Retornar sempre status 200, mesmo com falhas parciais
    return new Response(JSON.stringify({ 
      success: failedChunks === 0,
      processed: successCount,
      total: channels.length,
      failed_chunks: failedChunks,
      duration: `${duration}s`,
      logs,
      preview_json: previewJson,
      stats
    }), {
      status: 200, // Sempre 200, mesmo com falhas parciais
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    addLog('error', `Erro crítico na importação: ${error.message}`);
    console.error('Erro crítico na importação servidor:', error);
    
    // Retornar detalhes do erro com status 200 para que o frontend possa processar
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      logs,
      processed: 0,
      total: 0,
      failed_chunks: 1,
      duration: '0s',
      timestamp: new Date().toISOString()
    }), {
      status: 200, // Status 200 para que o frontend possa ler o JSON de erro
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseEXTINF(line: string) {
  const channel: any = {};
  
  // Extract duration (usually -1)
  const durationMatch = line.match(/#EXTINF:([^,\s]+)/);
  if (durationMatch) {
    channel.duration = durationMatch[1];
  }

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
