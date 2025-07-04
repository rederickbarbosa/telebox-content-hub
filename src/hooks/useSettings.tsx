import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Settings {
  teste_horas: string;
  whatsapp_numero: string;
  plano_destaque: string;
  tmdb_token: string;
  epg_url: string;
  site_titulo: string;
  home_descricao: string;
  instagram_url: string;
  facebook_url: string;
  telegram_url: string;
  site_url: string;
}

export const useSettings = () => {
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('*');
      
      if (data) {
        const settingsObj = data.reduce((acc: any, setting: any) => {
          acc[setting.setting_key] = setting.setting_value;
          return acc;
        }, {});
        setSettings(settingsObj);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const getSetting = (key: keyof Settings, defaultValue: string = '') => {
    return settings[key] || defaultValue;
  };

  const getTestPeriod = () => {
    return getSetting('teste_horas', '6') + ' horas';
  };

  const getWhatsAppNumber = () => {
    return getSetting('whatsapp_numero', '5511911837288');
  };

  const getPlans = () => {
    const destaque = getSetting('plano_destaque', '1');
    return [
      { id: '1', duracao: '1 Mês', preco: 'R$ 30,00', popular: destaque === '1' },
      { id: '2', duracao: '2 Meses', preco: 'R$ 55,00', popular: destaque === '2' },
      { id: '3', duracao: '3 Meses', preco: 'R$ 80,00', popular: destaque === '3' },
    ];
  };

  const buildWhatsAppUrl = (type: 'test' | 'contract', planId?: string) => {
    const number = getWhatsAppNumber();
    const baseUrl = `https://wa.me/${number}?text=`;
    
    if (type === 'test') {
      return baseUrl + encodeURIComponent(`Olá, gostaria de fazer o teste grátis de ${getTestPeriod()} da TELEBOX`);
    } else {
      const plan = getPlans().find(p => p.id === planId);
      const planText = plan ? ` ${plan.duracao} (${plan.preco})` : '';
      return baseUrl + encodeURIComponent(`Olá, quero assinar a TELEBOX e contratar um plano${planText}`);
    }
  };

  return {
    settings,
    loading,
    getSetting,
    getTestPeriod,
    getWhatsAppNumber,
    getPlans,
    buildWhatsAppUrl,
    refresh: loadSettings
  };
};