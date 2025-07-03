import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Download, Smartphone, Tv } from "lucide-react";

const Aplicativos = () => {
  const whatsappAppUrl = "https://wa.me/5511911837288?text=Gostaria%20de%20saber%20sobre%20os%20aplicativos%20para%20Smart%20TV";

  const appsGratuitos = [
    {
      nome: "Blink Player",
      plataforma: "Android",
      tipo: "gratuito",
      url: "https://play.google.com/store/apps/details?id=com.iptvBlinkPlayer",
      logo: "https://play-lh.googleusercontent.com/B_RVRpwTQvCrQC7vNmuNixPkPs-C0FnCbN2Ixgc9UmXOAcg_RD-vgN_25IQV-FOhS5YD=w240-h480-rw",
      descricao: "Player IPTV completo para Android"
    },
    {
      nome: "Blink Player Pro",
      plataforma: "iOS",
      tipo: "gratuito",
      url: "https://apps.apple.com/us/app/blink-player-pro/id1635779666",
      logo: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/5f/5d/0a/5f5d0a9b-6c59-e1fb-be8d-b9ae75d719fc/AppIcon-0-0-1x_U007emarketing-0-8-0-0-sRGB-85-220.png/230x0w.webp",
      descricao: "Versão Pro para dispositivos iOS"
    },
    {
      nome: "Smarters Player Lite",
      plataforma: "iOS",
      tipo: "gratuito",
      url: "https://apps.apple.com/br/app/smarters-player-lite/id1628995509",
      logo: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/28/35/70/283570d2-298b-0d0f-cc0f-7f81b1e67d30/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.jpeg/230x0w.webp",
      descricao: "Player leve e eficiente para iOS"
    }
  ];

  const appsPagos = [
    { nome: "BAY IPTV", logo: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051166963x413214974482317500/Bay%20IPTV.png", destaque: false },
    { nome: "BOB PLAYER", logo: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051203614x110778080324160930/BOB%20Player.png", destaque: true },
    { nome: "BLINK PLAYER", logo: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051186836x163508151263530600/Blink%20Player.png", destaque: false },
    { nome: "BOB PREMIUM", logo: "https://d690eca1cc598e984c14889e63f8a117.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1734554526998x333107931195849150/logo%20bob%20premium.png", destaque: false },
    { nome: "BOB PRO", logo: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051222103x583936875275090800/BOB%20PRO.png", destaque: false },
    { nome: "DUPLECAST IPTV", logo: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051456340x156278902758103070/Duplecast%20IPTV.png", destaque: false },
    { nome: "DUPLEX PLAY", logo: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051475892x816918257579983900/Duplex%20Play.png", destaque: false },
    { nome: "EASY PLAYER", logo: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051509778x709761454654707600/Easy%20Player.png", destaque: false },
    { nome: "IBO PLAYER", logo: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051752402x571396282355654400/IBO%20player.png", destaque: true },
    { nome: "IBO PLAYER PRO", logo: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721058726027x735646428818075500/IBO%20PLAYER%20PRO%204.png", destaque: true },
    { nome: "IPTV OTT PLAYER", logo: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721052478623x472472372386141700/OTT%20Player.png", destaque: false },
    { nome: "OTT PLAY", logo: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721052461434x598392090187291300/OTT%20Play.png", destaque: false },
    { nome: "SMARTONE IPTV", logo: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721052735413x517835630117172740/SMARTONE%20IPTV.png", destaque: false },
    { nome: "VIRGINIA PLAYER", logo: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721052937364x867908660942959000/VIRGINIA%20TV.png", destaque: false },
    { nome: "VU PLAYER PRO", logo: "https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721052967322x954653944485070800/VU%20PLAYER%20PRO.png", destaque: false }
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Aplicativos TELEBOX</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Assista em qualquer dispositivo com nossos aplicativos compatíveis
          </p>
        </div>

        {/* Plataforma Web */}
        <section className="mb-12">
          <Card className="max-w-2xl mx-auto shadow-telebox-card bg-gradient-card">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-3">
                <ExternalLink className="h-6 w-6 text-telebox-blue" />
                Plataforma Web
              </CardTitle>
              <CardDescription>Grátis para assinantes</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <img 
                src="/lovable-uploads/52a92ba9-cb00-476e-86a7-8019ac8c0c91.png" 
                alt="TELEBOX Web" 
                className="h-16 w-auto mx-auto mb-4"
              />
              <p className="mb-6 text-muted-foreground">
                Acesse direto do navegador, sem necessidade de downloads. 
                Disponível para todos os assinantes.
              </p>
              <Button 
                variant="hero"
                size="lg"
                onClick={() => window.open("https://web.telebox.com.br", '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Acessar Plataforma Web
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Apps Gratuitos */}
        <section className="mb-12">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Smartphone className="h-6 w-6 text-telebox-blue" />
            <h2 className="text-3xl font-bold">Aplicativos GRATUITOS</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {appsGratuitos.map((app) => (
              <Card key={app.nome} className="shadow-telebox-card hover:shadow-telebox-hero transition-shadow group">
                <CardHeader className="text-center">
                  <img 
                    src={app.logo} 
                    alt={app.nome}
                    className="h-20 w-20 mx-auto mb-4 rounded-xl shadow-lg group-hover:scale-105 transition-transform"
                  />
                  <CardTitle className="text-lg">{app.nome}</CardTitle>
                  <CardDescription>{app.plataforma}</CardDescription>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Gratuito
                  </Badge>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    {app.descricao}
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(app.url, '_blank')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Apps Pagos Smart TV */}
        <section>
          <div className="flex items-center justify-center gap-3 mb-8">
            <Tv className="h-6 w-6 text-telebox-blue" />
            <h2 className="text-3xl font-bold">Apps Smart TV (Pagos)</h2>
          </div>
          
          <div className="text-center mb-8">
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Para Smart TVs, oferecemos licenças anuais de aplicativos premium. 
              Consulte disponibilidade para seu modelo de TV.
            </p>
          </div>

          {/* Apps em destaque primeiro */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-center mb-6">⭐ Apps em Destaque</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {appsPagos.filter(app => app.destaque).map((app) => (
                <Card key={app.nome} className="shadow-telebox-card hover:shadow-telebox-hero transition-shadow group relative">
                  <Badge className="absolute -top-2 -right-2 bg-yellow-500 text-black">
                    Destaque
                  </Badge>
                  <CardHeader className="text-center pb-3">
                    <img 
                      src={app.logo} 
                      alt={app.nome}
                      className="h-16 w-16 mx-auto mb-3 rounded-lg group-hover:scale-105 transition-transform"
                    />
                    <CardTitle className="text-sm">{app.nome}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Todos os apps */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-center mb-6">Todos os Apps Disponíveis</h3>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {appsPagos.map((app) => (
                <Card key={app.nome} className="shadow-telebox-card hover:shadow-telebox-hero transition-shadow group">
                  <CardHeader className="text-center p-4">
                    <img 
                      src={app.logo} 
                      alt={app.nome}
                      className="h-12 w-12 mx-auto mb-2 rounded-lg group-hover:scale-105 transition-transform"
                    />
                    <CardTitle className="text-xs leading-tight">{app.nome}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          <div className="text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6 max-w-2xl mx-auto">
              <h3 className="font-semibold text-yellow-800 mb-2">📝 Como Contratar</h3>
              <p className="text-yellow-700 text-sm">
                Os aplicativos para Smart TV são vendidos com licença anual. 
                Entre em contato conosco para verificar a compatibilidade com seu modelo de TV.
              </p>
            </div>
            
            <Button 
              variant="whatsapp"
              size="lg"
              onClick={() => window.open(whatsappAppUrl, '_blank')}
            >
              Consultar Apps Smart TV
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Aplicativos;