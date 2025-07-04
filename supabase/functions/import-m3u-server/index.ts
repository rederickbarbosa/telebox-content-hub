
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
    addLog('info', '🚀 Iniciando processamento M3U no servidor');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('❌ Variáveis de ambiente Supabase não configuradas');
    }

    addLog('info', '✅ Credenciais Supabase OK');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar se é FormData
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      throw new Error('❌ Content-Type deve ser multipart/form-data');
    }
    
    addLog('info', '📥 Lendo FormData do request...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('❌ Arquivo não encontrado no FormData');
    }

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    addLog('info', `📁 Arquivo recebido: ${file.name} (${fileSizeMB}MB)`);
    
    // Verificar se o arquivo não é muito grande (limite de 50MB)
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('❌ Arquivo muito grande. Limite máximo: 50MB');
    }
    
    // Ler conteúdo do arquivo
    addLog('info', '📖 Lendo conteúdo do arquivo...');
    const fileContent = await file.text();
    
    if (!fileContent || fileContent.trim().length === 0) {
      throw new Error('❌ Arquivo vazio ou não pôde ser lido');
    }
    
    addLog('info', `✅ Conteúdo lido: ${fileContent.length.toLocaleString()} caracteres`);
    
    // Parse M3U content
    addLog('info', '🔄 Iniciando conversão M3U para JSON...');
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
            grupo: currentChannel.group_title || 'Sem grupo',
            logo: currentChannel.tvg_logo || '',
            qualidade,
            tvg_id: currentChannel.tvg_id || '',
            url: currentChannel.url,
            ativo: true
          });
          currentChannel = {};
        }
      }
    }

    addLog('success', `✅ Conversão concluída: ${channels.length.toLocaleString()} canais encontrados`);
    
    // Gerar estatísticas por grupo
    const stats: Record<string, number> = {};
    channels.forEach(channel => {
      const grupo = channel.grupo || 'Sem grupo';
      stats[grupo] = (stats[grupo] || 0) + 1;
    });
    
    addLog('info', `📊 Grupos encontrados: ${Object.keys(stats).length}`);
    
    // Limpar catálogo anterior ANTES de inserir
    addLog('info', '🧹 Limpando catálogo anterior...');
    try {
      const { error: deleteError, count } = await supabase
        .from('catalogo_m3u_live')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except a dummy row
      
      if (deleteError && !deleteError.message.includes('no rows')) {
        addLog('warning', `⚠️ Aviso ao limpar catálogo: ${deleteError.message}`);
      } else {
        addLog('success', `✅ Catálogo anterior limpo: ${count || 0} registros removidos`);
      }
    } catch (cleanupError: any) {
      addLog('warning', `⚠️ Erro na limpeza (continuando): ${cleanupError.message}`);
    }

    // Inserir em blocos menores para evitar problemas de quota
    const chunkSize = 10000; // Reduzido para 10k por bloco
    const totalChunks = Math.ceil(channels.length / chunkSize);
    
    addLog('info', `📦 Iniciando inserção em ${totalChunks} blocos de até ${chunkSize.toLocaleString()} canais cada`);
    
    let successCount = 0;
    let failedChunks = 0;
    
    // Processar em blocos
    for (let i = 0; i < totalChunks; i++) {
      const chunk = channels.slice(i * chunkSize, (i + 1) * chunkSize);
      
      addLog('info', `📤 Processando bloco ${i + 1}/${totalChunks} (${chunk.length.toLocaleString()} canais)`);
      
      try {
        const { data, error: insertError } = await supabase
          .from('catalogo_m3u_live')
          .insert(chunk)
          .select('id');

        if (insertError) {
          addLog('error', `❌ Erro no bloco ${i + 1}: ${insertError.message}`);
          addLog('error', `❌ Detalhes do erro: ${JSON.stringify(insertError)}`);
          failedChunks++;
        } else {
          const insertedCount = data?.length || chunk.length;
          addLog('success', `✅ Bloco ${i + 1} inserido com sucesso: ${insertedCount.toLocaleString()} canais`);
          if (data && data.length > 0) {
            addLog('info', `🔗 Primeiros IDs inseridos: ${data.slice(0, 3).map(row => row.id).join(', ')}...`);
          }
          successCount += insertedCount;
        }
      } catch (error: any) {
        addLog('error', `❌ Exceção no bloco ${i + 1}: ${error.message}`);
        console.error('Erro detalhado:', error);
        failedChunks++;
      }
      
      // Pequeno delay entre blocos para não sobrecarregar
      if (i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Verificar se realmente inseriu no banco
    addLog('info', '🔍 Verificando dados inseridos no banco...');
    try {
      const { count, error: countError } = await supabase
        .from('catalogo_m3u_live')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true);
      
      if (countError) {
        addLog('warning', `⚠️ Erro ao contar registros: ${countError.message}`);
      } else {
        addLog('info', `📊 Total de registros ativos na tabela: ${count?.toLocaleString() || 0}`);
      }
    } catch (error: any) {
      addLog('warning', `⚠️ Erro na verificação: ${error.message}`);
    }
    
    // Resultado final
    const finalMessage = failedChunks === 0 
      ? `🎉 Importação concluída com 100% de sucesso!`
      : `⚠️ Importação parcial: ${failedChunks} de ${totalChunks} blocos falharam`;
    
    addLog('info', finalMessage);
    addLog('info', `📊 Estatísticas finais: ${successCount.toLocaleString()}/${channels.length.toLocaleString()} canais processados em ${duration}s`);
    
    // Gerar JSON para preview
    const previewJson = {
      metadata: {
        generated_at: new Date().toISOString(),
        total_channels: channels.length,
        successful_inserts: successCount,
        failed_chunks: failedChunks,
        processing_time: `${duration}s`,
        converter: "TELEBOX Server M3U Converter",
        version: "3.0"
      },
      channels: channels.slice(0, 50) // Prévia dos primeiros 50
    };

    // Retornar sempre status 200 com detalhes completos
    return new Response(JSON.stringify({ 
      success: failedChunks === 0,
      processed: successCount,
      total: channels.length,
      failed_chunks: failedChunks,
      duration: `${duration}s`,
      logs,
      preview_json: previewJson,
      stats,
      table_verification: successCount > 0 ? 'Dados inseridos com sucesso' : 'ATENÇÃO: Nenhum dado foi inserido'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    addLog('error', `💥 Erro crítico na importação: ${error.message}`);
    console.error('💥 Erro crítico completo:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      logs,
      processed: 0,
      total: 0,
      failed_chunks: 1,
      duration: '0s',
      timestamp: new Date().toISOString(),
      debug: 'Verifique as configurações do Supabase e permissions da tabela'
    }), {
      status: 200,
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
