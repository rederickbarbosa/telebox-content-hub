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
import { Settings, Upload, Database, Users, Bell, Home, CreditCard } from "lucide-react";

import CatalogUploader from "@/components/admin/CatalogUploader";
import AppManager from "@/components/admin/AppManager";
import PopulateApps from "@/components/admin/PopulateApps";
import NotificationManager from "@/components/admin/NotificationManager";
import UserManager from "@/components/admin/UserManager";
import EdgeFunctionTester from "@/components/admin/EdgeFunctionTester";
import HomeManager from "@/components/admin/HomeManager";
import PlansManager from "@/components/admin/PlansManager";
import EpgManager from "@/components/admin/EpgManager";
import ApiConfigManager from "@/components/admin/ApiConfigManager";

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
    const [conteudos, catalogoLive, users] = await Promise.all([
      supabase.from('conteudos').select('tipo', { count: 'exact' }),
      supabase.from('catalogo_m3u_live').select('tipo', { count: 'exact' }).eq('ativo', true),
      supabase.from('profiles').select('id', { count: 'exact' })
    ]);

    const conteudosFilmes = conteudos.data?.filter(c => c.tipo === 'filme').length || 0;
    const conteudosSeries = conteudos.data?.filter(c => c.tipo === 'serie').length || 0;
    const catalogoFilmes = catalogoLive.data?.filter(c => c.tipo === 'filme').length || 0;
    const catalogoSeries = catalogoLive.data?.filter(c => c.tipo === 'serie').length || 0;
    const catalogoCanais = catalogoLive.data?.filter(c => c.tipo === 'canal').length || 0;

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

        <Tabs defaultValue="catalogo" className="w-full">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
            <TabsTrigger value="epg">EPG</TabsTrigger>
            <TabsTrigger value="planos">Planos</TabsTrigger>
            <TabsTrigger value="apps">Apps</TabsTrigger>
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
            <TabsTrigger value="configuracoes">Config</TabsTrigger>
            <TabsTrigger value="testes">Testes</TabsTrigger>
          </TabsList>

          <TabsContent value="catalogo">
            <CatalogUploader onUploadComplete={loadStats} />
          </TabsContent>

          <TabsContent value="epg">
            <EpgManager />
          </TabsContent>

          <TabsContent value="planos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Gerenciar Planos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PlansManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apps" className="space-y-6">
            <PopulateApps />
            <AppManager />
          </TabsContent>

          <TabsContent value="home" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Configurações da Home
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HomeManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usuarios" className="space-y-6">
            <UserManager />
          </TabsContent>

          <TabsContent value="notificacoes" className="space-y-6">
            <NotificationManager />
          </TabsContent>

          <TabsContent value="configuracoes">
            <ApiConfigManager />
          </TabsContent>

          <TabsContent value="testes" className="space-y-6">
            <EdgeFunctionTester userId={user.id} />
            
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
                      const response = await supabase.functions.invoke('fetch-epg-xmltv');
                      if (response.error) throw new Error(response.error.message);
                      
                      toast({
                        title: "EPG atualizado!",
                        description: `${response.data.programas_processados || 0} programas processados.`,
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
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;