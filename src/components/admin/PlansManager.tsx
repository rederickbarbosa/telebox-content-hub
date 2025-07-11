import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Star, Plus, Trash2, Edit } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  original_price?: number;
  savings?: number;
  is_popular: boolean;
  is_active: boolean;
  features: string[];
  order_position: number;
  whatsapp_message?: string;
}

const PlansManager = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_plans')
        .select('*')
        .order('order_position');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os planos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async (plan: Partial<Plan>) => {
    try {
      setSaving(true);

      if (plan.id) {
        // Atualizar plano existente
        const { error } = await supabase
          .from('admin_plans')
          .update(plan)
          .eq('id', plan.id);

        if (error) throw error;
      } else {
        // Criar novo plano
        const { error } = await supabase
          .from('admin_plans')
          .insert([{
            name: plan.name!,
            duration_months: plan.duration_months!,
            price: plan.price!,
            ...plan,
            order_position: plans.length + 1
          }]);

        if (error) throw error;
      }

      await fetchPlans();
      setIsDialogOpen(false);
      setEditingPlan(null);

      toast({
        title: "Sucesso",
        description: "Plano salvo com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o plano.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('admin_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      
      await fetchPlans();
      toast({
        title: "Sucesso",
        description: "Plano excluído com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o plano.",
        variant: "destructive",
      });
    }
  };

  const setPopularPlan = async (planId: string) => {
    try {
      // Remover popular de todos os planos
      await supabase
        .from('admin_plans')
        .update({ is_popular: false })
        .neq('id', '');

      // Definir como popular apenas o selecionado
      const { error } = await supabase
        .from('admin_plans')
        .update({ is_popular: true })
        .eq('id', planId);

      if (error) throw error;
      
      await fetchPlans();
      toast({
        title: "Sucesso",
        description: "Plano popular atualizado.",
      });
    } catch (error) {
      console.error('Erro ao definir plano popular:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o plano popular.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (plan?: Plan) => {
    if (plan) {
      setEditingPlan({ ...plan });
    } else {
      setEditingPlan({
        id: '',
        name: '',
        duration_months: 1,
        price: 0,
        is_popular: false,
        is_active: true,
        features: [],
        order_position: 0,
        whatsapp_message: ''
      });
    }
    setIsDialogOpen(true);
  };

  const addFeature = () => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: [...editingPlan.features, '']
    });
  };

  const updateFeature = (index: number, value: string) => {
    if (!editingPlan) return;
    const newFeatures = [...editingPlan.features];
    newFeatures[index] = value;
    setEditingPlan({
      ...editingPlan,
      features: newFeatures
    });
  };

  const removeFeature = (index: number) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: editingPlan.features.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2">Carregando planos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Planos</h2>
        <Button onClick={() => openEditDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      <div className="grid gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className={plan.is_popular ? "border-yellow-500 border-2" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {plan.name}
                  {plan.is_popular && (
                    <Badge className="bg-yellow-500 text-black">
                      <Star className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                  {!plan.is_active && (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPopularPlan(plan.id)}
                    disabled={plan.is_popular}
                  >
                    Marcar como Popular
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(plan)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deletePlan(plan.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Duração:</span> {plan.duration_months} mês(es)
                </div>
                <div>
                  <span className="font-medium">Preço:</span> R$ {plan.price.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Posição:</span> {plan.order_position}
                </div>
                <div>
                  <span className="font-medium">Features:</span> {plan.features.length}
                </div>
              </div>
              {plan.features.length > 0 && (
                <div className="mt-2">
                  <span className="text-sm font-medium">Recursos:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {plan.features.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan?.id ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
          </DialogHeader>
          
          {editingPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Plano</Label>
                  <Input
                    id="name"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="duration_months">Duração (meses)</Label>
                  <Input
                    id="duration_months"
                    type="number"
                    value={editingPlan.duration_months}
                    onChange={(e) => setEditingPlan({...editingPlan, duration_months: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({...editingPlan, price: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="order_position">Posição</Label>
                  <Input
                    id="order_position"
                    type="number"
                    value={editingPlan.order_position}
                    onChange={(e) => setEditingPlan({...editingPlan, order_position: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={editingPlan.is_active}
                  onCheckedChange={(checked) => setEditingPlan({...editingPlan, is_active: checked})}
                />
                <Label htmlFor="is_active">Plano Ativo</Label>
              </div>

              <div>
                <Label htmlFor="whatsapp_message">Mensagem WhatsApp</Label>
                <Textarea
                  id="whatsapp_message"
                  value={editingPlan.whatsapp_message || ''}
                  onChange={(e) => setEditingPlan({...editingPlan, whatsapp_message: e.target.value})}
                  placeholder="Olá! Quero contratar o plano..."
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Recursos do Plano</Label>
                  <Button size="sm" onClick={addFeature}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {editingPlan.features.map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        placeholder="Ex: Acesso completo"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFeature(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => savePlan(editingPlan)} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlansManager;