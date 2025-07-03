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

    // Buscar URL do EPG nas configurações
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'epg_url')
      .single();

    const epgUrl = settings?.setting_value || 'http://zed7.top/xmltv.php?username=spg9tct&password=r846kdc';

    console.log('Buscando EPG de:', epgUrl);

    // Fazer fetch do XML
    const response = await fetch(epgUrl);
    if (!response.ok) {
      throw new Error(`Erro ao buscar EPG: ${response.status}`);
    }

    const xmlText = await response.text();
    console.log('XML EPG obtido, tamanho:', xmlText.length);

    // Parse XML usando DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Extrair canais
    const channels = Array.from(xmlDoc.querySelectorAll('channel')).map(channel => ({
      id: channel.getAttribute('id') || '',
      name: channel.querySelector('display-name')?.textContent || '',
      icon: channel.querySelector('icon')?.getAttribute('src') || ''
    }));

    // Extrair programas (apenas futuros)
    const now = new Date();
    const programmes = Array.from(xmlDoc.querySelectorAll('programme')).map(programme => {
      const startTime = parseXMLTime(programme.getAttribute('start') || '');
      const stopTime = parseXMLTime(programme.getAttribute('stop') || '');
      
      return {
        channel: programme.getAttribute('channel') || '',
        title: programme.querySelector('title')?.textContent || '',
        desc: programme.querySelector('desc')?.textContent || '',
        start: startTime,
        stop: stopTime,
        category: programme.querySelector('category')?.textContent || ''
      };
    }).filter(programme => {
      // Apenas programas atuais e futuros
      return programme.start && programme.start >= now;
    });

    console.log(`Encontrados ${channels.length} canais e ${programmes.length} programas`);

    // Limpar programação anterior
    await supabase.from('programacao').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Inserir nova programação
    const programmesToInsert = programmes.map(programme => ({
      canal_id: programme.channel,
      canal_nome: channels.find(c => c.id === programme.channel)?.name || programme.channel,
      programa_nome: programme.title,
      programa_descricao: programme.desc,
      inicio: programme.start.toISOString(),
      fim: programme.stop?.toISOString() || new Date(programme.start.getTime() + 60 * 60 * 1000).toISOString(),
      categoria: programme.category
    }));

    // Inserir em lotes
    const batchSize = 500;
    for (let i = 0; i < programmesToInsert.length; i += batchSize) {
      const batch = programmesToInsert.slice(i, i + batchSize);
      const { error } = await supabase.from('programacao').insert(batch);
      if (error) {
        console.error('Erro ao inserir lote de programação:', error);
      }
    }

    console.log('EPG processado com sucesso');

    return new Response(JSON.stringify({
      success: true,
      channels: channels.length,
      programmes: programmes.length,
      updated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no processamento EPG:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseXMLTime(xmlTime: string): Date | null {
  if (!xmlTime) return null;
  
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
}