import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Map as MapIcon,
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
  ArrowLeft,
  ArrowRight,
  LogOut,
  Download,
  GraduationCap,
  TrendingUp,
  UserCog,
  Calculator,
  Info
} from "lucide-react";
import { BRAINNOVA_LOGO_SRC, CAMARA_VALENCIA_LOGO_SRC } from "@/lib/logo-assets";
import { 
  getSubdimensionesConScores, 
  getDimensionScore,
  getDimensiones,
  getIndicadoresConDatos,
  getDistribucionPorSubdimension,
  getDatosHistoricosIndicador,
  type IndicadorConDatos
} from "@/lib/kpis-data";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line
} from "recharts";
import { exportIndicadoresToCSV } from "@/lib/csv-export";

const COLORS = ['#0c6c8b', '#3B82F6', '#F97316', '#10B981', '#8B5CF6', '#EF4444'];

// Pesos de importancia según documentación técnica Brainnova Score (Alta=3, Media=2, Baja=1)
const PESO_IMPORTANCIA: Record<string, number> = { Alta: 3, Media: 2, Baja: 1 };

// Mapeo de dimensiones con sus iconos y descripciones (fallback si la BD no tiene descripción)
const dimensionesInfo: Record<string, { icon: any; descripcion: string }> = {
  "Transformación Digital Empresarial": {
    icon: Building2,
    descripcion: "Cuantifica el grado de adopción, integración y aprovechamiento de las tecnologías digitales por parte de las empresas. Incluye digitalización básica, e-commerce, tecnologías avanzadas (big data, IA, cloud, RPA, ciberseguridad) y cultura organizativa digital."
  },
  "Capital Humano": {
    icon: Users,
    descripcion: "Evalúa las competencias digitales, la capacidad de formación continua y la disponibilidad de talento tecnológico. Mide competencias digitales de la población, formación continua y reciclaje profesional, y talento profesional TIC."
  },
  "Infraestructura Digital": {
    icon: Wifi,
    descripcion: "Analiza el grado de desarrollo, cobertura y accesibilidad de las infraestructuras que habilitan la economía digital. Evalúa el acceso a infraestructuras incluyendo cobertura de banda ancha, conectividad 5G, adopción de servicios de alta capacidad y despliegue de nodos de datos Edge."
  },
  "Ecosistema y Colaboración": {
    icon: Network,
    descripcion: "Mide la madurez del ecosistema digital regional y la intensidad de las interacciones entre los agentes públicos, privados y tecnológicos. Evalúa conectividad, colaboración y transferencia, así como el entorno de provisión tecnológica."
  },
  "Emprendimiento e Innovación": {
    icon: Lightbulb,
    descripcion: "Mide la capacidad del entorno regional para fomentar el emprendimiento digital y la innovación tecnológica. Incluye acceso a financiación digital, dinamismo emprendedor, infraestructura de apoyo y políticas públicas de fomento."
  },
  "Servicios Públicos Digitales": {
    icon: Shield,
    descripcion: "Evalúa el nivel de digitalización y calidad de los servicios públicos ofrecidos por la administración regional. Analiza la disponibilidad de servicios públicos digitales y la interacción digital con la administración."
  },
  "Sostenibilidad Digital": {
    icon: Leaf,
    descripcion: "Integra la perspectiva medioambiental en la economía digital, analizando el impacto y las oportunidades de la digitalización verde. Mide economía circular y estrategias verdes, así como eficiencia y huella ambiental."
  },
};

