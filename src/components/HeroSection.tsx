import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Activity, Zap, ArrowRight } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [logoError, setLogoError] = useState(false);

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
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center pb-28">
        <div className="space-y-12">
          {/* Logo + Cámara Valencia (pegado debajo del logo) */}
          <div className="flex flex-col items-center">
            <div className="flex justify-center">
              {logoError ? (
                <div className="w-96 h-96 bg-white rounded-xl shadow-lg" />
              ) : (
                <img
                  src={`${import.meta.env.BASE_URL}brainnova-logo.png`}
                  alt="Brainnova"
                  className="h-96 w-auto max-w-[1200px] object-contain block"
                  onError={() => setLogoError(true)}
                />
              )}
            </div>
            <p className="text-white text-base sm:text-lg font-medium leading-tight -mt-8">
              Cámara Valencia
            </p>
          </div>

          {/* Título y subtítulo separados del bloque logo */}
          <div className="space-y-3 mt-10">
            <h1 className="text-white text-2xl sm:text-3xl md:text-4xl font-bold leading-tight max-w-3xl mx-auto">
              Plataforma Avanzada de Economía Digital e Innovación
            </h1>
            <p className="text-white/95 text-lg sm:text-xl font-medium max-w-2xl mx-auto">
              Conoce, analiza y transforma la economía digital valenciana en tiempo real.
            </p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
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
          <div className="flex flex-col items-center mt-12 pt-4 pb-2">
            <Button 
              size="lg" 
              className="bg-white hover:bg-gray-50 text-[#0c6c8b] text-lg px-10 py-7 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 font-bold"
              onClick={handleAccessDashboard}
            >
              Acceder al Dashboard
              <ArrowRight className="h-5 w-5 text-[#0c6c8b]" />
            </Button>
            <p className="text-white/90 text-sm sm:text-base mt-4">
              Explora datos, dimensiones e informes en profundidad
            </p>
            <p className="text-white/90 text-sm mt-2 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white/80" aria-hidden />
              Sistema de Indicadores de Transformación Digital
            </p>
          </div>
        </div>
      </div>

      {/* Footer: ancho completo para que el logo quede en el margen izquierdo real */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-row items-center justify-between w-full pl-2 pr-4 sm:pl-4 sm:pr-6 py-6 gap-4">
        <a
          href="https://www.camaravalencia.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0"
        >
          {!logoError ? (
            <img
              src="/camara-valencia-blanco.png"
              alt="Cámara València"
              className="h-10 sm:h-12 w-auto object-contain object-left"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="text-white font-serif text-left block">
              <span className="block text-lg sm:text-xl font-bold tracking-tight">Cámara</span>
              <span className="block text-sm sm:text-base font-normal text-white/90">València</span>
            </span>
          )}
        </a>
        <p className="flex-1 text-center text-xs text-white/90">
          © 2026 BRAINNOVA - Cámara Valencia -{" "}
          <a
            href="https://www.camaravalencia.com/politica-de-privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Privacidad
          </a>
          {" · "}
          <a
            href="https://www.camaravalencia.com/aviso-legal"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Términos de uso
          </a>
          {" · "}
          <a
            href="https://www.camaravalencia.com/politica-de-cookies"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Política de cookies
          </a>
        </p>
        <div className="flex-shrink-0 min-w-[5rem]" aria-hidden />
      </div>
    </section>
  );
};

export default HeroSection;