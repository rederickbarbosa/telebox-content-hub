
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

interface CatalogCardProps {
  conteudo: {
    id: string;
    nome: string;
    tipo: string;
    grupo: string;
    logo: string;
    qualidade: string;
    tmdb_data?: {
      poster_path?: string;
      vote_average?: number;
      release_date?: string;
    };
  };
  onClick: () => void;
}

const CatalogCard = ({ conteudo, onClick }: CatalogCardProps) => {
  const [imageError, setImageError] = useState(false);

  const posterUrl = conteudo.tmdb_data?.poster_path 
    ? `https://image.tmdb.org/t/p/w500${conteudo.tmdb_data.poster_path}`
    : conteudo.logo;

  return (
    <Card 
      className="cursor-pointer hover:shadow-telebox-hero transition-shadow group"
      onClick={onClick}
    >
      <div className="relative overflow-hidden rounded-t-lg">
        <img
          src={imageError ? "/placeholder.svg" : posterUrl || "/placeholder.svg"}
          alt={conteudo.nome}
          className="w-full h-64 object-cover group-hover:scale-105 transition-transform"
          loading="lazy"
          onError={() => setImageError(true)}
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
        <div className="text-xs text-muted-foreground">
          {conteudo.grupo}
          {conteudo.tmdb_data?.release_date && (
            <span className="block">
              {new Date(conteudo.tmdb_data.release_date).getFullYear()}
            </span>
          )}
        </div>
      </CardHeader>
    </Card>
  );
};

export default CatalogCard;
