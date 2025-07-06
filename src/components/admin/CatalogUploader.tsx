import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileVideo, CheckCircle, AlertCircle, Database, Download, Copy, Clock, Server, AlertTriangle, Bug } from "lucide-react";
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
  duration?: string;
  name: string;
  tvg_id?: string;
  tvg_name?: string;
  tvg_logo?: string;
  group_title?: string;
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
  const [totalInserted, setTotalInserted] = useState<number>(0);
  const [hasErrors, setHasErrors] = useState(false);
  const [successRate, setSuccessRate] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const MAX_FILE_SIZE_MB = 45;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const addLog = (level: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const log: UploadLog = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    setUploadLogs(prev => [...prev, log]);
    
    if (level === 'error') {
      setHasErrors(true);
    }
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
    }

    const nameMatch = line.match(/,([^,]+)$/);
    if (nameMatch) {
      channel.name = nameMatch[1].trim();
    }

    const attributeRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
    let match;
    while ((match = attributeRegex.exec(line)) !== null) {
      const key = match[1].replace(/-/g, '_') as keyof ParsedChannel;
      (channel as any)[key] = match[2];
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
            name: currentChannel.name,
            tvg_id: currentChannel.tvg_id || '',
            tvg_name: currentChannel.tvg_name || '',
            tvg_logo: currentChannel.tvg_logo || '',
            group_title: currentChannel.group_title || ''
          });
          currentChannel = {};
        }
      }
    }

    return {
      metadata: {
        generated_at: new Date().toISOString(),
        total_channels: channels.length,
        converter: "TELEBOX Catalog Converter",
        version: "4.0"
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

  const uploadToServer = async (data: ConvertedData) => {
    addLog('info', `🚀 Enviando ${data.channels.length.toLocaleString()} canais para processamento`);
    
    try {
      const jsonString = JSON.stringify(data);
      const fileSizeMB = (new Blob([jsonString]).size / (1024 * 1024)).toFixed(2);
      
      addLog('info', `📦 Tamanho do arquivo: ${fileSizeMB}MB`);
      
      const formData = new FormData();
      const blob = new Blob([jsonString], { type: 'application/json' });
      formData.append('file', blob, `telebox-catalog-${Date.now()}.json`);
      
      addLog('info', '📤 Enviando para função Edge com políticas corrigidas...');
      
      const { data: result, error } = await supabase.functions.invoke('import-m3u-server', {
        body: formData
      });
      
      if (error) {
        addLog('error', `❌ Erro na função Edge: ${error.message}`);
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
        
        if (result.success) {
          setTotalInserted(result.inserted || 0);
          const rate = result.processed > 0 ? ((result.inserted || 0) / result.processed * 100) : 0;
          setSuccessRate(rate);
          
          addLog('success', `🎉 Processamento concluído!`);
          addLog('success', `📊 Resultado: ${result.inserted || 0} canais inseridos de ${result.processed || 0} processados`);
          addLog('success', `📈 Taxa de sucesso: ${rate.toFixed(1)}%`);
          
        } else {
          throw new Error(result.error || 'Erro desconhecido no servidor');
        }
      }
      
    } catch (error: any) {
      addLog('error', `💥 Erro no upload: ${error.message}`);
      console.error('Erro completo:', error);
      throw error;
    }
  };

  const processFile = async (file: File) => {
    // Reset states
    setUploadLogs([]);
    setUploadComplete(false);
    setElapsedTime('00:00:00');
    setTotalInserted(0);
    setHasErrors(false);
    setSuccessRate(0);

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

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast({
        title: "Arquivo muito grande",
        description: `O arquivo deve ter no máximo ${MAX_FILE_SIZE_MB}MB. Atual: ${fileSizeMB}MB`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setConverting(true);
    setProgress(0);
    startTimer();

    try {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      addLog('info', `📁 Processando: ${file.name} (${fileSizeMB}MB)`);

      const fileContent = await file.text();
      setProgress(20);

      let processedData: ConvertedData;

      // Detectar se é JSON ou M3U
      const trimmedContent = fileContent.trim();
      const isJSON = trimmedContent.startsWith('{') || trimmedContent.startsWith('[');

      if (isJSON) {
        addLog('info', '🔄 Processando arquivo JSON...');
        const jsonData = JSON.parse(fileContent);
        
        if (jsonData.channels && Array.isArray(jsonData.channels)) {
          processedData = {
            metadata: jsonData.metadata || {
              generated_at: new Date().toISOString(),
              total_channels: jsonData.channels.length,
              converter: "TELEBOX JSON Import",
              version: "4.0"
            },
            channels: jsonData.channels.map((ch: any) => ({
              name: ch.name || ch.nome || 'Sem nome',
              tvg_id: ch.tvg_id || '',
              tvg_name: ch.tvg_name || '',
              tvg_logo: ch.tvg_logo || ch.logo || '',
              group_title: ch.group_title || ch.grupo || ''
            }))
          };
        } else if (Array.isArray(jsonData)) {
          processedData = {
            metadata: {
              generated_at: new Date().toISOString(),
              total_channels: jsonData.length,
              converter: "TELEBOX Array Import",
              version: "4.0"
            },
            channels: jsonData.map((ch: any) => ({
              name: ch.name || ch.nome || 'Sem nome',
              tvg_id: ch.tvg_id || '',
              tvg_name: ch.tvg_name || '',
              tvg_logo: ch.tvg_logo || ch.logo || '',
              group_title: ch.group_title || ch.grupo || ''
            }))
          };
        } else {
          throw new Error('JSON deve ter propriedade "channels" (array) ou ser um array direto');
        }
        
        addLog('success', `✅ JSON processado: ${processedData.channels.length.toLocaleString()} canais`);
      } else {
        addLog('info', '🔄 Convertendo M3U para JSON...');
        processedData = convertM3UToJSON(fileContent);
        addLog('success', `✅ M3U convertido: ${processedData.channels.length.toLocaleString()} canais`);
      }

      setProgress(50);

      const uploadStats = calculateStats(processedData);
      setStats(uploadStats);
      setPreview(processedData.channels.slice(0, 10));
      setConvertedData(processedData);
      setProgress(70);

      addLog('info', `📊 Estatísticas: ${uploadStats.totalChannels} canais, ${uploadStats.totalGroups} grupos`);
      
      // Upload para o servidor
      await uploadToServer(processedData);
      
      setProgress(100);
      setUploadComplete(true);
      
      if (!hasErrors && totalInserted > 0) {
        toast({
          title: "✅ Catálogo atualizado!",
          description: `${totalInserted.toLocaleString()} canais processados com sucesso (${successRate.toFixed(1)}% de taxa de sucesso)`,
        });
        onUploadComplete();
      } else if (hasErrors) {
        toast({
          title: "⚠️ Processamento com erros",
          description: "Verifique os logs para mais detalhes",
          variant: "destructive",
        });
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
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const handleAreaClick = () => {
    fileInputRef.current?.click();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          TELEBOX - Upload Definitivo
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Server className="h-4 w-4" />
            Políticas corrigidas • RLS configurado
          </div>
        </CardTitle>
        <CardDescription>
          Sistema com correções definitivas de RLS, policies e estrutura da tabela.
          <br />
          <span className="text-green-600 font-medium">
            ✅ Banco atualizado: Campos nullable, defaults configurados, service role liberado!
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
              {dragOver ? 'Solte o arquivo aqui' : 'Clique ou arraste o arquivo'}
            </p>
            <p className="text-xs text-muted-foreground">
              Formatos: .m3u, .m3u8, .json • Máximo: {MAX_FILE_SIZE_MB}MB
            </p>
            <p className="text-xs text-blue-600 font-medium">
              🔧 Correções aplicadas: RLS, policies, estrutura da tabela
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
                {converting ? "🔄 Processando arquivo..." : 
                 uploading ? "📤 Enviando..." : "✅ Concluído"}
              </span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Tempo: {elapsedTime}</span>
            </div>
          </div>
        )}

        {uploadComplete && (
          <div className={`${hasErrors ? "bg-red-50 border border-red-200" : totalInserted > 0 ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"} rounded-lg p-4`}>
            <div className="flex items-center gap-2 mb-2">
              {hasErrors ? (
                <>
                  <Bug className="h-5 w-5 text-red-700" />
                  <span className="font-medium text-red-700">⚠️ Processamento com erros</span>
                </>
              ) : totalInserted > 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-700" />
                  <span className="font-medium text-green-700">✅ Catálogo atualizado com sucesso</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-700" />
                  <span className="font-medium text-yellow-700">🚨 Nenhum dado inserido</span>
                </>
              )}
            </div>
            <div className="text-sm space-y-1">
              <div>Canais inseridos: <strong>{totalInserted.toLocaleString()}</strong></div>
              {successRate > 0 && (
                <div>Taxa de sucesso: <strong>{successRate.toFixed(1)}%</strong></div>
              )}
              {hasErrors && (
                <div className="text-red-600 mt-1">Verifique os logs para detalhes dos erros</div>
              )}
            </div>
          </div>
        )}

        {uploadLogs.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                Logs do Processo ({uploadLogs.length} entradas)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyLogsToClipboard}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadLogs}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Ver Completo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Log Completo do Upload</DialogTitle>
                      <DialogDescription>
                        Logs detalhados do processamento com correções aplicadas
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {uploadLogs.length} entradas de log
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={copyLogsToClipboard}
                            className="flex items-center gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            Copiar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={downloadLogs}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Baixar
                          </Button>
                        </div>
                      </div>
                      {/* Área de log com altura fixa e scroll */}
                      <div className="h-96 overflow-y-auto bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono">
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
            
            {/* Preview compacto dos últimos logs */}
            <div className="h-32 overflow-y-auto bg-slate-50 p-3 rounded text-xs border">
              {uploadLogs.slice(-8).map((log, index) => (
                <div 
                  key={index} 
                  className={`mb-1 ${
                    log.level === 'error' ? 'text-red-600' :
                    log.level === 'warning' ? 'text-orange-600' :
                    log.level === 'success' ? 'text-green-600' :
                    'text-slate-600'
                  }`}
                >
                  [{log.timestamp.split('T')[1].split('.')[0]}] {log.message}
                </div>
              ))}
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
                <span className="text-muted-foreground">Grupos:</span>
                <div className="font-medium text-telebox-blue">{stats.totalGroups}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Com Logo:</span>
                <div className="font-medium text-telebox-blue">{stats.channelsWithLogo.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Tamanho:</span>
                <div className="font-medium text-telebox-blue">{stats.jsonSize.toLocaleString()} KB</div>
              </div>
            </div>
          </div>
        )}

        {preview.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">👀 Prévia (primeiros 10 itens)</h4>
            <div className="h-48 overflow-y-auto bg-slate-900 text-slate-100 p-4 rounded-lg text-xs">
              <pre>{JSON.stringify(preview, null, 2)}</pre>
            </div>
          </div>
        )}

        {convertedData && !uploading && (
          <div className="flex gap-2">
            <Button 
              onClick={downloadJSON} 
              size="sm" 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Baixar JSON Processado
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• <strong>✅ Correções aplicadas:</strong> RLS habilitado com policy para service role</p>
          <p>• <strong>🔧 Estrutura corrigida:</strong> Campos nullable, defaults configurados</p>
          <p>• <strong>📊 Logs detalhados:</strong> Tratamento robusto de erros e diagnóstico completo</p>
          <p>• <strong>🚀 Sem duplicatas:</strong> Sistema inteligente evita registros duplicados</p>
          <p>• <strong>✅ Suporte robusto:</strong> Arquivos até {MAX_FILE_SIZE_MB}MB processados com segurança</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CatalogUploader;
