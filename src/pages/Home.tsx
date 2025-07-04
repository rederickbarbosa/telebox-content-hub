import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";

const Home = () => {
  const [featuredContent, setFeaturedContent] = useState<any[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { settings, getTestPeriod, buildWhatsAppUrl, getPlans, getSetting } = useSettings();

  useEffect(() => {
    loadFeaturedContent();
  }, []);

  const loadFeaturedContent = async () => {
    try {
      // Buscar conteúdos em destaque
      const [conteudosResponse, catalogoResponse] = await Promise.all([
        supabase.from('conteudos').select('*').eq('disponivel', true).in('tipo', ['filme', 'serie']).limit(4),
        supabase.from('catalogo_m3u').select('*').eq('ativo', true).in('tipo', ['filme', 'serie']).limit(4)
      ]);

      let content = [];
      
      if (conteudosResponse.data && conteudosResponse.data.length > 0) {
        content = conteudosResponse.data;
        // Usar backdrop da TMDB para fundo
        if (content[0]?.backdrop_url) {
          setBackgroundImage(content[0].backdrop_url);
        }
      } else if (catalogoResponse.data && catalogoResponse.data.length > 0) {
        content = catalogoResponse.data.map(item => ({
          id: item.id,
          nome: item.nome,
          tipo: item.tipo,
          poster_url: item.tvg_logo,
          generos: item.grupo ? [item.grupo] : [],
          ano: null,
          descricao: '',
          classificacao: 0
        }));
      }

      // Pegar 2 filmes e 2 séries se possível
      const filmes = content.filter(c => c.tipo === 'filme').slice(0, 2);
      const series = content.filter(c => c.tipo === 'serie').slice(0, 2);
      const featured = [...filmes, ...series];

      setFeaturedContent(featured);
    } catch (error) {
      console.error('Erro ao carregar conteúdo em destaque:', error);
    } finally {
      setLoading(false);
    }
  };

  // Usar configurações do hook
  const planos = getPlans();
  const whatsappTestUrl = buildWhatsAppUrl('test');
  const whatsappContractUrl = buildWhatsAppUrl('contract');

  const streamings = [
    "Globoplay", "Netflix", "Disney+", "Prime Video", "Paramount+", 
    "HBO MAX", "Apple TV+", "Amazon Prime", "Crunchyroll", "Pluto TV"
  ];

  const appsGratuitos = [
    {
      nome: "Blink Player",
      plataforma: "Android",
      url: "https://play.google.com/store/apps/details?id=com.iptvBlinkPlayer",
      logo: "https://play-lh.googleusercontent.com/B_RVRpwTQvCrQC7vNmuNixPkPs-C0FnCbN2Ixgc9UmXOAcg_RD-vgN_25IQV-FOhS5YD=w240-h480-rw"
    },
    {
      nome: "Blink Player Pro",
      plataforma: "iOS",
      url: "https://apps.apple.com/us/app/blink-player-pro/id1635779666",
      logo: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/5f/5d/0a/5f5d0a9b-6c59-e1fb-be8d-b9ae75d719fc/AppIcon-0-0-1x_U007emarketing-0-8-0-0-sRGB-85-220.png/230x0w.webp"
    },
    {
      nome: "Smarters Player Lite",
      plataforma: "iOS",
      url: "https://apps.apple.com/br/app/smarters-player-lite/id1628995509",
      logo: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/28/35/70/283570d2-298b-0d0f-cc0f-7f81b1e67d30/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.jpeg/230x0w.webp"
    }
  ];

  const redirectToWatch = (content: any) => {
    const baseUrl = "https://web.telebox.com.br/w";
    const type = content.tipo === "filme" ? "movie" : "tv";
    const url = `${baseUrl}/${type}?search=${encodeURIComponent(content.nome)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section with Dynamic Background */}
      <section 
        className="relative text-white py-20 overflow-hidden"
        style={{
          background: backgroundImage 
            ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${backgroundImage})`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <img 
            src="/lovable-uploads/f8c39ee0-2f4f-48db-8eec-77de87d513ee.png" 
            alt="TELEBOX" 
            className="h-20 w-auto mx-auto mb-8"
          />
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {settings.site_titulo || 'Melhor IPTV do Brasil'}
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
            {settings.home_descricao || 'Acesse mais de 200.000 conteúdos dos principais streamings, canais abertos e fechados em uma única plataforma'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="xl" 
              variant="whatsapp"
              onClick={() => window.open(whatsappTestUrl, '_blank')}
              className="text-lg"
            >
              🎉 Teste Grátis {getTestPeriod()}
            </Button>
            <Button 
              size="xl" 
              variant="hero"
              onClick={() => window.open(whatsappContractUrl, '_blank')}
              className="text-lg bg-yellow-400 text-black hover:bg-yellow-500"
            >
              Contratar Agora
            </Button>
          </div>

          {/* Streamings disponíveis */}
          <div className="mb-8">
            <p className="text-lg mb-4 text-white/80">Streamings inclusos:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {streamings.map((streaming) => (
                <Badge key={streaming} variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                  {streaming}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Content Section */}
      {featuredContent.length > 0 && (
        <section className="py-20 bg-telebox-gray-light">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Conteúdos em Destaque</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Descubra os principais filmes e séries disponíveis na plataforma
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {featuredContent.map((content, index) => (
                <Dialog key={content.id}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:shadow-telebox-hero transition-shadow group">
                      <div className="relative overflow-hidden rounded-t-lg">
                        <img
                          src={content.poster_url || "/placeholder.svg"}
                          alt={content.nome}
                          className="w-full h-64 object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.svg';
                          }}
                        />
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="bg-black/70 text-white">
                            {content.tipo}
                          </Badge>
                        </div>
                        {content.classificacao > 0 && (
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="bg-yellow-500 text-black">
                              ⭐ {content.classificacao.toFixed(1)}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm font-semibold line-clamp-2">
                          {content.nome}
                        </CardTitle>
                        {content.ano && (
                          <CardDescription className="text-xs">
                            {content.ano}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  </DialogTrigger>

                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">{content.nome}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <img
                          src={content.poster_url || "/placeholder.svg"}
                          alt={content.nome}
                          className="w-full h-auto rounded-lg shadow-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.svg';
                          }}
                        />
                      </div>
                      
                      <div className="space-y-4">
                        {content.descricao && (
                          <div>
                            <h3 className="font-semibold mb-2">Sinopse</h3>
                            <p className="text-muted-foreground">{content.descricao}</p>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{content.tipo}</Badge>
                          {content.ano && <Badge variant="outline">{content.ano}</Badge>}
                          {content.classificacao > 0 && (
                            <Badge variant="outline">⭐ {content.classificacao.toFixed(1)}</Badge>
                          )}
                        </div>
                        
                        {content.generos && content.generos.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-2">Gêneros</h3>
                            <div className="flex flex-wrap gap-2">
                              {content.generos.map((genero: string, index: number) => (
                                <Badge key={index} variant="secondary">{genero}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <Button
                          variant="hero"
                          onClick={() => redirectToWatch(content)}
                          className="w-full"
                        >
                          Assistir Agora
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Planos Section */}
      <section className="py-20 bg-telebox-gray-light">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Escolha seu Plano</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Preços especiais para você ter acesso completo ao melhor conteúdo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {planos.map((plano) => (
              <Card key={plano.duracao} className={`relative ${plano.popular ? 'ring-2 ring-telebox-blue shadow-telebox-hero' : 'shadow-telebox-card'}`}>
                {plano.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-telebox-blue">
                    Mais Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plano.duracao}</CardTitle>
                  <CardDescription className="text-3xl font-bold text-telebox-blue">
                    {plano.preco}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center justify-center">
                      <span className="text-green-500 mr-2">✓</span>
                      200k+ conteúdos
                    </li>
                    <li className="flex items-center justify-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Todos os streamings
                    </li>
                    <li className="flex items-center justify-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Canais HD/4K
                    </li>
                    <li className="flex items-center justify-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Suporte incluído
                    </li>
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plano.popular ? "hero" : "telebox"}
                    onClick={() => window.open(whatsappContractUrl, '_blank')}
                  >
                    Contratar via WhatsApp
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              * Preços válidos para o sinal IPTV. Aplicativos pagos vendidos separadamente.
            </p>
          </div>
        </div>
      </section>

      {/* Apps Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Como Assistir</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Disponível em múltiplas plataformas para sua comodidade
            </p>
          </div>

          {/* Plataforma Web */}
          <div className="mb-12">
            <Card className="max-w-2xl mx-auto shadow-telebox-card">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">🌐 Plataforma Web (Grátis para assinantes)</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <img 
                  src="/lovable-uploads/52a92ba9-cb00-476e-86a7-8019ac8c0c91.png" 
                  alt="TELEBOX Web" 
                  className="h-16 w-auto mx-auto mb-4"
                />
                <p className="mb-4">Acesse direto do navegador, sem downloads</p>
                <Button 
                  variant="telebox"
                  onClick={() => window.open(settings.site_url || "https://web.telebox.com.br", '_blank')}
                >
                  Acessar Plataforma Web
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Apps Gratuitos */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-center mb-8">📱 Aplicativos GRATUITOS</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {appsGratuitos.map((app) => (
                <Card key={app.nome} className="shadow-telebox-card hover:shadow-telebox-hero transition-shadow">
                  <CardHeader className="text-center">
                    <img 
                      src={app.logo} 
                      alt={app.nome}
                      className="h-16 w-16 mx-auto mb-4 rounded-lg"
                    />
                    <CardTitle className="text-lg">{app.nome}</CardTitle>
                    <CardDescription>{app.plataforma}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open(app.url, '_blank')}
                    >
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Apps Pagos Smart TV */}
          <div>
            <h3 className="text-2xl font-bold text-center mb-4">📺 Smart TV (Apps Pagos)</h3>
            <p className="text-center text-muted-foreground mb-8">
              Para Smart TVs, temos aplicativos premium disponíveis. Entre em contato para mais informações.
            </p>
            <div className="text-center">
              <Button 
                variant="telebox"
                onClick={() => window.location.href = '/aplicativos'}
              >
                Consultar Apps Smart TV
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-hero text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Teste grátis por {getTestPeriod()} ou contrate seu plano agora mesmo!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="xl" 
              variant="whatsapp"
              onClick={() => window.open(whatsappTestUrl, '_blank')}
            >
              Testar Grátis Agora
            </Button>
            <Button 
              size="xl" 
              variant="premium"
              onClick={() => window.open(whatsappContractUrl, '_blank')}
            >
              Contratar Plano
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;