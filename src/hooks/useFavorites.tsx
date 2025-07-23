import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Favorite {
  id: string;
  content_id: string;
  content_type: string;
  content_name: string;
  created_at: string;
}

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFavorites(data || []);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const isFavorite = (contentId: string, contentType: string) => {
    return favorites.some(fav => 
      fav.content_id === contentId && fav.content_type === contentType
    );
  };

  const getFavoritesByType = (type: string) => {
    return favorites.filter(fav => fav.content_type === type);
  };

  return {
    favorites,
    loading,
    isFavorite,
    getFavoritesByType,
    refresh: loadFavorites
  };
};