import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Play, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Conteudo {
  id: string;
  nome: string;
  tipo: string;
  generos: string[];
  ano: number;
  poster_url: string;
  backdrop_url: string;
  descricao: string;
  classificacao: number;
  tmdb_id: number;
  trailer_url: string;
}

const Catalogo = () => {
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [filteredConteudos, setFilteredConteudos] = useState<Conteudo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [generoFilter, setGeneroFilter] = useState("todos");
  const [anoFilter, setAnoFilter] = useState("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConteudos();
  }, []);

  useEffect(() => {
    filterConteudos();
  }, [conteudos, searchTerm, tipoFilter, generoFilter, anoFilter]);

  const fetchConteudos = async () => {
    try {
      // Buscar do novo catálogo live primeiro, depois dos conteúdos enriquecidos
      const [catalogoResponse, conteudosResponse] = await Promise.all([
        supabase.from('catalogo_m3u_live').select('*').eq('ativo', true),
        supabase.from('conteudos').select('*').eq('disponivel', true)
      ]);

      let allContent = [];

      // Usar dados do catálogo live (nova tabela)
      if (catalogoResponse.data) {
        const catalogoContent = catalogoResponse.data.map(item => ({
          id: item.id,
          nome: item.nome,
          tipo: item.tipo,
          generos: item.grupo ? [item.grupo] : [],
          ano: item.ano || null,
          poster_url: item.poster_url || item.logo || '',
          backdrop_url: item.backdrop_url || '',
          descricao: item.descricao || '',
          classificacao: item.classificacao || 0,
          tmdb_id: item.tmdb_id || 0,
          trailer_url: '',
          source: 'catalogo_m3u_live'
        }));
        allContent = [...allContent, ...catalogoContent];
      }

      // Processar conteúdos enriquecidos
      if (conteudosResponse.data) {
        const enrichedContent = conteudosResponse.data.map(item => ({
          ...item,
          source: 'conteudos'
        }));
        allContent = [...allContent, ...enrichedContent];
      }

      // Remover duplicatas baseado no nome e priorizar conteúdos enriquecidos
      const uniqueContent = allContent.filter((item, index, self) => {
        const duplicateIndex = self.findIndex(c => 
          c.nome.toLowerCase() === item.nome.toLowerCase() && c.tipo === item.tipo
        );
        // Se é duplicata, manter apenas se for de fonte enriquecida ou se for o primeiro
        if (duplicateIndex !== index) {
          return item.source === 'conteudos' && self[duplicateIndex].source !== 'conteudos';
        }
        return true;
      });

      setConteudos(uniqueContent);
    } catch (error) {
      console.error('Erro ao buscar conteúdos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterConteudos = () => {
    let filtered = conteudos;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (tipoFilter !== "todos") {
      filtered = filtered.filter(item => item.tipo === tipoFilter);
    }

    if (generoFilter !== "todos") {
      filtered = filtered.filter(item =>
        item.generos?.includes(generoFilter)
      );
    }

    if (anoFilter !== "todos") {
      filtered = filtered.filter(item => item.ano?.toString() === anoFilter);
    }

    setFilteredConteudos(filtered);
  };

  const redirectToWatch = (conteudo: any) => {
    const baseUrl = "https://web.telebox.com.br/w";
    const type = conteudo.tipo === "filme" ? "movie" : conteudo.tipo === "serie" ? "tv" : "live";
    const url = `${baseUrl}/${type}?search=${encodeURIComponent(conteudo.nome)}`;
    window.open(url, '_blank');
  };

  const getGenresFromConteudos = () => {
    const allGenres = conteudos.flatMap(item => item.generos || []);
    return [...new Set(allGenres)].sort();
  };

  const getYearsFromConteudos = () => {
    const years = conteudos.map(item => item.ano).filter(Boolean);
    return [...new Set(years)].sort((a, b) => b - a);
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
            Explore mais de {conteudos.length} conteúdos disponíveis
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-card rounded-lg p-6 mb-8 shadow-telebox-card">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
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
                <SelectItem value="todos">Todos os tipos</SelectItem>
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
                <SelectItem value="todos">Todos os gêneros</SelectItem>
                {getGenresFromConteudos().map(genre => (
                  <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={anoFilter} onValueChange={setAnoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os anos</SelectItem>
                {getYearsFromConteudos().map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={() => {
                setSearchTerm("");
                setTipoFilter("todos");
                setGeneroFilter("todos");
                setAnoFilter("todos");
              }}
              variant="outline"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Grid de Conteúdos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredConteudos.map((conteudo) => (
            <Dialog key={conteudo.id}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-telebox-hero transition-shadow group">
                  <div className="relative overflow-hidden rounded-t-lg">
                    <img
                      src={conteudo.poster_url || "/placeholder.svg"}
                      alt={conteudo.nome}
                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-black/70 text-white">
                        {conteudo.tipo}
                      </Badge>
                    </div>
                    {conteudo.classificacao && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-yellow-500 text-black">
                          ⭐ {conteudo.classificacao.toFixed(1)}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-semibold line-clamp-2">
                      {conteudo.nome}
                    </CardTitle>
                    {conteudo.ano && (
                      <CardDescription className="text-xs">
                        {conteudo.ano}
                      </CardDescription>
                    )}
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
                      src={conteudo.poster_url || "/placeholder.svg"}
                      alt={conteudo.nome}
                      className="w-full h-auto rounded-lg shadow-lg"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    {conteudo.descricao && (
                      <div>
                        <h3 className="font-semibold mb-2">Sinopse</h3>
                        <p className="text-muted-foreground">{conteudo.descricao}</p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{conteudo.tipo}</Badge>
                      {conteudo.ano && <Badge variant="outline">{conteudo.ano}</Badge>}
                      {conteudo.classificacao && (
                        <Badge variant="outline">⭐ {conteudo.classificacao.toFixed(1)}</Badge>
                      )}
                    </div>
                    
                    {conteudo.generos && conteudo.generos.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Gêneros</h3>
                        <div className="flex flex-wrap gap-2">
                          {conteudo.generos.map((genero, index) => (
                            <Badge key={index} variant="secondary">{genero}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-3 pt-4">
                      {conteudo.trailer_url && (
                        <Button
                          variant="outline"
                          onClick={() => window.open(conteudo.trailer_url, '_blank')}
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
          ))}
        </div>

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