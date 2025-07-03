import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 FETCH-EPG-SIMPLE FUNCTION CALLED');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📡 Starting EPG fetch...');
    
    // Environment check
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔑 Environment variables:', {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      const error = 'Missing environment variables';
      console.error('❌', error);
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get EPG URL from settings
    console.log('⚙️ Fetching EPG URL from settings...');
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'epg_url')
      .single();

    console.log('⚙️ Settings result:', { settings, error: settingsError });

    const epgUrl = settings?.setting_value || 'http://zed7.top/xmltv.php?username=spg9tct&password=r846kdc';
    console.log('🌐 Using EPG URL:', epgUrl);

    // Fetch XML with timeout
    console.log('📥 Fetching XML from EPG...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(epgUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TELEBOX/1.0)',
        'Accept': 'application/xml, text/xml, */*'
      }
    });
    clearTimeout(timeoutId);
    
    console.log('📥 Fetch response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      const error = `HTTP error: ${response.status} - ${response.statusText}`;
      console.error('❌', error);
      throw new Error(error);
    }

    const xmlText = await response.text();
    console.log('📄 XML content:', {
      length: xmlText.length,
      firstChars: xmlText.substring(0, 200),
      containsXml: xmlText.includes('<?xml'),
      containsTv: xmlText.includes('<tv>')
    });

    if (!xmlText || xmlText.length < 100) {
      throw new Error('EPG empty or invalid');
    }

    // Parse XML using DOMParser
    console.log('🔍 Parsing XML...');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Check for parser errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      const error = 'XML parsing error: ' + parserError.textContent;
      console.error('❌', error);
      throw new Error(error);
    }

    // Extract channels
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

    console.log('📺 Channels found:', channels.length);
    console.log('📝 Sample channel:', channels[0]);

    // Extract programmes (only current and future, next 24 hours)
    const now = new Date();
    const maxTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    
    const programmeElements = xmlDoc.querySelectorAll('programme');
    console.log('📺 Total programmes in XML:', programmeElements.length);
    
    const programmes = Array.from(programmeElements).map(programme => {
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
      // Only current and future programmes (next 24 hours)
      if (!programme.start) return false;
      return programme.start >= now && programme.start <= maxTime;
    });

    console.log('📈 Programmes filtered (next 24h):', programmes.length);
    console.log('📝 Sample programme:', programmes[0]);

    // Clean old programming data
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    console.log('🗑️ Cleaning old programming data...');
    const { error: deleteError } = await supabase
      .from('programacao')
      .delete()
      .lt('fim', yesterday.toISOString());
      
    if (deleteError) {
      console.error('⚠️ Error cleaning old data:', deleteError);
    }

    // Insert new programming data
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
    }).filter(p => p.programa_nome); // Only programmes with name

    console.log('📥 Programmes to insert:', programmesToInsert.length);
    console.log('📝 Sample programme to insert:', programmesToInsert[0]);

    // Insert in batches
    const batchSize = 200;
    let insertedCount = 0;
    
    for (let i = 0; i < programmesToInsert.length; i += batchSize) {
      const batch = programmesToInsert.slice(i, i + batchSize);
      const { error } = await supabase.from('programacao').insert(batch);
      if (error) {
        console.error('❌ Batch insert error:', error);
      } else {
        insertedCount += batch.length;
        console.log(`✅ Inserted batch ${i / batchSize + 1}: ${batch.length} programmes`);
      }
    }

    console.log('📊 Final EPG stats:', {
      channels: channels.length,
      totalProgrammes: programmes.length,
      insertedProgrammes: insertedCount
    });

    const result = {
      success: true,
      channels: channels.length,
      programmes: insertedCount,
      updated_at: new Date().toISOString()
    };

    console.log('🎉 FETCH-EPG-SIMPLE COMPLETED SUCCESSFULLY');
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 CRITICAL ERROR in fetch-epg-simple:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error.message?.includes('fetch') || error.message?.includes('timeout')) {
      errorMessage = 'Error fetching EPG data (timeout or connection)';
      statusCode = 502;
    } else if (error.message?.includes('XML') || error.message?.includes('parse')) {
      errorMessage = 'Error parsing EPG XML format';
      statusCode = 400;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.message,
      stack: error.stack
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseXMLTime(xmlTime: string): Date | null {
  if (!xmlTime) return null;
  
  try {
    // Format: YYYYMMDDHHMMSS ZZZZZ
    const match = xmlTime.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
    if (!match) return null;
    
    const [, year, month, day, hour, minute, second, timezone] = match;
    
    // Create date in UTC first
    const date = new Date();
    date.setUTCFullYear(parseInt(year));
    date.setUTCMonth(parseInt(month) - 1);
    date.setUTCDate(parseInt(day));
    date.setUTCHours(parseInt(hour));
    date.setUTCMinutes(parseInt(minute));
    date.setUTCSeconds(parseInt(second));
    date.setUTCMilliseconds(0);
    
    // Adjust timezone if provided
    if (timezone) {
      const sign = timezone[0] === '+' ? 1 : -1;
      const tzHours = parseInt(timezone.slice(1, 3));
      const tzMinutes = parseInt(timezone.slice(3, 5));
      const offsetMinutes = sign * (tzHours * 60 + tzMinutes);
      
      // Adjust to UTC
      date.setUTCMinutes(date.getUTCMinutes() - offsetMinutes);
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing XML time:', xmlTime, error);
    return null;
  }
}