const DimensionDetail = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { roles } = usePermissions();
  const { isAdmin, profile, loading: profileLoading } = useUserProfile();
  const [searchParams] = useSearchParams();
  const dimensionNombre = (searchParams.get("dimension") || "").trim();
  
  const [selectedTerritorio, setSelectedTerritorio] = useState("Comunitat Valenciana");
  const [selectedAno, setSelectedAno] = useState("2024");
  const [selectedReferencia, setSelectedReferencia] = useState("Media UE");

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Obtener información de la dimensión desde Supabase
  const { data: dimensiones } = useQuery({
    queryKey: ["dimensiones"],
    queryFn: getDimensiones,
  });

  // Resolver nombre canónico (insensible a mayúsculas) para que coincida con la BD
  const normalizeDim = (s: string) => (s || "").trim().toLowerCase();
  const dimensionNombreNorm = normalizeDim(dimensionNombre);
  const dimensionInfoDB = dimensiones?.find(dim => normalizeDim(dim.nombre) === dimensionNombreNorm);
  const canonicalDimensionNombre = dimensionInfoDB?.nombre ?? dimensionNombre;

  const dimensionInfoKey = Object.keys(dimensionesInfo).find(k => normalizeDim(k) === dimensionNombreNorm);
  const dimensionInfo = dimensionesInfo[dimensionInfoKey || ""] || {
    icon: Layers,
    descripcion: "Información detallada de la dimensión."
  };
  const Icon = dimensionInfo.icon;

  // Obtener score global de la dimensión (nombre acepta mayúsculas/minúsculas)
  const { data: dimensionScore } = useQuery({
    queryKey: ["dimension-score", canonicalDimensionNombre, selectedTerritorio, selectedAno],
    queryFn: () => getDimensionScore(canonicalDimensionNombre, selectedTerritorio, Number(selectedAno)),
    enabled: !!canonicalDimensionNombre,
  });

  // Obtener subdimensiones con scores
  const { data: subdimensiones } = useQuery({
    queryKey: ["subdimensiones-scores", canonicalDimensionNombre, selectedTerritorio, selectedAno],
    queryFn: () => getSubdimensionesConScores(canonicalDimensionNombre, selectedTerritorio, Number(selectedAno)),
    enabled: !!canonicalDimensionNombre,
  });

  // Obtener todos los indicadores de la dimensión
  const { data: indicadores } = useQuery({
    queryKey: ["indicadores-dimension", canonicalDimensionNombre],
    queryFn: () => getIndicadoresConDatos(canonicalDimensionNombre),
    enabled: !!canonicalDimensionNombre,
  });

  // Obtener distribución por subdimensión
  const { data: distribucion } = useQuery({
    queryKey: ["distribucion-dimension", canonicalDimensionNombre],
    queryFn: () => getDistribucionPorSubdimension(canonicalDimensionNombre),
    enabled: !!canonicalDimensionNombre,
  });

  // Obtener datos históricos para todos los indicadores
  const { data: historicoData } = useQuery({
    queryKey: ["historico-dimension", indicadores?.map(i => i.nombre)],
    queryFn: async () => {
      if (!indicadores) return {};
      const data: Record<string, Array<{ periodo: number; valor: number }>> = {};
      await Promise.all(
        indicadores.slice(0, 5).map(async (ind) => {
          if (ind.ultimoValor !== undefined) {
            const historico = await getDatosHistoricosIndicador(ind.nombre, selectedTerritorio, 10);
            data[ind.nombre] = historico;
          }
        })
      );
      return data;
    },
    enabled: !!indicadores && indicadores.length > 0,
  });

  // Preparar datos para el gráfico de pastel
  const pieData = distribucion?.map(sub => ({
    name: sub.nombre,
    value: sub.porcentaje,
    totalIndicadores: sub.totalIndicadores
  })) || [];

  // Mapa subdimensión -> % de indicadores (el mismo % que sale en la página de subdimensión)
  const porcentajePorSubdimension = useMemo(() => {
    const map = new Map<string, number>();
    (distribucion ?? []).forEach((d) => {
      if (d?.nombre != null && typeof d.porcentaje === "number") {
        map.set(String(d.nombre).trim().toLowerCase(), d.porcentaje);
      }
    });
    return map;
  }, [distribucion]);
  const getPorcentajeIndicadores = (nombreSub: string) => {
    if (nombreSub == null || typeof nombreSub !== "string") return null;
    const key = nombreSub.trim().toLowerCase();
    if (porcentajePorSubdimension.has(key)) return porcentajePorSubdimension.get(key) ?? null;
    return distribucion?.find((d) => d && normalizeDim(d.nombre) === key)?.porcentaje ?? null;
  };

  // Preparar datos para el gráfico de línea (evolución histórica)
  const lineData: Array<{ periodo: number; [key: string]: number | string }> = [];
  
  if (historicoData && indicadores) {
    const periodos = new Set<number>();
    indicadores.slice(0, 5).forEach(ind => {
      const historico = historicoData[ind.nombre] || [];
      historico.forEach(d => periodos.add(d.periodo));
    });
    
    Array.from(periodos).sort().forEach(periodo => {
      const punto: { periodo: number; [key: string]: number | string } = { periodo };
      indicadores.slice(0, 5).forEach(ind => {
        const historico = historicoData[ind.nombre] || [];
        const valor = historico.find(d => d.periodo === periodo);
        if (valor) {
          punto[ind.nombre] = valor.valor;
        }
      });
      lineData.push(punto);
    });
  }

  const handleExportCSV = () => {
    if (indicadores) {
      exportIndicadoresToCSV(indicadores, `dimension-${displayDimensionNombre}`);
    }
  };

  const totalIndicadores = indicadores?.length || 0;

  // Verificar si el usuario es admin o superadmin
  const role = profile?.role?.toLowerCase().trim();
  const profileRoleIsAdmin = role === 'admin' || role === 'superadmin';
  const userIsAdmin = isAdmin || roles.isAdmin || roles.isSuperAdmin || profileRoleIsAdmin;
  
  const menuItems = useMemo(() => {
    const items: Array<{
      icon: any;
      label: string;
      href: string;
      active?: boolean;
      disabled?: boolean;
    }> = [
      { icon: LayoutDashboard, label: "Dashboard General", href: "/dashboard" },
      { icon: Layers, label: "Dimensiones", href: "/dimensiones", active: true },
      { icon: LineChart, label: "Todos los Indicadores", href: "/kpis" },
      { icon: MapIcon, label: "Comparación Territorial", href: "/comparacion" },
      { icon: Clock, label: "Evolución Temporal", href: "/evolucion" },
      { icon: FileText, label: "Informes", href: "/informes" },
      { icon: MessageSquare, label: "Encuestas", href: "/encuestas" },
      { icon: BookOpen, label: "Metodología", href: "/metodologia" },
      { icon: UserCog, label: "Editar usuario", href: "/editar-usuario" },
    ];
    
    // Solo mostrar "Gestión de Usuarios" para admin y superadmin
    if (userIsAdmin) {
      items.push({ icon: Shield, label: "Gestión de Usuarios", href: "/admin-usuarios" });
    }
    
    return items;
  }, [userIsAdmin]);

  if (!dimensionNombre) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Dimensión no encontrada</h1>
          <Button onClick={() => navigate("/dimensiones")}>Volver a Dimensiones</Button>
        </div>
      </div>
    );
  }

  const displayDimensionNombre = canonicalDimensionNombre;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0c6c8b] text-white flex flex-col">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <img
              src={BRAINNOVA_LOGO_SRC}
              alt="Brainnova"
              className="h-40 w-auto object-contain"
            />
          </div>
          
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const ItemIcon = item.icon;
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
                  <ItemIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="mt-auto p-6">
          <a href="https://www.camaravalencia.com" target="_blank" rel="noopener noreferrer" className="block mb-4">
            <img src={CAMARA_VALENCIA_LOGO_SRC} alt="Cámara Valencia" className="h-40 w-auto object-contain" />
          </a>
          <p className="text-xs text-blue-200">Versión 2026</p>
          <p className="text-xs text-blue-200">Actualizado Febrero 2026</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-blue-100 text-[#0c6c8b] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dimensiones")}
                className="text-[#0c6c8b] hover:text-[#0a5a73] font-medium flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>← Volver a Dimensiones</span>
              </button>
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
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Title Section: nombre y descripción desde BD / fallback */}
            <div className="mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[#0c6c8b]/10 rounded-lg">
                    <Icon className="h-8 w-8 text-[#0c6c8b]" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-[#0c6c8b]">
                      {displayDimensionNombre}
                    </h1>
                    {dimensionInfoDB && (
                      <p className="text-sm text-gray-600 mt-1">
                        Peso en el índice global: <span className="font-semibold">{dimensionInfoDB.peso}%</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={selectedTerritorio} onValueChange={setSelectedTerritorio}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Territorio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Comunitat Valenciana">Comunitat Valenciana</SelectItem>
                      <SelectItem value="España">España</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedAno} onValueChange={setSelectedAno}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2023, 2022, 2021].map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-lg text-gray-600 mt-4 max-w-4xl">
                {dimensionInfo.descripcion}
              </p>
            </div>

            {/* Metodología de cálculo (Documentación técnica Brainnova Score) */}
            <Card className="bg-white border-[#0c6c8b]/20 mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl text-[#0c6c8b]">
                  <Calculator className="h-5 w-5" />
                  Metodología de cálculo (Brainnova Score)
                </CardTitle>
                <p className="text-sm text-gray-600">
                  El Brainnova Score es un indicador compuesto (0-100) que evalúa el rendimiento en un contexto dado. Cálculo en 4 etapas:
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">1. Definición del contexto</h4>
                  <p className="text-gray-700">Se seleccionan todos los indicadores disponibles para el contexto (Periodo, País, Sector, Tamaño).</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">2. Normalización dinámica (Min-Max)</h4>
                  <p className="text-gray-700 mb-1">Para cada indicador, puntuación normalizada comparando con el mínimo y máximo global del indicador en el ecosistema (mismo año):</p>
                  <p className="font-mono text-xs bg-gray-100 p-2 rounded text-[#0c6c8b]">
                    Valor Normalizado = (Valor Real − Mínimo Global) / (Máximo Global − Mínimo Global)  →  resultado entre 0 y 1
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">3. Ponderación por importancia (nivel subdimensión)</h4>
                  <p className="text-gray-700 mb-1">Cada indicador tiene importancia Alta, Media o Baja. Pesos: Alta=3, Media=2, Baja=1. Media ponderada en cada subdimensión:</p>
                  <p className="font-mono text-xs bg-gray-100 p-2 rounded text-[#0c6c8b]">
                    Score Subdimensión = Suma(Valor Normalizado × Peso) / Suma(Pesos)
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">4. Agregación (dimensión y global)</h4>
                  <p className="text-gray-700 mb-1">Score de dimensión = promedio simple de los scores de sus subdimensiones. El índice global es la suma ponderada de los scores de las dimensiones según su peso (ej. {dimensionInfoDB?.peso ?? 0}% para esta dimensión).</p>
                  <p className="font-mono text-xs bg-gray-100 p-2 rounded text-[#0c6c8b]">
                    Score Dimensión = Promedio(Scores Subdimensiones)  ·  Brainnova Score = Suma(Score Dimensión × Peso %)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* KPI Cards (datos desde BD) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Score de la dimensión */}
              <Card className="bg-white border-[#0c6c8b]/30">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-[#0c6c8b]" />
                    <span className="text-sm text-gray-600">Score dimensión</span>
                  </div>
                  <div className="text-3xl font-bold text-[#0c6c8b]">
                    {dimensionScore != null ? Math.round(dimensionScore) : "—"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedTerritorio} · {selectedAno} (promedio de subdimensiones)
                  </div>
                </CardContent>
              </Card>
              {/* Total Indicadores Card */}
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <GraduationCap className="h-5 w-5 text-[#0c6c8b]" />
                        <span className="text-sm text-gray-600">Total indicadores</span>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {totalIndicadores}
                      </div>
                      {dimensionInfoDB && (
                        <div className="text-xs text-gray-500">
                          Peso en índice global: {dimensionInfoDB.peso ?? 0}%
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vista previa de indicadores (primeros 2) */}
              {indicadores?.slice(0, 2).map((indicador) => (
                <Card
                  key={indicador.nombre}
                  className="bg-gray-50 border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/kpis?search=${encodeURIComponent(indicador.nombre)}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-[#0c6c8b]" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {indicador.ultimoValor !== undefined ? indicador.ultimoValor.toFixed(1) : "—"}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-1">{indicador.nombre}</p>
                    {indicador.subdimension && (
                      <p className="text-xs text-[#0c6c8b]">{indicador.subdimension}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribución por Subdimensión */}
              <Card className="bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="h-5 w-5 text-[#0c6c8b]" />
                      <CardTitle className="text-xl font-bold text-gray-900">
                        Distribución por subdimensión
                      </CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      className="flex items-center space-x-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Exportar CSV</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend
                          content={({ payload }) => (
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2 w-full">
                              {payload?.map((entry, index) => {
                                const pct = entry.payload?.value ?? pieData[index]?.value;
                                return (
                                  <div
                                    key={`legend-${index}`}
                                    className="flex items-start gap-2 min-w-0 sm:max-w-[45%]"
                                  >
                                    <span
                                      className="inline-block w-3 h-3 rounded-sm flex-shrink-0 mt-0.5"
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-sm text-gray-700 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                      {entry.value}: {pct}%
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No hay datos de distribución disponibles
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Evolución Histórica */}
              <Card className="bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-[#0c6c8b]" />
                      <CardTitle className="text-xl font-bold text-gray-900">
                        Evolución histórica
                      </CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      className="flex items-center space-x-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Exportar CSV</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {lineData.length > 0 && indicadores ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsLineChart data={lineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="periodo" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        {indicadores.slice(0, 5).map((ind, index) => (
                          <Line
                            key={ind.nombre}
                            type="monotone"
                            dataKey={ind.nombre}
                            stroke={COLORS[index % COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            name={ind.nombre.length > 30 ? ind.nombre.substring(0, 30) + "..." : ind.nombre}
                          />
                        ))}
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No hay datos históricos disponibles
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Indicadores de esta dimensión (datos desde BD: importancia, fórmula, fuente) */}
            {indicadores && indicadores.length > 0 && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-[#0c6c8b]">
                    <Info className="h-5 w-5" />
                    Indicadores de esta dimensión ({indicadores.length})
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Importancia usada en el cálculo: Alta (peso 3), Media (peso 2), Baja (peso 1). Datos desde la base de datos.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-3 px-2 font-semibold text-gray-700">Indicador</th>
                          <th className="text-left py-3 px-2 font-semibold text-gray-700">Subdimensión</th>
                          <th className="text-left py-3 px-2 font-semibold text-gray-700">Importancia</th>
                          <th className="text-left py-3 px-2 font-semibold text-gray-700">Último valor</th>
                          <th className="text-left py-3 px-2 font-semibold text-gray-700 hidden lg:table-cell">Fórmula / Fuente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {indicadores.map((ind) => (
                          <tr
                            key={ind.nombre}
                            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                            onClick={() => navigate(`/kpis?search=${encodeURIComponent(ind.nombre)}`)}
                          >
                            <td className="py-3 px-2 font-medium text-gray-900">{ind.nombre}</td>
                            <td className="py-3 px-2 text-gray-700">{ind.subdimension || "—"}</td>
                            <td className="py-3 px-2">
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                ind.importancia === "Alta" ? "bg-emerald-100 text-emerald-800" :
                                ind.importancia === "Media" ? "bg-amber-100 text-amber-800" :
                                "bg-gray-100 text-gray-700"
                              }`}>
                                {ind.importancia || "—"} {ind.importancia ? `(peso ${PESO_IMPORTANCIA[ind.importancia] ?? 1})` : ""}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-gray-700">
                              {ind.ultimoValor !== undefined ? ind.ultimoValor.toFixed(2) : "—"}
                              {ind.ultimoPeriodo != null && ` (${ind.ultimoPeriodo})`}
                            </td>
                            <td className="py-3 px-2 text-gray-600 hidden lg:table-cell max-w-xs truncate" title={[ind.formula, ind.fuente].filter(Boolean).join(" · ")}>
                              {ind.formula ? `Fórmula: ${ind.formula}` : ""}
                              {ind.formula && ind.fuente ? " · " : ""}
                              {ind.fuente ? `Fuente: ${ind.fuente}` : ""}
                              {!ind.formula && !ind.fuente ? "—" : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detalle de Subdimensiones - Clickable */}
            <div>
              <h2 className="text-2xl font-bold text-[#0c6c8b] mb-6">
                Detalle de Subdimensiones
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subdimensiones?.map((subdimension) => {
                  const nombreSub = subdimension?.nombre ?? "";
                  const porcentajeIndicadores = getPorcentajeIndicadores(nombreSub);
                  const scoreNum = Number(subdimension?.score);
                  const tieneScore = !isNaN(scoreNum) && scoreNum > 0;
                  const progressValue = tieneScore ? Math.min(100, Math.max(0, scoreNum)) : (typeof porcentajeIndicadores === "number" && !isNaN(porcentajeIndicadores) ? porcentajeIndicadores : 0);
                  return (
                  <Card 
                    key={nombreSub} 
                    className="bg-white border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/kpis/subdimension?subdimension=${encodeURIComponent(nombreSub)}&dimension=${encodeURIComponent(displayDimensionNombre)}`)}
                  >
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                          {nombreSub}
                        </h3>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-4xl font-bold text-gray-900">
                              {tieneScore ? Math.round(scoreNum) : (porcentajeIndicadores != null ? `${porcentajeIndicadores}%` : "—")}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {tieneScore ? selectedTerritorio : (porcentajeIndicadores != null ? "de los indicadores de la dimensión" : "Sin datos")}
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            {tieneScore && (
                              <>
                                <div className="text-sm text-gray-600">España: <span className="font-semibold">{Math.round(subdimension.espana)}</span></div>
                                <div className="text-sm text-gray-600">UE: <span className="font-semibold">{Math.round(subdimension.ue)}</span></div>
                              </>
                            )}
                            {porcentajeIndicadores != null && (
                              <div className="text-sm text-[#0c6c8b] font-medium">
                                {porcentajeIndicadores}% indicadores
                              </div>
                            )}
                          </div>
                        </div>
                        <Progress value={progressValue} className="h-2" />
                        <div className="text-xs text-gray-500 mt-1">{subdimension.indicadores ?? 0} indicadores</div>
                      </div>
                      <div className="flex items-center justify-end mt-4">
                        <ArrowRight className="h-5 w-5 text-[#0c6c8b]" />
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DimensionDetail;

