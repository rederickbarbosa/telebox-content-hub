import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Star, ExternalLink } from "lucide-react";

const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0YmU4YmIzNmVlMWVlZmQ1YTAxNjNkOTA4OTU5MzczMSIsIm5iZiI6MTc1MDAyMTg2OS44MjIsInN1YiI6IjY4NGYzNmVkMzI3NDY0N2M0ZDI5NTAxYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.GTS74gYaVoWQHAQlz6kBvWYmGL9n6gGethzJHW7qzEA";

interface TrendingContent {
  id: string;
  nome: string;
  tipo: string;
  logo?: string;
  tmdb_data?: {
    poster_path?: string;
    vote_average?: number;
    release_date?: string;
    overview?: string;
  };
}

const TrendingMovies = () => {
  const [trending, setTrending] = useState<TrendingContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingContent();
  }, []);

  const fetchTrendingContent = async () => {
    try {
      setLoading(true);

      // Buscar filmes e séries populares do Brasil no TMDB
      const trendingResponse = await fetch(
        'https://api.themoviedb.org/3/trending/all/week?language=pt-BR&region=BR',
        {
          headers: {
            'Authorization': `Bearer ${TMDB_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const trendingData = await trendingResponse.json();
      
      if (trendingData.results) {
        // Buscar quais desses conteúdos estão disponíveis no nosso catálogo
        // Usar paginação para buscar todos
        let allCatalogData: any[] = [];
        let hasMore = true;
        let page = 0;
        const pageSize = 10000;

        while (hasMore) {
          const { data: catalogPage } = await supabase
            .from('catalogo_m3u_live')
            .select('id, nome, tipo, logo')
            .eq('ativo', true)
            .in('tipo', ['filme', 'serie'])
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (catalogPage && catalogPage.length > 0) {
            allCatalogData = [...allCatalogData, ...catalogPage];
            hasMore = catalogPage.length === pageSize;
            page++;
          } else {
            hasMore = false;
          }
        }

        const catalogData = allCatalogData;

        if (catalogData) {
          // Combinar dados do TMDB com nosso catálogo - APENAS conteúdo que está no catálogo
          const matchedContent: TrendingContent[] = [];
          
          // Primeiro, vamos pegar os itens do nosso catálogo que têm tmdb_id ou que podemos fazer match
          for (const catalogItem of catalogData.slice(0, 12)) {
            // Buscar no TMDB apenas se o item do catálogo ainda não tem dados TMDB
            if (!catalogItem.logo || !catalogItem.logo.includes('tmdb.org')) {
              try {
                const searchQuery = encodeURIComponent(catalogItem.nome);
                const searchResponse = await fetch(
                  `https://api.themoviedb.org/3/search/${catalogItem.tipo === 'filme' ? 'movie' : 'tv'}?query=${searchQuery}&language=pt-BR`,
                  {
                    headers: {
                      'Authorization': `Bearer ${TMDB_TOKEN}`,
                      'Content-Type': 'application/json',
                    },
                  }
                );
                
                const searchData = await searchResponse.json();
                
                if (searchData.results && searchData.results.length > 0) {
                  const bestMatch = searchData.results[0];
                  
                  matchedContent.push({
                    ...catalogItem,
                    tmdb_data: {
                      poster_path: bestMatch.poster_path,
                      vote_average: bestMatch.vote_average,
                      release_date: bestMatch.release_date || bestMatch.first_air_date,
                      overview: bestMatch.overview
                    }
                  });
                }
              } catch (error) {
                console.error(`Erro ao buscar dados TMDB para ${catalogItem.nome}:`, error);
              }
            } else {
              // Se já tem logo do TMDB, usar como está
              matchedContent.push(catalogItem);
            }
          }

          setTrending(matchedContent);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar conteúdo em alta:', error);
    } finally {
      setLoading(false);
    }
  };

  const redirectToWatch = (content: TrendingContent) => {
    const baseUrl = "https://web.telebox.com.br/w";
    const type = content.tipo === "filme" ? "movie" : content.tipo === "serie" ? "tv" : "live";
    const url = `${baseUrl}/${type}?search=${encodeURIComponent(content.nome)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2">Carregando conteúdo em alta...</p>
          </div>
        </div>
      </div>
    );
  }

  if (trending.length === 0) return null;

  return (
    <div className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Em Alta no Brasil
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Os filmes e séries mais populares que estão disponíveis no nosso catálogo
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
          {trending.map((content) => (
            <Card key={content.id} className="cursor-pointer hover:shadow-lg transition-shadow group">
              <div className="relative overflow-hidden rounded-t-lg">
                <img
                  src={
                    content.tmdb_data?.poster_path 
                      ? `https://image.tmdb.org/t/p/w500${content.tmdb_data.poster_path}`
                      : content.logo || "https://via.placeholder.com/300x450/1f2937/ffffff?text=TELEBOX"
                  }
                  alt={content.nome}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://via.placeholder.com/300x450/1f2937/ffffff?text=TELEBOX";
                  }}
                />
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="bg-red-600 text-white text-xs">
                    Em Alta
                  </Badge>
                </div>
                {content.tmdb_data?.vote_average && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-yellow-500 text-black text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      {content.tmdb_data.vote_average.toFixed(1)}
                    </Badge>
                  </div>
                )}
              </div>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-semibold line-clamp-2">
                  {content.nome}
                </CardTitle>
                {content.tmdb_data?.release_date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(content.tmdb_data.release_date).getFullYear()}
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => redirectToWatch(content)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Assistir
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrendingMovies;