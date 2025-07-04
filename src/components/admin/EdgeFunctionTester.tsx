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

  const testAllSystems = async () => {
    setTesting(true);
    setLastResult(null);
    setDebugResult(null);
    
    const results: Array<{name: string, success: boolean, data?: any, error?: string}> = [];
    
    try {
      // Test 1: Debug
      console.log('🔧 1/3 Testando Debug...');
      try {
        const debugResponse = await supabase.functions.invoke('debug-test', {
          body: { test: 'system test' }
        });
        results.push({
          name: 'Debug',
          success: !debugResponse.error,
          data: debugResponse.data,
          error: debugResponse.error?.message
        });
      } catch (error: any) {
        results.push({
          name: 'Debug',
          success: false,
          error: error.message
        });
      }

      // Test 2: EPG
      console.log('🔧 2/3 Testando EPG...');
      try {
        const epgResponse = await supabase.functions.invoke('fetch-epg-simple', {
          body: {}
        });
        results.push({
          name: 'EPG',
          success: !epgResponse.error,
          data: epgResponse.data,
          error: epgResponse.error?.message
        });
      } catch (error: any) {
        results.push({
          name: 'EPG',
          success: false,
          error: error.message
        });
      }

      // Test 3: TMDB Enrich
      console.log('🔧 3/3 Testando TMDB...');
      try {
        const tmdbResponse = await supabase.functions.invoke('enrich-tmdb', {
          body: { batchSize: 3 }
        });
        results.push({
          name: 'TMDB',
          success: !tmdbResponse.error,
          data: tmdbResponse.data,
          error: tmdbResponse.error?.message
        });
      } catch (error: any) {
        results.push({
          name: 'TMDB',
          success: false,
          error: error.message
        });
      }

      // Compile results
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      setLastResult({
        type: 'SISTEMA COMPLETO',
        success: failCount === 0,
        data: {
          summary: `${successCount}/${results.length} testes passaram`,
          results: results,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      toast({
        title: failCount === 0 ? "✅ Todos os testes passaram!" : `⚠️ ${failCount} teste(s) falharam`,
        description: `${successCount}/${results.length} sistemas funcionando`,
        variant: failCount === 0 ? "default" : "destructive"
      });

    } catch (error: any) {
      console.error('❌ Erro no teste completo:', error);
      setLastResult({
        type: 'SISTEMA COMPLETO',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "❌ Erro no teste completo",
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
            onClick={testAllSystems}
            disabled={testing}
            variant="default"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            🔧 Testar Tudo
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