import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  user?: any;
}

const Header = ({ user }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    }
  };

  const whatsappTestUrl = "https://wa.me/5511911837288?text=Olá%2C%20gostaria%20de%20fazer%20o%20teste%20grátis%20de%206%20horas%20da%20TELEBOX";
  const whatsappContractUrl = "https://wa.me/5511911837288?text=Olá%2C%20quero%20assinar%20a%20TELEBOX%20e%20contratar%20um%20plano";

  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b border-border/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/52a92ba9-cb00-476e-86a7-8019ac8c0c91.png" 
              alt="TELEBOX" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-foreground hover:text-telebox-blue transition-colors font-medium">
              Início
            </Link>
            <Link to="/catalogo" className="text-foreground hover:text-telebox-blue transition-colors font-medium">
              Catálogo
            </Link>
            <Link to="/programacao" className="text-foreground hover:text-telebox-blue transition-colors font-medium">
              Programação
            </Link>
            <Link to="/aplicativos" className="text-foreground hover:text-telebox-blue transition-colors font-medium">
              Aplicativos
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open(whatsappTestUrl, '_blank')}
            >
              Teste Grátis
            </Button>
            <Button 
              size="sm" 
              variant="whatsapp"
              onClick={() => window.open(whatsappContractUrl, '_blank')}
            >
              Contratar
            </Button>
            {user ? (
              <div className="flex items-center space-x-2">
                <Link to="/conta">
                  <Button size="sm" variant="ghost">
                    Minha Conta
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={handleSignOut}>
                  Sair
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button size="sm" variant="telebox">
                  Entrar
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden flex items-center justify-center w-8 h-8"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/40">
            <nav className="flex flex-col space-y-3">
              <Link to="/" className="text-foreground hover:text-telebox-blue transition-colors font-medium py-2">
                Início
              </Link>
              <Link to="/catalogo" className="text-foreground hover:text-telebox-blue transition-colors font-medium py-2">
                Catálogo
              </Link>
              <Link to="/programacao" className="text-foreground hover:text-telebox-blue transition-colors font-medium py-2">
                Programação
              </Link>
              <Link to="/aplicativos" className="text-foreground hover:text-telebox-blue transition-colors font-medium py-2">
                Aplicativos
              </Link>
              <div className="flex flex-col space-y-2 pt-4">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(whatsappTestUrl, '_blank')}
                >
                  Teste Grátis
                </Button>
                <Button 
                  size="sm" 
                  variant="whatsapp"
                  onClick={() => window.open(whatsappContractUrl, '_blank')}
                >
                  Contratar
                </Button>
                {user ? (
                  <>
                    <Link to="/conta">
                      <Button size="sm" variant="ghost" className="w-full">
                        Minha Conta
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={handleSignOut} className="w-full">
                      Sair
                    </Button>
                  </>
                ) : (
                  <Link to="/auth">
                    <Button size="sm" variant="telebox" className="w-full">
                      Entrar
                    </Button>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;