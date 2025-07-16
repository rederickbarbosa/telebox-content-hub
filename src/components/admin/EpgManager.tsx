import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Settings, Tv, Clock, Calendar } from "lucide-react";

const EpgManager = () => {
  const [epgUrl, setEpgUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total_programas: 0,
    canais_unicos: 0,
    proximas_24h: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadEpgSettings();
    loadStats();
  }, []);

  const loadEpgSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'epg_xmltv_url')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setEpgUrl(data?.setting_value || 'http://zed7.top/xmltv.php?username=spg9tct&password=r846kdc');
    } catch (error) {
      console.error('Erro ao carregar configurações EPG:', error);
    }
  };

  const loadStats = async () => {
    try {
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Total de programas
      const { count: totalCount } = await supabase
        .from('programacao')
        .select('*', { count: 'exact', head: true });

      // Canais únicos
      const { data: canaisData } = await supabase
        .from('programacao')
        .select('canal_nome');

      const canaisUnicos = new Set(canaisData?.map(p => p.canal_nome) || []).size;

      // Programas próximas 24h
      const { count: proximas24h } = await supabase
        .from('programacao')
        .select('*', { count: 'exact', head: true })
        .gte('inicio', now.toISOString())
        .lte('inicio', next24h.toISOString());

      setStats({
        total_programas: totalCount || 0,
        canais_unicos: canaisUnicos,
        proximas_24h: proximas24h || 0
      });

      // Buscar última atualização
      const { data: logData } = await supabase
        .from('system_logs')
        .select('created_at')
        .eq('message', 'EPG atualizado com sucesso')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (logData) {
        setLastUpdate(logData.created_at);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const saveEpgUrl = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('upsert_admin_setting', {
        key: 'epg_xmltv_url',
        value: epgUrl,
        description_text: 'URL do XMLTV para EPG'
      });

      if (error) throw error;

      toast({
        title: "URL EPG salva",
        description: "A URL do EPG foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar URL EPG:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a URL do EPG.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateEpg = async () => {
    setUpdating(true);
    try {
      toast({
        title: "Atualizando EPG",
        description: "Buscando dados do XMLTV. Isso pode levar alguns minutos...",
      });

      const { data, error } = await supabase.functions.invoke('fetch-epg-xmltv');

      if (error) throw error;

      console.log('Resultado da atualização EPG:', data);

      // Recarregar estatísticas
      await loadStats();

      toast({
        title: "EPG atualizado",
        description: `${data.programas_processados} programas processados com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao atualizar EPG:', error);
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar o EPG. Verifique a URL.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const clearEpg = async () => {
    if (!confirm('Tem certeza que deseja limpar toda a programação?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('programacao')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      await loadStats();
      
      toast({
        title: "EPG limpo",
        description: "Toda a programação foi removida.",
      });
    } catch (error) {
      console.error('Erro ao limpar EPG:', error);
      toast({
        title: "Erro",
        description: "Não foi possível limpar o EPG.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Tv className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Gerenciamento EPG/XMLTV</h2>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total_programas}</div>
              <p className="text-sm text-muted-foreground">Total de Programas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.canais_unicos}</div>
              <p className="text-sm text-muted-foreground">Canais Únicos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.proximas_24h}</div>
              <p className="text-sm text-muted-foreground">Próximas 24h</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuração da URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração XMLTV
          </CardTitle>
          <CardDescription>
            Configure a URL do XMLTV para buscar a programação dos canais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="epgUrl">URL do XMLTV</Label>
            <Input
              id="epgUrl"
              value={epgUrl}
              onChange={(e) => setEpgUrl(e.target.value)}
              placeholder="http://example.com/xmltv.php?user=&pass="
            />
            <p className="text-sm text-muted-foreground">
              URL deve retornar um arquivo XMLTV válido
            </p>
          </div>

          <Button 
            onClick={saveEpgUrl}
            disabled={loading || !epgUrl}
          >
            {loading ? "Salvando..." : "Salvar URL"}
          </Button>
        </CardContent>
      </Card>

      {/* Status e Ações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Atualização EPG
          </CardTitle>
          <CardDescription>
            Gerencie a atualização da programação dos canais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastUpdate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Última atualização: {new Date(lastUpdate).toLocaleString('pt-BR')}
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={updateEpg}
              disabled={updating || !epgUrl}
            >
              {updating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar EPG
                </>
              )}
            </Button>

            <Button 
              onClick={clearEpg}
              disabled={loading}
              variant="outline"
            >
              Limpar EPG
            </Button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">ℹ️ Informações</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• A atualização pode levar alguns minutos dependendo do tamanho do arquivo XMLTV</li>
              <li>• Programas antigos (mais de 24h) são removidos automaticamente</li>
              <li>• Notificações são geradas automaticamente para jogos de times favoritos</li>
              <li>• O EPG é atualizado automaticamente a cada 6 horas</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EpgManager;