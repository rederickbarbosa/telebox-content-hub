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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Iniciando busca do EPG...');

    // Buscar URL do EPG nas configurações
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'epg_url')
      .single();

    const epgUrl = settings?.setting_value || 'http://zed7.top/xmltv.php?username=spg9tct&password=r846kdc';

    console.log('Buscando EPG de:', epgUrl);

    // Fazer fetch do XML com timeout e error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

    const response = await fetch(epgUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TELEBOX/1.0)',
        'Accept': 'application/xml, text/xml, */*'
      }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Erro HTTP ao buscar EPG: ${response.status} - ${response.statusText}`);
      throw new Error(`Erro ao buscar EPG: ${response.status} - ${response.statusText}`);
    }

    const xmlText = await response.text();
    console.log('XML EPG obtido, tamanho:', xmlText.length);

    if (!xmlText || xmlText.length < 100) {
      throw new Error('EPG vazio ou inválido');
    }

    // Parse XML usando DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Verificar se houve erro no parsing
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('Erro no parse XML:', parserError.textContent);
      throw new Error('Erro ao fazer parse do XML EPG: ' + parserError.textContent);
    }

    // Extrair canais
    const channelElements = xmlDoc.querySelectorAll('channel');
    const channels = Array.from(channelElements).map(channel => {
      const displayName = channel.querySelector('display-name')?.textContent || '';
      const icon = channel.querySelector('icon')?.getAttribute('src') || '';
      
      return {
        id: channel.getAttribute('id') || '',
        name: displayName,
        icon: icon
      };
    });

    console.log(`Encontrados ${channels.length} canais`);

    // Extrair programas (apenas futuros e atuais)
    const now = new Date();
    const programmes = Array.from(xmlDoc.querySelectorAll('programme')).map(programme => {
      const startTime = parseXMLTime(programme.getAttribute('start') || '');
      const stopTime = parseXMLTime(programme.getAttribute('stop') || '');
      const title = programme.querySelector('title')?.textContent || '';
      const desc = programme.querySelector('desc')?.textContent || '';
      const category = programme.querySelector('category')?.textContent || '';
      const channelId = programme.getAttribute('channel') || '';
      
      return {
        channel: channelId,
        title: title,
        desc: desc,
        start: startTime,
        stop: stopTime,
        category: category
      };
    }).filter(programme => {
      // Apenas programas atuais e futuros (próximas 24 horas)
      if (!programme.start) return false;
      const maxTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 horas
      return programme.start >= now && programme.start <= maxTime;
    });

    console.log(`Encontrados ${programmes.length} programas futuros`);

    // Limpar programação anterior (apenas dados antigos)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await supabase.from('programacao').delete().lt('fim', yesterday.toISOString());

    // Inserir nova programação
    const programmesToInsert = programmes.map(programme => {
      const channelName = channels.find(c => c.id === programme.channel)?.name || programme.channel;
      
      return {
        canal_id: programme.channel,
        canal_nome: channelName,
        programa_nome: programme.title,
        programa_descricao: programme.desc,
        inicio: programme.start?.toISOString() || new Date().toISOString(),
        fim: programme.stop?.toISOString() || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        categoria: programme.category
      };
    }).filter(p => p.programa_nome); // Apenas programas com nome

    console.log(`Preparados ${programmesToInsert.length} programas para inserção`);

    // Inserir em lotes menores
    const batchSize = 200;
    let insertedCount = 0;
    for (let i = 0; i < programmesToInsert.length; i += batchSize) {
      const batch = programmesToInsert.slice(i, i + batchSize);
      const { error } = await supabase.from('programacao').insert(batch);
      if (error) {
        console.error('Erro ao inserir lote de programação:', error);
      } else {
        insertedCount += batch.length;
      }
    }

    console.log(`EPG processado com sucesso: ${insertedCount} programas inseridos`);

    return new Response(JSON.stringify({
      success: true,
      channels: channels.length,
      programmes: insertedCount,
      updated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro detalhado no processamento EPG:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });
    
    let errorMessage = 'Erro interno do servidor';
    let statusCode = 500;
    
    if (error.message?.includes('fetch') || error.message?.includes('timeout')) {
      errorMessage = 'Erro ao buscar dados do EPG (timeout ou conexão)';
      statusCode = 502;
    } else if (error.message?.includes('XML') || error.message?.includes('parse')) {
      errorMessage = 'Erro no formato XML do EPG';
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

function parseXMLTime(xmlTime: string): Date | null {
  if (!xmlTime) return null;
  
  try {
    // Formato: YYYYMMDDHHMMSS ZZZZZ
    const match = xmlTime.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
    if (!match) return null;
    
    const [, year, month, day, hour, minute, second, timezone] = match;
    
    // Criar data em UTC primeiro
    const date = new Date();
    date.setUTCFullYear(parseInt(year));
    date.setUTCMonth(parseInt(month) - 1);
    date.setUTCDate(parseInt(day));
    date.setUTCHours(parseInt(hour));
    date.setUTCMinutes(parseInt(minute));
    date.setUTCSeconds(parseInt(second));
    date.setUTCMilliseconds(0);
    
    // Ajustar timezone se fornecido
    if (timezone) {
      const sign = timezone[0] === '+' ? 1 : -1;
      const tzHours = parseInt(timezone.slice(1, 3));
      const tzMinutes = parseInt(timezone.slice(3, 5));
      const offsetMinutes = sign * (tzHours * 60 + tzMinutes);
      
      // Ajustar para UTC
      date.setUTCMinutes(date.getUTCMinutes() - offsetMinutes);
    }
    
    return date;
  } catch (error) {
    console.error('Erro ao fazer parse do tempo XML:', xmlTime, error);
    return null;
  }
}