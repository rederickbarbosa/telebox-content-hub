
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileVideo, CheckCircle, AlertCircle, Database, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CatalogUploaderProps {
  onUploadComplete: () => void;
}

interface UploadStats {
  totalChannels: number;
  totalGroups: number;
  channelsWithLogo: number;
  jsonSize: number;
}

interface ParsedChannel {
  duration: string;
  name: string;
  tvg_id?: string;
  tvg_name?: string;
  tvg_logo?: string;
  group_title?: string;
  url: string;
}

interface ConvertedData {
  metadata: {
    generated_at: string;
    total_channels: number;
    converter: string;
    version: string;
  };
  channels: ParsedChannel[];
}

interface BatchProgress {
  current: number;
  total: number;
  processed: number;
}

const CatalogUploader = ({ onUploadComplete }: CatalogUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [preview, setPreview] = useState<ParsedChannel[]>([]);
  const [convertedData, setConvertedData] = useState<ConvertedData | null>(null);
  const [uploadLogs, setUploadLogs] = useState<string[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);
  const { toast } = useToast();

  const parseEXTINF = (line: string): Partial<ParsedChannel> => {
    const channel: Partial<ParsedChannel> = {};
    
    // Extract duration
    const durationMatch = line.match(/#EXTINF:([^,\s]+)/);
    if (durationMatch) {
      channel.duration = durationMatch[1];
    } else {
      channel.duration = '-1';
    }

    // Extract channel name (after last comma)
    const nameMatch = line.match(/,([^,]+)$/);
    if (nameMatch) {
      channel.name = nameMatch[1].trim();
    }

    // Extract tvg-id
    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
    if (tvgIdMatch) {
      channel.tvg_id = tvgIdMatch[1];
    }

    // Extract tvg-name
    const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
    if (tvgNameMatch) {
      channel.tvg_name = tvgNameMatch[1];
    }

    // Extract tvg-logo
    const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
    if (tvgLogoMatch) {
      channel.tvg_logo = tvgLogoMatch[1];
    }

    // Extract group-title
    const groupTitleMatch = line.match(/group-title="([^"]*)"/);
    if (groupTitleMatch) {
      channel.group_title = groupTitleMatch[1];
    }

    return channel;
  };

  const convertM3UToJSON = (m3uContent: string): ConvertedData => {
    const lines = m3uContent.split('\n').map(line => line.trim()).filter(line => line);
    const channels: ParsedChannel[] = [];
    let currentChannel: Partial<ParsedChannel> = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('#EXTINF:')) {
        currentChannel = parseEXTINF(line);
      } else if (line.startsWith('http') || line.includes('://')) {
        if (Object.keys(currentChannel).length > 0 && currentChannel.name) {
          channels.push({
            duration: currentChannel.duration || '-1',
            name: currentChannel.name,
            tvg_id: currentChannel.tvg_id || '',
            tvg_name: currentChannel.tvg_name || '',
            tvg_logo: currentChannel.tvg_logo || '',
            group_title: currentChannel.group_title || '',
            url: line
          });
          currentChannel = {};
        }
      }
    }

    return {
      metadata: {
        generated_at: new Date().toISOString(),
        total_channels: channels.length,
        converter: "M3U to JSON Converter",
        version: "1.0"
      },
      channels
    };
  };

  const calculateStats = (data: ConvertedData): UploadStats => {
    const groups = new Set(data.channels.map(ch => ch.group_title).filter(g => g));
    const channelsWithLogo = data.channels.filter(ch => ch.tvg_logo && ch.tvg_logo.trim()).length;
    const jsonString = JSON.stringify(data, null, 2);
    const jsonSize = Math.round(new Blob([jsonString]).size / 1024);

    return {
      totalChannels: data.channels.length,
      totalGroups: groups.size,
      channelsWithLogo,
      jsonSize
    };
  };

  const downloadJSON = () => {
    if (!convertedData) return;
    
    const jsonString = JSON.stringify(convertedData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telebox-catalog-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const addLog = (message: string) => {
    setUploadLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const uploadInBatches = async (data: ConvertedData) => {
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(data.channels.length / BATCH_SIZE);
    let processedChannels = 0;

    addLog(`Iniciando upload em ${totalBatches} lotes de ${BATCH_SIZE} itens cada`);
    
    setBatchProgress({
      current: 0,
      total: totalBatches,
      processed: 0
    });

    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, data.channels.length);
      const batch = data.channels.slice(start, end);
      
      const batchData = {
        metadata: data.metadata,
        channels: batch
      };

      addLog(`Enviando lote ${i + 1}/${totalBatches} (${batch.length} itens)`);

      try {
        const { data: result, error } = await supabase.functions.invoke('ingest-catalogo', {
          body: batchData
        });

        if (error) {
          addLog(`Erro no lote ${i + 1}: ${error.message}`);
          throw error;
        }

        processedChannels += batch.length;
        addLog(`Lote ${i + 1} processado com sucesso (${result.processed || batch.length} itens)`);

        setBatchProgress({
          current: i + 1,
          total: totalBatches,
          processed: processedChannels
        });

        // Update progress bar
        const progressPercent = Math.round(((i + 1) / totalBatches) * 100);
        setProgress(progressPercent);

      } catch (error: any) {
        addLog(`Falha crítica no lote ${i + 1}: ${error.message}`);
        throw error;
      }
    }

    addLog(`✅ Upload concluído: ${processedChannels} itens processados em ${totalBatches} lotes`);
    setUploadComplete(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setUploadLogs([]);
    setUploadComplete(false);
    setBatchProgress(null);

    // Validate file type
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.m3u', '.m3u8', '.json'];
    const isValidFile = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValidFile) {
      toast({
        title: "Formato inválido",
        description: "Apenas arquivos .m3u, .m3u8 ou .json são aceitos.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setConverting(fileName.endsWith('.m3u') || fileName.endsWith('.m3u8'));
    setProgress(0);

    try {
      addLog(`Iniciando processamento do arquivo: ${file.name} (${Math.round(file.size / 1024)} KB)`);

      // Read file content
      const fileContent = await file.text();
      setProgress(20);

      let processedData: ConvertedData;

      if (fileName.endsWith('.m3u') || fileName.endsWith('.m3u8')) {
        addLog('Convertendo arquivo M3U para JSON...');
        setProgress(40);
        processedData = convertM3UToJSON(fileContent);
        addLog(`Conversão concluída: ${processedData.channels.length} canais encontrados`);
        setProgress(60);
      } else {
        addLog('Validando arquivo JSON...');
        setProgress(40);
        processedData = JSON.parse(fileContent);
        
        // Validate JSON structure
        if (!processedData.metadata || !processedData.channels) {
          throw new Error('JSON deve conter "metadata" e "channels"');
        }
        addLog(`JSON válido: ${processedData.channels.length} canais`);
        setProgress(60);
      }

      // Calculate stats and show preview
      const uploadStats = calculateStats(processedData);
      setStats(uploadStats);
      setPreview(processedData.channels.slice(0, 50));
      setConvertedData(processedData);
      setProgress(70);

      // Upload in batches
      addLog('Iniciando upload para o Supabase...');
      await uploadInBatches(processedData);

      setProgress(100);
      addLog('🎉 Processo concluído com sucesso!');

      toast({
        title: "✅ Importação concluída!",
        description: `${uploadStats.totalChannels} canais processados com sucesso.`,
      });

      onUploadComplete();

    } catch (error: any) {
      addLog(`❌ Erro: ${error.message}`);
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setConverting(false);
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Upload de Catálogo M3U/JSON
        </CardTitle>
        <CardDescription>
          Faça upload de arquivos .m3u, .m3u8 ou .json para atualizar o catálogo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-telebox-blue/50 transition-colors">
          <FileVideo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <Label htmlFor="catalog-file" className="cursor-pointer">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Clique para selecionar arquivo M3U ou JSON
              </p>
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: .m3u, .m3u8, .json
              </p>
            </div>
          </Label>
          <Input
            id="catalog-file"
            type="file"
            accept=".m3u,.m3u8,.json"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </div>

        {progress > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                {converting ? "Convertendo M3U..." : uploading ? "Enviando dados..." : "Processando..."}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            
            {batchProgress && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Lote {batchProgress.current}/{batchProgress.total}</div>
                <div>Processados: {batchProgress.processed.toLocaleString()} itens</div>
              </div>
            )}
          </div>
        )}

        {uploadComplete && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">✅ Catálogo atualizado com sucesso</span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="link" size="sm" className="h-auto p-0 text-green-600 hover:text-green-700">
                  <Eye className="h-3 w-3 mr-1" />
                  Ver detalhes técnicos
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Log de Upload</DialogTitle>
                  <DialogDescription>
                    Detalhes técnicos do processo de importação
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Log completo:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(uploadLogs.join('\n'));
                        toast({ title: "Log copiado!", description: "Log copiado para a área de transferência" });
                      }}
                    >
                      Copiar Log
                    </Button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono">
                    {uploadLogs.map((log, index) => (
                      <div key={index} className="mb-1">{log}</div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {stats && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">📊 Estatísticas do Arquivo</h4>
              {convertedData && (
                <Button 
                  onClick={downloadJSON} 
                  size="sm" 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar JSON
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total de Canais:</span>
                <div className="font-medium text-telebox-blue">{stats.totalChannels.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Grupos Únicos:</span>
                <div className="font-medium text-telebox-blue">{stats.totalGroups}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Com Logo:</span>
                <div className="font-medium text-telebox-blue">{stats.channelsWithLogo.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Tamanho JSON:</span>
                <div className="font-medium text-telebox-blue">{stats.jsonSize.toLocaleString()} KB</div>
              </div>
            </div>
          </div>
        )}

        {preview.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">👀 Prévia (primeiros 50 itens)</h4>
            <div className="max-h-60 overflow-y-auto bg-slate-900 text-slate-100 p-4 rounded-lg text-xs">
              <pre>{JSON.stringify(preview, null, 2)}</pre>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Arquivos M3U serão convertidos automaticamente para JSON</p>
          <p>• Arquivos grandes são enviados em lotes de 500 itens para melhor performance</p>
          <p>• O processamento ocorre automaticamente após o upload</p>
          <p>• Dados antigos serão desativados automaticamente</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CatalogUploader;
