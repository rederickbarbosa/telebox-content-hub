import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PopulateApps = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const defaultApps = [
    // Apps Gratuitos
    {
      nome: "Blink Player",
      tipo: "gratuito",
      plataforma: "android",
      download_url: "https://play.google.com/store/apps/details?id=com.iptvBlinkPlayer",
      logo_url: "https://play-lh.googleusercontent.com/B_RVRpwTQvCrQC7vNmuNixPkPs-C0FnCbN2Ixgc9UmXOAcg_RD-vgN_25IQV-FOhS5YD=w240-h480-rw",
      ativo: true,
      destaque: false
    },
    {
      nome: "Blink Player Pro",
      tipo: "gratuito",
      plataforma: "ios",
      download_url: "https://apps.apple.com/us/app/blink-player-pro/id1635779666",
      logo_url: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/5f/5d/0a/5f5d0a9b-6c59-e1fb-be8d-b9ae75d719fc/AppIcon-0-0-1x_U007emarketing-0-8-0-0-sRGB-85-220.png/230x0w.webp",
      ativo: true,
      destaque: false
    },
    {
      nome: "Smarters Player Lite",
      tipo: "gratuito",
      plataforma: "ios",
      download_url: "https://apps.apple.com/br/app/smarters-player-lite/id1628995509",
      logo_url: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/28/35/70/283570d2-298b-0d0f-cc0f-7f81b1e67d30/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.jpeg/230x0w.webp",
      ativo: true,
      destaque: false
    },
    // Apps Pagos Smart TV
    {
      nome: "BAY IPTV",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051166963x413214974482317500/Bay%20IPTV.png",
      ativo: true,
      destaque: false
    },
    {
      nome: "BOB PLAYER",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051203614x110778080324160930/BOB%20Player.png",
      ativo: true,
      destaque: true
    },
    {
      nome: "BLINK PLAYER",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051186836x163508151263530600/Blink%20Player.png",
      ativo: true,
      destaque: false
    },
    {
      nome: "BOB PREMIUM",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://d690eca1cc598e984c14889e63f8a117.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1734554526998x333107931195849150/logo%20bob%20premium.png",
      ativo: true,
      destaque: false
    },
    {
      nome: "BOB PRO",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051222103x583936875275090800/BOB%20PRO.png",
      ativo: true,
      destaque: false
    },
    {
      nome: "DUPLECAST IPTV",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051456340x156278902758103070/Duplecast%20IPTV.png",
      ativo: true,
      destaque: false
    },
    {
      nome: "DUPLEX PLAY",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051475892x816918257579983900/Duplex%20Play.png",
      ativo: true,
      destaque: false
    },
    {
      nome: "EASY PLAYER",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051509778x709761454654707600/Easy%20Player.png",
      ativo: true,
      destaque: false
    },
    {
      nome: "IBO PLAYER",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051752402x571396282355654400/IBO%20player.png",
      ativo: true,
      destaque: true
    },
    {
      nome: "IBO PLAYER PRO",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721058726027x735646428818075500/IBO%20PLAYER%20PRO%204.png",
      ativo: true,
      destaque: true
    },
    {
      nome: "IPTV OTT PLAYER",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721052478623x472472372386141700/OTT%20Player.png",
      ativo: true,
      destaque: false
    },
    {
      nome: "OTT PLAY",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721052461434x598392090187291300/OTT%20Play.png",
      ativo: true,
      destaque: false
    },
    {
      nome: "SMARTONE IPTV",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721052735413x517835630117172740/SMARTONE%20IPTV.png",
      ativo: true,
      destaque: false
    },
    {
      nome: "VIRGINIA PLAYER",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721052937364x867908660942959000/VIRGINIA%20TV.png",
      ativo: true,
      destaque: false
    },
    {
      nome: "VU PLAYER PRO",
      tipo: "premium",
      plataforma: "smart-tv",
      download_url: null,
      logo_url: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721052967322x954653944485070800/VU%20PLAYER%20PRO.png",
      ativo: true,
      destaque: false
    }
  ];

  const populateApps = async () => {
    setLoading(true);
    try {
      // Primeiro, verificar se já existem apps
      const { data: existingApps } = await supabase
        .from('apps')
        .select('nome');

      const existingNames = existingApps?.map(app => app.nome) || [];
      
      // Filtrar apenas apps que não existem
      const newApps = defaultApps.filter(app => !existingNames.includes(app.nome));

      if (newApps.length === 0) {
        toast({
          title: "Apps já existem",
          description: "Todos os aplicativos padrão já foram adicionados.",
        });
        return;
      }

      // Inserir novos apps
      const { error } = await supabase
        .from('apps')
        .insert(newApps);

      if (error) throw error;

      toast({
        title: "Apps populados!",
        description: `${newApps.length} aplicativos foram adicionados com sucesso.`,
      });

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao popular aplicativos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Popular Apps Padrão
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Adicione todos os aplicativos padrão (gratuitos e Smart TV) ao sistema.
        </p>
        <Button onClick={populateApps} disabled={loading}>
          {loading ? "Adicionando..." : "Adicionar Apps Padrão"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PopulateApps;