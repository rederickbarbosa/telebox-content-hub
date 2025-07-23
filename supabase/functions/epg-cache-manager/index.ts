import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action } = await req.json().catch(() => ({ action: 'cleanup' }));

    console.log(`Executando ação EPG cache: ${action}`);

    if (action === 'cleanup') {
      // Limpar cache expirado
      const { error: cleanupError } = await supabase.rpc('cleanup_epg_cache');
      
      if (cleanupError) {
        console.error('Erro na limpeza do cache:', cleanupError);
        throw cleanupError;
      }

      // Buscar estatísticas do cache
      const { data: stats, error: statsError } = await supabase
        .from('epg_cache')
        .select('canal_nome, count(*)', { count: 'exact' });

      console.log('Cache EPG limpo com sucesso');
      
      return new Response(
        JSON.stringify({
          success: true,
          action: 'cleanup',
          cache_entries: stats?.length || 0,
          message: 'Cache EPG limpo com sucesso'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'refresh') {
      // Buscar URL do EPG das configurações
      const { data: epgUrlSetting } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'epg_xmltv_url')
        .single();

      const epgUrl = epgUrlSetting?.setting_value || 'http://zed7.top/xmltv.php?username=spg9tct&password=r846kdc';

      console.log('Atualizando cache EPG de:', epgUrl);

      // Fazer fetch do XMLTV
      const response = await fetch(epgUrl);
      const xmlData = await response.text();

      // Parsear XML simplificado
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
      
      const programs = xmlDoc.querySelectorAll('programme');
      console.log(`Encontrados ${programs.length} programas no XMLTV`);

      let processedPrograms = 0;
      const cacheData = new Map();

      // Processar programas
      for (const program of programs) {
        const channel = program.getAttribute('channel');
        const start = program.getAttribute('start');
        const stop = program.getAttribute('stop');
        const title = program.querySelector('title')?.textContent || 'Sem título';
        const desc = program.querySelector('desc')?.textContent || '';

        if (!channel || !start) continue;

        const startDate = new Date(
          start.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')
        );
        const stopDate = stop ? new Date(
          stop.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')
        ) : null;

        const programData = {
          inicio: startDate.toISOString(),
          fim: stopDate?.toISOString(),
          programa: title,
          descricao: desc
        };

        const dateKey = startDate.toISOString().split('T')[0];
        const cacheKey = `${channel}_${dateKey}`;

        if (!cacheData.has(cacheKey)) {
          cacheData.set(cacheKey, {
            canal_nome: channel,
            data_programa: dateKey,
            programas: []
          });
        }

        cacheData.get(cacheKey).programas.push(programData);
        processedPrograms++;
      }

      // Salvar no cache
      for (const [key, data] of cacheData) {
        await supabase
          .from('epg_cache')
          .upsert({
            canal_nome: data.canal_nome,
            data_programa: data.data_programa,
            programas: data.programas,
            expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 horas
          }, {
            onConflict: 'canal_nome,data_programa'
          });
      }

      console.log(`Cache EPG atualizado: ${processedPrograms} programas processados`);

      return new Response(
        JSON.stringify({
          success: true,
          action: 'refresh',
          programs_processed: processedPrograms,
          cache_entries: cacheData.size,
          message: 'Cache EPG atualizado com sucesso'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Ação não reconhecida. Use "cleanup" ou "refresh"'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );

  } catch (error) {
    console.error('Erro na função epg-cache-manager:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});