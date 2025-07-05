
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, ExternalLink, Star, Calendar, Users, Clock } from "lucide-react";

interface CatalogModalProps {
  conteudo: {
    id: string;
    nome: string;
    tipo: string;
    grupo: string;
    logo: string;
    qualidade: string;
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
  };
  tmdbLoading: boolean;
  onWatch: () => void;
}

const CatalogModal = ({ conteudo, tmdbLoading, onWatch }: CatalogModalProps) => {
  const posterUrl = conteudo.tmdb_data?.poster_path 
    ? `https://image.tmdb.org/t/p/w500${conteudo.tmdb_data.poster_path}`
    : conteudo.logo || "/placeholder.svg";

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-2xl">{conteudo.nome}</DialogTitle>
      </DialogHeader>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <img
            src={posterUrl}
            alt={conteudo.nome}
            className="w-full h-auto rounded-lg shadow-lg"
          />
        </div>
        
        <div className="space-y-4">
          {tmdbLoading && (
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
                <Clock className="h-3 w-3 mr-1" />
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
                {conteudo.tmdb_data.cast.slice(0, 5).map((actor, index) => (
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
              onClick={onWatch}
              className="w-full"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Assistir na Plataforma
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
};

export default CatalogModal;
