import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FavoriteButtonProps {
  contentId: string;
  contentType: 'canal' | 'filme' | 'serie';
  contentName: string;
  isFavorite?: boolean;
  onToggle?: (isFavorite: boolean) => void;
}

const FavoriteButton = ({ 
  contentId, 
  contentType, 
  contentName, 
  isFavorite = false,
  onToggle 
}: FavoriteButtonProps) => {
  const [favorite, setFavorite] = useState(isFavorite);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const toggleFavorite = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Login necessário",
          description: "Faça login para favoritar conteúdos.",
          variant: "destructive",
        });
        return;
      }

      if (favorite) {
        // Remover dos favoritos
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', contentId)
          .eq('content_type', contentType);

        if (error) throw error;

        setFavorite(false);
        onToggle?.(false);
        
        toast({
          title: "Removido dos favoritos",
          description: `${contentName} foi removido dos seus favoritos.`,
        });
      } else {
        // Adicionar aos favoritos
        const { error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            content_id: contentId,
            content_type: contentType,
            content_name: contentName
          });

        if (error) throw error;

        setFavorite(true);
        onToggle?.(true);
        
        toast({
          title: "Adicionado aos favoritos",
          description: `${contentName} foi adicionado aos seus favoritos.`,
        });
      }
    } catch (error) {
      console.error('Erro ao alterar favorito:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o favorito.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={toggleFavorite}
      disabled={loading}
      className={`transition-colors ${
        favorite 
          ? 'bg-red-100 text-red-600 border-red-300 hover:bg-red-200' 
          : 'hover:bg-gray-100'
      }`}
    >
      <Heart 
        className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} 
      />
    </Button>
  );
};

export default FavoriteButton;