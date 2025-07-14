import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Play, Star, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  serieName: string;
  serieData: any;
}

interface Episode {
  id: string;
  nome: string;
  temporada: number;
  episodio: number;
  grupo: string;
  url: string;
  qualidade: string;
}

const SeriesModal = ({ isOpen, onClose, serieName, serieData }: SeriesModalProps) => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [seasons, setSeasons] = useState<number[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && serieName) {
      loadEpisodes();
    }
  }, [isOpen, serieName]);

  const loadEpisodes = async () => {
    setLoading(true);
    try {
      // Buscar todos os episódios da série usando múltiplas estratégias
      let allEpisodes: any[] = [];
      
      // Busca 1: Nome exato com like
      const { data: exactMatch } = await supabase
        .from('catalogo_m3u_live')
        .select('*')
        .eq('tipo', 'serie')
        .ilike('nome', `%${serieName}%`)
        .eq('ativo', true);

      if (exactMatch) {
        allEpisodes = [...allEpisodes, ...exactMatch];
      }

      // Busca 2: Se poucos resultados, tentar variações
      if (allEpisodes.length < 5) {
        const serieWords = serieName.split(' ').filter(word => word.length > 2);
        for (const word of serieWords) {
          const { data: wordMatch } = await supabase
            .from('catalogo_m3u_live')
            .select('*')
            .eq('tipo', 'serie')
            .ilike('nome', `%${word}%`)
            .eq('ativo', true);
          
          if (wordMatch) {
            allEpisodes = [...allEpisodes, ...wordMatch];
          }
        }
      }

      // Remover duplicatas
      const uniqueEpisodes = allEpisodes.filter((episode, index, self) => 
        index === self.findIndex(e => e.id === episode.id)
      );

      if (uniqueEpisodes.length > 0) {
        const episodesWithSeasons = uniqueEpisodes.map(episode => {
          const seasonMatch = episode.nome.match(/S(\d+)E(\d+)|T(\d+)E(\d+)|Temporada\s*(\d+).*Episódio\s*(\d+)/i);
          let temporada = 1;
          let episodio = 1;

          if (seasonMatch) {
            temporada = parseInt(seasonMatch[1] || seasonMatch[3] || seasonMatch[5] || '1');
            episodio = parseInt(seasonMatch[2] || seasonMatch[4] || seasonMatch[6] || '1');
          }

          return {
            ...episode,
            temporada,
            episodio
          };
        }).sort((a, b) => {
          // Ordenar por temporada primeiro, depois por episódio
          if (a.temporada !== b.temporada) {
            return a.temporada - b.temporada;
          }
          return a.episodio - b.episodio;
        });

        setEpisodes(episodesWithSeasons);
        
        // Extrair temporadas únicas
        const uniqueSeasons = [...new Set(episodesWithSeasons.map(ep => ep.temporada))].sort((a, b) => a - b);
        setSeasons(uniqueSeasons);
        
        if (uniqueSeasons.length > 0) {
          setSelectedSeason(uniqueSeasons[0]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar episódios:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEpisodesForSeason = (season: number) => {
    return episodes
      .filter(ep => ep.temporada === season)
      .sort((a, b) => a.episodio - b.episodio);
  };

  const redirectToWatch = (episode: Episode) => {
    const baseUrl = "https://web.telebox.com.br/w";
    const url = `${baseUrl}/tv?search=${encodeURIComponent(episode.nome)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Play className="h-6 w-6" />
            {serieName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Poster e informações */}
          <div className="space-y-4">
            <img
              src={
                serieData?.tmdb_data?.poster_path 
                  ? `https://image.tmdb.org/t/p/w500${serieData.tmdb_data.poster_path}`
                  : serieData?.logo || "/placeholder.svg"
              }
              alt={serieName}
              className="w-full h-auto rounded-lg shadow-lg"
            />
            
            {serieData?.tmdb_data?.overview && (
              <div>
                <h3 className="font-semibold mb-2">Sinopse</h3>
                <p className="text-muted-foreground text-sm">{serieData.tmdb_data.overview}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Série</Badge>
              {serieData?.qualidade && <Badge variant="outline">{serieData.qualidade}</Badge>}
              {serieData?.tmdb_data?.vote_average && (
                <Badge variant="outline">
                  <Star className="h-3 w-3 mr-1" />
                  {serieData.tmdb_data.vote_average.toFixed(1)}
                </Badge>
              )}
            </div>

            {serieData?.tmdb_data?.genres && serieData.tmdb_data.genres.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Gêneros</h3>
                <div className="flex flex-wrap gap-2">
                  {serieData.tmdb_data.genres.map((genero: any) => (
                    <Badge key={genero.id} variant="secondary">{genero.name}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lista de episódios */}
          <div className="md:col-span-2 space-y-4">
            {seasons.length > 1 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Selecionar Temporada:</label>
                <Select value={selectedSeason.toString()} onValueChange={(value) => setSelectedSeason(parseInt(value))}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Temporada" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map(season => (
                      <SelectItem key={season} value={season.toString()}>
                        Temporada {season}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold">
                Temporada {selectedSeason} ({getEpisodesForSeason(selectedSeason).length} episódios)
              </h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Carregando episódios...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                  {getEpisodesForSeason(selectedSeason).map((episode) => (
                    <div 
                      key={episode.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            E{episode.episodio.toString().padStart(2, '0')}
                          </Badge>
                          {episode.qualidade && (
                            <Badge variant="secondary" className="text-xs">
                              {episode.qualidade}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-sm line-clamp-2">
                          {episode.nome}
                        </h4>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => redirectToWatch(episode)}
                        className="ml-3"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Assistir
                      </Button>
                    </div>
                  ))}
                  
                  {getEpisodesForSeason(selectedSeason).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum episódio encontrado para esta temporada
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SeriesModal;