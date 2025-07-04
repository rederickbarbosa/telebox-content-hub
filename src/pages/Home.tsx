
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Play, Clock, Users, Globe } from "lucide-react";
import ChannelCarousel from "@/components/home/ChannelCarousel";

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30"></div>
        
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
                A melhor plataforma de IPTV do Brasil com mais de <strong>50.000 canais</strong>, filmes e séries em <strong>alta qualidade</strong>
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
                  <span className="text-lg font-bold">50K+</span>
                  <span className="text-sm text-gray-300">Canais</span>
                </div>
                <div className="flex flex-col items-center">
                  <Play className="h-8 w-8 mb-2 text-green-400" />
                  <span className="text-lg font-bold">HD/4K</span>
                  <span className="text-sm text-gray-300">Qualidade</span>
                </div>
                <div className="flex flex-col items-center">
                  <Clock className="h-8 w-8 mb-2 text-yellow-400" />
                  <span className="text-lg font-bold">24h</span>
                  <span className="text-sm text-gray-300">Suporte</span>
                </div>
                <div className="flex flex-col items-center">
                  <Users className="h-8 w-8 mb-2 text-purple-400" />
                  <span className="text-lg font-bold">10K+</span>
                  <span className="text-sm text-gray-300">Clientes</span>
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
              Todos os planos incluem acesso completo ao catálogo, suporte 24h e apps gratuitos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Plano 1 Mês - Popular */}
            <div className="relative bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-8 text-white shadow-2xl transform hover:scale-105 transition-all duration-300">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-yellow-400 text-black font-bold px-4 py-1 text-sm flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Mais Popular
                </Badge>
              </div>
              
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">1 Mês</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold">R$ 30</span>
                  <span className="text-lg">/mês</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-400" />
                    <span>Acesso completo</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-400" />
                    <span>Todos os canais e filmes</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-400" />
                    <span>Suporte 24h</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-400" />
                    <span>Apps gratuitos</span>
                  </li>
                </ul>
                <a
                  href={`https://wa.me/5511911837288?text=Olá! Quero contratar o plano de 1 mês por R$ 30,00.`}
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

            {/* Plano 2 Meses */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-200 hover:border-blue-300 transition-all duration-300">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">2 Meses</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-800">R$ 55</span>
                  <span className="text-lg text-gray-600">/2 meses</span>
                  <div className="text-sm text-green-600 font-medium">Economize R$ 5</div>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
                    <span className="text-gray-700">Acesso completo</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
                    <span className="text-gray-700">Todos os canais e filmes</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
                    <span className="text-gray-700">Suporte prioritário</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
                    <span className="text-gray-700">Apps gratuitos</span>
                  </li>
                </ul>
                <a
                  href={`https://wa.me/5511911837288?text=Olá! Quero contratar o plano de 2 meses por R$ 55,00.`}
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

            {/* Plano 3 Meses */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-200 hover:border-blue-300 transition-all duration-300">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">3 Meses</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-800">R$ 80</span>
                  <span className="text-lg text-gray-600">/3 meses</span>
                  <div className="text-sm text-green-600 font-medium">Economize R$ 10</div>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
                    <span className="text-gray-700">Acesso completo</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
                    <span className="text-gray-700">Todos os canais e filmes</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
                    <span className="text-gray-700">Suporte VIP</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
                    <span className="text-gray-700">Apps gratuitos</span>
                  </li>
                </ul>
                <a
                  href={`https://wa.me/5511911837288?text=Olá! Quero contratar o plano de 3 meses por R$ 80,00.`}
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
          </div>
        </div>
      </div>

      {/* Channel Carousel */}
      <ChannelCarousel />

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Por que escolher o TELEBOX?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tecnologia de ponta e qualidade incomparável
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Cobertura Global</h3>
              <p className="text-gray-600">
                Canais de todo o mundo com transmissão em tempo real
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Qualidade 4K</h3>
              <p className="text-gray-600">
                Transmissão em ultra alta definição sem travamentos
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Suporte 24h</h3>
              <p className="text-gray-600">
                Atendimento especializado disponível todos os dias
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
