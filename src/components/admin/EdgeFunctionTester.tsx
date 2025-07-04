
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
  const { toast } = useToast();

  const testAllSystems = async () => {
    setTesting(true);
    setLastResult(null);
    
    const results: Array<{name: string, success: boolean, data?: any, error?: string}> = [];
    
    try {
      console.log('🔧 Iniciando teste completo do sistema...');

      // Test 1: Debug (ping básico)
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

      // Test 2: M3U Import (demo com 100 linhas)
      console.log('🔧 2/3 Testando Importação M3U...');
      try {
        const demoData = {
          metadata: {
            generated_at: new Date().toISOString(),
            total_channels: 3,
            converter: "M3U to JSON Converter - Demo",
            version: "1.0"
          },
          channels: [
            {
              duration: "-1",
              name: "Test Channel 1",
              tvg_id: "test1",
              tvg_name: "Test Channel 1",
              tvg_logo: "https://via.placeholder.com/150",
              group_title: "TESTE | DEMO",
              url: "http://demo.test/stream1.ts"
            },
            {
              duration: "-1",
              name: "Demo Movie",
              tvg_id: "demo_movie",
              tvg_name: "Demo Movie",
              tvg_logo: "https://via.placeholder.com/300x450",
              group_title: "FILMES | DEMO",
              url: "http://demo.test/movie1.mp4"
            },
            {
              duration: "-1",
              name: "Demo Series S01E01",
              tvg_id: "demo_series",
              tvg_name: "Demo Series S01E01",
              tvg_logo: "https://via.placeholder.com/300x450",
              group_title: "SÉRIES | DEMO",
              url: "http://demo.test/series1.mp4"
            }
          ]
        };

        const importResponse = await supabase.functions.invoke('ingest-catalogo', {
          body: demoData
        });
        results.push({
          name: 'M3U Import',
          success: !importResponse.error,
          data: importResponse.data,
          error: importResponse.error?.message
        });
      } catch (error: any) {
        results.push({
          name: 'M3U Import',
          success: false,
          error: error.message
        });
      }

      // Test 3: TMDB Enrich
      console.log('🔧 3/3 Testando TMDB Enrich...');
      try {
        const tmdbResponse = await supabase.functions.invoke('enrich-tmdb', {
          body: { batchSize: 3 }
        });
        results.push({
          name: 'TMDB Enrich',
          success: !tmdbResponse.error,
          data: tmdbResponse.data,
          error: tmdbResponse.error?.message
        });
      } catch (error: any) {
        results.push({
          name: 'TMDB Enrich',
          success: false,
          error: error.message
        });
      }

      // Compile results
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      setLastResult({
        type: 'TESTE COMPLETO',
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
        type: 'TESTE COMPLETO',
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
          Teste Completo do Sistema
        </CardTitle>
        <CardDescription>
          Execute todos os testes de Edge Functions em sequência
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testAllSystems}
          disabled={testing}
          variant="default"
          className="w-full flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          🔧 Testar Tudo
        </Button>

        {testing && (
          <Alert>
            <AlertDescription>
              Executando testes do sistema... Verifique o console para logs detalhados.
            </AlertDescription>
          </Alert>
        )}

        {lastResult && (
          <Alert variant={lastResult.success ? "default" : "destructive"}>
            <AlertDescription>
              <div className="space-y-3">
                <div className="font-medium text-lg">
                  {lastResult.type}: {lastResult.success ? "✅ Sucesso" : "❌ Erro"}
                </div>
                <div className="text-xs opacity-70">
                  {lastResult.timestamp}
                </div>
                {lastResult.success ? (
                  <div className="space-y-2">
                    <div className="font-medium text-sm">
                      {lastResult.data.summary}
                    </div>
                    <div className="space-y-1">
                      {lastResult.data.results.map((result: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span>{result.success ? "✅" : "❌"}</span>
                          <span className="font-medium">{result.name}</span>
                          {result.error && (
                            <span className="text-xs text-muted-foreground">
                              ({result.error})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer hover:underline">
                        Ver detalhes técnicos
                      </summary>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-40">
                        {JSON.stringify(lastResult.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <div className="text-sm text-destructive-foreground">
                    {lastResult.error}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• <strong>Debug:</strong> Testa conectividade básica das Edge Functions</p>
          <p>• <strong>M3U Import:</strong> Simula importação de 3 canais demo</p>
          <p>• <strong>TMDB Enrich:</strong> Testa busca de metadados para filmes/séries</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EdgeFunctionTester;
