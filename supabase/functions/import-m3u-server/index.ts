
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
    addLog('info', '🚀 Iniciando processamento de arquivo no servidor');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('❌ Variáveis de ambiente Supabase não configuradas');
    }

    addLog('info', '✅ Credenciais Supabase configuradas');
    addLog('info', `🔗 URL do projeto: ${supabaseUrl}`);
    
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
    
    // DETECÇÃO AUTOMÁTICA: M3U ou JSON
    const trimmedContent = fileContent.trim();
    const isJSON = trimmedContent.startsWith('{') || trimmedContent.startsWith('[');
    const isM3U = trimmedContent.startsWith('#EXTM3U') || trimmedContent.includes('#EXTINF');
    
    addLog('info', `🔍 Detecção automática: ${isJSON ? 'JSON' : isM3U ? 'M3U' : 'FORMATO DESCONHECIDO'}`);
    
    let channels: any[] = [];
    
    if (isJSON) {
      addLog('info', '🔄 Processando arquivo JSON...');
      try {
        const jsonData = JSON.parse(fileContent);
        
        // Verificar se tem estrutura esperada
        if (jsonData.channels && Array.isArray(jsonData.channels)) {
          channels = jsonData.channels.map((channel: any) => ({
            nome: channel.name || channel.nome || 'Sem nome',
            tipo: determineChannelType(channel.group_title || channel.grupo || ''),
            grupo: channel.group_title || channel.grupo || 'Sem grupo',
            logo: channel.tvg_logo || channel.logo || '',
            qualidade: determineQuality(channel.name || channel.nome || ''),
            tvg_id: channel.tvg_id || '',
            // NÃO incluir URL no banco conforme solicitado
            ativo: true
          }));
          
          addLog('success', `✅ JSON processado: ${channels.length.toLocaleString()} canais encontrados`);
        } else {
          throw new Error('❌ JSON não possui estrutura válida (deve conter array "channels")');
        }
      } catch (jsonError: any) {
        throw new Error(`❌ Erro ao processar JSON: ${jsonError.message}`);
      }
    } else if (isM3U) {
      addLog('info', '🔄 Processando arquivo M3U...');
      
      const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);
      let currentChannel: any = {};

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith('#EXTINF:')) {
          currentChannel = parseEXTINF(line);
        } else if (line.startsWith('http') || line.includes('://')) {
          if (Object.keys(currentChannel).length > 0) {
            // NÃO incluir URL no banco conforme solicitado
            channels.push({
              nome: currentChannel.name || 'Sem nome',
              tipo: determineChannelType(currentChannel.group_title || ''),
              grupo: currentChannel.group_title || 'Sem grupo',
              logo: currentChannel.tvg_logo || '',
              qualidade: determineQuality(currentChannel.name || ''),
              tvg_id: currentChannel.tvg_id || '',
              ativo: true
            });
            currentChannel = {};
          }
        }
      }
      
      addLog('success', `✅ M3U processado: ${channels.length.toLocaleString()} canais encontrados`);
    } else {
      throw new Error('❌ Formato de arquivo não reconhecido. Deve ser M3U ou JSON válido.');
    }
    
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

      const { error: deleteError } = await supabase
        .from('catalogo_m3u_live')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteError) {
        addLog('error', `❌ ERRO NA LIMPEZA: ${deleteError.message}`);
      } else {
        addLog('success', `✅ Limpeza concluída`);
      }
      
    } catch (cleanupError: any) {
      addLog('warning', `⚠️ Exceção na limpeza: ${cleanupError.message}`);
    }

    // INSERÇÃO EM BLOCOS MENORES COM DIAGNÓSTICO DETALHADO
    const chunkSize = 10000; // 10k por segurança
    const totalChunks = Math.ceil(channels.length / chunkSize);
    
    addLog('info', `📦 Iniciando inserção em ${totalChunks} blocos de até ${chunkSize.toLocaleString()} canais cada`);
    
    let successCount = 0;
    let failedChunks = 0;
    let actualInsertedCount = 0;
    
    for (let i = 0; i < totalChunks; i++) {
      const chunk = channels.slice(i * chunkSize, (i + 1) * chunkSize);
      
      addLog('info', `📤 Processando bloco ${i + 1}/${totalChunks} (${chunk.length.toLocaleString()} canais)`);
      
      try {
        if (i === 0) {
          addLog('info', `🔍 Primeiro canal do bloco: ${JSON.stringify(chunk[0])}`);
        }

        const { data: insertData, error: insertError } = await supabase
          .from('catalogo_m3u_live')
          .insert(chunk)
          .select('id, nome');

        if (insertError) {
          addLog('error', `❌ ERRO CRÍTICO NO BLOCO ${i + 1}:`);
          addLog('error', `   Mensagem: ${insertError.message}`);
          addLog('error', `   Código: ${insertError.code || 'N/A'}`);
          addLog('error', `   Detalhes: ${insertError.details || 'N/A'}`);
          addLog('error', `   Hint: ${insertError.hint || 'N/A'}`);
          failedChunks++;
        } else {
          const realInserted = insertData?.length || 0;
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
        failedChunks++;
      }
      
      // Pequeno delay para não sobrecarregar
      if (i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // DIAGNÓSTICO 4: Verificação final OBRIGATÓRIA
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
    
    return new Response(JSON.stringify({ 
      success: failedChunks === 0,
      processed: successCount,
      actual_inserted: actualInsertedCount,
      total: channels.length,
      failed_chunks: failedChunks,
      duration: `${duration}s`,
      logs,
      file_type: isJSON ? 'JSON' : 'M3U',
      table_verification: actualInsertedCount > 0 ? 'Dados inseridos com sucesso' : 'ATENÇÃO: Possível problema na inserção - verificar RLS/Policies',
      diagnostic_info: {
        supabase_url: supabaseUrl,
        service_key_present: !!supabaseServiceKey,
        chunks_processed: totalChunks,
        chunk_size: chunkSize,
        file_format_detected: isJSON ? 'JSON' : isM3U ? 'M3U' : 'UNKNOWN'
      }
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
      debug: 'Erro crítico - verificar logs detalhados'
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

function determineChannelType(grupo: string): string {
  const grupoLower = grupo.toLowerCase();
  if (grupoLower.includes('filme') || grupoLower.includes('movie')) {
    return 'filme';
  } else if (grupoLower.includes('serie') || grupoLower.includes('tv') || grupoLower.includes('show')) {
    return 'serie';
  }
  return 'canal';
}

function determineQuality(nome: string): string {
  const nomeLower = nome.toLowerCase();
  if (nomeLower.includes('4k')) return '4K';
  else if (nomeLower.includes('fhd') || nomeLower.includes('fullhd')) return 'FHD';
  else if (nomeLower.includes('hd')) return 'HD';
  return 'SD';
}
