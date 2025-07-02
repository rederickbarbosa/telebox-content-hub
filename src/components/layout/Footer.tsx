import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <footer className="bg-gradient-dark text-white py-12 mt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo e Descrição */}
          <div className="col-span-1 md:col-span-2">
            <img 
              src="https://i.ibb.co/FxVWqFP/Logo-TBX-Home.png" 
              alt="TELEBOX" 
              className="h-12 w-auto mb-4 filter brightness-0 invert"
            />
            <p className="text-gray-300 mb-4 max-w-md">
              Acesse mais de 200.000 conteúdos dos principais streamings, canais abertos e fechados em uma única plataforma.
            </p>
            <div className="flex space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open("https://wa.me/5511911837288", '_blank')}
                className="border-white text-white hover:bg-white hover:text-black"
              >
                WhatsApp
              </Button>
            </div>
          </div>

          {/* Links Rápidos */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-300 hover:text-white transition-colors">
                  Início
                </a>
              </li>
              <li>
                <a href="/catalogo" className="text-gray-300 hover:text-white transition-colors">
                  Catálogo
                </a>
              </li>
              <li>
                <a href="/programacao" className="text-gray-300 hover:text-white transition-colors">
                  Programação
                </a>
              </li>
              <li>
                <a href="/aplicativos" className="text-gray-300 hover:text-white transition-colors">
                  Aplicativos
                </a>
              </li>
            </ul>
          </div>

          {/* Planos */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Planos</h3>
            <ul className="space-y-2">
              <li className="text-gray-300">1 Mês - R$ 30,00</li>
              <li className="text-gray-300">2 Meses - R$ 55,00</li>
              <li className="text-gray-300">3 Meses - R$ 80,00</li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 TELEBOX. Todos os direitos reservados.
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <DMCADialog />
              <TermsDialog />
              <PrivacyDialog />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

const DMCADialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <button className="text-gray-400 hover:text-white text-sm transition-colors">
        DMCA
      </button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Política DMCA</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p>
          A TELEBOX não armazena, hospeda ou produz qualquer conteúdo audiovisual. 
          Nosso serviço funciona exclusivamente como um agregador de links disponíveis 
          publicamente na internet.
        </p>
        <p>
          Todos os conteúdos são fornecidos através de links externos encontrados 
          publicamente na web. Não somos responsáveis pelo conteúdo disponibilizado 
          através destes links.
        </p>
        <p>
          Se você acredita que algum conteúdo infringe direitos autorais, entre em 
          contato conosco através do WhatsApp para análise e possível remoção.
        </p>
      </div>
    </DialogContent>
  </Dialog>
);

const TermsDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <button className="text-gray-400 hover:text-white text-sm transition-colors">
        Termos
      </button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Termos de Uso</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p>
          Ao utilizar nossos serviços, você concorda com os seguintes termos:
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>O serviço é fornecido "como está", sem garantias</li>
          <li>É proibido o uso comercial ou redistribuição do serviço</li>
          <li>O usuário é responsável pelo uso adequado do conteúdo</li>
          <li>Reservamo-nos o direito de modificar ou descontinuar o serviço</li>
          <li>Problemas técnicos podem ocorrer e serão resolvidos quando possível</li>
        </ul>
      </div>
    </DialogContent>
  </Dialog>
);

const PrivacyDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <button className="text-gray-400 hover:text-white text-sm transition-colors">
        Privacidade
      </button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Política de Privacidade</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p>
          Respeitamos sua privacidade e protegemos seus dados pessoais:
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>Coletamos apenas dados necessários para o funcionamento do serviço</li>
          <li>Não compartilhamos dados pessoais com terceiros</li>
          <li>Dados de navegação podem ser coletados para melhorar a experiência</li>
          <li>Você pode solicitar a exclusão de seus dados a qualquer momento</li>
          <li>Utilizamos cookies para melhorar a funcionalidade do site</li>
        </ul>
      </div>
    </DialogContent>
  </Dialog>
);

export default Footer;