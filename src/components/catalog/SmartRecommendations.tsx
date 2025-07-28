import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Clock, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CatalogModal from './CatalogModal';
import SeriesModal from './SeriesModal';
import ChannelModal from './ChannelModal';

interface RecommendationItem {
  id: string;
  nome: string;
  tipo: string;
  poster_url?: string;
  classificacao?: number;
  ano?: number;
  grupo?: string;
  score: number;
  reason: string;
}

interface SmartRecommendationsProps {
  userId?: string;
  maxItems?: number;
}

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  userId,
  maxItems = 6
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<RecommendationItem | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, [userId]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      
      if (userId) {
        // Recomendações personalizadas para usuários logados
        await loadPersonalizedRecommendations();
      } else {
        // Recomendações gerais para visitantes
        await loadGeneralRecommendations();
      }
    } catch (error) {
      console.error('Erro ao carregar recomendações:', error);
      await loadGeneralRecommendations(); // Fallback
    } finally {
      setLoading(false);
    }
  };

  const loadPersonalizedRecommendations = async () => {
    // Buscar favoritos do usuário
    const { data: favorites } = await supabase
      .from('user_favorites')
      .select('content_type, content_name')
      .eq('user_id', userId)
      .limit(10);

    // Buscar histórico de visualizações
    const { data: history } = await supabase
      .from('user_content_status')
      .select('conteudo_id, status')
      .eq('user_id', userId)
      .limit(20);

    // Analisar preferências por gênero dos favoritos
    const preferredGenres = extractGenresFromFavorites(favorites || []);
    
    // Buscar conteúdo similar
    const { data: catalog } = await supabase
      .from('catalogo_m3u_live')
      .select('*')
      .eq('ativo', true)
      .limit(100);

    if (catalog) {
      const scored = scoreContent(catalog, preferredGenres, favorites || [], history || []);
      setRecommendations(scored.slice(0, maxItems));
    }
  };

  const loadGeneralRecommendations = async () => {
    // Recomendações baseadas em popularidade e qualidade
    const { data: catalog } = await supabase
      .from('catalogo_m3u_live')
      .select('*')
      .eq('ativo', true)
      .not('classificacao', 'is', null)
      .gte('classificacao', 7.0)
      .limit(50);

    if (catalog) {
      const recommendations = catalog
        .map(item => ({
          ...item,
          score: calculateGeneralScore(item),
          reason: getGeneralReason(item)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, maxItems);

      setRecommendations(recommendations);
    }
  };

  const extractGenresFromFavorites = (favorites: any[]) => {
    const genres: { [key: string]: number } = {};
    
    favorites.forEach(fav => {
      // Tentar extrair gênero do nome ou grupo
      const genreGuess = extractGenreFromName(fav.content_name);
      if (genreGuess) {
        genres[genreGuess] = (genres[genreGuess] || 0) + 1;
      }
    });

    return Object.entries(genres)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);
  };

  const extractGenreFromName = (name: string): string | null => {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('ação') || lowerName.includes('action')) return 'Ação';
    if (lowerName.includes('comédia') || lowerName.includes('comedy')) return 'Comédia';
    if (lowerName.includes('drama')) return 'Drama';
    if (lowerName.includes('terror') || lowerName.includes('horror')) return 'Terror';
    if (lowerName.includes('romance')) return 'Romance';
    if (lowerName.includes('ficção') || lowerName.includes('sci-fi')) return 'Ficção Científica';
    if (lowerName.includes('aventura') || lowerName.includes('adventure')) return 'Aventura';
    if (lowerName.includes('suspense') || lowerName.includes('thriller')) return 'Suspense';
    
    return null;
  };

  const scoreContent = (
    catalog: any[], 
    preferredGenres: string[], 
    favorites: any[], 
    history: any[]
  ) => {
    return catalog.map(item => {
      let score = 0;
      let reason = '';

      // Boost por gênero preferido
      const itemGenre = extractGenreFromName(item.nome) || extractGenreFromName(item.grupo || '');
      if (itemGenre && preferredGenres.includes(itemGenre)) {
        score += 5;
        reason = `Baseado no seu interesse em ${itemGenre}`;
      }

      // Boost por classificação alta
      if (item.classificacao && item.classificacao >= 8.0) {
        score += 3;
        reason = reason || 'Altamente avaliado';
      }

      // Boost por ano recente
      if (item.ano && item.ano >= 2020) {
        score += 2;
        reason = reason || 'Lançamento recente';
      }

      // Boost por qualidade HD/4K
      if (item.qualidade && (item.qualidade.includes('HD') || item.qualidade.includes('4K'))) {
        score += 1;
      }

      // Penalizar se já está nos favoritos
      const isFavorite = favorites.some(fav => 
        fav.content_name.toLowerCase() === item.nome.toLowerCase()
      );
      if (isFavorite) {
        score -= 10;
      }

      return {
        ...item,
        score: Math.max(0, score),
        reason: reason || 'Recomendado para você'
      };
    }).filter(item => item.score > 0);
  };

  const calculateGeneralScore = (item: any) => {
    let score = 0;
    
    // Classificação TMDB
    if (item.classificacao) {
      score += item.classificacao;
    }
    
    // Boost para anos recentes
    if (item.ano && item.ano >= 2020) {
      score += 2;
    } else if (item.ano && item.ano >= 2015) {
      score += 1;
    }
    
    // Boost para qualidade HD
    if (item.qualidade && (item.qualidade.includes('HD') || item.qualidade.includes('4K'))) {
      score += 1;
    }
    
    return score;
  };

  const getGeneralReason = (item: any) => {
    if (item.classificacao && item.classificacao >= 8.5) {
      return 'Excelente avaliação';
    } else if (item.ano && item.ano >= 2023) {
      return 'Lançamento recente';
    } else if (item.classificacao && item.classificacao >= 7.5) {
      return 'Bem avaliado';
    }
    return 'Popular no TELEBOX';
  };

  const handleItemClick = (item: RecommendationItem) => {
    setSelectedItem(item);
  };

  const renderModal = () => {
    if (!selectedItem) return null;

    // Simplified recommendation modal - just show basic info
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold">{selectedItem.nome}</h3>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            <p><strong>Tipo:</strong> {selectedItem.tipo}</p>
            {selectedItem.classificacao && (
              <p><strong>Avaliação:</strong> {selectedItem.classificacao.toFixed(1)}/10</p>
            )}
            {selectedItem.ano && (
              <p><strong>Ano:</strong> {selectedItem.ano}</p>
            )}
            {selectedItem.grupo && (
              <p><strong>Categoria:</strong> {selectedItem.grupo}</p>
            )}
            <p><strong>Por que recomendamos:</strong> {selectedItem.reason}</p>
          </div>
          
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setSelectedItem(null)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Fechar
            </button>
            <a
              href={`https://wa.me/5511911837288?text=${encodeURIComponent(`Olá! Quero mais informações sobre ${selectedItem.nome} do TELEBOX.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-center"
            >
              Contratar
            </a>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Recomendações Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-32 rounded-lg mb-2"></div>
                <div className="bg-muted h-4 rounded mb-1"></div>
                <div className="bg-muted h-3 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Recomendações Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhuma recomendação disponível no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {userId ? 'Recomendações para Você' : 'Recomendações em Destaque'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {recommendations.map((item) => (
              <div
                key={item.id}
                className="group cursor-pointer transition-transform hover:scale-105"
                onClick={() => handleItemClick(item)}
              >
                <div className="relative mb-2">
                  {item.poster_url ? (
                    <img
                      src={item.poster_url}
                      alt={item.nome}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                      <span className="text-sm text-center p-2 font-medium">
                        {item.nome}
                      </span>
                    </div>
                  )}
                  
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.tipo}
                    </Badge>
                  </div>
                  
                  {item.classificacao && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="text-xs bg-background/80">
                        <Star className="w-3 h-3 mr-1" />
                        {item.classificacao.toFixed(1)}
                      </Badge>
                    </div>
                  )}
                </div>
                
                <h4 className="font-medium text-sm line-clamp-2 mb-1">
                  {item.nome}
                </h4>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  <span>{item.reason}</span>
                </div>
                
                {item.ano && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{item.ano}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {renderModal()}
    </>
  );
};