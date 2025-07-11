
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Play, Clock, Users, Globe } from "lucide-react";
import ChannelCarousel from "@/components/home/ChannelCarousel";
import TrendingMovies from "@/components/home/TrendingMovies";
import { supabase } from "@/integrations/supabase/client";

const Home = () => {
  const [backgroundImages, setBackgroundImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [stats, setStats] = useState({ canais: 50000, filmes: 20000, series: 10000 });
  const [settings, setSettings] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    loadBackgroundImages();
    loadRealStats();
    loadHomeSettings();
    loadPlans();
    
    // Trocar imagem de fundo a cada 5 segundos
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => 
        backgroundImages.length > 0 ? (prev + 1) % backgroundImages.length : 0
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  const loadBackgroundImages = async () => {
    try {
      // Buscar filmes e séries brasileiros populares para imagens de fundo
      const { data } = await supabase
        .from('catalogo_m3u_live')
        .select('nome, logo')
        .in('tipo', ['filme', 'serie'])
        .not('logo', 'is', null)
        .limit(10);

      if (data && data.length > 0) {
        const images = data
          .map(item => item.logo)
          .filter(logo => logo && (logo.includes('tmdb.org') || logo.includes('image')));
        
        if (images.length > 0) {
          setBackgroundImages(images);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar imagens de fundo:', error);
    }
  };

  const loadRealStats = async () => {
    try {
      const { data } = await supabase
        .from('catalogo_m3u_live')
        .select('tipo')
        .eq('ativo', true);

      if (data) {
        const canais = data.filter(item => item.tipo === 'canal').length;
        const filmes = data.filter(item => item.tipo === 'filme').length;
        const series = data.filter(item => item.tipo === 'serie').length;
        
        setStats({ canais, filmes, series });
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadHomeSettings = async () => {
    try {
      const { data } = await supabase
        .from('admin_home_settings')
        .select('*')
        .limit(1)
        .single();

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações da home:', error);
    }
  };

  const loadPlans = async () => {
    try {
      const { data } = await supabase
        .from('admin_plans')
        .select('*')
        .eq('is_active', true)
        .order('order_position');

      if (data) {
        setPlans(data);
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Images */}
        {backgroundImages.length > 0 && (
          <div className="absolute inset-0">
            <img
              src={backgroundImages[currentImageIndex]}
              alt="Background"
              className="w-full h-full object-cover opacity-30"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/50"></div>
        
        {/* Hero Background */}
        <div className="relative min-h-[80vh] flex items-center">
          <div className="container mx-auto px-4 py-20">
            <div className="max-w-4xl mx-auto text-center text-white">
              <div className="flex justify-center mb-8">
                <img 
                  src="/lovable-uploads/52a92ba9-cb00-476e-86a7-8019ac8c0c91.png" 
                  alt="TELEBOX" 
                  className="h-16 w-auto"
                />
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                TELEBOX
              </h1>
              
              <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto leading-relaxed">
                {settings?.hero_description ? 
                  settings.hero_description
                    .replace('{canais}', stats.canais.toLocaleString())
                    .replace('{filmes}', stats.filmes.toLocaleString())
                    .replace('{series}', stats.series.toLocaleString())
                  : 
                  `A melhor plataforma de IPTV do Brasil com mais de ${stats.canais.toLocaleString()} canais, ${stats.filmes.toLocaleString()} filmes e ${stats.series.toLocaleString()} séries em alta qualidade`
                }
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <a
                  href={`https://wa.me/5511911837288?text=Olá! Quero contratar o TELEBOX. Preciso de mais informações sobre os planos.`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button 
                    size="lg" 
                    className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-8 py-4 text-lg rounded-full shadow-2xl hover:shadow-yellow-400/25 transition-all duration-300 transform hover:scale-105"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Contratar Agora
                  </Button>
                </a>
                
                <a
                  href={`https://wa.me/5511911837288?text=Olá! Gostaria de testar o TELEBOX gratuitamente.`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-2 border-white text-white hover:bg-white hover:text-black font-bold px-8 py-4 text-lg rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105"
                  >
                    Teste Grátis
                  </Button>
                </a>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="flex flex-col items-center">
                  <Globe className="h-8 w-8 mb-2 text-blue-400" />
                  <span className="text-lg font-bold">{(stats.canais / 1000).toFixed(0)}K+</span>
                  <span className="text-sm text-gray-300">{settings?.stats_canais_label || 'Canais'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <Play className="h-8 w-8 mb-2 text-green-400" />
                  <span className="text-lg font-bold">{(stats.filmes / 1000).toFixed(0)}K+</span>
                  <span className="text-sm text-gray-300">{settings?.stats_filmes_label || 'Filmes'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <Clock className="h-8 w-8 mb-2 text-yellow-400" />
                  <span className="text-lg font-bold">{(stats.series / 1000).toFixed(0)}K+</span>
                  <span className="text-sm text-gray-300">{settings?.stats_series_label || 'Séries'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <Users className="h-8 w-8 mb-2 text-purple-400" />
                  <span className="text-lg font-bold">{settings?.stats_qualidade_label || 'HD/4K'}</span>
                  <span className="text-sm text-gray-300">{settings?.stats_qualidade_descricao || 'Qualidade'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Escolha seu Plano
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Todos os planos incluem acesso completo ao catálogo e apps gratuitos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const isPopular = plan.is_popular;
              
              return (
                <div 
                  key={plan.id}
                  className={`relative rounded-2xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-300 ${
                    isPopular 
                      ? 'bg-gradient-to-br from-blue-600 to-purple-700 text-white' 
                      : 'bg-white border-2 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-yellow-400 text-black font-bold px-4 py-1 text-sm flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Mais Popular
                      </Badge>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h3 className={`text-2xl font-bold mb-4 ${isPopular ? 'text-white' : 'text-gray-800'}`}>
                      {plan.name}
                    </h3>
                    <div className="mb-6">
                      <span className={`text-5xl font-bold ${isPopular ? 'text-white' : 'text-gray-800'}`}>
                        R$ {plan.price.toFixed(0)}
                      </span>
                      <span className={`text-lg ${isPopular ? 'text-white' : 'text-gray-600'}`}>
                        /{plan.duration_months > 1 ? `${plan.duration_months} meses` : 'mês'}
                      </span>
                      {plan.savings && (
                        <div className={`text-sm font-medium mt-2 ${isPopular ? 'text-green-200' : 'text-green-600'}`}>
                          Economize R$ {plan.savings.toFixed(0)}
                        </div>
                      )}
                    </div>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center">
                          <CheckCircle className={`h-5 w-5 mr-3 ${isPopular ? 'text-green-400' : 'text-green-500'}`} />
                          <span className={isPopular ? 'text-white' : 'text-gray-700'}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <a
                      href={`https://wa.me/5511911837288?text=${encodeURIComponent(plan.whatsapp_message || `Olá! Quero contratar o plano ${plan.name}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 text-lg rounded-full">
                        Contratar Agora
                      </Button>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trending Movies */}
      <TrendingMovies />

      {/* Channel Carousel */}
      {settings?.channel_carousel_enabled !== false && <ChannelCarousel />}

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              {settings?.features_title || 'Por que escolher o TELEBOX?'}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {settings?.features_subtitle || 'Tecnologia de ponta e qualidade incomparável'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {settings?.feature_1_title || 'Cobertura Global'}
              </h3>
              <p className="text-gray-600">
                {settings?.feature_1_description || 'Canais de todo o mundo com transmissão em tempo real'}
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {settings?.feature_2_title || 'Qualidade 4K'}
              </h3>
              <p className="text-gray-600">
                {settings?.feature_2_description || 'Transmissão em ultra alta definição sem travamentos'}
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {settings?.feature_3_title || 'Disponibilidade Total'}
              </h3>
              <p className="text-gray-600">
                {settings?.feature_3_description || 'Acesso completo ao catálogo 24 horas por dia'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
