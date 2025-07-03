import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Smartphone, Plus, Edit, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface App {
  id: string;
  nome: string;
  tipo: string;
  plataforma: string;
  download_url: string | null;
  logo_url: string | null;
  ativo: boolean;
  destaque: boolean;
}

const AppManager = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'gratuito',
    plataforma: 'android',
    download_url: '',
    logo_url: '',
    ativo: true,
    destaque: false
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('nome');

      if (error) throw error;
      setApps(data || []);
    } catch (error) {
      console.error('Erro ao buscar apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingApp) {
        // Atualizar app existente
        const { error } = await supabase
          .from('apps')
          .update(formData)
          .eq('id', editingApp.id);

        if (error) throw error;

        toast({
          title: "App atualizado",
          description: "O aplicativo foi atualizado com sucesso.",
        });
      } else {
        // Criar novo app
        const { error } = await supabase
          .from('apps')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "App criado",
          description: "O aplicativo foi criado com sucesso.",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchApps();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o aplicativo.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (app: App) => {
    setEditingApp(app);
    setFormData({
      nome: app.nome,
      tipo: app.tipo,
      plataforma: app.plataforma,
      download_url: app.download_url || '',
      logo_url: app.logo_url || '',
      ativo: app.ativo,
      destaque: app.destaque
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este aplicativo?')) return;

    try {
      const { error } = await supabase
        .from('apps')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "App excluído",
        description: "O aplicativo foi excluído com sucesso.",
      });

      fetchApps();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao excluir o aplicativo.",
        variant: "destructive",
      });
    }
  };

  const toggleStatus = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('apps')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;

      fetchApps();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'gratuito',
      plataforma: 'android',
      download_url: '',
      logo_url: '',
      ativo: true,
      destaque: false
    });
    setEditingApp(null);
  };

  if (loading) {
    return <div>Carregando aplicativos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Gerenciar Aplicativos
            </CardTitle>
            <CardDescription>
              Gerencie os aplicativos disponíveis para download
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo App
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingApp ? 'Editar' : 'Novo'} Aplicativo
                </DialogTitle>
                <DialogDescription>
                  {editingApp ? 'Edite as informações' : 'Adicione um novo aplicativo'} para a lista.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome do App</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: TELEBOX Android"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gratuito">Gratuito</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="plataforma">Plataforma</Label>
                    <Select value={formData.plataforma} onValueChange={(value) => setFormData({ ...formData, plataforma: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="android">Android</SelectItem>
                        <SelectItem value="ios">iOS</SelectItem>
                        <SelectItem value="windows">Windows</SelectItem>
                        <SelectItem value="macos">macOS</SelectItem>
                        <SelectItem value="smart-tv">Smart TV</SelectItem>
                        <SelectItem value="web">Web</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="download_url">URL de Download</Label>
                  <Input
                    id="download_url"
                    value={formData.download_url}
                    onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                    placeholder="https://play.google.com/store/apps/details?id=..."
                  />
                </div>

                <div>
                  <Label htmlFor="logo_url">URL do Logo</Label>
                  <Input
                    id="logo_url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://exemplo.com/logo.png"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="destaque"
                    checked={formData.destaque}
                    onCheckedChange={(checked) => setFormData({ ...formData, destaque: checked })}
                  />
                  <Label htmlFor="destaque">Destacar</Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingApp ? 'Atualizar' : 'Criar'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {apps.map((app) => (
            <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {app.logo_url && (
                  <img 
                    src={app.logo_url} 
                    alt={app.nome}
                    className="w-10 h-10 rounded"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{app.nome}</h4>
                    {app.destaque && <Star className="h-4 w-4 text-yellow-500" />}
                  </div>
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <Badge variant={app.tipo === 'gratuito' ? 'secondary' : 'default'}>
                      {app.tipo}
                    </Badge>
                    <Badge variant="outline">
                      {app.plataforma}
                    </Badge>
                    <Badge variant={app.ativo ? 'default' : 'destructive'}>
                      {app.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={app.ativo}
                  onCheckedChange={(checked) => toggleStatus(app.id, checked)}
                />
                <Button size="sm" variant="outline" onClick={() => handleEdit(app)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(app.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {apps.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum aplicativo cadastrado
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AppManager;