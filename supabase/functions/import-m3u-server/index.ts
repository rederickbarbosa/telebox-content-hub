
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
    addLog('info', '🚀 Iniciando processamento TELEBOX');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('❌ Variáveis de ambiente Supabase não configuradas');
    }

    addLog('info', '✅ Credenciais Supabase configuradas');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Teste de conexão com diagnóstico aprimorado
    addLog('info', '🔍 Testando conexão com Supabase...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('catalogo_m3u_live')
        .select('count(*)', { count: 'exact', head: true });
      
      if (testError) {
        addLog('error', `❌ ERRO DE CONEXÃO: ${testError.message}`);
        addLog('error', `❌ Código: ${testError.code || 'N/A'}`);
        addLog('error', `❌ Detalhes: ${testError.details || 'N/A'}`);
        throw new Error(`Erro de conexão: ${testError.message}`);
      } else {
        addLog('success', `✅ Conexão OK. Registros existentes: ${testData || 0}`);
      }
    } catch (connError: any) {
      addLog('error', `❌ FALHA NA CONEXÃO: ${connError.message}`);
      throw connError;
    }
    
    // Verificar Content-Type
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      throw new Error('❌ Content-Type deve ser multipart/form-data');
    }
    
    addLog('info', '📥 Lendo FormData...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('❌ Arquivo não encontrado no FormData');
    }

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    addLog('info', `📁 Arquivo: ${file.name} (${fileSizeMB}MB)`);
    
    // Limite mais restritivo conforme feedback
    if (file.size > 45 * 1024 * 1024) {
      throw new Error(`❌ Arquivo muito grande: ${fileSizeMB}MB (máx: 45MB)`);
    }
    
    addLog('info', '📖 Lendo conteúdo...');
    const fileContent = await file.text();
    
    if (!fileContent || fileContent.trim().length === 0) {
      throw new Error('❌ Arquivo vazio');
    }
    
    addLog('info', `✅ Conteúdo lido: ${fileContent.length.toLocaleString()} caracteres`);
    
    // DETECÇÃO MELHORADA: JSON ou M3U
    const trimmedContent = fileContent.trim();
    const isJSON = trimmedContent.startsWith('{') || trimmedContent.startsWith('[');
    const isM3U = trimmedContent.startsWith('#EXTM3U') || trimmedContent.includes('#EXTINF');
    
    addLog('info', `🔍 Formato detectado: ${isJSON ? 'JSON' : isM3U ? 'M3U' : 'DESCONHECIDO'}`);
    
    let channels: any[] = [];
    
    if (isJSON) {
      addLog('info', '🔄 Processando JSON...');
      try {
        const jsonData = JSON.parse(fileContent);
        
        if (jsonData.channels && Array.isArray(jsonData.channels)) {
          channels = jsonData.channels.map((channel: any) => ({
            nome: channel.name || channel.nome || 'Sem nome',
            tipo: determineChannelType(channel.group_title || channel.grupo || ''),
            grupo: channel.group_title || channel.grupo || 'Sem grupo',
            logo: channel.tvg_logo || channel.logo || '',
            qualidade: determineQuality(channel.name || channel.nome || ''),
            tvg_id: channel.tvg_id || '',
            ativo: true
          }));
          
          addLog('success', `✅ JSON processado: ${channels.length.toLocaleString()} canais`);
        } else if (Array.isArray(jsonData)) {
          // Caso seja um array direto
          channels = jsonData.map((channel: any) => ({
            nome: channel.name || channel.nome || 'Sem nome',
            tipo: determineChannelType(channel.group_title || channel.grupo || ''),
            grupo: channel.group_title || channel.grupo || 'Sem grupo',
            logo: channel.tvg_logo || channel.logo || '',
            qualidade: determineQuality(channel.name || channel.nome || ''),
            tvg_id: channel.tvg_id || '',
            ativo: true
          }));
          
          addLog('success', `✅ Array JSON processado: ${channels.length.toLocaleString()} canais`);
        } else {
          throw new Error('❌ JSON não possui estrutura válida (esperado "channels" array ou array direto)');
        }
      } catch (jsonError: any) {
        addLog('error', `❌ Erro JSON: ${jsonError.message}`);
        throw new Error(`Erro ao processar JSON: ${jsonError.message}`);
      }
    } else if (isM3U) {
      addLog('info', '🔄 Processando M3U...');
      
      const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);
      let currentChannel: any = {};

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith('#EXTINF:')) {
          currentChannel = parseEXTINF(line);
        } else if (line.startsWith('http') || line.includes('://')) {
          if (Object.keys(currentChannel).length > 0) {
            // NÃO incluir URL conforme solicitado
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
      
      addLog('success', `✅ M3U processado: ${channels.length.toLocaleString()} canais`);
    } else {
      throw new Error('❌ Formato não reconhecido. Deve ser M3U ou JSON válido');
    }
    
    if (channels.length === 0) {
      throw new Error('❌ Nenhum canal válido encontrado no arquivo');
    }

    // DIAGNÓSTICO: Estrutura dos dados
    addLog('info', '🔍 Validando estrutura dos dados...');
    const sampleChannel = channels[0];
    addLog('info', `📋 Exemplo: ${JSON.stringify(sampleChannel, null, 2)}`);
    
    // LIMPEZA INTELIGENTE: apenas registros inativos antigos
    addLog('info', '🧹 Preparando limpeza do catálogo...');
    try {
      const { data: countBefore, error: countError } = await supabase
        .from('catalogo_m3u_live')
        .select('count(*)', { count: 'exact', head: true });
      
      if (!countError) {
        addLog('info', `📊 Registros antes da atualização: ${countBefore || 0}`);
      }

      // Primeiro marcar todos como inativos
      const { error: updateError } = await supabase
        .from('catalogo_m3u_live')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('ativo', true);
      
      if (updateError) {
        addLog('warning', `⚠️ Erro ao marcar como inativos: ${updateError.message}`);
      } else {
        addLog('success', `✅ Registros marcados como inativos para atualização`);
      }
      
    } catch (cleanupError: any) {
      addLog('warning', `⚠️ Aviso na limpeza: ${cleanupError.message}`);
    }

    // INSERÇÃO OTIMIZADA COM VERIFICAÇÃO DE DUPLICATAS
    const chunkSize = 5000; // Reduzido para maior estabilidade
    const totalChunks = Math.ceil(channels.length / chunkSize);
    
    addLog('info', `📦 Inserção em ${totalChunks} blocos de ${chunkSize.toLocaleString()} canais`);
    
    let successCount = 0;
    let actualInsertedCount = 0;
    let duplicatesSkipped = 0;
    
    for (let i = 0; i < totalChunks; i++) {
      const chunk = channels.slice(i * chunkSize, (i + 1) * chunkSize);
      
      addLog('info', `📤 Processando bloco ${i + 1}/${totalChunks} (${chunk.length.toLocaleString()} canais)`);
      
      try {
        // Verificar duplicatas existentes por nome e grupo
        const existingChannels = await supabase
          .from('catalogo_m3u_live')
          .select('nome, grupo, tvg_id')
          .in('nome', chunk.map(c => c.nome));

        let newChannels = chunk;
        if (existingChannels.data && existingChannels.data.length > 0) {
          const existingKeys = new Set(
            existingChannels.data.map(c => `${c.nome}:${c.grupo}:${c.tvg_id}`)
          );
          
          const uniqueChannels = chunk.filter(channel => {
            const key = `${channel.nome}:${channel.grupo}:${channel.tvg_id}`;
            return !existingKeys.has(key);
          });
          
          duplicatesSkipped += chunk.length - uniqueChannels.length;
          newChannels = uniqueChannels;
          
          addLog('info', `🔍 Bloco ${i + 1}: ${newChannels.length} novos, ${chunk.length - newChannels.length} duplicatas ignoradas`);
        }

        if (newChannels.length > 0) {
          const { data: insertData, error: insertError } = await supabase
            .from('catalogo_m3u_live')
            .insert(newChannels)
            .select('id, nome');

          if (insertError) {
            addLog('error', `❌ ERRO NO BLOCO ${i + 1}:`);
            addLog('error', `   Mensagem: ${insertError.message}`);
            addLog('error', `   Código: ${insertError.code || 'N/A'}`);
            addLog('error', `   Detalhes: ${insertError.details || 'N/A'}`);
            addLog('error', `   Hint: ${insertError.hint || 'N/A'}`);
            
            // Continuar com próximos blocos mesmo com erro
            continue;
          } else {
            const realInserted = insertData?.length || 0;
            actualInsertedCount += realInserted;
            
            addLog('success', `✅ Bloco ${i + 1} inserido: ${realInserted} novos canais`);
            addLog('info', `   📊 Total acumulado: ${actualInsertedCount.toLocaleString()}`);
            
            successCount += realInserted;
          }
        } else {
          addLog('info', `⏭️ Bloco ${i + 1}: todos são duplicatas, pulando inserção`);
        }
      } catch (error: any) {
        addLog('error', `❌ EXCEÇÃO NO BLOCO ${i + 1}: ${error.message}`);
        continue;
      }
      
      // Pausa entre blocos para não sobrecarregar
      if (i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    // Remover registros antigos que não foram reativados (opcional)
    try {
      const { data: oldRecords, error: cleanError } = await supabase
        .from('catalogo_m3u_live')
        .delete()
        .eq('ativo', false)
        .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Mais de 24h inativos

      if (!cleanError && oldRecords) {
        addLog('info', `🧹 Removidos ${oldRecords.length || 0} registros antigos`);
      }
    } catch (cleanError) {
      addLog('warning', `⚠️ Aviso na limpeza final: ${cleanError}`);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // VERIFICAÇÃO FINAL OBRIGATÓRIA
    addLog('info', '🔍 VERIFICAÇÃO FINAL...');
    try {
      const { data: finalCount, error: finalCountError } = await supabase
        .from('catalogo_m3u_live')
        .select('count(*)', { count: 'exact', head: true });
      
      if (finalCountError) {
        addLog('error', `❌ Erro na contagem final: ${finalCountError.message}`);
      } else {
        addLog('success', `📊 TOTAL FINAL NA TABELA: ${finalCount || 0}`);
        
        if ((finalCount || 0) === 0) {
          addLog('error', '🚨 TABELA VAZIA! Possível problema em RLS/Policies');
        } else {
          addLog('success', '🎉 DADOS CONFIRMADOS NO BANCO!');
        }
      }
      
      // Buscar amostra dos dados inseridos
      const { data: sampleRecords, error: sampleError } = await supabase
        .from('catalogo_m3u_live')
        .select('id, nome, tipo, grupo')
        .eq('ativo', true)
        .limit(5);
      
      if (!sampleError && sampleRecords && sampleRecords.length > 0) {
        addLog('info', '📋 Amostra dos registros ativos:');
        sampleRecords.forEach((record, idx) => {
          addLog('info', `   ${idx + 1}. ${record.nome} (${record.tipo}) - ${record.grupo}`);
        });
      }
      
    } catch (error: any) {
      addLog('error', `❌ Erro na verificação final: ${error.message}`);
    }
    
    // Resultado final
    const hasSuccess = actualInsertedCount > 0;
    const finalMessage = hasSuccess 
      ? `🎉 Importação concluída com sucesso!`
      : `⚠️ Nenhum dado foi inserido (possível duplicatas ou erro de permissão)`;
    
    addLog('info', finalMessage);
    addLog('info', `📊 Estatísticas finais:`);
    addLog('info', `   - Canais processados: ${channels.length.toLocaleString()}`);
    addLog('info', `   - Inserções realizadas: ${actualInsertedCount.toLocaleString()}`);
    addLog('info', `   - Duplicatas ignoradas: ${duplicatesSkipped.toLocaleString()}`);
    addLog('info', `   - Tempo total: ${duration}s`);
    addLog('info', '✅ Processo finalizado');
    
    return new Response(JSON.stringify({ 
      success: hasSuccess,
      processed: successCount,
      actual_inserted: actualInsertedCount,
      duplicates_skipped: duplicatesSkipped,
      total: channels.length,
      duration: `${duration}s`,
      logs,
      file_type: isJSON ? 'JSON' : 'M3U',
      message: hasSuccess ? 'Catálogo atualizado com sucesso' : 'Nenhum dado novo inserido'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    addLog('error', `💥 Erro crítico: ${error.message}`);
    console.error('💥 Erro crítico completo:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      logs,
      processed: 0,
      actual_inserted: 0,
      total: 0,
      duration: '0s',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
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
