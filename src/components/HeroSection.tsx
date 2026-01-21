import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Activity, Zap, ArrowRight } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleAccessDashboard = () => {
    // Si está cargando, redirigir a /auth de todas formas para forzar login
    if (loading) {
      navigate('/auth', { replace: true });
      return;
    }
    
    // Verificar explícitamente si hay usuario
    // Si NO hay usuario, SIEMPRE redirigir a /auth
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    
    // Si hay usuario, ir al dashboard
    navigate('/dashboard');
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0c6c8b]">
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Abstract Geometric Shapes */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 border border-slate-500/15 rounded-lg transform rotate-12"></div>
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 border border-slate-400/15 rounded-2xl transform -rotate-12"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-12">
          {/* Logo Section */}
          <div className="space-y-3">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-white rounded-xl shadow-lg"></div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight">
              BRAINNOVA
            </h1>
            <p className="text-lg text-slate-300 font-light">
              COMUNITAT VALENCIANA
            </p>
          </div>

          {/* Main Headline */}
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-4xl mx-auto">
              Plataforma Avanzada de Economía Digital e Innovación
            </h2>
            <p className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto leading-relaxed">
              Conoce, analiza y transforma la economía digital valenciana en tiempo real.
            </p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
            <Card className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300">
              <TrendingUp className="h-10 w-10 text-gray-700 mx-auto mb-4" />
              <h3 className="text-4xl font-bold text-gray-900 mb-2">7</h3>
              <p className="text-gray-600 text-sm font-medium">Dimensiones estratégicas</p>
            </Card>

            <Card className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300">
              <Activity className="h-10 w-10 text-gray-700 mx-auto mb-4" />
              <h3 className="text-4xl font-bold text-gray-900 mb-2">50+</h3>
              <p className="text-gray-600 text-sm font-medium">Indicadores clave</p>
            </Card>

            <Card className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300">
              <Zap className="h-10 w-10 text-gray-700 mx-auto mb-4" />
              <h3 className="text-4xl font-bold text-gray-900 mb-2">2025</h3>
              <p className="text-gray-600 text-sm font-medium">Actualizado Nov 2025</p>
            </Card>
          </div>

          {/* Call to Action Button */}
          <div className="flex flex-col items-center space-y-4 mt-12">
            <Button 
              size="lg" 
              className="bg-white hover:bg-gray-50 text-[#0c6c8b] text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 font-bold"
              onClick={handleAccessDashboard}
            >
              Acceder al Dashboard
              <ArrowRight className="h-5 w-5 text-[#0c6c8b]" />
            </Button>
            <p className="text-slate-400 text-sm">
              Explora datos, dimensiones e informes en profundidad
            </p>
          </div>

          {/* Additional Info */}
          <div className="flex items-center justify-center gap-2 mt-16">
            <div className="w-2 h-2 bg-[#3B82F6] rounded-full"></div>
            <p className="text-slate-400 text-sm">
              Sistema de Indicadores de Transformación Digital
            </p>
          </div>
        </div>
      </div>

      {/* Footer Copyright */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <p className="text-slate-500 text-xs text-center">
          © 2025 BRAINNOVA · Comunitat Valenciana · Plataforma de Economía Digital
        </p>
      </div>
    </section>
  );
};

export default HeroSection;