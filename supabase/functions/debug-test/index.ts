import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 DEBUG FUNCTION CALLED - Method:', req.method);
  console.log('🚀 Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Starting debug function...');
    
    // Test environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('🔑 Environment check:', {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
      supabaseAnonKey: !!supabaseAnonKey,
      supabaseUrlValue: supabaseUrl ? 'SET' : 'NOT_SET'
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      const error = 'Missing environment variables';
      console.error('❌', error);
      return new Response(JSON.stringify({ 
        error,
        debug: { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Test Supabase connection
    console.log('🔌 Testing Supabase connection...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Simple database test
    const { data: testData, error: testError } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .limit(1);
      
    console.log('📊 Database test result:', { testData, testError });

    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return new Response(JSON.stringify({ 
        error: 'Database connection failed',
        details: testError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Test request body parsing
    let requestBody = {};
    try {
      requestBody = await req.json();
      console.log('📝 Request body parsed:', requestBody);
    } catch (e) {
      console.log('⚠️ No JSON body or parsing error:', e.message);
    }

    console.log('✅ DEBUG FUNCTION COMPLETED SUCCESSFULLY');
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Debug function working perfectly!',
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey
      },
      databaseTest: testData,
      requestBody
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 CRITICAL ERROR in debug function:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(JSON.stringify({ 
      error: 'Critical error in debug function',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});