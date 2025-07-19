import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Play, Tv } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Episode {
  id: string;
  nome: string;
  season: number;
  episode: number;
  season_text: string;
  episode_text: string;
  url: string;
  logo?: string;
}

interface Season {
  number: number;
  episodes: Episode[];
}

interface Series {
  name: string;
  seasons: Season[];
  totalEpisodes: number;
  logo?: string;
}

interface SeriesHierarchyProps {
  searchTerm?: string;
  genre?: string;
}

const SeriesHierarchy = ({ searchTerm, genre }: SeriesHierarchyProps) => {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSeries();
  }, [searchTerm, genre]);

  const loadSeries = async () => {
    try {
      setLoading(true);
      
      // Query base
      let query = supabase
        .from('catalogo_m3u_live')
        .select('id, nome, url, logo, grupo')
        .eq('ativo', true)
        .eq('tipo', 'serie');

      // Aplicar filtros
      if (searchTerm) {
        query = query.ilike('nome', `%${searchTerm}%`);
      }
      if (genre) {
        query = query.ilike('grupo', `%${genre}%`);
      }

      const { data, error } = await query.order('nome');
      
      if (error) throw error;

      // Processar dados e agrupar
      const seriesMap = new Map<string, Series>();

      data?.forEach((item) => {
        // Extrair nome da série e informações de temporada/episódio
        const seriesName = item.nome.replace(/\s*(S\d{1,2}E\d{1,3}|Season\s*\d+|Temporada\s*\d+|Ep\s*\d+|Episode\s*\d+|\s*-\s*\d+x\d+).*$/gi, '').trim();
        
        // Extrair temporada e episódio
        const seasonMatch = item.nome.match(/S(\d{1,2})/i);
        const episodeMatch = item.nome.match(/E(\d{1,3})/i);
        
        if (!seasonMatch || !episodeMatch) return;
        
        const seasonNum = parseInt(seasonMatch[1]);
        const episodeNum = parseInt(episodeMatch[1]);
        
        const episode: Episode = {
          id: item.id,
          nome: item.nome,
          season: seasonNum,
          episode: episodeNum,
          season_text: `S${String(seasonNum).padStart(2, '0')}`,
          episode_text: `E${String(episodeNum).padStart(2, '0')}`,
          url: item.url,
          logo: item.logo
        };

        // Organizar por série
        if (!seriesMap.has(seriesName)) {
          seriesMap.set(seriesName, {
            name: seriesName,
            seasons: [],
            totalEpisodes: 0,
            logo: item.logo
          });
        }

        const currentSeries = seriesMap.get(seriesName)!;
        currentSeries.totalEpisodes++;

        // Encontrar ou criar temporada
        let season = currentSeries.seasons.find(s => s.number === seasonNum);
        if (!season) {
          season = { number: seasonNum, episodes: [] };
          currentSeries.seasons.push(season);
        }

        season.episodes.push(episode);
      });

      // Ordenar temporadas e episódios
      const sortedSeries = Array.from(seriesMap.values()).map(series => ({
        ...series,
        seasons: series.seasons
          .sort((a, b) => a.number - b.number)
          .map(season => ({
            ...season,
            episodes: season.episodes.sort((a, b) => a.episode - b.episode)
          }))
      })).sort((a, b) => a.name.localeCompare(b.name));

      setSeries(sortedSeries);
    } catch (error) {
      console.error('Erro ao carregar séries:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSeries = (seriesName: string) => {
    const newExpanded = new Set(expandedSeries);
    if (newExpanded.has(seriesName)) {
      newExpanded.delete(seriesName);
    } else {
      newExpanded.add(seriesName);
    }
    setExpandedSeries(newExpanded);
  };

  const toggleSeason = (seriesName: string, seasonNumber: number) => {
    const key = `${seriesName}-S${seasonNumber}`;
    const newExpanded = new Set(expandedSeasons);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSeasons(newExpanded);
  };

  const handleWatchEpisode = (episode: Episode, seriesName: string) => {
    // Construir URL da plataforma web
    const watchUrl = `https://web.telebox.com.br/w/serie?search=${encodeURIComponent(seriesName)}`;
    window.open(watchUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Tv className="h-8 w-8 mx-auto mb-4 animate-pulse" />
          <p>Carregando séries...</p>
        </div>
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Tv className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma série encontrada</h3>
          <p className="text-muted-foreground">
            Tente ajustar os filtros de busca.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {series.length} série{series.length !== 1 ? 's' : ''} encontrada{series.length !== 1 ? 's' : ''}
        </h2>
        <Badge variant="secondary">
          {series.reduce((total, s) => total + s.totalEpisodes, 0)} episódios
        </Badge>
      </div>

      {series.map((serie) => (
        <Card key={serie.name} className="overflow-hidden">
          <Collapsible 
            open={expandedSeries.has(serie.name)}
            onOpenChange={() => toggleSeries(serie.name)}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {serie.logo && (
                      <img 
                        src={serie.logo} 
                        alt={serie.name}
                        className="w-12 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <CardTitle className="text-left">{serie.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">
                          {serie.seasons.length} temporada{serie.seasons.length !== 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="secondary">
                          {serie.totalEpisodes} episódio{serie.totalEpisodes !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {expandedSeries.has(serie.name) ? 
                    <ChevronDown className="h-5 w-5" /> : 
                    <ChevronRight className="h-5 w-5" />
                  }
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {serie.seasons.map((season) => (
                    <div key={season.number} className="border rounded-lg">
                      <Collapsible
                        open={expandedSeasons.has(`${serie.name}-S${season.number}`)}
                        onOpenChange={() => toggleSeason(serie.name, season.number)}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                Temporada {season.number}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {season.episodes.length} episódio{season.episodes.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            {expandedSeasons.has(`${serie.name}-S${season.number}`) ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="px-3 pb-3 space-y-2">
                            {season.episodes.map((episode) => (
                              <div key={episode.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {episode.season_text}{episode.episode_text}
                                  </Badge>
                                  <span className="text-sm truncate">
                                    {episode.nome.replace(serie.name, '').replace(/S\d{1,2}E\d{1,3}/gi, '').trim()}
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleWatchEpisode(episode, serie.name)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
};

export default SeriesHierarchy;