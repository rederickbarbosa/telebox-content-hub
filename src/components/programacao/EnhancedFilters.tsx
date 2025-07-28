import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, X, MapPin, Tv, Clock } from 'lucide-react';

interface FilterState {
  estado: string;
  qualidade: string[];
  genero: string;
  search: string;
  showAll: boolean;
}

interface EnhancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableStates: string[];
  availableQualities: string[];
  availableGenres: string[];
}

export const EnhancedFilters: React.FC<EnhancedFiltersProps> = ({
  filters,
  onFiltersChange,
  availableStates,
  availableQualities,
  availableGenres
}) => {
  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleQuality = (quality: string) => {
    const newQualities = filters.qualidade.includes(quality)
      ? filters.qualidade.filter(q => q !== quality)
      : [...filters.qualidade, quality];
    updateFilters({ qualidade: newQualities });
  };

  const clearFilters = () => {
    onFiltersChange({
      estado: '',
      qualidade: [],
      genero: '',
      search: '',
      showAll: false
    });
  };

  const hasActiveFilters = filters.estado || filters.qualidade.length > 0 || 
                          filters.genero || filters.search || filters.showAll;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Filtros da Programação</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="ml-auto text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Busca por programa */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1">
            <Search className="h-4 w-4" />
            Buscar Programa
          </label>
          <Input
            placeholder="Nome do programa..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
          />
        </div>

        {/* Filtro por Estado */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            Estado/Região
          </label>
          <Select value={filters.estado} onValueChange={(value) => updateFilters({ estado: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os estados</SelectItem>
              {availableStates.map(state => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Gênero */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1">
            <Tv className="h-4 w-4" />
            Categoria/Gênero
          </label>
          <Select value={filters.genero} onValueChange={(value) => updateFilters({ genero: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as categorias</SelectItem>
              {availableGenres.map(genre => (
                <SelectItem key={genre} value={genre}>{genre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro Ver Tudo */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Visualização
          </label>
          <Button
            variant={filters.showAll ? "default" : "outline"}
            onClick={() => updateFilters({ showAll: !filters.showAll })}
            className="w-full justify-start"
          >
            {filters.showAll ? 'Mostrar Agrupados' : 'Ver Todos os Canais'}
          </Button>
        </div>
      </div>

      {/* Tags de Qualidade */}
      {availableQualities.length > 0 && (
        <div className="mt-4">
          <label className="text-sm font-medium mb-2 block">Qualidade:</label>
          <div className="flex flex-wrap gap-2">
            {availableQualities.map(quality => {
              const isSelected = filters.qualidade.includes(quality);
              return (
                <Badge
                  key={quality}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleQuality(quality)}
                >
                  {quality}
                  {isSelected && <X className="h-3 w-3 ml-1" />}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumo dos Filtros Ativos */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Filtros ativos: {' '}
            {filters.search && <span className="font-medium">"{filters.search}"</span>}
            {filters.estado && <span className="font-medium">{filters.estado}</span>}
            {filters.genero && <span className="font-medium">{filters.genero}</span>}
            {filters.qualidade.length > 0 && (
              <span className="font-medium">{filters.qualidade.join(', ')}</span>
            )}
            {filters.showAll && <span className="font-medium">Todos os canais</span>}
          </div>
        </div>
      )}
    </div>
  );
};