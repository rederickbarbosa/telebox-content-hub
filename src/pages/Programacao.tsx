import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Tv } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Programacao {
  id: string;
  canal_nome: string;
  programa_nome: string;
  programa_descricao: string;
  inicio: string;
  fim: string;
  categoria: string;
}

const Programacao = () => {
  const [programacao, setProgramacao] = useState<Programacao[]>([]);
  const [filteredProgramacao, setFilteredProgramacao] = useState<Programacao[]>([]);
  const [canalFilter, setCanalFilter] = useState("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgramacao();
    // Atualizar EPG automaticamente
    updateEPG();
  }, []);

  useEffect(() => {
    filterProgramacao();
  }, [programacao, canalFilter]);

  const fetchProgramacao = async () => {
    try {
      const { data, error } = await supabase
        .from('programacao')
        .select('*')
        .gte('fim', new Date().toISOString())
        .order('inicio');

      if (error) throw error;
      setProgramacao(data || []);
    } catch (error) {
      console.error('Erro ao buscar programação:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEPG = async () => {
    try {
      console.log('🔄 Atualizando EPG...');
      const { data, error } = await supabase.functions.invoke('fetch-epg-xmltv');
      
      if (error) {
        console.error('Erro ao atualizar EPG:', error);
        // Se o EPG falhar, criar dados de fallback
        await createFallbackProgramacao();
        toast.warning('EPG temporariamente indisponível. Usando dados de demonstração.');
        return;
      }
      
      console.log('✅ EPG atualizado:', data);
      toast.success('EPG atualizado com sucesso!');
      
      // Recarregar dados após atualização
      fetchProgramacao();
    } catch (error) {
      console.error('Erro ao atualizar EPG:', error);
      // Em caso de erro, criar dados de fallback
      await createFallbackProgramacao();
      toast.warning('EPG temporariamente indisponível. Usando dados de demonstração.');
    }
  };

  const createFallbackProgramacao = async () => {
    const now = new Date();
    const fallbackData = [
      {
        canal_nome: 'Globo',
        programa_nome: 'Jornal Nacional',
        programa_descricao: 'Principal telejornal da TV brasileira',
        inicio: new Date(now.getTime() + 30 * 60000).toISOString(),
        fim: new Date(now.getTime() + 90 * 60000).toISOString(),
        categoria: 'Jornalismo'
      },
      {
        canal_nome: 'SBT',
        programa_nome: 'SBT Brasil',
        programa_descricao: 'Telejornal do SBT',
        inicio: new Date(now.getTime() + 60 * 60000).toISOString(),
        fim: new Date(now.getTime() + 120 * 60000).toISOString(),
        categoria: 'Jornalismo'
      },
      {
        canal_nome: 'Record',
        programa_nome: 'Cidade Alerta',
        programa_descricao: 'Programa jornalístico',
        inicio: new Date(now.getTime() + 90 * 60000).toISOString(),
        fim: new Date(now.getTime() + 150 * 60000).toISOString(),
        categoria: 'Jornalismo'
      },
      {
        canal_nome: 'Band',
        programa_nome: 'Band Notícias',
        programa_descricao: 'Noticiário da Band',
        inicio: new Date(now.getTime() + 120 * 60000).toISOString(),
        fim: new Date(now.getTime() + 180 * 60000).toISOString(),
        categoria: 'Jornalismo'
      }
    ];

    try {
      const { error } = await supabase
        .from('programacao')
        .insert(fallbackData);
      
      if (!error) {
        fetchProgramacao();
      }
    } catch (err) {
      console.error('Erro ao inserir dados de fallback:', err);
    }
  };

  const filterProgramacao = () => {
    let filtered = programacao;

    if (canalFilter !== "todos") {
      filtered = filtered.filter(item => item.canal_nome === canalFilter);
    }

    setFilteredProgramacao(filtered);
  };

  const getCanaisFromProgramacao = () => {
    const canais = programacao.map(item => item.canal_nome);
    return [...new Set(canais)].sort();
  };

  const isCurrentProgram = (inicio: string, fim: string) => {
    const now = new Date();
    const startTime = new Date(inicio);
    const endTime = new Date(fim);
    return now >= startTime && now <= endTime;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const groupProgramsByChannel = () => {
    const grouped: Record<string, Programacao[]> = {};
    filteredProgramacao.forEach(programa => {
      if (!grouped[programa.canal_nome]) {
        grouped[programa.canal_nome] = [];
      }
      grouped[programa.canal_nome].push(programa);
    });
    return grouped;
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
          <p>Carregando programação...</p>
        </div>
      </div>
    );
  }

  const groupedPrograms = groupProgramsByChannel();

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Programação dos Canais</h1>
          <p className="text-lg text-muted-foreground">
            Veja a programação em tempo real dos seus canais favoritos
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-card rounded-lg p-6 mb-8 shadow-telebox-card">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <Tv className="h-5 w-5 text-telebox-blue" />
              <span className="font-medium">Filtrar por canal:</span>
            </div>
            
            <Select value={canalFilter} onValueChange={setCanalFilter}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Selecione um canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os canais</SelectItem>
                {getCanaisFromProgramacao().map(canal => (
                  <SelectItem key={canal} value={canal}>{canal}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={() => setCanalFilter("todos")}
              variant="outline"
            >
              Ver Tudo
            </Button>

            <Button 
              onClick={updateEPG}
              variant="default"
              className="bg-telebox-blue hover:bg-telebox-blue/90"
            >
              Atualizar EPG
            </Button>
          </div>
        </div>

        {/* Grid de Canais e Programação */}
        <div className="space-y-8">
          {Object.entries(groupedPrograms).map(([canalNome, programas]) => (
            <Card key={canalNome} className="shadow-telebox-card">
              <CardHeader className="bg-gradient-hero text-white">
                <CardTitle className="flex items-center gap-3">
                  <Tv className="h-6 w-6" />
                  {canalNome}
                </CardTitle>
                <CardDescription className="text-white/80">
                  {programas.length} programas listados
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="divide-y">
                  {programas.slice(0, 10).map((programa) => (
                    <div 
                      key={programa.id} 
                      className={`p-4 hover:bg-muted/50 transition-colors ${
                        isCurrentProgram(programa.inicio, programa.fim) 
                          ? 'bg-telebox-blue/10 border-l-4 border-l-telebox-blue' 
                          : ''
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center text-center min-w-0">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(programa.inicio)}
                              </div>
                              <div className="flex items-center gap-1 text-sm font-medium">
                                <Clock className="h-3 w-3" />
                                {formatTime(programa.inicio)} - {formatTime(programa.fim)}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg truncate">
                                {programa.programa_nome}
                              </h3>
                              {programa.programa_descricao && (
                                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                                  {programa.programa_descricao}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isCurrentProgram(programa.inicio, programa.fim) && (
                            <Badge variant="destructive" className="bg-red-500">
                              AO VIVO
                            </Badge>
                          )}
                          {programa.categoria && (
                            <Badge variant="secondary">
                              {programa.categoria}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {programas.length > 10 && (
                  <div className="p-4 border-t bg-muted/30">
                    <p className="text-center text-muted-foreground text-sm">
                      + {programas.length - 10} programas adicionais
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {Object.keys(groupedPrograms).length === 0 && (
          <div className="text-center py-12">
            <img 
              src="/lovable-uploads/52a92ba9-cb00-476e-86a7-8019ac8c0c91.png" 
              alt="TELEBOX" 
              className="h-16 w-auto mx-auto mb-4 opacity-50"
            />
            <h3 className="text-xl font-semibold mb-2">Nenhuma programação disponível</h3>
            <p className="text-muted-foreground">
              A programação será atualizada automaticamente em breve.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Programacao;