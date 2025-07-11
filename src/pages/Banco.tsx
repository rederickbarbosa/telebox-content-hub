import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Heart, Play, Check, Plus } from "lucide-react";

interface Conteudo {
  id: string;
  nome: string;
  tipo: string;
  generos: string[];
  ano: number;
  poster_url: string;
  backdrop_url: string;
  descricao: string;
  classificacao: number;
  tmdb_id: number;
}

interface UserStatus {
  id?: string;
  status: string;
  conteudo_id: string;
  user_id: string;
}

const Banco = () => {
  const [user, setUser] = useState<any>(null);
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [filteredConteudos, setFilteredConteudos] = useState<Conteudo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    filterConteudos();
  }, [conteudos, userStatuses, searchTerm, statusFilter, tipoFilter]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      setUser(user);
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      navigate('/auth');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar conteúdos da tabela catalogo_m3u_live
      const { data: conteudosData, error: conteudosError } = await supabase
        .from('catalogo_m3u_live')
        .select('*')
        .eq('ativo', true)
        .in('tipo', ['filme', 'serie'])
        .order('nome');

      if (conteudosError) throw conteudosError;

      // Buscar status do usuário
      const { data: statusData, error: statusError } = await supabase
        .from('user_content_status')
        .select('*')
        .eq('user_id', user.id);

      if (statusError) throw statusError;

      setConteudos(conteudosData || []);
      setUserStatuses(statusData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar o banco de filmes e séries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterConteudos = () => {
    let filtered = conteudos;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (tipoFilter !== "todos") {
      filtered = filtered.filter(item => item.tipo === tipoFilter);
    }

    if (statusFilter !== "todos") {
      const conteudosComStatus = userStatuses
        .filter(status => status.status === statusFilter)
        .map(status => status.conteudo_id);
      
      filtered = filtered.filter(item => conteudosComStatus.includes(item.id));
    }

    setFilteredConteudos(filtered);
  };

  const getUserStatus = (conteudoId: string) => {
    return userStatuses.find(status => status.conteudo_id === conteudoId);
  };

  const updateStatus = async (conteudoId: string, newStatus: string) => {
    try {
      const existingStatus = getUserStatus(conteudoId);

      if (existingStatus) {
        // Atualizar status existente
        const { error } = await supabase
          .from('user_content_status')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', existingStatus.id);

        if (error) throw error;

        setUserStatuses(prev =>
          prev.map(status =>
            status.id === existingStatus.id
              ? { ...status, status: newStatus }
              : status
          )
        );
      } else {
        // Criar novo status
        const { data, error } = await supabase
          .from('user_content_status')
          .insert([{
            user_id: user.id,
            conteudo_id: conteudoId,
            status: newStatus
          }])
          .select()
          .single();

        if (error) throw error;

        setUserStatuses(prev => [...prev, data]);
      }

      toast({
        title: "Status atualizado",
        description: "O status do conteúdo foi salvo com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const removeStatus = async (conteudoId: string) => {
    try {
      const existingStatus = getUserStatus(conteudoId);
      if (!existingStatus?.id) return;

      const { error } = await supabase
        .from('user_content_status')
        .delete()
        .eq('id', existingStatus.id);

      if (error) throw error;

      setUserStatuses(prev =>
        prev.filter(status => status.id !== existingStatus.id)
      );

      toast({
        title: "Removido",
        description: "O conteúdo foi removido da sua lista.",
      });
    } catch (error) {
      console.error('Erro ao remover status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o conteúdo.",
        variant: "destructive",
      });
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'quero_ver': 'Quero Ver',
      'assistindo': 'Assistindo',
      'assistido': 'Assistido'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'quero_ver': 'bg-blue-100 text-blue-700',
      'assistindo': 'bg-yellow-100 text-yellow-700',
      'assistido': 'bg-green-100 text-green-700'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getStatsCount = (status: string) => {
    return userStatuses.filter(s => s.status === status).length;
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
          <p>Carregando seu banco...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você precisa estar logado para acessar o banco de filmes e séries.
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Banco de Filmes e Séries</h1>
          <p className="text-lg text-muted-foreground">
            Organize e acompanhe seus filmes e séries favoritos
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-telebox-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-telebox-blue">{userStatuses.length}</div>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-telebox-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{getStatsCount('quero_ver')}</div>
                <p className="text-sm text-muted-foreground">Quero Ver</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-telebox-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{getStatsCount('assistindo')}</div>
                <p className="text-sm text-muted-foreground">Assistindo</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-telebox-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{getStatsCount('assistido')}</div>
                <p className="text-sm text-muted-foreground">Assistidos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-8 shadow-telebox-card">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar filmes e séries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="filme">Filmes</SelectItem>
                  <SelectItem value="serie">Séries</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="quero_ver">Quero Ver</SelectItem>
                  <SelectItem value="assistindo">Assistindo</SelectItem>
                  <SelectItem value="assistido">Assistido</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={() => {
                  setSearchTerm("");
                  setTipoFilter("todos");
                  setStatusFilter("todos");
                }}
                variant="outline"
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grid de Conteúdos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredConteudos.map((conteudo) => {
            const userStatus = getUserStatus(conteudo.id);
            
            return (
              <Card key={conteudo.id} className="shadow-telebox-card hover:shadow-telebox-hero transition-shadow">
                <div className="relative overflow-hidden rounded-t-lg">
                  <img
                    src={conteudo.poster_url || "/placeholder.svg"}
                    alt={conteudo.nome}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="bg-black/70 text-white">
                      {conteudo.tipo}
                    </Badge>
                  </div>
                  {userStatus && (
                    <div className="absolute top-2 right-2">
                      <Badge className={getStatusColor(userStatus.status)}>
                        {getStatusLabel(userStatus.status)}
                      </Badge>
                    </div>
                  )}
                  {conteudo.classificacao && (
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="secondary" className="bg-yellow-500 text-black">
                        ⭐ {conteudo.classificacao.toFixed(1)}
                      </Badge>
                    </div>
                  )}
                </div>
                
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-semibold line-clamp-2">
                    {conteudo.nome}
                  </CardTitle>
                  {conteudo.ano && (
                    <CardDescription className="text-xs">
                      {conteudo.ano}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="p-3 pt-0">
                  <div className="space-y-2">
                    {!userStatus ? (
                      <div className="grid grid-cols-3 gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(conteudo.id, 'quero_ver')}
                          className="text-xs"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(conteudo.id, 'assistindo')}
                          className="text-xs"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(conteudo.id, 'assistido')}
                          className="text-xs"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Select
                          value={userStatus.status}
                          onValueChange={(value) => updateStatus(conteudo.id, value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="quero_ver">Quero Ver</SelectItem>
                            <SelectItem value="assistindo">Assistindo</SelectItem>
                            <SelectItem value="assistido">Assistido</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeStatus(conteudo.id)}
                          className="w-full text-xs"
                        >
                          Remover
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredConteudos.length === 0 && (
          <div className="text-center py-12">
            <img 
              src="/lovable-uploads/52a92ba9-cb00-476e-86a7-8019ac8c0c91.png" 
              alt="TELEBOX" 
              className="h-16 w-auto mx-auto mb-4 opacity-50"
            />
            <h3 className="text-xl font-semibold mb-2">Nenhum conteúdo encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter === "todos" 
                ? "Tente ajustar os filtros ou explore o catálogo para adicionar filmes e séries."
                : "Você ainda não marcou nenhum conteúdo com este status."
              }
            </p>
            <Button 
              variant="telebox"
              onClick={() => navigate('/catalogo')}
            >
              Explorar Catálogo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Banco;