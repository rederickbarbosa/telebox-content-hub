
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

    addLog('info', '✅ Credenciais Supabase configuradas');
    addLog('info', `🔗 URL do projeto: ${supabaseUrl}`);
    addLog('info', `🔑 Service key presente: ${supabaseServiceKey ? 'SIM' : 'NÃO'}`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // DIAGNÓSTICO 1: Testar conexão com Supabase
    addLog('info', '🔍 Testando conexão com Supabase...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('catalogo_m3u_live')
        .select('count(*)', { count: 'exact', head: true });
      
      if (testError) {
        addLog('error', `❌ ERRO DE CONEXÃO: ${testError.message}`);
        addLog('error', `❌ Detalhes: ${JSON.stringify(testError)}`);
      } else {
        addLog('success', `✅ Conexão OK - Registros existentes: ${testData || 0}`);
      }
    } catch (connError: any) {
      addLog('error', `❌ FALHA NA CONEXÃO: ${connError.message}`);
    }
    
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
    
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('❌ Arquivo muito grande. Limite máximo: 50MB');
    }
    
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
          
          let tipo = 'canal';
          if (currentChannel.group_title) {
            const grupo = currentChannel.group_title.toLowerCase();
            if (grupo.includes('filme') || grupo.includes('movie')) {
              tipo = 'filme';
            } else if (grupo.includes('serie') || grupo.includes('tv') || grupo.includes('show')) {
              tipo = 'serie';
            }
          }
          
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
    
    if (channels.length === 0) {
      throw new Error('❌ Nenhum canal válido encontrado no arquivo');
    }

    // DIAGNÓSTICO 2: Verificar estrutura dos dados antes do insert
    addLog('info', '🔍 Verificando estrutura dos dados...');
    const sampleChannel = channels[0];
    addLog('info', `📋 Exemplo de canal: ${JSON.stringify(sampleChannel, null, 2)}`);
    
    // DIAGNÓSTICO 3: Limpar catálogo anterior COM VERIFICAÇÃO
    addLog('info', '🧹 Limpando catálogo anterior...');
    try {
      const { data: countBefore, error: countError } = await supabase
        .from('catalogo_m3u_live')
        .select('count(*)', { count: 'exact', head: true });
      
      if (countError) {
        addLog('warning', `⚠️ Erro ao contar registros antes da limpeza: ${countError.message}`);
      } else {
        addLog('info', `📊 Registros antes da limpeza: ${countBefore || 0}`);
      }

      const { data: deleteData, error: deleteError, count: deletedCount } = await supabase
        .from('catalogo_m3u_live')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteError) {
        addLog('error', `❌ ERRO NA LIMPEZA: ${deleteError.message}`);
        addLog('error', `❌ Código: ${deleteError.code}, Detalhes: ${deleteError.details}`);
        // Não vai parar por causa do erro de limpeza, tenta inserir mesmo assim
      } else {
        addLog('success', `✅ Limpeza concluída: ${deletedCount || 0} registros removidos`);
      }
      
      // Verificar se realmente limpou
      const { data: countAfter, error: countAfterError } = await supabase
        .from('catalogo_m3u_live')
        .select('count(*)', { count: 'exact', head: true });
      
      if (!countAfterError) {
        addLog('info', `📊 Registros após limpeza: ${countAfter || 0}`);
      }
    } catch (cleanupError: any) {
      addLog('warning', `⚠️ Exceção na limpeza: ${cleanupError.message}`);
    }

    // INSERÇÃO EM BLOCOS MENORES COM DIAGNÓSTICO DETALHADO
    const chunkSize = 5000; // Reduzido para 5k por segurança
    const totalChunks = Math.ceil(channels.length / chunkSize);
    
    addLog('info', `📦 Iniciando inserção em ${totalChunks} blocos de até ${chunkSize.toLocaleString()} canais cada`);
    
    let successCount = 0;
    let failedChunks = 0;
    let actualInsertedCount = 0;
    
    for (let i = 0; i < totalChunks; i++) {
      const chunk = channels.slice(i * chunkSize, (i + 1) * chunkSize);
      
      addLog('info', `📤 Processando bloco ${i + 1}/${totalChunks} (${chunk.length.toLocaleString()} canais)`);
      
      try {
        // DIAGNÓSTICO 4: Mostrar dados do primeiro canal do bloco
        if (i === 0) {
          addLog('info', `🔍 Primeiro canal do bloco: ${JSON.stringify(chunk[0])}`);
        }

        const { data: insertData, error: insertError, count: insertCount } = await supabase
          .from('catalogo_m3u_live')
          .insert(chunk)
          .select('id, nome', { count: 'exact' });

        if (insertError) {
          addLog('error', `❌ ERRO CRÍTICO NO BLOCO ${i + 1}:`);
          addLog('error', `   Mensagem: ${insertError.message}`);
          addLog('error', `   Código: ${insertError.code || 'N/A'}`);
          addLog('error', `   Detalhes: ${insertError.details || 'N/A'}`);
          addLog('error', `   Hint: ${insertError.hint || 'N/A'}`);
          addLog('error', `   JSON completo: ${JSON.stringify(insertError)}`);
          failedChunks++;
        } else {
          const realInserted = insertData?.length || insertCount || chunk.length;
          actualInsertedCount += realInserted;
          
          addLog('success', `✅ Bloco ${i + 1} inserido com sucesso`);
          addLog('info', `   📊 Canais no bloco: ${chunk.length}`);
          addLog('info', `   📊 Realmente inseridos: ${realInserted}`);
          addLog('info', `   📊 Total acumulado: ${actualInsertedCount}`);
          
          if (insertData && insertData.length > 0) {
            const sampleIds = insertData.slice(0, 3).map(row => `${row.nome} (${row.id.slice(0, 8)}...)`);
            addLog('info', `   🔗 Exemplos inseridos: ${sampleIds.join(', ')}`);
          }
          
          successCount += realInserted;
        }
      } catch (error: any) {
        addLog('error', `❌ EXCEÇÃO NO BLOCO ${i + 1}: ${error.message}`);
        addLog('error', `   Stack: ${error.stack || 'N/A'}`);
        failedChunks++;
      }
      
      // Pequeno delay para não sobrecarregar
      if (i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // DIAGNÓSTICO 5: Verificação final OBRIGATÓRIA
    addLog('info', '🔍 VERIFICAÇÃO FINAL: Contando registros na tabela...');
    try {
      const { data: finalCount, error: finalCountError } = await supabase
        .from('catalogo_m3u_live')
        .select('count(*)', { count: 'exact', head: true });
      
      if (finalCountError) {
        addLog('error', `❌ Erro ao contar registros finais: ${finalCountError.message}`);
      } else {
        addLog('info', `📊 TOTAL DE REGISTROS NA TABELA AGORA: ${finalCount || 0}`);
        
        if ((finalCount || 0) === 0) {
          addLog('error', '🚨 PROBLEMA CRÍTICO: TABELA AINDA VAZIA APÓS INSERÇÃO!');
          addLog('error', '🔍 Possíveis causas:');
          addLog('error', '   - RLS (Row Level Security) bloqueando inserts');
          addLog('error', '   - Policies restritivas na tabela');
          addLog('error', '   - Service Role Key incorreta');
          addLog('error', '   - Problema de schema/campos incompatíveis');
          addLog('error', '   - Transação rollback silencioso');
        } else if ((finalCount || 0) < actualInsertedCount) {
          addLog('warning', `⚠️ DISCREPÂNCIA: Esperado ${actualInsertedCount}, encontrado ${finalCount}`);
        } else {
          addLog('success', '🎉 INSERÇÃO CONFIRMADA: Dados realmente persistidos!');
        }
      }
      
      // Buscar alguns registros como prova
      const { data: sampleRecords, error: sampleError } = await supabase
        .from('catalogo_m3u_live')
        .select('id, nome, tipo, grupo')
        .limit(5);
      
      if (!sampleError && sampleRecords && sampleRecords.length > 0) {
        addLog('info', '📋 Amostra dos registros inseridos:');
        sampleRecords.forEach((record, idx) => {
          addLog('info', `   ${idx + 1}. ${record.nome} (${record.tipo}) - Grupo: ${record.grupo}`);
        });
      }
      
    } catch (error: any) {
      addLog('error', `❌ Erro na verificação final: ${error.message}`);
    }
    
    // Resultado final
    const finalMessage = failedChunks === 0 
      ? `🎉 Importação concluída com 100% de sucesso!`
      : `⚠️ Importação parcial: ${failedChunks} de ${totalChunks} blocos falharam`;
    
    addLog('info', finalMessage);
    addLog('info', `📊 Estatísticas finais:`);
    addLog('info', `   - Canais processados: ${channels.length.toLocaleString()}`);
    addLog('info', `   - Inserções reportadas: ${successCount.toLocaleString()}`);
    addLog('info', `   - Blocos falharam: ${failedChunks}`);
    addLog('info', `   - Tempo total: ${duration}s`);
    addLog('info', '🔍 IMPORTANTE: Verificar Supabase Studio para confirmar dados!');
    
    // Gerar estatísticas por grupo
    const stats: Record<string, number> = {};
    channels.forEach(channel => {
      const grupo = channel.grupo || 'Sem grupo';
      stats[grupo] = (stats[grupo] || 0) + 1;
    });
    
    // Gerar JSON para preview
    const previewJson = {
      metadata: {
        generated_at: new Date().toISOString(),
        total_channels: channels.length,
        successful_inserts: successCount,
        actual_inserted: actualInsertedCount,
        failed_chunks: failedChunks,
        processing_time: `${duration}s`,
        converter: "TELEBOX Diagnostic M3U Converter",
        version: "4.0"
      },
      channels: channels.slice(0, 50)
    };

    return new Response(JSON.stringify({ 
      success: failedChunks === 0,
      processed: successCount,
      actual_inserted: actualInsertedCount,
      total: channels.length,
      failed_chunks: failedChunks,
      duration: `${duration}s`,
      logs,
      preview_json: previewJson,
      stats,
      table_verification: actualInsertedCount > 0 ? 'Dados inseridos com sucesso' : 'ATENÇÃO: Possível problema na inserção - verificar RLS/Policies',
      diagnostic_info: {
        supabase_url: supabaseUrl,
        service_key_present: !!supabaseServiceKey,
        chunks_processed: totalChunks,
        chunk_size: chunkSize
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    addLog('error', `💥 Erro crítico na importação: ${error.message}`);
    addLog('error', `💥 Stack completo: ${error.stack || 'N/A'}`);
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
      debug: 'Erro crítico - verificar logs detalhados',
      diagnostic_info: {
        error_type: error.constructor.name,
        error_stack: error.stack
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseEXTINF(line: string) {
  const channel: any = {};
  
  const durationMatch = line.match(/#EXTINF:([^,\s]+)/);
  if (durationMatch) {
    channel.duration = durationMatch[1];
  }

  const nameMatch = line.match(/,([^,]+)$/);
  if (nameMatch) {
    channel.name = nameMatch[1].trim();
  }

  const attributeRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
  let match;
  while ((match = attributeRegex.exec(line)) !== null) {
    const key = match[1].replace(/-/g, '_');
    channel[key] = match[2];
  }

  return channel;
}
