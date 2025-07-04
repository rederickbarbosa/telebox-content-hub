
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileVideo, CheckCircle, AlertCircle, Database, Download, Eye, Settings, Copy } from "lucide-react";
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

interface UploadLog {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

const CatalogUploader = ({ onUploadComplete }: CatalogUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [chunkSize, setChunkSize] = useState(100);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [preview, setPreview] = useState<ParsedChannel[]>([]);
  const [convertedData, setConvertedData] = useState<ConvertedData | null>(null);
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [eta, setEta] = useState<string>('');
  const [startTime, setStartTime] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addLog = (level: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const log: UploadLog = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    setUploadLogs(prev => [...prev, log]);
  };

  const calculateETA = (processed: number, total: number, startTime: number) => {
    if (processed === 0) return '';
    const elapsed = Date.now() - startTime;
    const rate = processed / elapsed;
    const remaining = total - processed;
    const etaMs = remaining / rate;
    const etaSeconds = Math.round(etaMs / 1000);
    
    if (etaSeconds < 60) return `${etaSeconds}s restantes`;
    const etaMinutes = Math.round(etaSeconds / 60);
    return `${etaMinutes}min restantes`;
  };

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

  const copyLogsToClipboard = () => {
    const logsText = uploadLogs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    navigator.clipboard.writeText(logsText).then(() => {
      toast({
        title: "Log copiado!",
        description: "Log completo copiado para a área de transferência",
      });
    });
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const uploadInChunks = async (data: ConvertedData) => {
    const chunks: ParsedChannel[][] = [];
    
    // Divide channels into chunks
    for (let i = 0; i < data.channels.length; i += chunkSize) {
      chunks.push(data.channels.slice(i, i + chunkSize));
    }

    setTotalChunks(chunks.length);
    addLog('info', `Iniciando upload sequencial em ${chunks.length} blocos de ${chunkSize} itens cada`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let retries = 0;
      let success = false;

      const chunkData = {
        metadata: data.metadata,
        channels: chunk
      };

      while (!success && retries < 3) {
        try {
          addLog('info', `Enviando bloco ${i + 1}/${chunks.length} (${chunk.length} itens) - Tentativa ${retries + 1}`);

          const { data: result, error } = await supabase.functions.invoke('ingest-catalogo', {
            body: chunkData
          });

          if (error) {
            throw error;
          }

          success = true;
          setCurrentChunk(i + 1);
          const progressPercent = Math.round(((i + 1) / chunks.length) * 100);
          setProgress(progressPercent);

          // Calculate ETA
          const newEta = calculateETA(i + 1, chunks.length, startTime);
          setEta(newEta);

          addLog('success', `Bloco ${i + 1} processado com sucesso (${result.processed || chunk.length} itens)`);

        } catch (error: any) {
          retries++;
          const delay = Math.pow(2, retries - 1) * 2000; // 2s, 4s, 8s
          
          addLog('warning', `Erro no bloco ${i + 1}, tentativa ${retries}: ${error.message}`);
          
          if (retries < 3) {
            addLog('info', `Aguardando ${delay/1000}s antes da próxima tentativa...`);
            await sleep(delay);
          }
        }
      }

      if (!success) {
        addLog('error', `Falha crítica no bloco ${i + 1} após 3 tentativas`);
        throw new Error(`Falha ao processar bloco ${i + 1} após 3 tentativas`);
      }
    }

    addLog('success', `✅ Upload concluído: ${data.channels.length} itens processados em ${chunks.length} blocos`);
    setUploadComplete(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setUploadLogs([]);
    setUploadComplete(false);
    setCurrentChunk(0);
    setTotalChunks(0);
    setEta('');

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
    setStartTime(Date.now());

    try {
      addLog('info', `Iniciando processamento do arquivo: ${file.name} (${Math.round(file.size / 1024)} KB)`);

      // Read file content
      const fileContent = await file.text();
      setProgress(20);

      let processedData: ConvertedData;

      if (fileName.endsWith('.m3u') || fileName.endsWith('.m3u8')) {
        addLog('info', 'Convertendo arquivo M3U para JSON...');
        setProgress(40);
        processedData = convertM3UToJSON(fileContent);
        addLog('success', `Conversão concluída: ${processedData.channels.length} canais encontrados`);
        setProgress(60);
      } else {
        addLog('info', 'Validando arquivo JSON...');
        setProgress(40);
        processedData = JSON.parse(fileContent);
        
        // Validate JSON structure
        if (!processedData.metadata || !processedData.channels) {
          throw new Error('JSON deve conter "metadata" e "channels"');
        }
        addLog('success', `JSON válido: ${processedData.channels.length} canais`);
        setProgress(60);
      }

      // Calculate stats and show preview
      const uploadStats = calculateStats(processedData);
      setStats(uploadStats);
      setPreview(processedData.channels.slice(0, 50));
      setConvertedData(processedData);
      setProgress(70);

      // Upload in chunks with back-pressure
      addLog('info', `Iniciando upload sequencial com blocos de ${chunkSize} itens...`);
      await uploadInChunks(processedData);

      setProgress(100);
      setEta('Concluído!');
      addLog('success', '🎉 Processo concluído com sucesso!');

      toast({
        title: "✅ Importação concluída!",
        description: `${uploadStats.totalChannels} canais processados com sucesso.`,
      });

      onUploadComplete();

    } catch (error: any) {
      addLog('error', `❌ Erro: ${error.message}`);
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setConverting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Upload de Catálogo M3U/JSON
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-auto">
                <Settings className="h-4 w-4" />
                Configurar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurações de Upload</DialogTitle>
                <DialogDescription>
                  Ajuste o tamanho dos blocos para otimizar o upload
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="chunk-size">Tamanho do Bloco</Label>
                  <Select value={chunkSize.toString()} onValueChange={(value) => setChunkSize(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 itens (~50KB)</SelectItem>
                      <SelectItem value="300">300 itens (~150KB)</SelectItem>
                      <SelectItem value="500">500 itens (~250KB)</SelectItem>
                      <SelectItem value="1000">1000 itens (~500KB)</SelectItem>
                      <SelectItem value="2000">2000 itens (~1MB)</SelectItem>
                      <SelectItem value="5000">5000 itens (~2.5MB)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Arquivos grandes: use blocos menores para maior estabilidade
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
            ref={fileInputRef}
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
            
            {totalChunks > 0 && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Bloco {currentChunk}/{totalChunks}</div>
                <div>Tamanho do bloco: {chunkSize} itens</div>
                {eta && <div>{eta}</div>}
              </div>
            )}
          </div>
        )}

        {uploadComplete && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700 mb-2">
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
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Log de Upload</DialogTitle>
                  <DialogDescription>
                    Detalhes técnicos do processo de importação
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Log completo ({uploadLogs.length} entradas):</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyLogsToClipboard}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar Log
                    </Button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono">
                    {uploadLogs.map((log, index) => (
                      <div 
                        key={index} 
                        className={`mb-1 ${
                          log.level === 'error' ? 'text-red-400' :
                          log.level === 'warning' ? 'text-yellow-400' :
                          log.level === 'success' ? 'text-green-400' :
                          'text-slate-300'
                        }`}
                      >
                        [{log.timestamp.split('T')[1].split('.')[0]}] {log.level.toUpperCase()}: {log.message}
                      </div>
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
          <p>• Upload sequencial com retry automático até 3x por bloco</p>
          <p>• Configure o tamanho dos blocos para otimizar a performance</p>
          <p>• Dados antigos serão desativados automaticamente</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CatalogUploader;
