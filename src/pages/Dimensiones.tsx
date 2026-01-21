import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  LayoutDashboard,
  Layers,
  LineChart,
  Map,
  BookOpen,
  Clock,
  FileText,
  MessageSquare,
  Building2,
  Users,
  Wifi,
  Network,
  Lightbulb,
  Shield,
  Leaf,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  LogOut
} from "lucide-react";
import { getDimensiones, getIndicadoresConDatos, getDimensionScore, type IndicadorConDatos } from "@/lib/kpis-data";

interface DimensionData {
  nombre: string;
  score: number;
  descripcion: string;
  icon: any;
  indicadores: IndicadorConDatos[];
}

const Dimensiones = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { roles } = usePermissions();
  const [selectedTerritorio, setSelectedTerritorio] = useState("Comunitat Valenciana");
  const [selectedAno, setSelectedAno] = useState("2024");
  const [selectedReferencia, setSelectedReferencia] = useState("Media UE");
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(new Set());

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Obtener dimensiones desde Supabase
  const { data: dimensiones } = useQuery({
    queryKey: ["dimensiones"],
    queryFn: getDimensiones,
  });

  // Obtener todos los indicadores
  const { data: indicadores } = useQuery({
    queryKey: ["todos-indicadores"],
    queryFn: () => getIndicadoresConDatos(),
  });

  // Mapeo de iconos y descripciones por nombre de dimensión
  const dimensionesInfo: Record<string, { icon: any; descripcion: string }> = {
    "Transformación Digital Empresarial": {
      icon: Building2,
      descripcion: "Cuantifica el grado de adopción, integración y aprovechamiento de las tecnologías digitales por parte de las empresas."
    },
    "Capital Humano": {
      icon: Users,
      descripcion: "Evalúa las competencias digitales, la capacidad de formación continua y la disponibilidad de talento tecnológico."
    },
    "Infraestructura Digital": {
      icon: Wifi,
      descripcion: "Analiza el grado de desarrollo, cobertura y accesibilidad de las infraestructuras que habilitan la economía digital."
    },
    "Ecosistema y Colaboración": {
      icon: Network,
      descripcion: "Mide la madurez del ecosistema digital regional y la intensidad de las interacciones entre los agentes públicos, privados y tecnológicos."
    },
    "Emprendimiento e Innovación": {
      icon: Lightbulb,
      descripcion: "Mide la capacidad del entorno regional para fomentar el emprendimiento digital y la innovación tecnológica."
    },
    "Servicios Públicos Digitales": {
      icon: Shield,
      descripcion: "Evalúa el nivel de digitalización y calidad de los servicios públicos ofrecidos por la administración regional."
    },
    "Sostenibilidad Digital": {
      icon: Leaf,
      descripcion: "Integra la perspectiva medioambiental en la economía digital, analizando el impacto y las oportunidades de la digitalización verde."
    },
  };

  // Obtener scores de dimensiones
  const { data: dimensionScores } = useQuery({
    queryKey: ["dimension-scores-all"],
    queryFn: async () => {
      if (!dimensiones) return {};
      const scores: Record<string, number> = {};
      await Promise.all(
        dimensiones.map(async (dim) => {
          try {
            const score = await getDimensionScore(dim.nombre, "Comunitat Valenciana", 2024);
            scores[dim.nombre] = score;
          } catch (error) {
            console.error(`Error obteniendo score para ${dim.nombre}:`, error);
            scores[dim.nombre] = 0;
          }
        })
      );
      return scores;
    },
    enabled: !!dimensiones && dimensiones.length > 0,
  });

  // Construir dimensiones con datos desde Supabase
  const dimensionesConIndicadores = dimensiones?.map(dim => {
    const info = dimensionesInfo[dim.nombre] || dimensionesInfo[Object.keys(dimensionesInfo).find(k => k.toLowerCase() === dim.nombre.toLowerCase()) || ""] || {
      icon: Layers,
      descripcion: "Información detallada de la dimensión."
    };
    
    // Buscar indicadores que pertenezcan a esta dimensión
    // Normalizar nombres para comparación (sin acentos, minúsculas)
    const normalize = (str: string) => str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    
    const dimNombreNormalized = normalize(dim.nombre);
    
    const indicadoresDim = indicadores?.filter(ind => {
      if (!ind.dimension) return false;
      const indDimNormalized = normalize(ind.dimension);
      
      // Comparación exacta normalizada
      if (indDimNormalized === dimNombreNormalized) return true;
      
      // Comparación por palabras clave comunes
      const dimKeywords = dimNombreNormalized.split(/\s+/);
      const indKeywords = indDimNormalized.split(/\s+/);
      const commonKeywords = dimKeywords.filter(k => indKeywords.includes(k));
      
      // Si comparten al menos 2 palabras clave importantes, probablemente es la misma dimensión
      if (commonKeywords.length >= 2) return true;
      
      return false;
    }) || [];

    if (indicadoresDim.length === 0 && indicadores && indicadores.length > 0) {
      console.warn(`⚠️ Dimensión "${dim.nombre}" no tiene indicadores asignados. Indicadores disponibles:`, 
        indicadores.map(i => ({ nombre: i.nombre, dimension: i.dimension })).slice(0, 5)
      );
    } else {
      console.log(`✅ Dimensión "${dim.nombre}": ${indicadoresDim.length} indicadores encontrados`);
    }

    return {
      nombre: dim.nombre,
      score: dimensionScores?.[dim.nombre] || 0,
      descripcion: info.descripcion,
      icon: info.icon,
      indicadores: indicadoresDim
    };
  }) || [];

  const toggleDimension = (dimensionNombre: string) => {
    const newExpanded = new Set(expandedDimensions);
    if (newExpanded.has(dimensionNombre)) {
      newExpanded.delete(dimensionNombre);
    } else {
      newExpanded.add(dimensionNombre);
    }
    setExpandedDimensions(newExpanded);
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard General", href: "/dashboard" },
    { icon: Layers, label: "Dimensiones", href: "/dimensiones", active: true },
    { icon: LineChart, label: "Todos los Indicadores", href: "/kpis" },
    { icon: Map, label: "Comparación Territorial", href: "/comparacion" },
    { icon: Clock, label: "Evolución Temporal", href: "/evolucion" },
    { icon: FileText, label: "Informes", href: "/informes" },
    { icon: MessageSquare, label: "Encuestas", href: "/encuestas" },
    { icon: BookOpen, label: "Metodología", href: "/metodologia" },
    { icon: Shield, label: "Gestión de Usuarios", href: "/admin-usuarios", disabled: !roles.isAdmin },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0c6c8b] text-white flex flex-col">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <div className="w-8 h-8 bg-[#0c6c8b] rounded"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold">BRAINNOVA</h1>
              <p className="text-xs text-blue-200">Economía Digital</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.active;
              const isDisabled = item.disabled;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (!isDisabled && item.href) {
                      navigate(item.href);
                    }
                  }}
                  disabled={isDisabled}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors relative ${
                    isActive
                      ? "bg-[#0a5a73] text-white"
                      : isDisabled
                      ? "text-blue-300 opacity-50 cursor-not-allowed"
                      : "text-blue-100 hover:bg-[#0a5a73]/50"
                  }`}
                  style={isActive ? {
                    borderLeft: '4px solid #4FD1C7'
                  } : {}}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-blue-600">
          <p className="text-xs text-blue-200">Versión 2025</p>
          <p className="text-xs text-blue-200">Actualizado Nov 2025</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-blue-100 text-[#0c6c8b] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">BRAINNOVA Economía Digital</h2>
            </div>
            
            <div className="flex items-center space-x-2">
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Salir</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {/* Title Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#0c6c8b] mb-2">
                Dimensiones del Sistema BRAINNOVA
              </h1>
              <p className="text-lg text-[#0c6c8b]">
                Explora las siete dimensiones clave que componen el Índice de economía digital de la Comunitat Valenciana
              </p>
            </div>

            {/* Dimension Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dimensionesConIndicadores.map((dimension) => {
                const Icon = dimension.icon;
                const isExpanded = expandedDimensions.has(dimension.nombre);
                return (
                  <Card key={dimension.nombre} className="bg-white hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <Icon className="h-6 w-6 text-[#0c6c8b]" />
                          </div>
                        </div>
                        {dimension.score > 0 && (
                          <div className="text-right">
                            <div className="text-3xl font-bold text-gray-900">
                              {Math.round(dimension.score)}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {dimension.nombre}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-4 min-h-[40px]">
                        {dimension.descripcion}
                      </p>
                      
                      <div className="mb-4">
                        <Progress value={Math.round(dimension.score || 0)} className="h-2" />
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500">
                          {dimension.indicadores.length} indicadores
                        </span>
                        <button
                          onClick={() => toggleDimension(dimension.nombre)}
                          className="text-[#0c6c8b] hover:text-[#0a5a73] font-medium text-sm flex items-center space-x-1"
                        >
                          <span>{isExpanded ? "Ocultar" : "Ver"} indicadores</span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {/* Lista de indicadores expandible */}
                      {isExpanded && dimension.indicadores.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Indicadores ({dimension.indicadores.length})
                          </h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {dimension.indicadores.map((indicador, idx) => (
                              <div
                                key={idx}
                                className="p-2 bg-gray-50 rounded text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                onClick={() => navigate(`/kpis?search=${encodeURIComponent(indicador.nombre)}`)}
                              >
                                <div className="font-medium">{indicador.nombre}</div>
                                {indicador.subdimension && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {indicador.subdimension}
                                  </div>
                                )}
                                {indicador.ultimoValor !== undefined && (
                                  <div className="text-xs text-[#0c6c8b] mt-1">
                                    Valor: {indicador.ultimoValor.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => navigate(`/dimensiones/detalle?dimension=${encodeURIComponent(dimension.nombre)}`)}
                          className="text-[#0c6c8b] hover:text-[#0a5a73] font-medium text-sm flex items-center space-x-1 w-full justify-end"
                        >
                          <span>Ver detalle completo</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dimensiones;

