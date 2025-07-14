import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Tv, Signal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelName: string;
  channelData: any;
}

interface ChannelVariant {
  id: string;
  nome: string;
  qualidade: string;
  regiao?: string;
  grupo: string;
  url: string;
  logo: string;
}

const ChannelModal = ({ isOpen, onClose, channelName, channelData }: ChannelModalProps) => {
  const [variants, setVariants] = useState<ChannelVariant[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && channelName) {
      loadChannelVariants();
    }
  }, [isOpen, channelName]);

  const loadChannelVariants = async () => {
    setLoading(true);
    try {
      // Buscar todas as variantes do canal
      const { data } = await supabase
        .from('catalogo_m3u_live')
        .select('*')
        .eq('tipo', 'canal')
        .ilike('nome', `%${channelName}%`)
        .eq('ativo', true)
        .order('qualidade', { ascending: false });

      if (data) {
        const channelVariants = data.map(variant => ({
          ...variant,
          regiao: extractRegion(variant.nome)
        }));

        setVariants(channelVariants);
      }
    } catch (error) {
      console.error('Erro ao carregar variantes do canal:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractRegion = (nome: string): string => {
    const regionMatch = nome.match(/\b(BR|SP|RJ|MG|RS|PR|SC|BA|PE|CE|GO|DF|MT|MS|RO|AC|AM|AP|PA|RR|TO|AL|PB|PI|RN|SE|MA|ES)\b/i);
    return regionMatch ? regionMatch[1].toUpperCase() : 'BR';
  };

  const getQualityPriority = (quality: string): number => {
    const priorities: {[key: string]: number} = {
      '4K': 4,
      'FHD': 3,
      'HD': 2,
      'SD': 1
    };
    return priorities[quality] || 0;
  };

  const getFilteredVariants = () => {
    let filtered = variants;
    
    if (selectedQuality !== "all") {
      filtered = filtered.filter(variant => variant.qualidade === selectedQuality);
    }
    
    // Ordenar por qualidade (maior primeiro) e depois por região
    return filtered.sort((a, b) => {
      const qualityDiff = getQualityPriority(b.qualidade) - getQualityPriority(a.qualidade);
      if (qualityDiff !== 0) return qualityDiff;
      return (a.regiao || '').localeCompare(b.regiao || '');
    });
  };

  const getAvailableQualities = () => {
    const qualities = [...new Set(variants.map(v => v.qualidade))];
    return qualities.sort((a, b) => getQualityPriority(b) - getQualityPriority(a));
  };

  const redirectToWatch = (variant: ChannelVariant) => {
    const baseUrl = "https://web.telebox.com.br/w";
    const url = `${baseUrl}/live?search=${encodeURIComponent(variant.nome)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Tv className="h-6 w-6" />
            {channelName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Logo e informações */}
          <div className="space-y-4">
            <img
              src={channelData?.logo || "/placeholder.svg"}
              alt={channelName}
              className="w-full h-auto rounded-lg shadow-lg max-h-48 object-contain bg-gray-100"
            />
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Signal className="h-4 w-4" />
                <span className="font-medium">Variantes Disponíveis:</span>
                <Badge variant="outline">{variants.length}</Badge>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Canal</Badge>
                {channelData?.grupo && <Badge variant="outline">{channelData.grupo}</Badge>}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Qualidades Disponíveis</h3>
              <div className="flex flex-wrap gap-2">
                {getAvailableQualities().map(quality => (
                  <Badge key={quality} variant="secondary">{quality}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Lista de variantes */}
          <div className="md:col-span-2 space-y-4">
            {getAvailableQualities().length > 1 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Filtrar por Qualidade:</label>
                <Select value={selectedQuality} onValueChange={setSelectedQuality}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Qualidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Qualidades</SelectItem>
                    {getAvailableQualities().map(quality => (
                      <SelectItem key={quality} value={quality}>
                        {quality}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold">
                Variantes ({getFilteredVariants().length} disponíveis)
              </h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Carregando variantes...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                  {getFilteredVariants().map((variant) => (
                    <div 
                      key={variant.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {variant.qualidade}
                          </Badge>
                          {variant.regiao && (
                            <Badge variant="secondary" className="text-xs">
                              {variant.regiao}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-sm line-clamp-2">
                          {variant.nome}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {variant.grupo}
                        </p>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => redirectToWatch(variant)}
                        className="ml-3"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Assistir
                      </Button>
                    </div>
                  ))}
                  
                  {getFilteredVariants().length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma variante encontrada para esta qualidade
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

export default ChannelModal;