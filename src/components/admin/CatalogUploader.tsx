import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileVideo, CheckCircle, AlertCircle, Database, Download, Eye, Settings, Copy, Clock, Server, AlertTriangle, Trash2 } from "lucide-react";
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

interface BlockUploadResult {
  success: boolean;
  processed: number;
  error?: string;
}

const CatalogUploader = ({ onUploadComplete }: CatalogUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [preview, setPreview] = useState<ParsedChannel[]>([]);
  const [convertedData, setConvertedData] = useState<ConvertedData | null>(null);
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [eta, setEta] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [dragOver, setDragOver] = useState(false);
  const [processedChannels, setProcessedChannels] = useState(0);
  const [totalChannelsToProcess, setTotalChannelsToProcess] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Constantes para divisão de blocos
  const MAX_BLOCK_SIZE_MB = 40;
  const MAX_BLOCK_SIZE_BYTES = MAX_BLOCK_SIZE_MB * 1024 * 1024;

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

  const calculateETA = (processed: number, total: number, startTime: number) => {
    if (processed === 0) return '';
    const elapsed = Date.now() - startTime;
    const rate = processed / elapsed;
    const remaining = total - processed;
    const etaMs = remaining / rate;
    const etaSeconds = Math.round(etaMs / 1000);
    
    return formatTime(etaSeconds);
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
        converter: "TELEBOX M3U to JSON Converter",
        version: "2.0"
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

  const clearPreviousCatalog = async (): Promise<boolean> => {
    try {
      addLog('info', '🧹 Limpando catálogo anterior...');
      
      const { data, error } = await supabase.functions.invoke('clear-catalog');
      
      if (error) {
        addLog('error', `Erro ao limpar catálogo: ${error.message}`);
        return false;
      }
      
      if (data?.success) {
        addLog('success', `✅ Catálogo anterior limpo: ${data.deleted_count || 0} registros removidos`);
        return true;
      } else {
        addLog('warning', '⚠️ Falha na limpeza do catálogo anterior');
        return false;
      }
    } catch (error: any) {
      addLog('error', `Erro crítico na limpeza: ${error.message}`);
      return false;
    }
  };

  const uploadBlock = async (blockData: ParsedChannel[], blockIndex: number, totalBlocks: number): Promise<BlockUploadResult> => {
    try {
      addLog('info', `📤 Enviando bloco ${blockIndex + 1}/${totalBlocks} (${blockData.length} canais)`);
      
      // Criar JSON do bloco
      const blockJson = JSON.stringify({
        metadata: {
          generated_at: new Date().toISOString(),
          total_channels: blockData.length,
          block_index: blockIndex + 1,
          total_blocks: totalBlocks,
          converter: "TELEBOX Block Uploader",
          version: "2.0"
        },
        channels: blockData
      });
      
      // Verificar tamanho do bloco
      const blockSize = new Blob([blockJson]).size;
      const blockSizeMB = (blockSize / (1024 * 1024)).toFixed(2);
      
      if (blockSize > MAX_BLOCK_SIZE_BYTES) {
        throw new Error(`Bloco ${blockIndex + 1} muito grande: ${blockSizeMB}MB (máx: ${MAX_BLOCK_SIZE_MB}MB)`);
      }
      
      addLog('info', `📊 Tamanho do bloco: ${blockSizeMB}MB`);
      
      // Criar FormData
      const formData = new FormData();
      const blob = new Blob([blockJson], { type: 'application/json' });
      formData.append('file', blob, `block_${blockIndex + 1}_of_${totalBlocks}.json`);
      
      // Enviar para a Edge Function
      const { data, error } = await supabase.functions.invoke('import-m3u-server', {
        body: formData
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.success) {
        addLog('success', `✅ Bloco ${blockIndex + 1} enviado com sucesso (${data.processed || blockData.length} canais processados)`);
        return { success: true, processed: data.processed || blockData.length };
      } else {
        throw new Error(data?.error || 'Erro desconhecido no processamento do bloco');
      }
      
    } catch (error: any) {
      addLog('error', `❌ Falha no bloco ${blockIndex + 1}: ${error.message}`);
      return { success: false, processed: 0, error: error.message };
    }
  };

  const divideIntoBlocks = (channels: ParsedChannel[]): ParsedChannel[][] => {
    // Calcular tamanho médio por canal
    const sampleJson = JSON.stringify(channels.slice(0, 100));
    const avgChannelSize = new Blob([sampleJson]).size / 100;
    
    // Calcular quantos canais cabem em um bloco de 40MB
    const channelsPerBlock = Math.floor(MAX_BLOCK_SIZE_BYTES / avgChannelSize * 0.8); // 80% de segurança
    
    addLog('info', `📐 Tamanho médio por canal: ${(avgChannelSize / 1024).toFixed(2)}KB`);
    addLog('info', `📦 Canais por bloco (seguro): ${channelsPerBlock.toLocaleString()}`);
    
    const blocks: ParsedChannel[][] = [];
    for (let i = 0; i < channels.length; i += channelsPerBlock) {
      blocks.push(channels.slice(i, i + channelsPerBlock));
    }
    
    return blocks;
  };

  const uploadSequentially = async (data: ConvertedData) => {
    const blocks = divideIntoBlocks(data.channels);
    setTotalBlocks(blocks.length);
    setTotalChannelsToProcess(data.channels.length);
    
    addLog('info', `🔄 Iniciando upload sequencial de ${blocks.length} blocos`);
    addLog('info', `📊 Total de canais: ${data.channels.length.toLocaleString()}`);
    
    let totalProcessed = 0;
    let failedBlocks = 0;
    
    // Upload sequencial dos blocos
    for (let i = 0; i < blocks.length; i++) {
      setCurrentBlock(i + 1);
      
      const result = await uploadBlock(blocks[i], i, blocks.length);
      
      if (result.success) {
        totalProcessed += result.processed;
        setProcessedChannels(totalProcessed);
        addLog('success', `✅ Bloco ${i + 1} processado: ${result.processed.toLocaleString()} canais`);
      } else {
        failedBlocks++;
        addLog('error', `❌ Falha no bloco ${i + 1}: ${result.error}`);
      }
      
      // Atualizar progresso
      const progressPercent = Math.round(((i + 1) / blocks.length) * 100);
      setProgress(progressPercent);
      
      // Calcular ETA
      const newEta = calculateETA(i + 1, blocks.length, startTime);
      setEta(newEta);
      
      // Delay entre blocos para evitar sobrecarga
      if (i < blocks.length - 1) {
        addLog('info', '⏱️ Aguardando 2s antes do próximo bloco...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Resultado final
    const successRate = ((blocks.length - failedBlocks) / blocks.length * 100).toFixed(1);
    
    if (failedBlocks === 0) {
      addLog('success', `🎉 Upload concluído com 100% de sucesso!`);
      addLog('success', `📊 Total processado: ${totalProcessed.toLocaleString()} canais em ${blocks.length} blocos`);
      addLog('info', `🔍 IMPORTANTE: Verifique no Supabase Studio se os dados aparecem na tabela 'catalogo_m3u_live'`);
      setUploadComplete(true);
      
      toast({
        title: "✅ Catálogo atualizado com sucesso!",
        description: `${totalProcessed.toLocaleString()} canais processados. Verifique o Supabase Studio.`,
      });
      
      onUploadComplete();
    } else {
      addLog('warning', `⚠️ Upload parcial: ${failedBlocks} de ${blocks.length} blocos falharam`);
      addLog('info', `📊 Taxa de sucesso: ${successRate}% (${totalProcessed.toLocaleString()} canais processados)`);
      addLog('error', `🔍 ATENÇÃO: Verifique se os dados estão aparecendo no Supabase Studio na tabela 'catalogo_m3u_live'`);
      
      toast({
        title: "⚠️ Upload parcial",
        description: `${totalProcessed.toLocaleString()} canais processados. ${failedBlocks} blocos falharam. Verifique o Supabase.`,
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
    setCurrentBlock(0);
    setTotalBlocks(0);
    setProcessedChannels(0);
    setTotalChannelsToProcess(0);
    setEta('');
    setElapsedTime('00:00:00');

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

    // Check file size limit (500MB)
    const maxFileSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxFileSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 500MB.",
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
      setProgress(20);

      let processedData: ConvertedData;

      if (fileName.endsWith('.m3u') || fileName.endsWith('.m3u8')) {
        addLog('info', '🔄 Convertendo M3U para JSON...');
        setProgress(40);
        processedData = convertM3UToJSON(fileContent);
        addLog('success', `✅ Conversão concluída: ${processedData.channels.length.toLocaleString()} canais encontrados`);
        setProgress(60);
      } else {
        addLog('info', '✅ Validando arquivo JSON...');
        setProgress(40);
        processedData = JSON.parse(fileContent);
        
        if (!processedData.metadata || !processedData.channels) {
          throw new Error('JSON deve conter "metadata" e "channels"');
        }
        addLog('success', `✅ JSON válido: ${processedData.channels.length.toLocaleString()} canais`);
        setProgress(60);
      }

      // Calculate stats and show preview
      const uploadStats = calculateStats(processedData);
      setStats(uploadStats);
      setPreview(processedData.channels.slice(0, 50));
      setConvertedData(processedData);
      setProgress(70);

      // Upload sequentially with automatic block division
      await uploadSequentially(processedData);

      setProgress(100);
      setEta('Concluído!');

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
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Server className="h-4 w-4" />
            Divisão automática em blocos ≤ {MAX_BLOCK_SIZE_MB}MB
          </div>
        </CardTitle>
        <CardDescription>
          Sistema inteligente: divide automaticamente listas grandes em blocos seguros e faz upload sequencial.
          <br />
          <span className="text-orange-600 font-medium">
            🔍 Após o upload, verifique no Supabase Studio se os dados aparecem na tabela 'catalogo_m3u_live'
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
              Formatos aceitos: .m3u, .m3u8, .json (máx: 500MB)
            </p>
            <p className="text-xs text-green-600 font-medium">
              🚀 Sistema automático: divide em blocos ≤ {MAX_BLOCK_SIZE_MB}MB
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
                {converting ? "🔄 Convertendo M3U..." : uploading ? "📤 Enviando blocos..." : "✅ Processando..."}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            
            {totalBlocks > 0 && (
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Decorrido: {elapsedTime}</span>
                  </div>
                  {eta && <div>Restante: {eta}</div>}
                </div>
                <div>
                  <div>Bloco {currentBlock}/{totalBlocks}</div>
                  <div className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    <span>{processedChannels.toLocaleString()}/{totalChannelsToProcess.toLocaleString()} canais</span>
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
                  <span className="font-medium text-green-700">✅ Upload automático concluído</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-700" />
                  <span className="font-medium text-yellow-700">⚠ Upload em processamento...</span>
                </>
              )}
            </div>
            <div className="mb-3 p-3 bg-orange-100 border border-orange-300 rounded text-sm">
              <div className="font-medium text-orange-800 mb-1">🔍 Verificação obrigatória:</div>
              <div className="text-orange-700">
                Acesse o <a href="https://supabase.com/dashboard/project/e1b3b960-0f00-4a70-b646-daeca75b83c0/editor" target="_blank" rel="noopener noreferrer" className="underline font-medium">Supabase Studio</a> e 
                verifique se os dados aparecem na tabela <code className="bg-white px-1 rounded">catalogo_m3u_live</code>.
                <br />Se a tabela estiver vazia, há problema nas permissões RLS ou configuração.
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
                  <Button variant="link" size="sm" className="h-auto p-0 text-green-600 hover:text-green-700">
                    Ver log detalhado
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Log de Upload Automático Detalhado</DialogTitle>
                    <DialogDescription>
                      Detalhes técnicos completos da divisão automática e upload sequencial
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
          <p>• <strong>🤖 Sistema Automático:</strong> Divide listas grandes em blocos de até {MAX_BLOCK_SIZE_MB}MB automaticamente</p>
          <p>• <strong>📤 Upload Sequencial:</strong> Envia um bloco por vez com delay de 2s entre envios</p>
          <p>• <strong>🧹 Limpeza Automática:</strong> Remove catálogo anterior antes de inserir o novo</p>
          <p>• <strong>🔍 Verificação Obrigatória:</strong> Sempre confirme no Supabase Studio se os dados foram inseridos</p>
          <p>• <strong>📊 Logs Sempre Visíveis:</strong> Disponíveis para download mesmo em caso de erro</p>
          <p>• <strong>⚡ Escalável:</strong> Preparado para listas de qualquer tamanho</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CatalogUploader;
