import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Menu, X, BarChart3, FileText, MessageSquare, Database, LogOut, Shield, TrendingUp, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

const NavigationHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { roles } = usePermissions();
  const navigate = useNavigate();

  const menuItems = [
    { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
    { icon: FileText, label: "Informes", href: "#reports" },
    { icon: MessageSquare, label: "Encuestas", href: "/encuestas" },
    { icon: Database, label: "Datos Abiertos", href: "/datos-abiertos" },
    { icon: TrendingUp, label: "Tendencias", href: "/tendencias" },
    { icon: Target, label: "Brainnova score", href: "/brainnova-score" },
    ...(roles.isAdmin ? [{ icon: Shield, label: "Administración", href: "/config" }] : []),
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente"
      });
      // Force complete page reload to clear all state
      window.location.replace('/');
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar sesión",
        variant: "destructive"
      });
    }
  };

  const handleAuthAction = () => {
    if (user) {
      handleSignOut();
    } else {
      navigate('/auth');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-foreground">Brainnova</h1>
              <p className="text-sm text-muted-foreground">Ecosistema de Innovación</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {menuItems.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 hover:bg-accent/10"
                onClick={() => item.href.startsWith('/') ? navigate(item.href) : window.location.href = item.href}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {user && (
              <span className="text-sm text-muted-foreground">
                Hola, {user.user_metadata?.first_name || user.email}
              </span>
            )}
            {roles.isAdmin && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/admin-usuarios')}
                className="flex items-center space-x-2"
              >
                <Shield className="h-4 w-4" />
                <span>Gestión de Usuarios</span>
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/encuestas')}
            >
              Participar
            </Button>
            <Button 
              variant={user ? "destructive" : "default"} 
              size="sm"
              onClick={handleAuthAction}
              className="flex items-center space-x-2"
            >
              {user ? <LogOut className="h-4 w-4" /> : null}
              <span>{user ? "Cerrar Sesión" : "Acceder"}</span>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border/50">
          <Card className="m-4 p-4 space-y-2">
            {menuItems.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start space-x-2"
                onClick={() => {
                  if (item.href.startsWith('/')) {
                    navigate(item.href);
                  } else {
                    window.location.href = item.href;
                  }
                  setIsMenuOpen(false);
                }}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            ))}
            <div className="pt-2 space-y-2 border-t border-border">
              {user && (
                <div className="text-sm text-muted-foreground px-3 py-2">
                  Hola, {user.user_metadata?.first_name || user.email}
                </div>
              )}
              {roles.isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full flex items-center space-x-2"
                  onClick={() => {
                    navigate('/admin-usuarios');
                    setIsMenuOpen(false);
                  }}
                >
                  <Shield className="h-4 w-4" />
                  <span>Gestión de Usuarios</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  navigate('/encuestas');
                  setIsMenuOpen(false);
                }}
              >
                Participar
              </Button>
              <Button 
                variant={user ? "destructive" : "default"} 
                size="sm" 
                className="w-full flex items-center space-x-2"
                onClick={handleAuthAction}
              >
                {user ? <LogOut className="h-4 w-4" /> : null}
                <span>{user ? "Cerrar Sesión" : "Acceder"}</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </header>
  );
};

export default NavigationHeader;