import { useState, useEffect } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Channel {
  id: string;
  nome: string;
  logo: string;
  grupo: string;
  tipo: string;
}

const ChannelCarousel = () => {
  const [popularChannels, setPopularChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPopularChannels();
  }, []);

  const loadPopularChannels = async () => {
    try {
      // Get popular channels (canais) with logos, grouped by name to avoid duplicates
      const { data, error } = await supabase
        .from('catalogo_m3u_live')
        .select('id, nome, logo, grupo, tipo')
        .eq('ativo', true)
        .eq('tipo', 'canal')
        .not('logo', 'is', null)
        .neq('logo', '')
        .order('nome')
        .limit(100);

      if (error) {
        console.error('Error loading channels:', error);
        return;
      }

      if (data) {
        // Remove duplicates by channel name, keep only unique channels
        const uniqueChannels = data.reduce((acc: Channel[], current) => {
          const existing = acc.find(ch => ch.nome.toLowerCase().trim() === current.nome.toLowerCase().trim());
          if (!existing) {
            acc.push(current);
          }
          return acc;
        }, []);

        // Take first 20 channels
        setPopularChannels(uniqueChannels.slice(0, 20));
      }
    } catch (error) {
      console.error('Error loading popular channels:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-dark py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Canais Populares</h2>
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  if (popularChannels.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-dark py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-white text-center mb-8">
          Canais Populares
        </h2>
        <p className="text-gray-300 text-center mb-8">
          Confira os canais mais assistidos e acesse a programação completa
        </p>
        
        <div className="relative max-w-6xl mx-auto">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {popularChannels.map((channel) => (
                <CarouselItem key={channel.id} className="pl-2 md:pl-4 basis-1/3 md:basis-1/4 lg:basis-1/6">
                  <Link
                    to={`/programacao?canal=${encodeURIComponent(channel.nome)}`}
                    className="block group"
                  >
                    <div className="bg-white rounded-lg p-4 shadow-telebox-card hover:shadow-telebox-hover transition-all duration-300 group-hover:scale-105">
                      <div className="aspect-square flex items-center justify-center mb-2">
                        {channel.logo ? (
                          <img
                            src={channel.logo}
                            alt={channel.nome}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className="hidden w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400 text-xs text-center font-medium">
                            {channel.nome}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-xs font-medium text-center text-gray-800 truncate">
                        {channel.nome}
                      </h3>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-12 bg-white/10 border-white/20 text-white hover:bg-white/20" />
            <CarouselNext className="hidden md:flex -right-12 bg-white/10 border-white/20 text-white hover:bg-white/20" />
          </Carousel>
        </div>
        
        <div className="text-center mt-8">
          <Link
            to="/programacao"
            className="inline-flex items-center px-6 py-3 bg-telebox-blue text-white rounded-lg font-semibold hover:bg-telebox-blue-dark transition-colors"
          >
            Ver Programação Completa
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ChannelCarousel;
