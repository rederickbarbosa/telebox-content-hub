
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileVideo, CheckCircle, AlertCircle, Database, Download, Eye, Settings, Copy, Clock, Server, AlertTriangle } from "lucide-react";
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
  const [chunkSize, setChunkSize] = useState(() => {
    const saved = localStorage.getItem('telebox-chunk-size');
    return saved ? parseInt(saved) : 100;
  });
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [preview, setPreview] = useState<ParsedChannel[]>([]);
  const [convertedData, setConvertedData] = useState<ConvertedData | null>(null);
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [eta, setEta] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadMode, setUploadMode] = useState<'local' | 'server'>('local');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const addLog = (level: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const log: UploadLog = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    setUploadLogs(prev => [...prev, log]);
  };

  const updateChunkSize = (newSize: number) => {
    setChunkSize(newSize);
    localStorage.setItem('telebox-chunk-size', newSize.toString());
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    const start = Date.now();
    setStartTime(start);
    
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setElapsedTime(formatTime(elapsed));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const calculateETA = (processed: number, total: number, startTime: number) => {
    if (processed === 0) return '';
    const elapsed = Date.now() - startTime;
    const rate = processed / elapsed;
    const remaining = total - processed;
    const etaMs = remaining / rate;
    const etaSeconds = Math.round(etaMs / 1000);
    
    return formatTime(etaSeconds);
  };

  const uploadToServer = async (file: File) => {
    addLog('info', `🔄 Mudando para modo servidor devido a falhas no modo local`);
    addLog('info', `Enviando arquivo ${file.name} para processamento no servidor...`);
    
    setUploadMode('server');
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: result, error } = await supabase.functions.invoke('import-m3u-server', {
        body: formData
      });

      if (error) {
        throw error;
      }

      // Processar logs do servidor
      if (result.logs && Array.isArray(result.logs)) {
        result.logs.forEach((logMsg: string) => {
          // Parse log format: [timestamp] LEVEL: message
          const logMatch = logMsg.match(/\[([^\]]+)\] (\w+): (.+)/);
          if (logMatch) {
            const [, , level, message] = logMatch;
            addLog(level.toLowerCase() as any, message);
          } else {
            addLog('info', logMsg);
          }
        });
      }

      setProgress(100);
      setEta('Concluído!');

      if (result.success) {
        addLog('success', `✅ Processamento servidor concluído: ${result.processed}/${result.total} canais`);
        addLog('success', `Tempo total: ${result.duration}`);
        
        if (result.preview_json) {
          setConvertedData(result.preview_json);
        }
        
        // Calcular estatísticas
        if (result.stats) {
          setStats({
            totalChannels: result.total,
            totalGroups: Object.keys(result.stats).length,
            channelsWithLogo: 0, // Não disponível no retorno servidor
            jsonSize: Math.round(JSON.stringify(result.preview_json).length / 1024)
          });
        }

        toast({
          title: "✅ Importação concluída no servidor!",
          description: `${result.processed} canais processados com sucesso em ${result.duration}.`,
        });

        setUploadComplete(true);
        onUploadComplete();
      } else {
        throw new Error(`Falhas no servidor: ${result.failed_chunks} blocos falharam`);
      }

    } catch (error: any) {
      addLog('error', `❌ Erro no modo servidor: ${error.message}`);
      console.error('Erro na importação servidor:', error);
      toast({
        title: "Erro na importação servidor",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const uploadInPhases = async (data: ConvertedData) => {
    const chunks: any[] = [];
    
    // Primeiro chunk: objeto completo com metadata
    const firstChunkChannels = data.channels.slice(0, chunkSize);
    chunks.push({
      metadata: data.metadata,
      channels: firstChunkChannels
    });

    // Chunks restantes: apenas arrays de canais
    for (let i = chunkSize; i < data.channels.length; i += chunkSize) {
      chunks.push(data.channels.slice(i, i + chunkSize));
    }

    setTotalChunks(chunks.length);
    addLog('info', `Iniciando upload sequencial em ${chunks.length} blocos`);
    addLog('info', `Primeiro bloco: ${firstChunkChannels.length} canais + metadata`);
    addLog('info', `Blocos restantes: ${chunks.length - 1} x máximo ${chunkSize} canais cada`);
    
    let failedChunks = 0;

    // Upload sequencial com fallback
    for (let i = 0; i < chunks.length; i++) {
      const isFirstChunk = i === 0;
      const success = await uploadChunkWithRetry(chunks[i], i, isFirstChunk);
      
      if (!success) {
        failedChunks++;
        if (failedChunks >= 2) { // Se 2 ou mais chunks falharem, trocar para servidor
          addLog('warning', '⚠️ Múltiplas falhas detectadas no modo local');
          addLog('info', '🔄 Ativando fallback para modo servidor...');
          
          // Fallback para modo servidor
          const fileInput = fileInputRef.current;
          if (fileInput && fileInput.files && fileInput.files[0]) {
            await uploadToServer(fileInput.files[0]);
            return;
          } else {
            throw new Error('Arquivo não disponível para fallback servidor');
          }
        }
      }

      setCurrentChunk(i + 1);
      const progressPercent = Math.round(((i + 1) / chunks.length) * 100);
      setProgress(progressPercent);

      const newEta = calculateETA(i + 1, chunks.length, startTime);
      setEta(newEta);
    }

    if (failedChunks === 0) {
      addLog('success', `✔ Upload concluído: ${data.channels.length} canais processados em ${chunks.length} blocos`);
      setUploadComplete(true);
    }
  };

  const uploadChunkWithRetry = async (chunkData: any, chunkIndex: number, isFirstChunk: boolean): Promise<boolean> => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        addLog('info', `Bloco ${chunkIndex + 1}/${totalChunks} - Tentativa ${attempt}${isFirstChunk ? ' (com metadata)' : ''}`);

        const { data: result, error } = await supabase.functions.invoke('ingest-m3u-chunk', {
          body: chunkData
        });

        if (error) {
          throw error;
        }

        addLog('success', `✓ Bloco ${chunkIndex + 1} processado com sucesso (${result?.processed || 'N/A'} itens)`);
        return true;

      } catch (error: any) {
        const delay = Math.pow(2, attempt - 1) * 2000; // 2s, 4s, 8s
        
        if (attempt < 3) {
          addLog('warning', `⚠ Erro no bloco ${chunkIndex + 1}, tentativa ${attempt}: ${error.message}`);
          addLog('info', `Aguardando ${delay/1000}s antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          addLog('error', `✖ Falha definitiva no bloco ${chunkIndex + 1} após 3 tentativas: ${error.message}`);
          return false;
        }
      }
    }
    return false;
  };

  const parseEXTINF = (line: string): Partial<ParsedChannel> => {
    const channel: Partial<ParsedChannel> = {};
    
    const durationMatch = line.match(/#EXTINF:([^,\s]+)/);
    if (durationMatch) {
      channel.duration = durationMatch[1];
    } else {
      channel.duration = '-1';
    }

    const nameMatch = line.match(/,([^,]+)$/);
    if (nameMatch) {
      channel.name = nameMatch[1].trim();
    }

    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
    if (tvgIdMatch) {
      channel.tvg_id = tvgIdMatch[1];
    }

    const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
    if (tvgNameMatch) {
      channel.tvg_name = tvgNameMatch[1];
    }

    const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
    if (tvgLogoMatch) {
      channel.tvg_logo = tvgLogoMatch[1];
    }

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

  const downloadLogs = () => {
    const logsText = uploadLogs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telebox-upload-log-${new Date().toISOString().split('T')[0]}.txt`;
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const processFile = async (file: File) => {
    // Reset states
    setUploadLogs([]);
    setUploadComplete(false);
    setCurrentChunk(0);
    setTotalChunks(0);
    setEta('');
    setElapsedTime('00:00:00');
    setUploadMode('local');

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
    startTimer();

    try {
      addLog('info', `Iniciando processamento do arquivo: ${file.name} (${Math.round(file.size / 1024)} KB)`);

      // Para arquivos muito grandes (maior que 10MB), ir direto para modo servidor
      if (file.size > 10 * 1024 * 1024) {
        addLog('info', 'Arquivo grande detectado, usando modo servidor diretamente...');
        await uploadToServer(file);
        return;
      }

      // Read file content (modo local)
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

      // Upload in phases with fallback
      await uploadInPhases(processedData);

      setProgress(100);
      setEta('Concluído!');

      if (uploadComplete) {
        addLog('success', '🎉 Processo concluído com sucesso!');
        toast({
          title: "✅ Importação concluída!",
          description: `${uploadStats.totalChannels} canais processados com sucesso.`,
        });
        onUploadComplete();
      }

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
      stopTimer();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await processFile(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAreaClick = () => {
    fileInputRef.current?.click();
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
                  Ajuste o tamanho dos blocos e modo de processamento
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="chunk-size">Tamanho do Bloco (Modo Local)</Label>
                  <Select value={chunkSize.toString()} onValueChange={(value) => updateChunkSize(parseInt(value))}>
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
                    Arquivos grandes: use blocos menores para maior estabilidade.<br/>
                    Arquivos maiores que 10MB usam automaticamente o modo servidor.
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
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragOver 
              ? 'border-telebox-blue bg-blue-50' 
              : 'border-muted-foreground/25 hover:border-telebox-blue/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleAreaClick}
        >
          <FileVideo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {dragOver ? 'Solte o arquivo aqui' : 'Arraste arquivo aqui ou clique para selecionar'}
            </p>
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: .m3u, .m3u8, .json
            </p>
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".m3u,.m3u8,.json"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </div>

        {progress > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {uploadMode === 'server' && <Server className="h-4 w-4" />}
                {converting ? "Convertendo M3U..." : uploading ? "Enviando dados..." : "Processando..."}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            
            {totalChunks > 0 && (
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Decorrido: {elapsedTime}</span>
                  </div>
                  {eta && <div>Restante: {eta}</div>}
                </div>
                <div>
                  <div>Bloco {currentChunk}/{totalChunks}</div>
                  <div className="flex items-center gap-1">
                    {uploadMode === 'server' ? <Server className="h-3 w-3" /> : <Database className="h-3 w-3" />}
                    <span>Modo: {uploadMode === 'local' ? 'Local' : 'Servidor'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {(uploadComplete || uploadLogs.length > 0) && (
          <div className={uploadComplete ? "bg-green-50 border border-green-200 rounded-lg p-4" : "bg-yellow-50 border border-yellow-200 rounded-lg p-4"}>
            <div className="flex items-center gap-2 mb-2">
              {uploadComplete ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-700" />
                  <span className="font-medium text-green-700">✔ Catálogo atualizado com sucesso</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-700" />
                  <span className="font-medium text-yellow-700">⚠ Processamento em andamento</span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {convertedData && (
                <Button 
                  onClick={downloadJSON} 
                  size="sm" 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar JSON gerado
                </Button>
              )}
              <Button 
                onClick={downloadLogs} 
                size="sm" 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Baixar LOG completo
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" size="sm" className="h-auto p-0 text-green-600 hover:text-green-700">
                    Ver detalhes técnicos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Log de Upload Detalhado</DialogTitle>
                    <DialogDescription>
                      Detalhes técnicos completos do processo de importação
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Log completo ({uploadLogs.length} entradas):</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={copyLogsToClipboard}
                          className="flex items-center gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copiar log
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={downloadLogs}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Baixar .txt
                        </Button>
                      </div>
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
          </div>
        )}

        {stats && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">📊 Estatísticas do Arquivo</h4>
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
          <p>• <strong>Modo Local:</strong> Processa no navegador, ideal para arquivos pequenos (menor que 10MB)</p>
          <p>• <strong>Modo Servidor:</strong> Processa no Supabase, otimizado para arquivos grandes (maior que 10MB)</p>
          <p>• <strong>Fallback Automático:</strong> Se o modo local falhar, automaticamente usa o servidor</p>
          <p>• <strong>Logs Completos:</strong> Disponíveis para download mesmo em caso de erro</p>
          <p>• Drag & drop suportado - arraste arquivos sobre a área</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CatalogUploader;
