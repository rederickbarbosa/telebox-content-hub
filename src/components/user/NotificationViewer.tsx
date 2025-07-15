import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Trash2, Check, Clock, User } from "lucide-react";

interface Notification {
  id: string;
  user_id: string;
  tipo: string;
  mensagem: string;
  canal_nome?: string;
  status: string;
  created_at: string;
  data_envio?: string;
}

const NotificationViewer = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ status: 'lida' })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, status: 'lida' }
            : notif
        )
      );

      toast({
        title: "Notificação marcada como lida",
        description: "A notificação foi atualizada.",
      });
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a notificação.",
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.filter(notif => notif.id !== notificationId)
      );

      toast({
        title: "Notificação removida",
        description: "A notificação foi excluída.",
      });
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a notificação.",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ status: 'lida' })
        .eq('user_id', user.id)
        .eq('status', 'nao_lida');

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, status: 'lida' }))
      );

      toast({
        title: "Todas as notificações marcadas como lidas",
        description: "Suas notificações foram atualizadas.",
      });
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as notificações.",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'jogo_futebol':
        return '⚽';
      case 'estreia':
        return '🎬';
      case 'sistema':
        return '🔔';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (tipo: string) => {
    switch (tipo) {
      case 'jogo_futebol':
        return 'bg-green-100 text-green-700';
      case 'estreia':
        return 'bg-blue-100 text-blue-700';
      case 'sistema':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const unreadCount = notifications.filter(n => n.status === 'nao_lida').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Bell className="h-8 w-8 mx-auto mb-4 animate-pulse" />
          <p>Carregando notificações...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Login necessário</h3>
          <p className="text-muted-foreground">
            Faça login para ver suas notificações.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-telebox-blue" />
          <h2 className="text-2xl font-bold">Notificações</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} não lidas</Badge>
          )}
        </div>

        {notifications.length > 0 && unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            variant="outline"
            size="sm"
          >
            <Check className="mr-2 h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma notificação</h3>
            <p className="text-muted-foreground">
              Você ainda não possui notificações. Configure seu time favorito para receber alertas de jogos!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`transition-all ${
                notification.status === 'nao_lida' 
                  ? 'border-l-4 border-l-telebox-blue bg-blue-50/50' 
                  : 'opacity-75'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {getNotificationIcon(notification.tipo)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getNotificationColor(notification.tipo)}>
                          {notification.tipo.replace('_', ' ')}
                        </Badge>
                        {notification.canal_nome && (
                          <Badge variant="outline" className="text-xs">
                            {notification.canal_nome}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-sm font-medium">
                        {notification.mensagem}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {formatDate(notification.created_at)}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {notification.status === 'nao_lida' && (
                      <Button
                        onClick={() => markAsRead(notification.id)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      onClick={() => deleteNotification(notification.id)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationViewer;