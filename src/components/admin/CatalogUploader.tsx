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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

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

  const uploadDirectlyToServer = async (data: ConvertedData) => {
    try {
      addLog('info', '🚀 Enviando arquivo diretamente para processamento no servidor...');
      
      // Criar JSON completo
      const fullJson = JSON.stringify(data);
      const blob = new Blob([fullJson], { type: 'application/json' });
      
      // Verificar tamanho
      const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      addLog('info', `📊 Tamanho do arquivo: ${sizeMB}MB`);
      
      if (blob.size > MAX_BLOCK_SIZE_BYTES) {
        throw new Error(`Arquivo muito grande: ${sizeMB}MB (máx: ${MAX_BLOCK_SIZE_MB}MB)`);
      }
      
      // Criar FormData
      const formData = new FormData();
      formData.append('file', blob, `telebox-catalog-${new Date().toISOString().split('T')[0]}.json`);
      
      // Enviar para Edge Function
      const { data: result, error } = await supabase.functions.invoke('import-m3u-server', {
        body: formData
      });
      
      if (error) {
        throw error;
      }
      
      // Processar resposta
      if (result) {
        // Adicionar logs do servidor ao log local
        if (result.logs && Array.isArray(result.logs)) {
          result.logs.forEach((logMsg: string) => {
            // Extrair nível e mensagem do log
            const match = logMsg.match(/\[(.*?)\] (\w+): (.*)/);
            if (match) {
              const [, , level, message] = match;
              addLog(level.toLowerCase() as any, message);
            } else {
              addLog('info', logMsg);
            }
          });
        }
        
        // Armazenar informações de diagnóstico
        if (result.diagnostic_info) {
          setDiagnosticInfo(result.diagnostic_info);
        }
        
        if (result.actual_inserted !== undefined) {
          setActualInserted(result.actual_inserted);
        }
        
        if (result.success) {
          addLog('success', `🎉 Upload concluído! ${result.processed || 0} canais processados`);
          setUploadComplete(true);
          
          toast({
            title: "✅ Catálogo enviado com sucesso!",
            description: `${result.processed || 0} canais processados pelo servidor`,
          });
          
          onUploadComplete();
          
          // Verificação crítica
          if ((result.actual_inserted || 0) === 0) {
            addLog('error', '🚨 ATENÇÃO: Nenhum dado foi realmente inserido na tabela!');
            addLog('error', '🔍 Possíveis causas: RLS ativo, policies restritivas ou problema de permissões');
            
            toast({
              title: "⚠️ Problema detectado!",
              description: "Upload processado mas dados não inseridos. Verificar RLS/Policies no Supabase.",
              variant: "destructive",
            });
          }
        } else {
          throw new Error(result.error || 'Erro desconhecido no servidor');
        }
      }
    } catch (error: any) {
      addLog('error', `❌ Erro no servidor: ${error.message}`);
      console.error('Erro no upload:', error);
      
      toast({
        title: "Erro no upload",
        description: error.message,
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
    const maxFileSize = 500 * 1024 * 1024;
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

      // Upload directly to server
      await uploadDirectlyToServer(processedData);

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
          Upload de Catálogo M3U/JSON - Diagnóstico Avançado
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Server className="h-4 w-4" />
            Sistema de diagnóstico integrado
          </div>
        </CardTitle>
        <CardDescription>
          Sistema com diagnóstico completo para identificar problemas de inserção no Supabase.
          <br />
          <span className="text-red-600 font-medium">
            🔍 Verificação automática: RLS, policies, chaves de acesso e inserção real na tabela
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
            <p className="text-xs text-blue-600 font-medium">
              🔍 Sistema com diagnóstico avançado ativo
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
                {converting ? "🔄 Convertendo M3U..." : uploading ? "📤 Processando no servidor..." : "✅ Concluído"}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Tempo decorrido: {elapsedTime}</span>
              </div>
            </div>
          </div>
        )}

        {/* Diagnóstico */}
        {diagnosticInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-blue-700" />
              <span className="font-medium text-blue-700">Informações de Diagnóstico</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">URL Supabase:</span>
                <div className="font-mono text-xs bg-white p-1 rounded">{diagnosticInfo.supabase_url}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Service Key:</span>
                <div className="font-medium">{diagnosticInfo.service_key_present ? '✅ Presente' : '❌ Ausente'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Blocos processados:</span>
                <div className="font-medium">{diagnosticInfo.chunks_processed || 0}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Tamanho do bloco:</span>
                <div className="font-medium">{diagnosticInfo.chunk_size || 0} canais</div>
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
              <div>Registros realmente inseridos: <strong>{actualInserted}</strong></div>
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
                    Ver log de diagnóstico
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Log de Diagnóstico Completo</DialogTitle>
                    <DialogDescription>
                      Logs detalhados com verificações de conexão, RLS, inserção e diagnóstico
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
          <p>• <strong>🔍 Diagnóstico Avançado:</strong> Verifica conexão, RLS, policies e inserção real</p>
          <p>• <strong>📊 Verificação de Dados:</strong> Confirma se os registros foram realmente inseridos</p>
          <p>• <strong>🚨 Detecção de Problemas:</strong> Identifica RLS ativo, policies restritivas e erros de schema</p>
          <p>• <strong>📋 Logs Detalhados:</strong> Toda operação é logada para diagnóstico</p>
          <p>• <strong>🔗 Link Direto:</strong> Acesso rápido ao Supabase Studio para verificação</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CatalogUploader;
