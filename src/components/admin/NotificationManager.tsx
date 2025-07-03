import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  user_id: string;
  tipo: string;
  mensagem: string;
  canal_nome: string | null;
  status: string;
  created_at: string;
  profiles?: {
    user_id: string;
    nome: string;
    email: string;
  };
}

const NotificationManager = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'sistema',
    mensagem: '',
    canal_nome: '',
    target_user: 'all'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Buscar dados dos perfis separadamente
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(n => n.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, nome, email')
          .in('user_id', userIds);

        const notificationsWithProfiles = data.map(notification => ({
          ...notification,
          profiles: profiles?.find(p => p.user_id === notification.user_id)
        }));

        setNotifications(notificationsWithProfiles);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, nome, email')
        .order('nome');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      if (formData.target_user === 'all') {
        // Enviar para todos os usuários
        const notificationsToSend = users.map(user => ({
          user_id: user.user_id,
          tipo: formData.tipo,
          mensagem: formData.mensagem,
          canal_nome: formData.canal_nome || null,
          status: 'nao_lida'
        }));

        const { error } = await supabase
          .from('notificacoes')
          .insert(notificationsToSend);

        if (error) throw error;

        toast({
          title: "Notificações enviadas",
          description: `${notificationsToSend.length} notificações enviadas para todos os usuários.`,
        });
      } else {
        // Enviar para usuário específico
        const { error } = await supabase
          .from('notificacoes')
          .insert([{
            user_id: formData.target_user,
            tipo: formData.tipo,
            mensagem: formData.mensagem,
            canal_nome: formData.canal_nome || null,
            status: 'nao_lida'
          }]);

        if (error) throw error;

        toast({
          title: "Notificação enviada",
          description: "A notificação foi enviada com sucesso.",
        });
      }

      setFormData({
        tipo: 'sistema',
        mensagem: '',
        canal_nome: '',
        target_user: 'all'
      });

      fetchNotifications();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Ocorreu um erro ao enviar a notificação.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'lida' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'jogo':
        return '⚽';
      case 'estreia':
        return '🎬';
      case 'sistema':
        return '📢';
      default:
        return '📋';
    }
  };

  if (loading) {
    return <div>Carregando notificações...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Formulário para enviar notificação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Notificação
          </CardTitle>
          <CardDescription>
            Envie notificações para usuários específicos ou para todos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendNotification} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo">Tipo de Notificação</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sistema">Sistema</SelectItem>
                    <SelectItem value="jogo">Jogo de Futebol</SelectItem>
                    <SelectItem value="estreia">Estreia</SelectItem>
                    <SelectItem value="novidade">Novidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target_user">Destinatário</Label>
                <Select value={formData.target_user} onValueChange={(value) => setFormData({ ...formData, target_user: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Todos os usuários
                      </div>
                    </SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.nome} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.tipo === 'jogo' && (
              <div>
                <Label htmlFor="canal_nome">Nome do Canal</Label>
                <Input
                  id="canal_nome"
                  value={formData.canal_nome}
                  onChange={(e) => setFormData({ ...formData, canal_nome: e.target.value })}
                  placeholder="Ex: SporTV"
                />
              </div>
            )}

            <div>
              <Label htmlFor="mensagem">Mensagem</Label>
              <Textarea
                id="mensagem"
                value={formData.mensagem}
                onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                placeholder="Digite a mensagem da notificação..."
                rows={3}
                required
              />
            </div>

            <Button type="submit" disabled={sending} className="w-full">
              {sending ? 'Enviando...' : 'Enviar Notificação'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de notificações recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações Recentes
          </CardTitle>
          <CardDescription>
            Últimas 50 notificações enviadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="text-2xl">
                  {getTipoIcon(notification.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{notification.tipo}</Badge>
                    <Badge className={getStatusColor(notification.status)}>
                      {notification.status === 'lida' ? 'Lida' : 'Não lida'}
                    </Badge>
                    {notification.canal_nome && (
                      <Badge variant="secondary">{notification.canal_nome}</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium mb-1">{notification.mensagem}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Para: {notification.profiles?.nome}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(notification.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {notifications.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma notificação encontrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationManager;