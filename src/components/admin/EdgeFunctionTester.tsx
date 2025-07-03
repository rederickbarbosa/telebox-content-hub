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

  const testEPGFunction = async () => {
    setTesting(true);
    setLastResult(null);
    
    try {
      console.log('Testando função fetch-epg...');
      
      const response = await supabase.functions.invoke('fetch-epg', {
        body: {}
      });
      
      console.log('Resposta EPG:', response);
      
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
        title: "Teste EPG concluído",
        description: `EPG processado com sucesso! ${response.data?.programmes || 0} programas`,
      });
      
    } catch (error: any) {
      console.error('Erro no teste EPG:', error);
      setLastResult({
        type: 'EPG',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Erro no teste EPG",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const testM3UFunction = async () => {
    setTesting(true);
    setLastResult(null);
    
    try {
      console.log('Testando função process-m3u...');
      
      // M3U de teste simples
      const testM3U = `#EXTM3U
#EXTINF:-1 tvg-id="teste" tvg-name="Teste" tvg-logo="" group-title="Teste",Canal Teste
http://exemplo.com/teste.m3u8
#EXTINF:-1 tvg-id="filme1" tvg-name="Filme 1" tvg-logo="" group-title="Filmes",Filme de Teste
http://exemplo.com/filme1.m3u8`;
      
      const response = await supabase.functions.invoke('process-m3u', {
        body: {
          m3uContent: testM3U,
          userId: userId
        }
      });
      
      console.log('Resposta M3U:', response);
      
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
        title: "Teste M3U concluído",
        description: `M3U processado com sucesso! ${response.data?.totalChannels || 0} canais`,
      });
      
    } catch (error: any) {
      console.error('Erro no teste M3U:', error);
      setLastResult({
        type: 'M3U',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Erro no teste M3U",
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
        <div className="flex gap-4">
          <Button 
            onClick={testEPGFunction}
            disabled={testing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Testar EPG
          </Button>
          
          <Button 
            onClick={testM3UFunction}
            disabled={testing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Testar M3U
          </Button>
        </div>

        {testing && (
          <Alert>
            <AlertDescription>
              Testando Edge Functions... Verifique o console para logs detalhados.
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