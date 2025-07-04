
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Check, Star, Tv, Film, Radio, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface CatalogItem {
  id: string;
  nome: string;
  tipo: string;
  grupo: string;
  logo: string;
  poster_url?: string;
  backdrop_url?: string;
}

const Home = () => {
  const [heroContent, setHeroContent] = useState<CatalogItem | null>(null);
  const [popularChannels, setPopularChannels] = useState<CatalogItem[]>([]);
  const [featuredContent, setFeaturedContent] = useState<CatalogItem[]>([]);

  useEffect(() => {
    loadHeroContent();
    loadPopularChannels();
    loadFeaturedContent();
  }, []);

  const loadHeroContent = async () => {
    try {
      const { data } = await supabase
        .from('catalogo_m3u_live')
        .select('*')
        .eq('tipo', 'filme')
        .eq('ativo', true)
        .not('poster_url', 'is', null)
        .limit(1)
        .single();
      
      if (data) {
        setHeroContent(data);
      }
    } catch (error) {
      console.log('No hero content available');
    }
  };

  const loadPopularChannels = async () => {
    try {
      const { data } = await supabase
        .from('catalogo_m3u_live')
        .select('*')
        .eq('tipo', 'canal')
        .eq('ativo', true)
        .not('logo', 'is', null)
        .order('nome')
        .limit(20);
      
      if (data) {
        setPopularChannels(data);
      }
    } catch (error) {
      console.log('Error loading channels:', error);
    }
  };

  const loadFeaturedContent = async () => {
    try {
      const { data } = await supabase
        .from('catalogo_m3u_live')
        .select('*')
        .in('tipo', ['filme', 'serie'])
        .eq('ativo', true)
        .not('poster_url', 'is', null)
        .order('nome')
        .limit(12);
      
      if (data) {
        setFeaturedContent(data);
      }
    } catch (error) {
      console.log('Error loading featured content:', error);
    }
  };

  const whatsappUrl = "https://wa.me/5511911837288?text=Olá!%20Gostaria%20de%20contratar%20o%20TELEBOX%20IPTV";

  const heroStyle = heroContent?.poster_url 
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url(${heroContent.poster_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : {};

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="bg-gradient-hero text-white py-20 px-4"
        style={heroStyle}
      >
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            TELEBOX IPTV
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            A melhor experiência em entretenimento digital
          </p>
          <p className="text-lg mb-8 max-w-2xl mx-auto opacity-80">
            Milhares de canais, filmes e séries em alta qualidade. 
            Acesse de qualquer dispositivo, a qualquer hora.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-semibold px-8"
              asChild
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                Teste Grátis por 6h
              </a>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-black px-8"
              asChild
            >
              <Link to="/catalogo">
                Ver Catálogo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Popular Channels Carousel */}
      {popularChannels.length > 0 && (
        <section className="bg-white py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Canais Mais Populares</h2>
              <p className="text-gray-600">
                Confira alguns dos canais disponíveis em nossa plataforma
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <div className="flex gap-6 pb-4" style={{ width: 'max-content' }}>
                {popularChannels.map((channel) => (
                  <Link
                    key={channel.id} 
                    to={`/programacao?canal=${encodeURIComponent(channel.nome)}`}
                    className="flex-shrink-0 group"
                  >
                    <div className="w-24 h-24 bg-gradient-to-br from-telebox-blue/20 to-telebox-purple/20 rounded-lg p-4 flex items-center justify-center group-hover:scale-105 transition-transform shadow-telebox-card">
                      {channel.logo ? (
                        <img 
                          src={channel.logo} 
                          alt={channel.nome}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Tv className="w-8 h-8 text-telebox-blue" />
                      )}
                    </div>
                    <p className="text-center text-sm font-medium mt-2 group-hover:text-telebox-blue transition-colors">
                      {channel.nome}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
            
            <div className="text-center mt-8">
              <Button variant="outline" asChild>
                <Link to="/programacao" className="flex items-center gap-2">
                  Ver Programação Completa
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Plans Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Escolha seu Plano</h2>
            <p className="text-gray-600">
              Planos flexíveis para sua necessidade
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Plano 1 Mês - Popular */}
            <Card className="relative shadow-telebox-card hover:shadow-lg transition-shadow border-2 border-telebox-blue">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-telebox-blue text-white px-3 py-1">
                  Popular
                </Badge>
              </div>
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-bold mb-2">1 Mês</h3>
                <div className="text-3xl font-bold text-telebox-blue mb-4">
                  R$ 30,00
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Acesso completo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Todos os canais</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Filmes e séries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Suporte 24h</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-semibold"
                  asChild
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    Contratar Agora
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Plano 2 Meses */}
            <Card className="shadow-telebox-card hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-bold mb-2">2 Meses</h3>
                <div className="text-3xl font-bold text-telebox-blue mb-4">
                  R$ 55,00
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Acesso completo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Todos os canais</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Filmes e séries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Suporte 24h</span>
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full"
                  asChild
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    Contratar Agora
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Plano 3 Meses */}
            <Card className="shadow-telebox-card hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-bold mb-2">3 Meses</h3>
                <div className="text-3xl font-bold text-telebox-blue mb-4">
                  R$ 80,00
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Acesso completo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Todos os canais</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Filmes e séries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Suporte 24h</span>
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full"
                  asChild
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    Contratar Agora
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Content */}
      {featuredContent.length > 0 && (
        <section className="bg-white py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Destaques do Catálogo</h2>
              <p className="text-gray-600">
                Filmes e séries em destaque na nossa plataforma
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {featuredContent.map((item) => (
                <Link
                  key={item.id}
                  to="/catalogo"
                  className="group"
                >
                  <div className="aspect-[2/3] bg-gradient-to-br from-telebox-blue/20 to-telebox-purple/20 rounded-lg overflow-hidden shadow-telebox-card group-hover:shadow-lg transition-shadow">
                    {item.poster_url ? (
                      <img 
                        src={item.poster_url} 
                        alt={item.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {item.tipo === 'filme' ? (
                          <Film className="w-12 h-12 text-telebox-blue" />
                        ) : (
                          <Radio className="w-12 h-12 text-telebox-blue" />
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-center text-sm font-medium mt-2 group-hover:text-telebox-blue transition-colors line-clamp-2">
                    {item.nome}
                  </p>
                </Link>
              ))}
            </div>
            
            <div className="text-center mt-8">
              <Button variant="outline" asChild>
                <Link to="/catalogo" className="flex items-center gap-2">
                  Ver Catálogo Completo
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
