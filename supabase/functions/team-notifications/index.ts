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

    console.log('Iniciando verificação de notificações de times...');

    // Buscar usuários com time favorito definido
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, time_favorito')
      .not('time_favorito', 'is', null)
      .neq('time_favorito', '');

    if (profilesError) {
      console.error('Erro ao buscar profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Encontrados ${profiles?.length || 0} usuários com time favorito`);

    let notificacoesCriadas = 0;

    for (const profile of profiles || []) {
      console.log(`Verificando jogos para o time: ${profile.time_favorito}`);

      // Buscar jogos do time favorito na programação (hoje e amanhã)
      const { data: programas, error: programasError } = await supabase
        .from('programacao')
        .select('canal_nome, programa_nome, inicio, fim, programa_descricao')
        .or(`programa_nome.ilike.%${profile.time_favorito}%,programa_descricao.ilike.%${profile.time_favorito}%`)
        .gte('inicio', new Date().toISOString())
        .lte('inicio', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

      if (programasError) {
        console.error('Erro ao buscar programas:', programasError);
        continue;
      }

      console.log(`Encontrados ${programas?.length || 0} jogos para ${profile.time_favorito}`);

      for (const programa of programas || []) {
        const horaJogo = new Date(programa.inicio).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        const mensagem = `🏆 Seu time ${profile.time_favorito} joga hoje às ${horaJogo} no ${programa.canal_nome}`;

        // Verificar se a notificação já foi criada
        const { data: existingNotification } = await supabase
          .from('notificacoes')
          .select('id')
          .eq('user_id', profile.user_id)
          .eq('tipo', 'jogo')
          .eq('canal_nome', programa.canal_nome)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (!existingNotification) {
          // Criar nova notificação
          const { error: notificationError } = await supabase
            .from('notificacoes')
            .insert({
              user_id: profile.user_id,
              tipo: 'jogo',
              mensagem,
              canal_nome: programa.canal_nome,
              status: 'nao_lida'
            });

          if (notificationError) {
            console.error('Erro ao criar notificação:', notificationError);
          } else {
            notificacoesCriadas++;
            console.log(`Notificação criada para ${profile.time_favorito}`);
          }
        }
      }
    }

    // Log da operação
    await supabase
      .from('system_logs')
      .insert({
        level: 'info',
        message: 'Team notifications processed',
        context: {
          profiles_checked: profiles?.length || 0,
          notifications_created: notificacoesCriadas,
          timestamp: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        profiles_checked: profiles?.length || 0,
        notifications_created: notificacoesCriadas,
        message: 'Notificações de times processadas com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro na função team-notifications:', error);
    
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