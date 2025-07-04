import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Play, Zap } from "lucide-react";

interface EdgeFunctionTesterProps {
  userId: string;
}

const EdgeFunctionTester = ({ userId }: EdgeFunctionTesterProps) => {
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [debugResult, setDebugResult] = useState<any>(null);
  const { toast } = useToast();

  const testDebugFunction = async () => {
    setTesting(true);
    setDebugResult(null);
    
    try {
      console.log('🔧 Testando função debug-test...');
      
      const response = await supabase.functions.invoke('debug-test', {
        body: { test: 'debug function call' }
      });
      
      console.log('🔧 Resposta Debug:', response);
      
      setDebugResult({
        success: !response.error,
        data: response.data,
        error: response.error,
        timestamp: new Date().toISOString()
      });
      
      if (response.error) {
        throw new Error(JSON.stringify(response.error));
      }
      
      toast({
        title: "✅ Função Debug OK",
        description: "Função de debug executada com sucesso!",
      });
      
    } catch (error: any) {
      console.error('❌ Erro na função debug:', error);
      setDebugResult({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "❌ Erro na função debug",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const testEPGFunction = async () => {
    await testEPGSimpleFunction();
  };

  const testEPGSimpleFunction = async () => {
    setTesting(true);
    setLastResult(null);
    
    try {
      console.log('🔧 Testando função fetch-epg-simple...');
      
      const response = await supabase.functions.invoke('fetch-epg-simple', {
        body: {}
      });
      
      console.log('🔧 Resposta EPG Simple:', response);
      
      if (response.error) {
        throw new Error(JSON.stringify(response.error));
      }
      
      setLastResult({
        type: 'EPG',
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "✅ Teste EPG Simple concluído",
        description: `EPG processado! ${response.data?.programmes || 0} programas`,
      });
      
    } catch (error: any) {
      console.error('❌ Erro no teste EPG Simple:', error);
      setLastResult({
        type: 'EPG',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "❌ Erro no teste EPG Simple",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const testM3UFunction = async () => {
    await testM3USimpleFunction();
  };

  const testFunction = async (functionName: string) => {
    setTesting(true);
    setLastResult(null);
    
    try {
      console.log(`🔧 Testando função ${functionName}...`);
      
      let body = {};
      if (functionName === 'ingest-m3u-chunk') {
        body = { fileName: 'test-chunk.jsonl.gz', importUuid: 'test-uuid' };
      } else if (functionName === 'enrich-tmdb') {
        body = { batchSize: 5 };
      }
      
      const response = await supabase.functions.invoke(functionName, { body });
      
      console.log(`🔧 Resposta ${functionName}:`, response);
      
      if (response.error) {
        throw new Error(JSON.stringify(response.error));
      }
      
      setLastResult({
        type: functionName.toUpperCase(),
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: `✅ Teste ${functionName} concluído`,
        description: "Função executada com sucesso!",
      });
      
    } catch (error: any) {
      console.error(`❌ Erro no teste ${functionName}:`, error);
      setLastResult({
        type: functionName.toUpperCase(),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: `❌ Erro no teste ${functionName}`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const testM3USimpleFunction = async () => {
    setTesting(true);
    setLastResult(null);
    
    try {
      console.log('🔧 Testando função process-m3u-simple...');
      
      // M3U de teste simples
      const testM3U = `#EXTM3U
#EXTINF:-1 tvg-id="teste" tvg-name="Teste" tvg-logo="" group-title="Teste",Canal Teste
http://exemplo.com/teste.m3u8
#EXTINF:-1 tvg-id="filme1" tvg-name="Filme 1" tvg-logo="" group-title="Filmes",Filme de Teste
http://exemplo.com/filme1.m3u8`;
      
      const response = await supabase.functions.invoke('process-m3u-simple', {
        body: {
          m3uContent: testM3U
        }
      });
      
      console.log('🔧 Resposta M3U Simple:', response);
      
      if (response.error) {
        throw new Error(JSON.stringify(response.error));
      }
      
      setLastResult({
        type: 'M3U',
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "✅ Teste M3U Simple concluído",
        description: `M3U processado! ${response.data?.totalChannels || 0} canais`,
      });
      
    } catch (error: any) {
      console.error('❌ Erro no teste M3U Simple:', error);
      setLastResult({
        type: 'M3U',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "❌ Erro no teste M3U Simple",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Teste de Edge Functions
        </CardTitle>
        <CardDescription>
          Teste as Edge Functions para diagnosticar problemas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          <Button 
            onClick={testDebugFunction}
            disabled={testing}
            variant="default"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            🔧 Testar Debug
          </Button>
          
          <Button 
            onClick={testEPGFunction}
            disabled={testing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            🔧 Testar EPG Simple
          </Button>
          
          <Button 
            onClick={testM3UFunction}
            disabled={testing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            🔧 Testar M3U Simple
          </Button>
          
          <Button 
            onClick={() => testFunction('ingest-m3u-chunk')}
            disabled={testing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            🔧 Testar Chunk Ingest
          </Button>
          
          <Button 
            onClick={() => testFunction('enrich-tmdb')}
            disabled={testing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            🔧 Testar TMDB Enrich
          </Button>
        </div>

        {testing && (
          <Alert>
            <AlertDescription>
              Testando Edge Functions... Verifique o console para logs detalhados.
            </AlertDescription>
          </Alert>
        )}

        {debugResult && (
          <Alert variant={debugResult.success ? "default" : "destructive"}>
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">
                  🔧 Teste Debug: {debugResult.success ? "✅ Sucesso" : "❌ Erro"}
                </div>
                <div className="text-xs opacity-70">
                  {debugResult.timestamp}
                </div>
                {debugResult.success ? (
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(debugResult.data, null, 2)}
                  </pre>
                ) : (
                  <div className="text-sm text-destructive-foreground">
                    {debugResult.error}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {lastResult && (
          <Alert variant={lastResult.success ? "default" : "destructive"}>
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">
                  Teste {lastResult.type}: {lastResult.success ? "✅ Sucesso" : "❌ Erro"}
                </div>
                <div className="text-xs opacity-70">
                  {lastResult.timestamp}
                </div>
                {lastResult.success ? (
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(lastResult.data, null, 2)}
                  </pre>
                ) : (
                  <div className="text-sm text-destructive-foreground">
                    {lastResult.error}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default EdgeFunctionTester;