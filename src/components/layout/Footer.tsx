import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Send, MessageCircle, Clock } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface Settings {
  instagram_url?: string;
  facebook_url?: string;
  telegram_url?: string;
  whatsapp_numero?: string;
}

const Footer = () => {
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

  const socialMediaLinks = [
    { name: 'Instagram', url: settings.instagram_url, icon: Instagram, color: 'text-pink-600 hover:text-pink-700' },
    { name: 'Facebook', url: settings.facebook_url, icon: Facebook, color: 'text-blue-600 hover:text-blue-700' },
    { name: 'Telegram', url: settings.telegram_url, icon: Send, color: 'text-blue-500 hover:text-blue-600' },
  ].filter(link => link.url);

  return (
    <footer className="bg-gradient-dark text-white py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src="/lovable-uploads/f8c39ee0-2f4f-48db-8eec-77de87d513ee.png" 
                alt="TELEBOX" 
                className="h-8 w-auto brightness-110"
              />
              <span className="text-2xl font-bold">TELEBOX</span>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              A melhor plataforma de IPTV do Brasil. Assista seus conteúdos favoritos com qualidade superior e suporte 24 horas.
            </p>
            
            {/* Social Media */}
            {socialMediaLinks.length > 0 && (
              <div className="flex space-x-4">
                {socialMediaLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${social.color} transition-colors p-2 rounded-full hover:bg-white/10`}
                    aria-label={social.name}
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/catalogo" className="text-gray-300 hover:text-white transition-colors">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link to="/programacao" className="text-gray-300 hover:text-white transition-colors">
                  Programação
                </Link>
              </li>
              <li>
                <Link to="/aplicativos" className="text-gray-300 hover:text-white transition-colors">
                  Aplicativos
                </Link>
              </li>
              <li>
                <Link to="/banco" className="text-gray-300 hover:text-white transition-colors">
                  Banco de Séries
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contato</h3>
            <div className="space-y-3">
              <a
                href={`https://wa.me/${settings.whatsapp_numero || '5511911837288'}?text=Olá! Preciso de ajuda com minha conta TELEBOX.`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-white hover:text-green-400 transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-green-400" />
                <span className="text-white hover:text-green-400">Suporte via WhatsApp</span>
              </a>
              
              <div className="flex items-center space-x-2 text-gray-300">
                <Clock className="h-4 w-4" />
                <span>Disponível 24h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-gray-400 text-sm">
                © {new Date().getFullYear()} TELEBOX. Todos os direitos reservados.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Política DMCA
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Termos de Uso
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Privacidade
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
