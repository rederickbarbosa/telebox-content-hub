import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, Upload, Database, Users, Bell } from "lucide-react";
import M3UUploader from "@/components/admin/M3UUploader";
import AppManager from "@/components/admin/AppManager";
import NotificationManager from "@/components/admin/NotificationManager";
import UserManager from "@/components/admin/UserManager";

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>({});
  const [stats, setStats] = useState({
    totalFilmes: 0,
    totalSeries: 0,
    totalCanais: 0,
    totalUsers: 0
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadSettings();
    loadStats();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setUser(user);
    setIsAdmin(true);
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data } = await supabase
      .from('admin_settings')
      .select('*');
    
    if (data) {
      const settingsObj = data.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});
      setSettings(settingsObj);
    }
  };

  const loadStats = async () => {
    const [conteudos, catalogo, users] = await Promise.all([
      supabase.from('conteudos').select('tipo', { count: 'exact' }),
      supabase.from('catalogo_m3u').select('tipo', { count: 'exact' }),
      supabase.from('profiles').select('id', { count: 'exact' })
    ]);

    const conteudosFilmes = conteudos.data?.filter(c => c.tipo === 'filme').length || 0;
    const conteudosSeries = conteudos.data?.filter(c => c.tipo === 'serie').length || 0;
    const catalogoFilmes = catalogo.data?.filter(c => c.tipo === 'filme').length || 0;
    const catalogoSeries = catalogo.data?.filter(c => c.tipo === 'serie').length || 0;
    const catalogoCanais = catalogo.data?.filter(c => c.tipo === 'canal').length || 0;

    setStats({
      totalFilmes: Math.max(conteudosFilmes, catalogoFilmes),
      totalSeries: Math.max(conteudosSeries, catalogoSeries),
      totalCanais: catalogoCanais,
      totalUsers: users.count || 0
    });
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      // Usar a função upsert criada na migração para evitar erros de constraint
      const { error } = await supabase.rpc('upsert_admin_setting', {
        key: key,
        value: value,
        description_text: null
      });

      if (error) throw error;

      toast({
        title: "Configuração salva",
        description: "As alterações foram salvas com sucesso.",
      });
      setSettings({ ...settings, [key]: value });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img 
            src="/lovable-uploads/52a92ba9-cb00-476e-86a7-8019ac8c0c91.png" 
            alt="TELEBOX" 
            className="h-16 w-auto mx-auto mb-4 animate-pulse"
          />
          <p>Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Painel Administrativo</h1>
          <p className="text-lg text-muted-foreground">
            Gerencie configurações, conteúdo e usuários da TELEBOX
          </p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Filmes</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFilmes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Séries</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSeries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Canais</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCanais}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="configuracoes" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
            <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
            <TabsTrigger value="apps">Aplicativos</TabsTrigger>
            <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          </TabsList>

          <TabsContent value="configuracoes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="teste_horas">Teste Grátis (horas)</Label>
                    <Input
                      id="teste_horas"
                      type="number"
                      value={settings.teste_horas || ''}
                      onChange={(e) => updateSetting('teste_horas', e.target.value)}
                      placeholder="6"
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsapp_numero">Número WhatsApp</Label>
                    <Input
                      id="whatsapp_numero"
                      value={settings.whatsapp_numero || ''}
                      onChange={(e) => updateSetting('whatsapp_numero', e.target.value)}
                      placeholder="5511911837288"
                    />
                  </div>
                  <div>
                    <Label htmlFor="plano_destaque">Plano em Destaque</Label>
                    <Select
                      value={settings.plano_destaque || '1'}
                      onValueChange={(value) => updateSetting('plano_destaque', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Mês - R$ 30,00</SelectItem>
                        <SelectItem value="2">2 Meses - R$ 55,00</SelectItem>
                        <SelectItem value="3">3 Meses - R$ 80,00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Redes Sociais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="instagram_url">Instagram URL</Label>
                      <Input
                        id="instagram_url"
                        value={settings.instagram_url || ''}
                        onChange={(e) => updateSetting('instagram_url', e.target.value)}
                        placeholder="https://instagram.com/teleboxbrasil"
                      />
                    </div>
                    <div>
                      <Label htmlFor="facebook_url">Facebook URL</Label>
                      <Input
                        id="facebook_url"
                        value={settings.facebook_url || ''}
                        onChange={(e) => updateSetting('facebook_url', e.target.value)}
                        placeholder="https://facebook.com/teleboxbrasil"
                      />
                    </div>
                    <div>
                      <Label htmlFor="telegram_url">Telegram URL</Label>
                      <Input
                        id="telegram_url"
                        value={settings.telegram_url || ''}
                        onChange={(e) => updateSetting('telegram_url', e.target.value)}
                        placeholder="https://t.me/teleboxbrasil"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">APIs e Integrações</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tmdb_token">Token TMDB</Label>
                      <Input
                        id="tmdb_token"
                        value={settings.tmdb_token || ''}
                        onChange={(e) => updateSetting('tmdb_token', e.target.value)}
                        placeholder="Token da API do TMDB"
                        type="password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="epg_url">URL do EPG (XMLTV)</Label>
                      <Input
                        id="epg_url"
                        value={settings.epg_url || ''}
                        onChange={(e) => updateSetting('epg_url', e.target.value)}
                        placeholder="http://exemplo.com/xmltv.php?username=...&password=..."
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="catalogo" className="space-y-6">
            <M3UUploader userId={user.id} onUploadComplete={loadStats} />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Ações do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={loadStats} className="w-full">
                  Atualizar Estatísticas
                </Button>
                
                <Button 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const response = await supabase.functions.invoke('fetch-epg');
                      if (response.error) throw new Error(response.error.message);
                      
                      toast({
                        title: "EPG atualizado!",
                        description: `${response.data.programmes} programas de ${response.data.channels} canais atualizados.`,
                      });
                    } catch (error: any) {
                      toast({
                        title: "Erro ao atualizar EPG",
                        description: error.message,
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full"
                  variant="outline"
                >
                  Atualizar Programação (EPG)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apps" className="space-y-6">
            <AppManager />
          </TabsContent>

          <TabsContent value="notificacoes" className="space-y-6">
            <NotificationManager />
          </TabsContent>

          <TabsContent value="usuarios" className="space-y-6">
            <UserManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;