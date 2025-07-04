import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileVideo, CheckCircle, AlertCircle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChunkUploaderProps {
  onUploadComplete: () => void;
}

interface ChunkInfo {
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

const ChunkUploader = ({ onUploadComplete }: ChunkUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [totalProgress, setTotalProgress] = useState(0);
  const [importUuid, setImportUuid] = useState<string | null>(null);
  const { toast } = useToast();

  const updateChunkStatus = useCallback((index: number, updates: Partial<ChunkInfo>) => {
    setChunks(prev => prev.map((chunk, i) => 
      i === index ? { ...chunk, ...updates } : chunk
    ));
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Validate all files are .jsonl.gz
    const invalidFiles = files.filter(file => !file.name.endsWith('.jsonl.gz'));
    if (invalidFiles.length > 0) {
      toast({
        title: "Formato inválido",
        description: "Apenas arquivos .jsonl.gz são aceitos.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const uuid = crypto.randomUUID();
    setImportUuid(uuid);
    
    // Initialize chunk tracking
    const initialChunks: ChunkInfo[] = files.map(file => ({
      name: file.name,
      size: file.size,
      status: 'pending',
      progress: 0
    }));
    
    setChunks(initialChunks);
    setTotalProgress(0);

    try {
      let completedCount = 0;
      
      // Upload chunks in parallel (max 3 at a time)
      const concurrency = 3;
      for (let i = 0; i < files.length; i += concurrency) {
        const batch = files.slice(i, i + concurrency);
        
        await Promise.all(
          batch.map(async (file, batchIndex) => {
            const chunkIndex = i + batchIndex;
            
            try {
              updateChunkStatus(chunkIndex, { status: 'uploading' });
              
              const fileName = `${uuid}/${file.name}`;
              
              const { error: uploadError } = await supabase.storage
                .from('m3u-parts')
                .upload(fileName, file, {
                  cacheControl: '3600',
                  upsert: false
                });

              if (uploadError) {
                throw new Error(uploadError.message);
              }

              updateChunkStatus(chunkIndex, { 
                status: 'uploaded', 
                progress: 100 
              });

              // Process chunk via Edge Function
              updateChunkStatus(chunkIndex, { status: 'processing' });
              
              const { error: processError } = await supabase.functions.invoke('ingest-m3u-chunk', {
                body: {
                  fileName,
                  importUuid: uuid
                }
              });

              if (processError) {
                throw new Error(processError.message);
              }

              updateChunkStatus(chunkIndex, { status: 'completed' });
              completedCount++;
              
              const newProgress = Math.round((completedCount / files.length) * 100);
              setTotalProgress(newProgress);

            } catch (error: any) {
              updateChunkStatus(chunkIndex, { 
                status: 'error', 
                error: error.message 
              });
            }
          })
        );
      }

      // Run cleanup after all chunks are processed
      if (completedCount === files.length) {
        await supabase.rpc('cleanup_m3u', { current_import_uuid: uuid });
        
        toast({
          title: "Importação concluída!",
          description: `${completedCount} chunks processados com sucesso. Executando limpeza...`,
        });
        
        onUploadComplete();
      } else {
        toast({
          title: "Importação parcial",
          description: `${completedCount}/${files.length} chunks processados. Verifique os erros.`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const getStatusIcon = (status: ChunkInfo['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'processing': return <Package className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'uploading': return <Upload className="h-4 w-4 text-yellow-600" />;
      default: return <FileVideo className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ChunkInfo['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'processing': return 'text-blue-600';
      case 'uploading': return 'text-yellow-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Upload por Chunks (.jsonl.gz)
        </CardTitle>
        <CardDescription>
          Faça upload de múltiplos arquivos .jsonl.gz comprimidos para importação em lote
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-telebox-blue/50 transition-colors">
          <FileVideo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <Label htmlFor="chunk-files" className="cursor-pointer">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Clique para selecionar arquivos .jsonl.gz
              </p>
              <p className="text-xs text-muted-foreground">
                Múltiplos arquivos serão processados em paralelo
              </p>
            </div>
          </Label>
          <Input
            id="chunk-files"
            type="file"
            accept=".jsonl.gz"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </div>

        {totalProgress > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso total</span>
              <span>{totalProgress}%</span>
            </div>
            <Progress value={totalProgress} className="w-full" />
          </div>
        )}

        {chunks.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Status dos Chunks</h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {chunks.map((chunk, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(chunk.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {chunk.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(chunk.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-medium ${getStatusColor(chunk.status)}`}>
                      {chunk.status.toUpperCase()}
                    </p>
                    {chunk.error && (
                      <p className="text-xs text-red-600 max-w-32 truncate">
                        {chunk.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {importUuid && (
          <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
            <strong>Import UUID:</strong> {importUuid}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Arquivos devem estar em formato .jsonl.gz (JSON Lines comprimido)</p>
          <p>• Cada linha deve conter um objeto JSON válido</p>
          <p>• O processamento ocorre automaticamente após o upload</p>
          <p>• Dados antigos serão desativados automaticamente</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChunkUploader;