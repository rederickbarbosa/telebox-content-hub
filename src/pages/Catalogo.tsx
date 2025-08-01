
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Play, ExternalLink, Star, Calendar, Users, Grid, List, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/hooks/useFavorites";
import SeriesModal from "@/components/catalog/SeriesModal";
import ChannelModal from "@/components/catalog/ChannelModal";
import SeriesHierarchy from "@/components/catalog/SeriesHierarchy";

interface Conteudo {
  id: string;
  nome: string;
  tipo: string;
  grupo: string;
  logo: string;
  qualidade: string;
  tvg_id: string;
  ativo: boolean;
  // Estrutura série/temporada/episódio
  serie_nome?: string;
  temporada?: number;
  episodio?: number;
  // Estrutura canal agrupado
  canal_nome?: string;
  // Dados TMDB carregados dinamicamente
  tmdb_data?: {
    poster_path?: string;
    backdrop_path?: string;
    overview?: string;
    release_date?: string;
    vote_average?: number;
    genres?: Array<{id: number, name: string}>;
    runtime?: number;
    cast?: Array<{name: string, character: string}>;
    trailer_key?: string;
  };
}

const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0YmU4YmIzNmVlMWVlZmQ1YTAxNjNkOTA4OTU5MzczMSIsIm5iZiI6MTc1MDAyMTg2OS44MjIsInN1YiI6IjY4NGYzNmVkMzI3NDY0N2M0ZDI5NTAxYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.GTS74gYaVoWQHAQlz6kBvWYmGL9n6gGethzJHW7qzEA";

const Catalogo = () => {
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [filteredConteudos, setFilteredConteudos] = useState<Conteudo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [generoFilter, setGeneroFilter] = useState("todos");
  const [qualidadeFilter, setQualidadeFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [tmdbLoading, setTmdbLoading] = useState<{[key: string]: boolean}>({});
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedSeriesData, setSelectedSeriesData] = useState<any>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedChannelData, setSelectedChannelData] = useState<any>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { toast } = useToast();
  const { favorites, isFavorite } = useFavorites();

  useEffect(() => {
    fetchConteudos();
  }, []);

  useEffect(() => {
    filterConteudos();
  }, [conteudos, searchTerm, tipoFilter, generoFilter, qualidadeFilter, showFavoritesOnly, favorites]);

  const fetchConteudos = async () => {
    try {
      // Buscar TODOS os conteúdos - usar paginação para grandes volumes
      let allData: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 10000;

      while (hasMore) {
        const { data, error } = await supabase
          .from('catalogo_m3u_live')
          .select('*')
          .eq('ativo', true)
          .order('nome')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      setConteudos(allData);
      console.log(`Carregados ${allData.length} conteúdos`);
    } catch (error) {
      console.error('Erro ao buscar conteúdos:', error);
      toast({
        title: "Erro ao carregar catálogo",
        description: "Verifique sua conexão e tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterConteudos = () => {
    let filtered = conteudos;

    // Filtrar por favoritos se ativado
    if (showFavoritesOnly) {
      const favoriteIds = favorites.map(fav => fav.content_id);
      filtered = filtered.filter(item => favoriteIds.includes(item.id));
    }

    // Agrupar conteúdos baseado no tipo
    if (tipoFilter === "serie") {
      // Para séries, agrupar por série base (sem temporada/episódio)
      const seriesGrouped = new Map();
      
      filtered.forEach(item => {
        if (item.tipo === 'serie') {
          const serieBase = extractSerieBaseName(item.nome);
          if (!seriesGrouped.has(serieBase)) {
            seriesGrouped.set(serieBase, {
              ...item,
              nome: serieBase,
              serie_nome: serieBase
            });
          }
        }
      });
      
      filtered = Array.from(seriesGrouped.values());
    } else if (tipoFilter === "canal") {
      // Para canais, agrupar por nome base (sem qualidade/região)
      const canaisGrouped = new Map();
      
      filtered.forEach(item => {
        if (item.tipo === 'canal') {
          const canalBase = extractCanalBaseName(item.nome);
          if (!canaisGrouped.has(canalBase)) {
            canaisGrouped.set(canalBase, {
              ...item,
              nome: canalBase,
              canal_nome: canalBase
            });
          }
        }
      });
      
      filtered = Array.from(canaisGrouped.values());
    } else if (tipoFilter !== "todos") {
      // Para filmes e outros tipos, filtrar normalmente
      filtered = filtered.filter(item => item.tipo === tipoFilter);
    } else {
      // Para "todos", agrupar séries e canais, manter filmes individuais
      const uniqueContent = new Map();
      
      filtered.forEach(item => {
        let key = item.id;
        let processedItem = item;
        
        if (item.tipo === 'serie') {
          const serieBase = extractSerieBaseName(item.nome);
          key = `serie_${serieBase}`;
          processedItem = {
            ...item,
            nome: serieBase,
            serie_nome: serieBase
          };
        } else if (item.tipo === 'canal') {
          const canalBase = extractCanalBaseName(item.nome);
          key = `canal_${canalBase}`;
          processedItem = {
            ...item,
            nome: canalBase,
            canal_nome: canalBase
          };
        }
        
        if (!uniqueContent.has(key)) {
          uniqueContent.set(key, processedItem);
        }
      });
      
      filtered = Array.from(uniqueContent.values());
    }

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.grupo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.serie_nome && item.serie_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.canal_nome && item.canal_nome.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (generoFilter !== "todos") {
      filtered = filtered.filter(item =>
        item.grupo.toLowerCase().includes(generoFilter.toLowerCase())
      );
    }

    if (qualidadeFilter !== "todos") {
      filtered = filtered.filter(item => item.qualidade === qualidadeFilter);
    }

    setFilteredConteudos(filtered);
  };

  // Função para extrair nome base da série
  const extractSerieBaseName = (nome: string): string => {
    // Remove padrões como S01E01, T01E01, temporada, episódio, etc
    return nome
      .replace(/\s*S\d+E\d+.*$/i, '')
      .replace(/\s*T\d+E\d+.*$/i, '')
      .replace(/\s*\d+ª?\s*Temporada.*$/i, '')
      .replace(/\s*Temporada\s*\d+.*$/i, '')
      .replace(/\s*Episódio\s*\d+.*$/i, '')
      .replace(/\s*EP\s*\d+.*$/i, '')
      .replace(/\s*Ep\.\s*\d+.*$/i, '')
      .trim();
  };

  // Função para extrair nome base do canal
  const extractCanalBaseName = (nome: string): string => {
    // Remove qualidade, região, números duplicados
    return nome
      .replace(/\s*\b(HD|FHD|4K|SD|H264|H265)\b.*$/i, '')
      .replace(/\s*\b(BR|SP|RJ|MG|RS|PR|SC|BA|PE|CE|GO|DF|MT|MS|RO|AC|AM|AP|PA|RR|TO|AL|PB|PI|RN|SE|MA|ES)\b.*$/i, '')
      .replace(/\s*\(\d+\).*$/i, '')
      .replace(/\s*\[\d+\].*$/i, '')
      .replace(/\s*-\s*\d+.*$/i, '')
      .replace(/\s*\d+$/, '')
      .trim();
  };

  const fetchTMDBData = async (conteudo: Conteudo) => {
    if (conteudo.tmdb_data || tmdbLoading[conteudo.id]) return;

    setTmdbLoading(prev => ({ ...prev, [conteudo.id]: true }));

    try {
      const searchQuery = encodeURIComponent(conteudo.nome);
      const mediaType = conteudo.tipo === 'filme' ? 'movie' : 'tv';
      
      const searchResponse = await fetch(
        `https://api.themoviedb.org/3/search/${mediaType}?query=${searchQuery}&language=pt-BR`,
        {
          headers: {
            'Authorization': `Bearer ${TMDB_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const searchData = await searchResponse.json();
      
      if (searchData.results && searchData.results.length > 0) {
        const tmdbId = searchData.results[0].id;
        
        // Buscar detalhes completos
        const detailsResponse = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?language=pt-BR&append_to_response=credits,videos`,
          {
            headers: {
              'Authorization': `Bearer ${TMDB_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const detailsData = await detailsResponse.json();
        
        // Buscar trailer
        const trailer = detailsData.videos?.results?.find((video: any) => 
          video.type === 'Trailer' && video.site === 'YouTube'
        );

        const tmdbData = {
          poster_path: detailsData.poster_path,
          backdrop_path: detailsData.backdrop_path,
          overview: detailsData.overview,
          release_date: detailsData.release_date || detailsData.first_air_date,
          vote_average: detailsData.vote_average,
          genres: detailsData.genres,
          runtime: detailsData.runtime || detailsData.episode_run_time?.[0],
          cast: detailsData.credits?.cast?.slice(0, 5) || [],
          trailer_key: trailer?.key
        };

        // Atualizar estado local (não salvar no banco)
        setConteudos(prev => prev.map(item => 
          item.id === conteudo.id 
            ? { ...item, tmdb_data: tmdbData }
            : item
        ));
      }
    } catch (error) {
      console.error('Erro ao buscar dados TMDB:', error);
    } finally {
      setTmdbLoading(prev => ({ ...prev, [conteudo.id]: false }));
    }
  };

  const redirectToWatch = (conteudo: Conteudo) => {
    const baseUrl = "https://web.telebox.com.br/w";
    const type = conteudo.tipo === "filme" ? "movie" : conteudo.tipo === "serie" ? "tv" : "live";
    const url = `${baseUrl}/${type}?search=${encodeURIComponent(conteudo.nome)}`;
    window.open(url, '_blank');
  };

  const getGenresFromConteudos = () => {
    const allGenres = conteudos.map(item => item.grupo).filter(Boolean);
    return [...new Set(allGenres)].sort();
  };

  const getQualitiesFromConteudos = () => {
    const qualities = conteudos.map(item => item.qualidade).filter(Boolean);
    return [...new Set(qualities)].sort();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img 
            src="/lovable-uploads/52a92ba9-cb00-476e-86a7-8019ac8c0c91.png" 
            alt="TELEBOX" 
            className="h-16 w-auto mx-auto mb-4 animate-pulse"
          />
          <p>Carregando catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Catálogo TELEBOX</h1>
          <p className="text-lg text-muted-foreground">
            Explore mais de {conteudos.length.toLocaleString()} conteúdos disponíveis
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-card rounded-lg p-6 mb-8 shadow-telebox-card">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou grupo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="filme">Filmes</SelectItem>
                <SelectItem value="serie">Séries</SelectItem>
                <SelectItem value="canal">Canais</SelectItem>
              </SelectContent>
            </Select>

            <Select value={generoFilter} onValueChange={setGeneroFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Gênero" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {getGenresFromConteudos().map(genre => (
                  <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={qualidadeFilter} onValueChange={setQualidadeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Qualidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {getQualitiesFromConteudos().map(quality => (
                  <SelectItem key={quality} value={quality}>{quality}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              variant={showFavoritesOnly ? "default" : "outline"}
              className={showFavoritesOnly ? "bg-red-600 hover:bg-red-700" : ""}
            >
              <Heart className={`h-4 w-4 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              Favoritos
            </Button>

            <Button 
              onClick={() => {
                setSearchTerm("");
                setTipoFilter("todos");
                setGeneroFilter("todos");
                setQualidadeFilter("todos");
                setShowFavoritesOnly(false);
              }}
              variant="outline"
            >
              Limpar
            </Button>
          </div>
        </div>

        {/* Visualização de Conteúdos */}
        {tipoFilter === "serie" ? (
          <SeriesHierarchy 
            searchTerm={searchTerm}
            genre={generoFilter !== "todos" ? generoFilter : undefined}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredConteudos.map((conteudo) => {
            // Tratamento especial para séries
            if (conteudo.tipo === 'serie') {
              return (
                <Card 
                  key={conteudo.id}
                  className="cursor-pointer hover:shadow-telebox-hero transition-shadow group"
                  onClick={() => {
                    fetchTMDBData(conteudo);
                    setSelectedSeries(conteudo.serie_nome || conteudo.nome);
                    setSelectedSeriesData(conteudo);
                  }}
                >
                  <div className="relative overflow-hidden rounded-t-lg">
                    <img
                      src={
                        conteudo.tmdb_data?.poster_path 
                          ? `https://image.tmdb.org/t/p/w500${conteudo.tmdb_data.poster_path}`
                          : conteudo.logo || "/placeholder.svg"
                      }
                      alt={conteudo.nome}
                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <Badge variant="secondary" className="bg-purple-600 text-white text-xs">
                        Série
                      </Badge>
                      {conteudo.qualidade && (
                        <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                          {conteudo.qualidade}
                        </Badge>
                      )}
                    </div>
                    {conteudo.tmdb_data?.vote_average && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-yellow-500 text-black text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          {conteudo.tmdb_data.vote_average.toFixed(1)}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-semibold line-clamp-2">
                      {conteudo.serie_nome || conteudo.nome}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {conteudo.grupo}
                      {conteudo.tmdb_data?.release_date && (
                        <span className="block">
                          {new Date(conteudo.tmdb_data.release_date).getFullYear()}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            }

            // Tratamento especial para canais
            if (conteudo.tipo === 'canal') {
              return (
                <Card 
                  key={conteudo.id}
                  className="cursor-pointer hover:shadow-telebox-hero transition-shadow group"
                  onClick={() => {
                    setSelectedChannel(conteudo.canal_nome || conteudo.nome);
                    setSelectedChannelData(conteudo);
                  }}
                >
                  <div className="relative overflow-hidden rounded-t-lg">
                    <img
                      src={conteudo.logo || "/placeholder.svg"}
                      alt={conteudo.nome}
                      className="w-full h-64 object-contain bg-gray-100 group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <Badge variant="secondary" className="bg-red-600 text-white text-xs">
                        Canal
                      </Badge>
                      {conteudo.qualidade && (
                        <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                          {conteudo.qualidade}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-semibold line-clamp-2">
                      {conteudo.canal_nome || conteudo.nome}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {conteudo.grupo}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            }

            return (
              <Dialog key={conteudo.id}>
                <DialogTrigger asChild>
                  <Card 
                    className="cursor-pointer hover:shadow-telebox-hero transition-shadow group"
                    onClick={() => fetchTMDBData(conteudo)}
                  >
                  <div className="relative overflow-hidden rounded-t-lg">
                    <img
                      src={
                        conteudo.tmdb_data?.poster_path 
                          ? `https://image.tmdb.org/t/p/w500${conteudo.tmdb_data.poster_path}`
                          : conteudo.logo || "/placeholder.svg"
                      }
                      alt={conteudo.nome}
                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <Badge variant="secondary" className="bg-black/70 text-white text-xs">
                        {conteudo.tipo}
                      </Badge>
                      {conteudo.qualidade && (
                        <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                          {conteudo.qualidade}
                        </Badge>
                      )}
                    </div>
                    {conteudo.tmdb_data?.vote_average && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-yellow-500 text-black text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          {conteudo.tmdb_data.vote_average.toFixed(1)}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-semibold line-clamp-2">
                      {conteudo.nome}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {conteudo.grupo}
                      {conteudo.tmdb_data?.release_date && (
                        <span className="block">
                          {new Date(conteudo.tmdb_data.release_date).getFullYear()}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </DialogTrigger>

              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl">{conteudo.nome}</DialogTitle>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <img
                      src={
                        conteudo.tmdb_data?.poster_path 
                          ? `https://image.tmdb.org/t/p/w500${conteudo.tmdb_data.poster_path}`
                          : conteudo.logo || "/placeholder.svg"
                      }
                      alt={conteudo.nome}
                      className="w-full h-auto rounded-lg shadow-lg"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    {tmdbLoading[conteudo.id] && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-telebox-blue"></div>
                        <span className="text-sm">Carregando informações...</span>
                      </div>
                    )}

                    {conteudo.tmdb_data?.overview && (
                      <div>
                        <h3 className="font-semibold mb-2">Sinopse</h3>
                        <p className="text-muted-foreground text-sm">{conteudo.tmdb_data.overview}</p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{conteudo.tipo}</Badge>
                      <Badge variant="outline">{conteudo.qualidade}</Badge>
                      {conteudo.tmdb_data?.vote_average && (
                        <Badge variant="outline">
                          <Star className="h-3 w-3 mr-1" />
                          {conteudo.tmdb_data.vote_average.toFixed(1)}
                        </Badge>
                      )}
                      {conteudo.tmdb_data?.runtime && (
                        <Badge variant="outline">
                          <Calendar className="h-3 w-3 mr-1" />
                          {conteudo.tmdb_data.runtime}min
                        </Badge>
                      )}
                    </div>
                    
                    {conteudo.tmdb_data?.genres && conteudo.tmdb_data.genres.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Gêneros</h3>
                        <div className="flex flex-wrap gap-2">
                          {conteudo.tmdb_data.genres.map((genero) => (
                            <Badge key={genero.id} variant="secondary">{genero.name}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {conteudo.tmdb_data?.cast && conteudo.tmdb_data.cast.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Elenco Principal
                        </h3>
                        <div className="space-y-1">
                          {conteudo.tmdb_data.cast.map((actor, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium">{actor.name}</span>
                              {actor.character && (
                                <span className="text-muted-foreground"> como {actor.character}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-3 pt-4">
                      {conteudo.tmdb_data?.trailer_key && (
                        <Button
                          variant="outline"
                          onClick={() => window.open(`https://www.youtube.com/watch?v=${conteudo.tmdb_data?.trailer_key}`, '_blank')}
                          className="w-full"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Ver Trailer
                        </Button>
                      )}
                      
                      <Button
                        variant="hero"
                        onClick={() => redirectToWatch(conteudo)}
                        className="w-full"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Assistir na Plataforma
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            );
          })}
          </div>
        )}

        {/* Modal de Séries */}
        {selectedSeries && (
          <SeriesModal
            isOpen={!!selectedSeries}
            onClose={() => {
              setSelectedSeries(null);
              setSelectedSeriesData(null);
            }}
            serieName={selectedSeries}
            serieData={selectedSeriesData}
          />
        )}

        {/* Modal de Canais */}
        {selectedChannel && (
          <ChannelModal
            isOpen={!!selectedChannel}
            onClose={() => {
              setSelectedChannel(null);
              setSelectedChannelData(null);
            }}
            channelName={selectedChannel}
            channelData={selectedChannelData}
          />
        )}

        {filteredConteudos.length === 0 && (
          <div className="text-center py-12">
            <img 
              src="/lovable-uploads/52a92ba9-cb00-476e-86a7-8019ac8c0c91.png" 
              alt="TELEBOX" 
              className="h-16 w-auto mx-auto mb-4 opacity-50"
            />
            <h3 className="text-xl font-semibold mb-2">Nenhum conteúdo encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros para encontrar o que você procura.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalogo;
