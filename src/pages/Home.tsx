import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "@/components/ui/check-circle";
import { Instagram, Facebook, Send, MessageCircle, Clock } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import ChannelCarousel from "@/components/home/ChannelCarousel";

interface Settings {
  teste_horas?: string;
  whatsapp_numero?: string;
  plano_destaque?: string;
  instagram_url?: string;
  facebook_url?: string;
  telegram_url?: string;
}

const Home = () => {
  const [settings, setSettings] = useState<Settings>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('admin_settings')
      .select('*');
    
    if (data) {
      const settingsObj = data.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});
      setSettings(settingsObj);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0 bg-gradient-hero" />
        
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
              A melhor experiência em <span className="text-yellow-400">IPTV</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-300 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Assista seus canais, filmes e séries favoritos em qualquer lugar
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <Button 
                variant="hero" 
                size="xl" 
                className="w-full sm:w-auto"
                onClick={() => window.open(`https://wa.me/${settings.whatsapp_numero || '5511911837288'}?text=Olá! Gostaria de fazer um teste grátis de ${settings.teste_horas || '6'} horas.`, '_blank')}
              >
                🎯 Teste Grátis {settings.teste_horas || '6'}h
              </Button>
              <Button 
                variant="outline" 
                size="xl" 
                className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-300 text-black border-yellow-400 hover:border-yellow-300"
                onClick={() => window.open(`https://wa.me/${settings.whatsapp_numero || '5511911837288'}?text=Olá! Quero contratar o plano mensal por R$ 30,00.`, '_blank')}
              >
                💎 Contratar Agora
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Plan Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Escolha seu plano
            </h2>
            <p className="text-xl text-gray-600">
              Preços especiais para você começar hoje mesmo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Plan 1 Month - Popular */}
            <div className="relative bg-white rounded-2xl shadow-telebox-card p-8 border-2 border-telebox-blue">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-telebox-blue text-white px-4 py-2 rounded-full text-sm font-semibold">
                  🔥 POPULAR
                </span>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">1 Mês</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-telebox-blue">R$ 30</span>
                  <span className="text-gray-600">/mês</span>
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    Mais de 200.000 conteúdos
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    Canais em HD, FHD e 4K
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    Filmes e séries atualizados
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    Suporte 24h via WhatsApp
                  </li>
                </ul>
                <Button 
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-semibold"
                  onClick={() => window.open(`https://wa.me/${settings.whatsapp_numero || '5511911837288'}?text=Olá! Quero contratar o plano de 1 mês por R$ 30,00.`, '_blank')}
                >
                  Contratar Agora
                </Button>
              </div>
            </div>

            {/* Plan 2 Months */}
            <div className="bg-white rounded-2xl shadow-telebox-card p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">2 Meses</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-telebox-blue">R$ 55</span>
                  <span className="text-gray-600">/2 meses</span>
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    Mais de 200.000 conteúdos
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    Canais em HD, FHD e 4K
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    Filmes e séries atualizados
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    Suporte 24h via WhatsApp
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open(`https://wa.me/${settings.whatsapp_numero || '5511911837288'}?text=Olá! Quero contratar o plano de 2 meses por R$ 55,00.`, '_blank')}
                >
                  Contratar
                </Button>
              </div>
            </div>

            {/* Plan 3 Months */}
            <div className="bg-white rounded-2xl shadow-telebox-card p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">3 Meses</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-telebox-blue">R$ 80</span>
                  <span className="text-gray-600">/3 meses</span>
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    Mais de 200.000 conteúdos
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    Canais em HD, FHD e 4K
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    Filmes e séries atualizados
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    Suporte 24h via WhatsApp
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open(`https://wa.me/${settings.whatsapp_numero || '5511911837288'}?text=Olá! Quero contratar o plano de 3 meses por R$ 80,00.`, '_blank')}
                >
                  Contratar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Channel Carousel */}
      <ChannelCarousel />

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Recursos Incríveis
            </h2>
            <p className="text-xl text-gray-600">
              Aproveite ao máximo sua experiência com a TELEBOX
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="flex items-center justify-center h-16 w-16 mx-auto mb-4 bg-telebox-blue rounded-full text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play-circle"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Conteúdo Ilimitado
              </h3>
              <p className="text-gray-600">
                Assista filmes, séries e canais ao vivo sem restrições.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="flex items-center justify-center h-16 w-16 mx-auto mb-4 bg-telebox-blue rounded-full text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tv-2"><rect width="20" height="18" x="2" y="3" rx="2" ry="2"/><path d="M17 21H7"/></svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Qualidade Premium
              </h3>
              <p className="text-gray-600">
                Desfrute de imagem em HD, FHD e 4K para uma experiência imersiva.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="flex items-center justify-center h-16 w-16 mx-auto mb-4 bg-telebox-blue rounded-full text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-headset"><path d="M3 18v-3a9 9 0 0 1 18 0v3"/><path d="M19 6v-1a9 9 0 0 0-18 0v1"/><path d="M2 15h1"/><path d="M22 15h-1"/><path d="M2 9h1"/><path d="M22 9h-1"/><path d="M8 21h8"/></svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Suporte 24 Horas
              </h3>
              <p className="text-gray-600">
                Nossa equipe está sempre pronta para ajudar você.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Apps Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Aplicativos Compatíveis
            </h2>
            <p className="text-xl text-gray-600">
              Use a TELEBOX em seus dispositivos favoritos
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {/* App 1 */}
            <div className="text-center">
              <img
                src="https://logos-download.com/wp-content/uploads/2016/11/Android_logo_svg-700x212.png"
                alt="Android"
                className="h-12 w-auto mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">Android</h3>
              <p className="text-gray-600">
                Disponível para smartphones e tablets Android.
              </p>
            </div>

            {/* App 2 */}
            <div className="text-center">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/1667px-Apple_logo_black.svg.png"
                alt="iOS"
                className="h-12 w-auto mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">iOS</h3>
              <p className="text-gray-600">
                Aproveite no seu iPhone e iPad.
              </p>
            </div>

            {/* App 3 */}
            <div className="text-center">
              <img
                src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/353_Windows_logo-512.png"
                alt="Windows"
                className="h-12 w-auto mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">Windows</h3>
              <p className="text-gray-600">
                Assista no seu PC com Windows.
              </p>
            </div>

            {/* App 4 */}
            <div className="text-center">
              <img
                src="https://logodownload.org/wp-content/uploads/2017/04/samsung-logo-5.png"
                alt="Samsung TV"
                className="h-12 w-auto mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">Samsung TV</h3>
              <p className="text-gray-600">
                Aplicativo disponível para Smart TVs Samsung.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
