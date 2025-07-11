import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus } from "lucide-react";

interface HomeSettings {
  id: string;
  hero_description: string;
  stats_canais_label: string;
  stats_filmes_label: string;
  stats_series_label: string;
  stats_qualidade_label: string;
  stats_qualidade_descricao: string;
  features_title: string;
  features_subtitle: string;
  feature_1_title: string;
  feature_1_description: string;
  feature_2_title: string;
  feature_2_description: string;
  feature_3_title: string;
  feature_3_description: string;
  featured_channels_ids: string[];
  channel_carousel_enabled: boolean;
}

interface Channel {
  id: string;
  nome: string;
  grupo: string;
  logo: string;
  qualidade: string;
}

const HomeManager = () => {
  const [settings, setSettings] = useState<HomeSettings | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar configurações da home
      const { data: settingsData, error: settingsError } = await supabase
        .from('admin_home_settings')
        .select('*')
        .limit(1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      // Buscar canais disponíveis
      const { data: channelsData, error: channelsError } = await supabase
        .from('catalogo_m3u_live')
        .select('id, nome, grupo, logo, qualidade')
        .eq('tipo', 'canal')
        .eq('ativo', true)
        .order('nome')
        .limit(200);

      if (channelsError) throw channelsError;

      setSettings(settingsData);
      setChannels(channelsData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('admin_home_settings')
        .update(settings)
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Configurações da home salvas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addFeaturedChannel = (channelId: string) => {
    if (!settings || settings.featured_channels_ids.includes(channelId)) return;

    setSettings({
      ...settings,
      featured_channels_ids: [...settings.featured_channels_ids, channelId]
    });
  };

  const removeFeaturedChannel = (channelId: string) => {
    if (!settings) return;

    setSettings({
      ...settings,
      featured_channels_ids: settings.featured_channels_ids.filter(id => id !== channelId)
    });
  };

  const getFeaturedChannels = () => {
    if (!settings) return [];
    return channels.filter(channel => settings.featured_channels_ids.includes(channel.id));
  };

  const getAvailableChannels = () => {
    if (!settings) return channels;
    return channels.filter(channel => !settings.featured_channels_ids.includes(channel.id));
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2">Carregando configurações...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-8">
        <p>Nenhuma configuração encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Configurações da Home</h2>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Descrição Hero */}
        <Card>
          <CardHeader>
            <CardTitle>Descrição Principal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="hero_description">Descrição Hero</Label>
              <Textarea
                id="hero_description"
                value={settings.hero_description}
                onChange={(e) => setSettings({...settings, hero_description: e.target.value})}
                placeholder="Use {canais}, {filmes}, {series} para valores dinâmicos"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {`{canais}`}, {`{filmes}`}, {`{series}`} para inserir números dinâmicos
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stats_canais_label">Label Canais</Label>
              <Input
                id="stats_canais_label"
                value={settings.stats_canais_label}
                onChange={(e) => setSettings({...settings, stats_canais_label: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="stats_filmes_label">Label Filmes</Label>
              <Input
                id="stats_filmes_label"
                value={settings.stats_filmes_label}
                onChange={(e) => setSettings({...settings, stats_filmes_label: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="stats_series_label">Label Séries</Label>
              <Input
                id="stats_series_label"
                value={settings.stats_series_label}
                onChange={(e) => setSettings({...settings, stats_series_label: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="stats_qualidade_label">Label Qualidade</Label>
              <Input
                id="stats_qualidade_label"
                value={settings.stats_qualidade_label}
                onChange={(e) => setSettings({...settings, stats_qualidade_label: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Seção de Recursos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="features_title">Título da Seção</Label>
              <Input
                id="features_title"
                value={settings.features_title}
                onChange={(e) => setSettings({...settings, features_title: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="features_subtitle">Subtítulo</Label>
              <Input
                id="features_subtitle"
                value={settings.features_subtitle}
                onChange={(e) => setSettings({...settings, features_subtitle: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="feature_1_title">Recurso 1 - Título</Label>
                <Input
                  id="feature_1_title"
                  value={settings.feature_1_title}
                  onChange={(e) => setSettings({...settings, feature_1_title: e.target.value})}
                />
                <Label htmlFor="feature_1_description" className="mt-2 block">Descrição</Label>
                <Textarea
                  id="feature_1_description"
                  value={settings.feature_1_description}
                  onChange={(e) => setSettings({...settings, feature_1_description: e.target.value})}
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="feature_2_title">Recurso 2 - Título</Label>
                <Input
                  id="feature_2_title"
                  value={settings.feature_2_title}
                  onChange={(e) => setSettings({...settings, feature_2_title: e.target.value})}
                />
                <Label htmlFor="feature_2_description" className="mt-2 block">Descrição</Label>
                <Textarea
                  id="feature_2_description"
                  value={settings.feature_2_description}
                  onChange={(e) => setSettings({...settings, feature_2_description: e.target.value})}
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="feature_3_title">Recurso 3 - Título</Label>
                <Input
                  id="feature_3_title"
                  value={settings.feature_3_title}
                  onChange={(e) => setSettings({...settings, feature_3_title: e.target.value})}
                />
                <Label htmlFor="feature_3_description" className="mt-2 block">Descrição</Label>
                <Textarea
                  id="feature_3_description"
                  value={settings.feature_3_description}
                  onChange={(e) => setSettings({...settings, feature_3_description: e.target.value})}
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carrossel de Canais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Carrossel de Canais
              <Switch
                checked={settings.channel_carousel_enabled}
                onCheckedChange={(checked) => setSettings({...settings, channel_carousel_enabled: checked})}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.channel_carousel_enabled && (
              <>
                <div>
                  <Label>Canais em Destaque ({getFeaturedChannels().length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getFeaturedChannels().map(channel => (
                      <Badge key={channel.id} variant="secondary" className="flex items-center gap-1">
                        {channel.nome}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFeaturedChannel(channel.id)}
                          className="h-4 w-4 p-0 ml-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Adicionar Canal</Label>
                  <Select onValueChange={addFeaturedChannel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um canal..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableChannels().map(channel => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.nome} ({channel.grupo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomeManager;