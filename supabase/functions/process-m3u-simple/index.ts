import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 PROCESS-M3U FUNCTION CALLED');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Starting M3U processing...');
    
    // Environment check
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('🔑 Environment variables:', {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
      supabaseAnonKey: !!supabaseAnonKey
    });
    
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      const error = 'Missing required environment variables';
      console.error('❌', error);
      return new Response(JSON.stringify({ 
        error,
        details: {
          supabaseUrl: !!supabaseUrl,
          supabaseServiceKey: !!supabaseServiceKey,
          supabaseAnonKey: !!supabaseAnonKey
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract and validate JWT token
    const authHeader = req.headers.get('Authorization');
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      const error = 'Authorization header missing';
      console.error('❌', error);
      return new Response(JSON.stringify({ error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Extract user from JWT
    const token = authHeader.replace('Bearer ', '');
    console.log('🎫 Token length:', token.length);
    
    const { data: { user }, error: userError } = await userSupabase.auth.getUser(token);
    
    console.log('👤 User authentication:', {
      userId: user?.id,
      email: user?.email,
      error: userError?.message
    });
    
    if (userError || !user) {
      const error = 'Invalid authentication token';
      console.error('❌', error, userError);
      return new Response(JSON.stringify({ 
        error,
        details: userError?.message 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📝 Request body keys:', Object.keys(requestBody));
    } catch (e) {
      const error = 'Invalid JSON in request body';
      console.error('❌', error, e.message);
      return new Response(JSON.stringify({ 
        error,
        details: e.message 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { m3uContent } = requestBody;
    
    if (!m3uContent) {
      const error = 'M3U content is required';
      console.error('❌', error);
      return new Response(JSON.stringify({ error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📄 M3U content length:', m3uContent.length);

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    console.log('👮 User role check:', { 
      role: profile?.role, 
      error: profileError?.message 
    });

    if (profileError || profile?.role !== 'admin') {
      const error = 'Access denied. Admin role required';
      console.error('❌', error);
      return new Response(JSON.stringify({ 
        error,
        details: profileError?.message || 'User is not admin'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process M3U content (simplified)
    console.log('⚙️ Processing M3U content...');
    
    const lines = m3uContent.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
    const channels = [];
    let currentChannel: any = {};

    console.log('📊 Total lines in M3U:', lines.length);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('#EXTINF:')) {
        // Parse EXTINF line
        const nameMatch = line.match(/,([^,]+)$/);
        if (nameMatch) {
          currentChannel.name = nameMatch[1].trim();
        }
        
        // Extract group
        const groupMatch = line.match(/group-title="([^"]*)"/);
        if (groupMatch) {
          currentChannel.group_title = groupMatch[1];
        }
        
        // Extract logo
        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        if (logoMatch) {
          currentChannel.tvg_logo = logoMatch[1];
        }
        
      } else if (line.startsWith('http') || line.includes('://')) {
        // URL line
        if (Object.keys(currentChannel).length > 0) {
          currentChannel.url = line;
          
          // Determine type
          let tipo = 'canal';
          if (currentChannel.group_title) {
            const grupo = currentChannel.group_title.toLowerCase();
            if (grupo.includes('filme') || grupo.includes('movie')) {
              tipo = 'filme';
            } else if (grupo.includes('serie') || grupo.includes('tv') || grupo.includes('show')) {
              tipo = 'serie';
            }
          }

          channels.push({
            nome: currentChannel.name || 'Sem nome',
            grupo: currentChannel.group_title || 'Outros',
            tvg_logo: currentChannel.tvg_logo || '',
            url: currentChannel.url,
            tipo,
            qualidade: 'HD',
            regiao: '',
            ativo: true
          });
          
          currentChannel = {};
        }
      }
    }

    console.log('📈 Processed channels:', channels.length);
    console.log('📝 Sample channel:', channels[0]);

    // Save to storage as JSON
    const catalogJson = {
      metadata: {
        generated_at: new Date().toISOString(),
        total_channels: channels.length,
        converter: "TELEBOX M3U Converter",
        version: "1.0"
      },
      channels: channels
    };

    const jsonFileName = `catalog-${Date.now()}.json`;
    console.log('💾 Saving JSON to storage:', jsonFileName);

    const { error: uploadError } = await supabase.storage
      .from('catalog-json')
      .upload(jsonFileName, JSON.stringify(catalogJson, null, 2), {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      throw new Error('Failed to save catalog to storage: ' + uploadError.message);
    }

    console.log('✅ JSON saved to storage successfully');

    // Clear and insert into database
    console.log('🗄️ Clearing old catalog data...');
    await supabase.from('catalogo_m3u').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('📥 Inserting new catalog data...');
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize);
      const { error } = await supabase.from('catalogo_m3u').insert(batch);
      if (error) {
        console.error('❌ Batch insert error:', error);
      } else {
        insertedCount += batch.length;
        console.log(`✅ Inserted batch ${i / batchSize + 1}: ${batch.length} items`);
      }
    }

    console.log('📊 Final stats:', {
      totalChannels: channels.length,
      insertedToDb: insertedCount,
      jsonFile: jsonFileName
    });

    const response = {
      success: true,
      totalChannels: channels.length,
      insertedToDb: insertedCount,
      jsonFile: jsonFileName,
      stats: {
        filmes: channels.filter(c => c.tipo === 'filme').length,
        series: channels.filter(c => c.tipo === 'serie').length,
        canais: channels.filter(c => c.tipo === 'canal').length
      }
    };

    console.log('🎉 PROCESS-M3U COMPLETED SUCCESSFULLY');
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 CRITICAL ERROR in process-m3u:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});