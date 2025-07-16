import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Key, Settings, ExternalLink } from "lucide-react";

const ApiConfigManager = () => {
  const [tmdbToken, setTmdbToken] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [openrouterModel, setOpenrouterModel] = useState("openai/gpt-4o-mini");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const openrouterModels = [
    { value: "openai/gpt-4o-mini", label: "GPT-4O Mini (Recomendado)" },
    { value: "openai/gpt-4o", label: "GPT-4O" },
    { value: "anthropic/claude-3-sonnet", label: "Claude 3 Sonnet" },
    { value: "anthropic/claude-3-haiku", label: "Claude 3 Haiku" },
    { value: "meta-llama/llama-3.1-8b-instruct", label: "Llama 3.1 8B" },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['tmdb_token', 'openrouter_key', 'openrouter_model', 'whatsapp_number']);

      if (error) throw error;

      data?.forEach(setting => {
        switch (setting.setting_key) {
          case 'tmdb_token':
            setTmdbToken(setting.setting_value || '');
            break;
          case 'openrouter_key':
            setOpenrouterKey(setting.setting_value || '');
            break;
          case 'openrouter_model':
            setOpenrouterModel(setting.setting_value || 'openai/gpt-4o-mini');
            break;
          case 'whatsapp_number':
            setWhatsappNumber(setting.setting_value || '5511911837288');
            break;
        }
      });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const saveSetting = async (key: string, value: string, description: string) => {
    try {
      const { error } = await supabase.rpc('upsert_admin_setting', {
        key,
        value,
        description_text: description
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Erro ao salvar ${key}:`, error);
      return false;
    }
  };

  const saveAllSettings = async () => {
    setLoading(true);
    try {
      const settings = [
        { key: 'tmdb_token', value: tmdbToken, description: 'Token de API do TMDB' },
        { key: 'openrouter_key', value: openrouterKey, description: 'Chave de API do OpenRouter' },
        { key: 'openrouter_model', value: openrouterModel, description: 'Modelo de IA do OpenRouter' },
        { key: 'whatsapp_number', value: whatsappNumber, description: 'Número do WhatsApp para contato' },
      ];

      let successCount = 0;
      for (const setting of settings) {
        if (setting.value) {
          const success = await saveSetting(setting.key, setting.value, setting.description);
          if (success) successCount++;
        }
      }

      toast({
        title: "Configurações salvas",
        description: `${successCount} configurações foram salvas com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar algumas configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testTmdbConnection = async () => {
    if (!tmdbToken) {
      toast({
        title: "Token necessário",
        description: "Informe o token TMDB antes de testar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${tmdbToken}`);
      
      if (response.ok) {
        toast({
          title: "TMDB conectado",
          description: "Token TMDB válido e funcionando.",
        });
      } else {
        throw new Error('Token inválido');
      }
    } catch (error) {
      toast({
        title: "Erro na conexão",
        description: "Token TMDB inválido ou problema de conectividade.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Key className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Configurações de API</h2>
      </div>

      {/* TMDB Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            TMDB (The Movie Database)
          </CardTitle>
          <CardDescription>
            Configure a API do TMDB para buscar informações de filmes e séries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tmdbToken">Token de API TMDB</Label>
            <Input
              id="tmdbToken"
              type="password"
              value={tmdbToken}
              onChange={(e) => setTmdbToken(e.target.value)}
              placeholder="Insira seu token TMDB"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={testTmdbConnection} variant="outline">
              Testar Conexão
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open('https://www.themoviedb.org/settings/api', '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Obter Token
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* OpenRouter Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            OpenRouter (IA)
          </CardTitle>
          <CardDescription>
            Configure a API do OpenRouter para funcionalidades de IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openrouterKey">Chave de API OpenRouter</Label>
            <Input
              id="openrouterKey"
              type="password"
              value={openrouterKey}
              onChange={(e) => setOpenrouterKey(e.target.value)}
              placeholder="Insira sua chave OpenRouter"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="openrouterModel">Modelo de IA</Label>
            <Select value={openrouterModel} onValueChange={setOpenrouterModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {openrouterModels.map(model => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant="outline"
            onClick={() => window.open('https://openrouter.ai/keys', '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Obter Chave
          </Button>
        </CardContent>
      </Card>

      {/* WhatsApp Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            WhatsApp
          </CardTitle>
          <CardDescription>
            Configure o número do WhatsApp para contato
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">Número do WhatsApp</Label>
            <Input
              id="whatsappNumber"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="5511999999999"
            />
            <p className="text-sm text-muted-foreground">
              Formato: código do país + DDD + número (sem espaços ou caracteres especiais)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={saveAllSettings}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Salvando..." : "Salvar Todas as Configurações"}
          </Button>
        </CardContent>
      </Card>

      {/* Help */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-blue-800 mb-2">💡 Informações</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>TMDB:</strong> Usado para buscar informações, imagens e trailers de filmes e séries</li>
            <li>• <strong>OpenRouter:</strong> Usado para funcionalidades de IA como recomendações e notificações</li>
            <li>• <strong>WhatsApp:</strong> Número usado nos botões de contato e contratação</li>
            <li>• Todas as configurações são criptografadas e armazenadas com segurança</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiConfigManager;