
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
    addLog('info', '🚀 TELEBOX - Iniciando processamento de catálogo');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('❌ Variáveis de ambiente Supabase não configuradas (URL ou SERVICE_KEY)');
    }

    addLog('info', `✅ Credenciais OK - URL: ${supabaseUrl.substring(0, 30)}...`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // DIAGNÓSTICO COMPLETO DA CONEXÃO E TABELA
    addLog('info', '🔍 Executando diagnóstico completo...');
    
    try {
      // 1. Testar conexão básica
      const { data: testConn, error: connError } = await supabase
        .from('catalogo_m3u_live')
        .select('count(*)', { count: 'exact', head: true });
      
      if (connError) {
        addLog('error', `❌ ERRO DE CONEXÃO: ${connError.message}`);
        addLog('error', `   Código: ${connError.code || 'N/A'}`);
        addLog('error', `   Detalhes: ${connError.details || 'N/A'}`);
        addLog('error', `   Hint: ${connError.hint || 'N/A'}`);
        
        if (connError.message.includes('permission denied') || connError.message.includes('RLS')) {
          addLog('error', '🚨 PROBLEMA DE PERMISSÃO/RLS DETECTADO!');
          addLog('info', '💡 SOLUÇÃO: Execute no Supabase SQL Editor:');
          addLog('info', '   ALTER TABLE catalogo_m3u_live DISABLE ROW LEVEL SECURITY;');
          addLog('info', '   -- OU criar policy permissiva para service_role');
        }
        
        throw connError;
      }
      
      addLog('success', `✅ Conexão OK - Registros atuais: ${testConn || 0}`);
      
      // 2. Testar permissões de INSERT
      addLog('info', '🧪 Testando permissões INSERT...');
      
      const testRecord = {
        nome: 'TESTE_CONEXAO_' + Date.now(),
        tipo: 'canal',
        grupo: 'TESTE',
        logo: '',
        qualidade: 'SD',
        tvg_id: 'test_' + Date.now(),
        ativo: true
      };
      
      const { data: insertTest, error: insertError } = await supabase
        .from('catalogo_m3u_live')
        .insert([testRecord])
        .select('id');
      
      if (insertError) {
        addLog('error', `❌ ERRO DE PERMISSÃO INSERT: ${insertError.message}`);
        addLog('error', `   Código: ${insertError.code || 'N/A'}`);
        
        if (insertError.message.includes('permission denied') || insertError.code === '42501') {
          addLog('error', '🚨 SEM PERMISSÃO DE INSERT!');
          addLog('info', '💡 SOLUÇÃO: Execute no Supabase SQL Editor:');
          addLog('info', '   ALTER TABLE catalogo_m3u_live DISABLE ROW LEVEL SECURITY;');
        }
        
        throw insertError;
      }
      
      if (insertTest && insertTest.length > 0) {
        addLog('success', `✅ INSERT OK - ID criado: ${insertTest[0].id}`);
        
        // Limpar registro de teste
        await supabase.from('catalogo_m3u_live').delete().eq('id', insertTest[0].id);
        addLog('info', '🧹 Registro de teste removido');
      }
      
    } catch (diagError: any) {
      addLog('error', `💥 FALHA NO DIAGNÓSTICO: ${diagError.message}`);
      throw diagError;
    }
    
    // PROCESSAR ARQUIVO
    addLog('info', '📥 Processando arquivo enviado...');
    
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      throw new Error('❌ Content-Type deve ser multipart/form-data');
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('❌ Arquivo não encontrado no FormData');
    }

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    addLog('info', `📁 Arquivo: ${file.name} (${fileSizeMB}MB)`);
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      throw new Error(`❌ Arquivo muito grande: ${fileSizeMB}MB (máx: 50MB)`);
    }
    
    const fileContent = await file.text();
    
    if (!fileContent || fileContent.trim().length === 0) {
      throw new Error('❌ Arquivo vazio');
    }
    
    addLog('info', `✅ Conteúdo lido: ${fileContent.length.toLocaleString()} caracteres`);
    
    // DETECTAR FORMATO E PROCESSAR
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
          channels = jsonData.channels;
        } else if (Array.isArray(jsonData)) {
          channels = jsonData;
        } else {
          throw new Error('❌ JSON deve ter propriedade "channels" (array) ou ser um array direto');
        }
        
        addLog('success', `✅ JSON processado: ${channels.length.toLocaleString()} canais`);
      } catch (jsonError: any) {
        addLog('error', `❌ Erro ao processar JSON: ${jsonError.message}`);
        throw jsonError;
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
            // Não incluir URL conforme solicitado
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
      throw new Error('❌ Formato não reconhecido. Deve ser M3U válido ou JSON válido');
    }
    
    if (channels.length === 0) {
      throw new Error('❌ Nenhum canal válido encontrado no arquivo');
    }

    // NORMALIZAR DADOS
    addLog('info', '🔧 Normalizando dados...');
    const normalizedChannels = channels.map((channel: any) => ({
      nome: String(channel.name || channel.nome || 'Sem nome').trim(),
      tipo: determineChannelType(String(channel.group_title || channel.grupo || '')),
      grupo: String(channel.group_title || channel.grupo || 'Sem grupo').trim(),
      logo: String(channel.tvg_logo || channel.logo || '').trim(),
      qualidade: determineQuality(String(channel.name || channel.nome || '')),
      tvg_id: String(channel.tvg_id || '').trim(),
      ativo: true
    }));

    addLog('success', `✅ ${normalizedChannels.length.toLocaleString()} canais normalizados`);

    // INSERÇÃO EM LOTES (5000 por vez para segurança)
    const batchSize = 5000;
    const totalBatches = Math.ceil(normalizedChannels.length / batchSize);
    
    addLog('info', `📦 Inserção em ${totalBatches} lotes de ${batchSize.toLocaleString()} canais`);
    
    // 1. Marcar todos os registros existentes como inativos
    addLog('info', '🔄 Marcando registros antigos como inativos...');
    const { error: deactivateError } = await supabase
      .from('catalogo_m3u_live')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('ativo', true);
    
    if (deactivateError) {
      addLog('warning', `⚠️ Aviso ao desativar registros: ${deactivateError.message}`);
    } else {
      addLog('success', '✅ Registros antigos marcados como inativos');
    }
    
    let totalInserted = 0;
    let totalErrors = 0;
    
    // 2. Inserir novos registros em lotes
    for (let i = 0; i < totalBatches; i++) {
      const batch = normalizedChannels.slice(i * batchSize, (i + 1) * batchSize);
      
      addLog('info', `📤 Inserindo lote ${i + 1}/${totalBatches} (${batch.length.toLocaleString()} canais)`);
      
      try {
        const { data: insertedData, error: batchError } = await supabase
          .from('catalogo_m3u_live')
          .insert(batch)
          .select('id');

        if (batchError) {
          addLog('error', `❌ Erro no lote ${i + 1}: ${batchError.message}`);
          addLog('error', `   Código: ${batchError.code || 'N/A'}`);
          addLog('error', `   Detalhes: ${batchError.details || 'N/A'}`);
          totalErrors += batch.length;
          continue;
        }

        const insertedCount = insertedData?.length || 0;
        totalInserted += insertedCount;
        
        addLog('success', `✅ Lote ${i + 1} inserido: ${insertedCount.toLocaleString()} canais`);
        
      } catch (batchException: any) {
        addLog('error', `❌ Exceção no lote ${i + 1}: ${batchException.message}`);
        totalErrors += batch.length;
      }
      
      // Pausa entre lotes para não sobrecarregar
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 3. Limpeza de registros antigos (opcional - manter por 24h)
    addLog('info', '🧹 Limpando registros antigos...');
    const { error: cleanupError } = await supabase
      .from('catalogo_m3u_live')
      .delete()
      .eq('ativo', false)
      .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (cleanupError) {
      addLog('warning', `⚠️ Aviso na limpeza: ${cleanupError.message}`);
    } else {
      addLog('success', '✅ Registros antigos removidos');
    }

    // VERIFICAÇÃO FINAL
    addLog('info', '🔍 Verificação final...');
    const { data: finalCount, error: countError } = await supabase
      .from('catalogo_m3u_live')
      .select('count(*)', { count: 'exact', head: true });
    
    if (!countError) {
      addLog('success', `📊 TOTAL FINAL NA TABELA: ${finalCount || 0}`);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    const success = totalInserted > 0;
    const finalMessage = success 
      ? `🎉 Importação concluída com sucesso!`
      : `⚠️ Nenhum dado foi inserido`;
    
    addLog('info', finalMessage);
    addLog('info', `📊 ESTATÍSTICAS FINAIS:`);
    addLog('info', `   - Canais processados: ${normalizedChannels.length.toLocaleString()}`);
    addLog('info', `   - Inseridos com sucesso: ${totalInserted.toLocaleString()}`);
    addLog('info', `   - Erros: ${totalErrors.toLocaleString()}`);
    addLog('info', `   - Tempo total: ${duration}s`);
    addLog('info', '✅ Processo finalizado');
    
    return new Response(JSON.stringify({ 
      success: success,
      processed: normalizedChannels.length,
      inserted: totalInserted,
      errors: totalErrors,
      total_final: finalCount || 0,
      duration: `${duration}s`,
      logs,
      message: success ? 'Catálogo atualizado com sucesso' : 'Falha na inserção - verificar logs'
    }), {
      status: success ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    addLog('error', `💥 ERRO CRÍTICO: ${error.message}`);
    console.error('💥 Erro crítico completo:', error);
    
    // Diagnósticos específicos para erros comuns
    if (error.message.includes('permission denied') || error.message.includes('RLS')) {
      addLog('error', '🚨 PROBLEMA DE PERMISSÃO DETECTADO!');
      addLog('info', '💡 EXECUTE NO SUPABASE SQL EDITOR:');
      addLog('info', '   ALTER TABLE catalogo_m3u_live DISABLE ROW LEVEL SECURITY;');
      addLog('info', '   -- Ou crie policy: CREATE POLICY "Allow service role" ON catalogo_m3u_live FOR ALL USING (auth.role() = \'service_role\');');
    }
    
    if (error.message.includes('does not exist')) {
      addLog('error', '🚨 TABELA NÃO EXISTE!');
      addLog('info', '💡 Verifique se a tabela "catalogo_m3u_live" foi criada corretamente');
    }
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      logs,
      processed: 0,
      inserted: 0,
      errors: 1,
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
