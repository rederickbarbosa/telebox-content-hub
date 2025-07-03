import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileVideo, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface M3UUploaderProps {
  userId: string;
  onUploadComplete: () => void;
}

const M3UUploader = ({ userId, onUploadComplete }: M3UUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.m3u') && !file.name.toLowerCase().endsWith('.m3u8')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo M3U ou M3U8.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    setStats(null);

    try {
      // Ler o arquivo
      setProgress(20);
      const fileContent = await file.text();
      
      setProgress(40);
      
      // Processar via Edge Function
      console.log('Enviando M3U para processamento...', { 
        contentLength: fileContent.length, 
        userId 
      });
      
      const response = await supabase.functions.invoke('process-m3u', {
        body: {
          m3uContent: fileContent,
          userId: userId
        }
      });

      console.log('Resposta da Edge Function:', response);
      setProgress(80);

      if (response.error) {
        console.error('Erro da Edge Function:', response.error);
        throw new Error(response.error.message || 'Erro na Edge Function');
      }

      if (!response.data) {
        throw new Error('Nenhum dado retornado da Edge Function');
      }

      const result = response.data;
      setStats(result);
      setProgress(100);
      
      toast({
        title: "M3U processado com sucesso!",
        description: `${result.totalChannels} canais processados: ${result.stats.filmes} filmes, ${result.stats.series} séries, ${result.stats.canais} canais. JSON salvo: ${result.jsonFile}`,
      });
      
      onUploadComplete();
    } catch (error: any) {
      toast({
        title: "Erro ao processar M3U",
        description: error.message || "Ocorreu um erro ao processar o arquivo M3U.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Lista M3U
        </CardTitle>
        <CardDescription>
          Faça upload da sua lista M3U para atualizar automaticamente o catálogo de filmes, séries e canais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-telebox-blue/50 transition-colors">
          <FileVideo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <Label htmlFor="m3u-file" className="cursor-pointer">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Clique para selecionar arquivo M3U/M3U8
              </p>
              <p className="text-xs text-muted-foreground">
                Arquivos suportados: .m3u, .m3u8
              </p>
            </div>
          </Label>
          <Input
            id="m3u-file"
            type="file"
            accept=".m3u,.m3u8"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processando arquivo...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {stats && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-green-800">Processamento Concluído</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total:</span>
                    <div className="text-green-700">{stats.totalChannels}</div>
                  </div>
                  <div>
                    <span className="font-medium">Filmes:</span>
                    <div className="text-green-700">{stats.stats.filmes}</div>
                  </div>
                  <div>
                    <span className="font-medium">Séries:</span>
                    <div className="text-green-700">{stats.stats.series}</div>
                  </div>
                  <div>
                    <span className="font-medium">Canais:</span>
                    <div className="text-green-700">{stats.stats.canais}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• O arquivo será processado automaticamente</p>
          <p>• Dados antigos serão substituídos pelos novos</p>
          <p>• O processo pode levar alguns minutos para listas grandes</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default M3UUploader;