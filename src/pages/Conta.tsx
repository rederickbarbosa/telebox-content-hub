import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Settings, Heart, Bell, BarChart3, Upload, Camera } from "lucide-react";
import NotificationViewer from "@/components/user/NotificationViewer";
import { useFavorites } from "@/hooks/useFavorites";
import { PhotoUpload } from "@/components/user/PhotoUpload";
import { SmartRecommendations } from "@/components/catalog/SmartRecommendations";

interface Profile {
  id: string;
  nome: string;
  email: string;
  user_id: string;
  foto_url?: string;
  time_favorito?: string;
}

interface UserStats {
  totalConteudos: number;
  assistindo: number;
  assistidos: number;
  queroVer: number;
}

const Conta = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    totalConteudos: 0,
    assistindo: 0,
    assistidos: 0,
    queroVer: 0
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { favorites, getFavoritesByType } = useFavorites();

  useEffect(() => {
    checkUser();
    fetchUserStats();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      setUser(user);
      await fetchProfile(user.id);
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_content_status')
        .select('status')
        .eq('user_id', user.id);

      if (error) throw error;

      const statsData = {
        totalConteudos: data?.length || 0,
        assistindo: data?.filter(item => item.status === 'assistindo').length || 0,
        assistidos: data?.filter(item => item.status === 'assistido').length || 0,
        queroVer: data?.filter(item => item.status === 'quero_ver').length || 0,
      };

      setStats(statsData);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', profile.user_id);

      if (error) throw error;

      setProfile({ ...profile, ...updates });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const updatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Verifique se as senhas são iguais.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi alterada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      toast({
        title: "Erro ao atualizar senha",
        description: "Não foi possível alterar a senha.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const uploadProfilePhoto = async (file: File) => {
    if (!profile || !user) return;

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      await updateProfile({ foto_url: publicUrl });

      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível atualizar sua foto de perfil.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }
      uploadProfilePhoto(file);
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
          <p>Carregando sua conta...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você precisa estar logado para acessar esta página.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full"
              variant="telebox"
            >
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Minha Conta</h1>
          <p className="text-lg text-muted-foreground">
            Gerencie seu perfil e preferências
          </p>
        </div>

        {/* Header com Avatar e Info Básica */}
        <Card className="mb-8 shadow-telebox-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.foto_url || ""} />
                  <AvatarFallback className="text-2xl bg-telebox-blue text-white">
                    {profile.nome.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              
              <div className="text-center md:text-left flex-1">
                <h2 className="text-2xl font-bold">{profile.nome}</h2>
                <p className="text-muted-foreground">{profile.email}</p>
                <Badge variant="secondary" className="mt-2">
                  Usuário Ativo
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-telebox-blue">{stats.totalConteudos}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">{stats.assistidos}</div>
                  <div className="text-sm text-muted-foreground">Assistidos</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="perfil" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="perfil" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="estatisticas" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Estatísticas
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="configuracoes" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="space-y-6">
            <Card className="shadow-telebox-card">
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize suas informações básicas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={profile.nome}
                    onChange={(e) => setProfile({ ...profile, nome: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time-favorito">Time Favorito</Label>
                  <Input
                    id="time-favorito"
                    value={profile.time_favorito || ""}
                    onChange={(e) => setProfile({ ...profile, time_favorito: e.target.value })}
                    placeholder="Ex: Corinthians, Flamengo, São Paulo..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Receive notificações quando seu time jogar
                  </p>
                </div>
                
                <Button 
                  onClick={() => updateProfile({ 
                    nome: profile.nome, 
                    email: profile.email,
                    time_favorito: profile.time_favorito || null
                  })}
                  disabled={updating}
                  variant="telebox"
                >
                  {updating ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="estatisticas" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-telebox-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-telebox-blue" />
                    Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-telebox-blue">{stats.totalConteudos}</div>
                  <p className="text-sm text-muted-foreground">Conteúdos marcados</p>
                </CardContent>
              </Card>

              <Card className="shadow-telebox-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Quero Ver
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-500">{stats.queroVer}</div>
                  <p className="text-sm text-muted-foreground">Na sua lista</p>
                </CardContent>
              </Card>

              <Card className="shadow-telebox-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5 text-yellow-500" />
                    Assistindo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-500">{stats.assistindo}</div>
                  <p className="text-sm text-muted-foreground">Em andamento</p>
                </CardContent>
              </Card>

              <Card className="shadow-telebox-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5 text-green-500" />
                    Assistidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">{stats.assistidos}</div>
                  <p className="text-sm text-muted-foreground">Finalizados</p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-telebox-card">
              <CardHeader>
                <CardTitle>Seus Favoritos</CardTitle>
                <CardDescription>
                  Acesse rapidamente seus conteúdos marcados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {favorites.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Você ainda não marcou nenhum conteúdo como favorito.
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/catalogo')}
                    >
                      Explorar Catálogo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-500">
                          {getFavoritesByType('canal').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Canais</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-500">
                          {getFavoritesByType('filme').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Filmes</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">
                          {getFavoritesByType('serie').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Séries</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/catalogo')}
                      className="w-full"
                    >
                      Ver Todos os Favoritos
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Recomendações baseadas nos favoritos */}
            {user && (
              <div className="mt-8">
                <SmartRecommendations userId={user.id} maxItems={6} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="notificacoes" className="space-y-6">
            <NotificationViewer />
          </TabsContent>

          <TabsContent value="configuracoes" className="space-y-6">
            <Card className="shadow-telebox-card">
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>
                  Mantenha sua conta segura com uma senha forte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme sua nova senha"
                  />
                </div>
                
                <Button 
                  onClick={updatePassword}
                  disabled={updating || !newPassword || !confirmPassword}
                  variant="telebox"
                >
                  {updating ? "Alterando..." : "Alterar Senha"}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-telebox-card">
              <CardHeader>
                <CardTitle>Navegação Rápida</CardTitle>
                <CardDescription>
                  Acesse outras seções da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/banco')}
                >
                  <Heart className="mr-2 h-4 w-4" />
                  Banco de Filmes e Séries
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/catalogo')}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Explorar Catálogo
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/programacao')}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Ver Programação
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Conta;