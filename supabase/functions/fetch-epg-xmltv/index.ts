import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Programme {
  canal_nome: string;
  programa_nome: string;
  programa_descricao?: string;
  inicio: string;
  fim: string;
  categoria?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Iniciando busca do EPG XMLTV...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configuração do EPG
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'epg_xmltv_url')
      .single();

    const xmltvUrl = settings?.setting_value || 'http://zed7.top/xmltv.php?username=spg9tct&password=r846kdc';
    
    console.log('📡 Buscando EPG de:', xmltvUrl);

    // Buscar XMLTV
    const xmlResponse = await fetch(xmltvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TELEBOX/1.0)',
      },
    });

    if (!xmlResponse.ok) {
      throw new Error(`Erro ao buscar EPG: ${xmlResponse.status}`);
    }

    const xmlText = await xmlResponse.text();
    console.log('📄 XML recebido, tamanho:', xmlText.length);

    // Parser básico para XMLTV
    const programmes: Programme[] = [];
    const currentTime = new Date();
    const next24Hours = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);

    // Extrair programas usando regex (parser simples)
    const programmeRegex = /<programme[^>]*start="([^"]*)"[^>]*stop="([^"]*)"[^>]*channel="([^"]*)"[^>]*>(.*?)<\/programme>/gs;
    let match;

    while ((match = programmeRegex.exec(xmlText)) !== null) {
      const [, startTime, stopTime, channelId, content] = match;
      
      try {
        // Converter formato XMLTV para ISO
        const start = parseXMLTVTime(startTime);
        const stop = parseXMLTVTime(stopTime);
        
        // Só processar programas que estão nas próximas 24 horas
        if (start >= currentTime && start <= next24Hours) {
          // Extrair título e descrição
          const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/s);
          const descMatch = content.match(/<desc[^>]*>(.*?)<\/desc>/s);
          const categoryMatch = content.match(/<category[^>]*>(.*?)<\/category>/s);
          
          const title = titleMatch ? cleanText(titleMatch[1]) : 'Programa';
          const description = descMatch ? cleanText(descMatch[1]) : null;
          const category = categoryMatch ? cleanText(categoryMatch[1]) : null;
          
          // Limpar nome do canal
          const canalNome = cleanChannelName(channelId);
          
          programmes.push({
            canal_nome: canalNome,
            programa_nome: title,
            programa_descricao: description,
            inicio: start.toISOString(),
            fim: stop.toISOString(),
            categoria: category
          });
        }
      } catch (error) {
        console.warn('Erro ao processar programa:', error);
        continue;
      }
    }

    console.log('📺 Programas extraídos:', programmes.length);

    if (programmes.length === 0) {
      console.log('⚠️ Nenhum programa encontrado, tentando fallback...');
      return createFallbackResponse();
    }

    // Limpar programação antiga (mais de 1 dia)
    const oneDayAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
    await supabase
      .from('programacao')
      .delete()
      .lt('fim', oneDayAgo.toISOString());

    // Inserir novos programas em lotes
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < programmes.length; i += batchSize) {
      const batch = programmes.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('programacao')
        .upsert(batch, { 
          onConflict: 'canal_nome,inicio', 
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Erro ao inserir lote:', error);
      } else {
        insertedCount += batch.length;
      }
    }

    // Gerar notificações para times favoritos
    await generateFootballNotifications(supabase, programmes);

    console.log('✅ EPG atualizado com sucesso!', {
      programas_processados: programmes.length,
      programas_inseridos: insertedCount
    });

    return new Response(JSON.stringify({
      success: true,
      programas_processados: programmes.length,
      programas_inseridos: insertedCount,
      ultima_atualizacao: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro no fetch EPG:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Função para converter tempo XMLTV para Date
function parseXMLTVTime(timeStr: string): Date {
  // Formato: 20240115120000 +0000 ou 20240115120000
  const dateMatch = timeStr.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!dateMatch) {
    throw new Error(`Formato de tempo inválido: ${timeStr}`);
  }
  
  const [, year, month, day, hour, minute, second] = dateMatch;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
}

// Função para limpar texto HTML/XML
function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove tags HTML/XML
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// Função para limpar nome do canal
function cleanChannelName(channelId: string): string {
  return channelId
    .replace(/\.br$/, '')
    .replace(/tv\.globo/i, 'Globo')
    .replace(/sbt/i, 'SBT')
    .replace(/record/i, 'Record')
    .replace(/band/i, 'Band')
    .replace(/culture/i, 'TV Cultura')
    .replace(/\_/g, ' ')
    .replace(/\-/g, ' ')
    .trim();
}

// Gerar notificações para jogos de futebol
async function generateFootballNotifications(supabase: any, programmes: Programme[]) {
  try {
    // Buscar usuários com times favoritos
    const { data: users } = await supabase
      .from('profiles')
      .select('user_id, nome, time_favorito')
      .not('time_favorito', 'is', null);

    if (!users || users.length === 0) return;

    const footballKeywords = ['futebol', 'football', 'copa', 'campeonato', 'libertadores', 'brasileirão', 'série a', 'série b'];
    
    for (const user of users) {
      const timesFavoritos = user.time_favorito.toLowerCase().split(',').map((t: string) => t.trim());
      
      for (const programa of programmes) {
        const programaLower = programa.programa_nome.toLowerCase();
        const descricaoLower = (programa.programa_descricao || '').toLowerCase();
        
        // Verificar se é programa de futebol e contém o time
        const isFutebol = footballKeywords.some(keyword => 
          programaLower.includes(keyword) || descricaoLower.includes(keyword)
        );
        
        if (isFutebol) {
          const hasTeam = timesFavoritos.some(time => 
            programaLower.includes(time) || descricaoLower.includes(time)
          );
          
          if (hasTeam) {
            // Criar notificação
            await supabase
              .from('notificacoes')
              .insert({
                user_id: user.user_id,
                tipo: 'jogo_futebol',
                mensagem: `🏈 Jogo do seu time no ${programa.canal_nome}: ${programa.programa_nome}`,
                canal_nome: programa.canal_nome,
                data_envio: new Date().toISOString(),
                status: 'nao_lida'
              });
            
            console.log(`⚽ Notificação criada para ${user.nome}: ${programa.programa_nome}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro ao gerar notificações:', error);
  }
}

// Resposta de fallback em caso de erro
function createFallbackResponse() {
  const now = new Date();
  const programmes = [
    {
      canal_nome: 'Globo',
      programa_nome: 'Jornal Nacional',
      programa_descricao: 'Principal telejornal da TV brasileira',
      inicio: new Date(now.getTime() + 60000).toISOString(),
      fim: new Date(now.getTime() + 3600000).toISOString(),
      categoria: 'Jornalismo'
    },
    {
      canal_nome: 'SBT',
      programa_nome: 'SBT Brasil',
      programa_descricao: 'Telejornal do SBT',
      inicio: new Date(now.getTime() + 3600000).toISOString(),
      fim: new Date(now.getTime() + 7200000).toISOString(),
      categoria: 'Jornalismo'
    }
  ];

  return new Response(JSON.stringify({
    success: true,
    programas_processados: programmes.length,
    programas_inseridos: 0,
    fallback: true,
    message: 'Usando dados de fallback - verifique a URL do EPG'
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}