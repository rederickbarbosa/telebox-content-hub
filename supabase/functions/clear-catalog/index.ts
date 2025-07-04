
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente Supabase não configuradas');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🧹 Iniciando limpeza do catálogo anterior...');
    
    // Limpar catálogo anterior
    const { error: deleteError, count } = await supabase
      .from('catalogo_m3u_live')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError && !deleteError.message.includes('no rows')) {
      throw new Error(`Erro ao limpar catálogo: ${deleteError.message}`);
    }
    
    console.log(`✅ Catálogo limpo: ${count || 0} registros removidos`);

    return new Response(JSON.stringify({ 
      success: true,
      deleted_count: count || 0,
      message: 'Catálogo anterior limpo com sucesso'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Erro na limpeza do catálogo:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
