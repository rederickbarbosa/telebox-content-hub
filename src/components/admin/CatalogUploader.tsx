
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileVideo, CheckCircle, AlertCircle, Database, Download, Copy, Clock, Server, AlertTriangle } from "lucide-react";
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
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [preview, setPreview] = useState<ParsedChannel[]>([]);
  const [convertedData, setConvertedData] = useState<ConvertedData | null>(null);
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [startTime, setStartTime] = useState<number>(0);
  const [dragOver, setDragOver] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [actualInserted, setActualInserted] = useState<number>(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Limite seguro para cada upload - bem abaixo do limite de 40MB do servidor
  const MAX_CHUNK_SIZE_MB = 35;
  const MAX_CHUNK_SIZE_BYTES = MAX_CHUNK_SIZE_MB * 1024 * 1024;

  const addLog = (level: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const log: UploadLog = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    setUploadLogs(prev => [...prev, log]);
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
        converter: "TELEBOX M3U to JSON Converter - Auto Chunking",
        version: "3.0"
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

  // Nova função para dividir automaticamente o JSON em chunks menores
  const divideDataIntoChunks = (data: ConvertedData): ConvertedData[] => {
    const chunks: ConvertedData[] = [];
    const channels = data.channels;
    
    // Estimar tamanho médio por canal
    const sampleSize = Math.min(100, channels.length);
    const sampleChannels = channels.slice(0, sampleSize);
    const sampleJson = JSON.stringify({ channels: sampleChannels });
    const avgBytesPerChannel = new Blob([sampleJson]).size / sampleSize;
    
    // Calcular quantos canais cabem em cada chunk
    const channelsPerChunk = Math.floor(MAX_CHUNK_SIZE_BYTES / avgBytesPerChannel * 0.8); // 80% para margem de segurança
    
    addLog('info', `📊 Tamanho médio por canal: ${Math.round(avgBytesPerChannel)} bytes`);
    addLog('info', `📦 Canais por chunk: ${channelsPerChunk.toLocaleString()}`);
    
    for (let i = 0; i < channels.length; i += channelsPerChunk) {
      const chunkChannels = channels.slice(i, i + channelsPerChunk);
      const chunk: ConvertedData = {
        metadata: {
          ...data.metadata,
          chunk_info: {
            chunk_number: Math.floor(i / channelsPerChunk) + 1,
            total_chunks: Math.ceil(channels.length / channelsPerChunk),
            channels_in_chunk: chunkChannels.length,
            chunk_start: i,
            chunk_end: i + chunkChannels.length - 1
          }
        },
        channels: chunkChannels
      };
      
      // Verificar se o chunk não excede o limite
      const chunkSize = new Blob([JSON.stringify(chunk)]).size;
      const chunkSizeMB = chunkSize / (1024 * 1024);
      
      if (chunkSizeMB > MAX_CHUNK_SIZE_MB) {
        addLog('warning', `⚠️ Chunk ${chunks.length + 1} ainda grande: ${chunkSizeMB.toFixed(2)}MB - reduzindo...`);
        // Se ainda for grande, dividir esse chunk pela metade
        const halfSize = Math.floor(chunkChannels.length / 2);
        const firstHalf = chunkChannels.slice(0, halfSize);
        const secondHalf = chunkChannels.slice(halfSize);
        
        // Adicionar primeira metade
        chunks.push({
          ...chunk,
          channels: firstHalf,
          metadata: {
            ...chunk.metadata,
            chunk_info: {
              ...chunk.metadata.chunk_info,
              channels_in_chunk: firstHalf.length,
              split_chunk: true
            }
          }
        });
        
        // Adicionar segunda metade
        chunks.push({
          ...chunk,
          channels: secondHalf,
          metadata: {
            ...chunk.metadata,
            chunk_info: {
              ...chunk.metadata.chunk_info,
              chunk_number: chunk.metadata.chunk_info.chunk_number + 0.5,
              channels_in_chunk: secondHalf.length,
              split_chunk: true
            }
          }
        });
      } else {
        chunks.push(chunk);
      }
    }
    
    return chunks;
  };

  const uploadChunksSequentially = async (chunks: ConvertedData[]) => {
    setTotalChunks(chunks.length);
    let totalInserted = 0;
    
    addLog('info', `🚀 Iniciando upload sequencial de ${chunks.length} partes...`);
    
    for (let i = 0; i < chunks.length; i++) {
      setCurrentChunk(i + 1);
      const chunk = chunks[i];
      const chunkJson = JSON.stringify(chunk);
      const chunkSize = new Blob([chunkJson]).size;
      const chunkSizeMB = (chunkSize / (1024 * 1024)).toFixed(2);
      
      addLog('info', `📤 Enviando parte ${i + 1}/${chunks.length} (${chunkSizeMB}MB, ${chunk.channels.length.toLocaleString()} canais)`);
      
      try {
        // Criar FormData para este chunk
        const formData = new FormData();
        const blob = new Blob([chunkJson], { type: 'application/json' });
        formData.append('file', blob, `telebox-catalog-chunk-${i + 1}.json`);
        
        // Enviar para Edge Function
        const { data: result, error } = await supabase.functions.invoke('import-m3u-server', {
          body: formData
        });
        
        if (error) {
          throw error;
        }
        
        if (result) {
          // Processar logs do servidor
          if (result.logs && Array.isArray(result.logs)) {
            result.logs.forEach((logMsg: string) => {
              const match = logMsg.match(/\[(.*?)\] (\w+): (.*)/);
              if (match) {
                const [, , level, message] = match;
                addLog(level.toLowerCase() as any, `[Servidor] ${message}`);
              }
            });
          }
          
          // Acumular dados inseridos
          if (result.actual_inserted !== undefined) {
            totalInserted += result.actual_inserted;
          }
          
          if (result.success) {
            addLog('success', `✅ Parte ${i + 1} enviada com sucesso (${result.processed || 0} canais processados)`);
          } else {
            throw new Error(result.error || 'Erro desconhecido no servidor');
          }
        }
        
        // Atualizar progresso
        const progressPercent = ((i + 1) / chunks.length) * 100;
        setProgress(progressPercent);
        
        // Pequena pausa entre uploads para não sobrecarregar
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error: any) {
        addLog('error', `❌ Erro na parte ${i + 1}: ${error.message}`);
        console.error(`Erro no chunk ${i + 1}:`, error);
        
        // Continuar com os próximos chunks mesmo se um falhar
        continue;
      }
    }
    
    // Finalizar processo
    setActualInserted(totalInserted);
    
    if (totalInserted > 0) {
      addLog('success', `🎉 Upload completo! Total inserido: ${totalInserted.toLocaleString()} canais`);
      setUploadComplete(true);
      
      toast({
        title: "✅ Catálogo enviado com sucesso!",
        description: `${totalInserted.toLocaleString()} canais inseridos em ${chunks.length} partes`,
      });
      
      onUploadComplete();
    } else {
      addLog('error', '🚨 Nenhum dado foi inserido! Verificar configurações do Supabase.');
      
      toast({
        title: "⚠️ Problema detectado!",
        description: "Upload processado mas dados não inseridos. Verificar RLS/Policies no Supabase.",
        variant: "destructive",
      });
    }
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
    setElapsedTime('00:00:00');
    setDiagnosticInfo(null);
    setActualInserted(0);
    setCurrentChunk(0);
    setTotalChunks(0);

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

    // Check file size limit (aumentado para 1GB já que vamos dividir automaticamente)
    const maxFileSize = 1024 * 1024 * 1024; // 1GB
    if (file.size > maxFileSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 1GB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setConverting(fileName.endsWith('.m3u') || fileName.endsWith('.m3u8'));
    setProgress(0);
    startTimer();

    try {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      addLog('info', `📁 Processando arquivo: ${file.name} (${fileSizeMB}MB)`);

      // Read file content
      const fileContent = await file.text();
      setProgress(10);

      let processedData: ConvertedData;

      if (fileName.endsWith('.m3u') || fileName.endsWith('.m3u8')) {
        addLog('info', '🔄 Convertendo M3U para JSON...');
        setProgress(20);
        processedData = convertM3UToJSON(fileContent);
        addLog('success', `✅ Conversão concluída: ${processedData.channels.length.toLocaleString()} canais encontrados`);
        setProgress(30);
      } else {
        addLog('info', '✅ Validando arquivo JSON...');
        setProgress(20);
        processedData = JSON.parse(fileContent);
        
        if (!processedData.metadata || !processedData.channels) {
          throw new Error('JSON deve conter "metadata" e "channels"');
        }
        addLog('success', `✅ JSON válido: ${processedData.channels.length.toLocaleString()} canais`);
        setProgress(30);
      }

      // Calculate stats and show preview
      const uploadStats = calculateStats(processedData);
      setStats(uploadStats);
      setPreview(processedData.channels.slice(0, 50));
      setConvertedData(processedData);
      setProgress(40);

      // Verificar se precisa dividir em chunks
      const totalSizeJson = JSON.stringify(processedData);
      const totalSizeMB = new Blob([totalSizeJson]).size / (1024 * 1024);
      
      addLog('info', `📊 Tamanho total do JSON: ${totalSizeMB.toFixed(2)}MB`);
      
      if (totalSizeMB > MAX_CHUNK_SIZE_MB) {
        addLog('info', `🔪 Arquivo grande detectado! Dividindo automaticamente em partes menores...`);
        setProgress(50);
        
        // Dividir em chunks
        const chunks = divideDataIntoChunks(processedData);
        addLog('success', `✅ Divisão concluída: ${chunks.length} partes criadas`);
        setProgress(60);
        
        // Upload sequencial dos chunks
        await uploadChunksSequentially(chunks);
      } else {
        addLog('info', `✅ Arquivo pequeno, enviando diretamente...`);
        setProgress(60);
        
        // Upload direto (arquivo pequeno)
        await uploadChunksSequentially([processedData]);
      }

      setProgress(100);

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
          Upload de Catálogo M3U/JSON - Divisão Automática
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Server className="h-4 w-4" />
            Auto-chunking para arquivos grandes
          </div>
        </CardTitle>
        <CardDescription>
          Sistema com divisão automática para arquivos de qualquer tamanho. O arquivo será automaticamente dividido em partes de até 35MB cada.
          <br />
          <span className="text-blue-600 font-medium">
            🚀 Agora suporta listas gigantes - divisão automática no navegador antes do upload!
          </span>
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
              Formatos aceitos: .m3u, .m3u8, .json (até 1GB - divisão automática)
            </p>
            <p className="text-xs text-green-600 font-medium">
              ✨ Divisão automática: arquivos grandes são divididos em partes de 35MB automaticamente
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
                {converting ? "🔄 Convertendo M3U..." : 
                 totalChunks > 1 ? `📤 Enviando parte ${currentChunk}/${totalChunks}...` :
                 uploading ? "📤 Processando..." : "✅ Concluído"}
              </span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            
            {totalChunks > 1 && (
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                📦 Arquivo dividido em {totalChunks} partes • Parte atual: {currentChunk}/{totalChunks}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Tempo decorrido: {elapsedTime}</span>
              </div>
            </div>
          </div>
        )}

        {/* Status da inserção */}
        {actualInserted !== undefined && (
          <div className={actualInserted > 0 ? "bg-green-50 border border-green-200 rounded-lg p-4" : "bg-red-50 border border-red-200 rounded-lg p-4"}>
            <div className="flex items-center gap-2 mb-2">
              {actualInserted > 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-700" />
                  <span className="font-medium text-green-700">✅ Inserção confirmada na tabela</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-700" />
                  <span className="font-medium text-red-700">🚨 Problema na inserção</span>
                </>
              )}
            </div>
            <div className="text-sm">
              <div>Registros realmente inseridos: <strong>{actualInserted.toLocaleString()}</strong></div>
              {totalChunks > 1 && (
                <div className="text-blue-600">Processado em {totalChunks} partes automaticamente</div>
              )}
              {actualInserted === 0 && (
                <div className="mt-2 p-2 bg-red-100 rounded text-red-800">
                  <strong>Possíveis causas:</strong>
                  <ul className="list-disc list-inside mt-1 text-xs">
                    <li>RLS (Row Level Security) ativo na tabela</li>
                    <li>Policies restritivas bloqueando inserts</li>
                    <li>Service Role Key incorreta ou sem permissões</li>
                    <li>Schema da tabela incompatível</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {(uploadComplete || uploadLogs.length > 0) && (
          <div className={uploadComplete && actualInserted > 0 ? "bg-green-50 border border-green-200 rounded-lg p-4" : "bg-yellow-50 border border-yellow-200 rounded-lg p-4"}>
            <div className="flex items-center gap-2 mb-2">
              {uploadComplete && actualInserted > 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-700" />
                  <span className="font-medium text-green-700">✅ Upload e inserção bem-sucedidos</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-700" />
                  <span className="font-medium text-yellow-700">⚠ Verificar resultados</span>
                </>
              )}
            </div>
            <div className="mb-3 p-3 bg-orange-100 border border-orange-300 rounded text-sm">
              <div className="font-medium text-orange-800 mb-1">🔍 Verificação obrigatória:</div>
              <div className="text-orange-700">
                Acesse o <a href="https://supabase.com/dashboard/project/e1b3b960-0f00-4a70-b646-daeca75b83c0/editor" target="_blank" rel="noopener noreferrer" className="underline font-medium">Supabase Studio</a> e 
                verifique se os dados aparecem na tabela <code className="bg-white px-1 rounded">catalogo_m3u_live</code>.
                <br />Se a tabela estiver vazia, há problema nas permissões ou configuração.
              </div>
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
                Exportar LOG (.txt)
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" size="sm" className="h-auto p-0 text-blue-600 hover:text-blue-700">
                    Ver log completo ({uploadLogs.length} entradas)
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Log Completo - Divisão Automática</DialogTitle>
                    <DialogDescription>
                      Logs detalhados incluindo divisão automática, uploads sequenciais e diagnóstico
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Log completo ({uploadLogs.length} entradas) 
                        {totalChunks > 1 && <span className="text-blue-600">• {totalChunks} partes processadas</span>}
                      </span>
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
            {totalChunks > 1 && (
              <div className="mt-2 p-2 bg-blue-100 rounded text-blue-800 text-xs">
                🔧 <strong>Divisão automática aplicada:</strong> Arquivo dividido em {totalChunks} partes de até 35MB cada
              </div>
            )}
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
          <p>• <strong>🚀 Divisão Automática:</strong> Arquivos grandes são automaticamente divididos em partes de até 35MB</p>
          <p>• <strong>📤 Upload Sequencial:</strong> Cada parte é enviada automaticamente, uma após a outra</p>
          <p>• <strong>📊 Limite Seguro:</strong> Nunca ultrapassa o limite de 40MB do servidor</p>
          <p>• <strong>🔍 Diagnóstico Completo:</strong> Logs detalhados de cada etapa do processo</p>
          <p>• <strong>✅ Suporte a Listas Gigantes:</strong> Agora funciona com arquivos de qualquer tamanho (até 1GB)</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CatalogUploader;
