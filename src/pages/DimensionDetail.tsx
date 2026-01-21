import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  ArrowLeft,
  ArrowRight,
  LogOut,
  Download,
  GraduationCap,
  TrendingUp
} from "lucide-react";
import { 
  getSubdimensionesConScores, 
  getDimensionScore,
  getSubdimensiones,
  getIndicadoresConDatos,
  getDistribucionPorSubdimension,
  getDatosHistoricosIndicador,
  type IndicadorConDatos
} from "@/lib/kpis-data";
import {
  BarChart,
  Bar,
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

// Mapeo de dimensiones con sus iconos y descripciones
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
  const [searchParams] = useSearchParams();
  const dimensionNombre = searchParams.get("dimension") || "";
  
  const [selectedTerritorio, setSelectedTerritorio] = useState("Comunitat Valenciana");
  const [selectedAno, setSelectedAno] = useState("2024");
  const [selectedReferencia, setSelectedReferencia] = useState("Media UE");

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const dimensionInfo = dimensionesInfo[dimensionNombre] || {
    icon: Layers,
    descripcion: "Información detallada de la dimensión."
  };
  const Icon = dimensionInfo.icon;

  // Obtener información de la dimensión desde Supabase
  const { data: dimensiones } = useQuery({
    queryKey: ["dimensiones"],
    queryFn: () => getDimensiones(),
  });

  const dimensionInfoDB = dimensiones?.find(dim => dim.nombre === dimensionNombre);

  // Obtener score global de la dimensión
  const { data: dimensionScore } = useQuery({
    queryKey: ["dimension-score", dimensionNombre, selectedTerritorio, selectedAno],
    queryFn: () => getDimensionScore(dimensionNombre, selectedTerritorio, Number(selectedAno)),
    enabled: !!dimensionNombre,
  });

  // Obtener subdimensiones con scores
  const { data: subdimensiones } = useQuery({
    queryKey: ["subdimensiones-scores", dimensionNombre, selectedTerritorio, selectedAno],
    queryFn: () => getSubdimensionesConScores(dimensionNombre, selectedTerritorio, Number(selectedAno)),
    enabled: !!dimensionNombre,
  });

  // Obtener todos los indicadores de la dimensión
  const { data: indicadores } = useQuery({
    queryKey: ["indicadores-dimension", dimensionNombre],
    queryFn: () => getIndicadoresConDatos(dimensionNombre),
    enabled: !!dimensionNombre,
  });

  // Obtener distribución por subdimensión
  const { data: distribucion } = useQuery({
    queryKey: ["distribucion-dimension", dimensionNombre],
    queryFn: () => getDistribucionPorSubdimension(dimensionNombre),
    enabled: !!dimensionNombre,
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

  // Preparar datos para el gráfico de barras
  const chartData = subdimensiones?.map(sub => ({
    nombre: sub.nombre,
    "Comunitat Valenciana": Math.round(sub.score),
    "Media España": Math.round(sub.espana),
    "Media UE": Math.round(sub.ue),
  })) || [];

  // Preparar datos para el gráfico de pastel
  const pieData = distribucion?.map(sub => ({
    name: sub.nombre,
    value: sub.porcentaje,
    totalIndicadores: sub.totalIndicadores
  })) || [];

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
      exportIndicadoresToCSV(indicadores, `dimension-${dimensionNombre}`);
    }
  };

  const totalIndicadores = indicadores?.length || 0;

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard General", href: "/dashboard" },
    { icon: Layers, label: "Dimensiones", href: "/dimensiones", active: true },
    { icon: LineChart, label: "Todos los Indicadores", href: "/kpis" },
    { icon: Map, label: "Comparación Territorial", href: "/comparacion" },
    { icon: Clock, label: "Evolución Temporal", href: "/evolucion" },
    { icon: FileText, label: "Informes", href: "/informes" },
    { icon: MessageSquare, label: "Encuestas", href: "/encuestas" },
    { icon: BookOpen, label: "Metodología", href: "/metodologia" },
    ...(roles.isAdmin ? [{ icon: Shield, label: "Gestión de Usuarios", href: "/admin-usuarios" }] : []),
  ];

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
              const ItemIcon = item.icon;
              const isActive = item.active;
              return (
                <button
                  key={item.label}
                  onClick={() => item.href && navigate(item.href)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors relative ${
                    isActive
                      ? "bg-[#0a5a73] text-white"
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
            {/* Title Section */}
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-2">
                <LineChart className="h-8 w-8 text-[#0c6c8b]" />
                <h1 className="text-3xl font-bold text-[#0c6c8b]">
                  Dashboard completo de KPIs
                </h1>
              </div>
              <p className="text-lg text-gray-600">
                Sistema de indicadores del ecosistema digital valenciano organizados por dimensiones
              </p>
            </div>

            {/* Dimension Navigation */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              <span className="text-sm font-semibold text-[#0c6c8b] px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                {dimensionNombre}
              </span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                          Peso: {dimensionInfoDB.peso || 0}%
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Indicator Cards */}
              {indicadores?.slice(0, 3).map((indicador, index) => (
                <Card key={indicador.nombre} className="bg-gray-50 border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <TrendingUp className="h-5 w-5 text-[#0c6c8b]" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900 mb-1">
                          {indicador.ultimoValor !== undefined ? indicador.ultimoValor.toFixed(1) : "0"}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                          {indicador.nombre}
                        </p>
                        {indicador.subdimension && (
                          <button
                            onClick={() => navigate(`/kpis/subdimension?subdimension=${encodeURIComponent(indicador.subdimension)}&dimension=${encodeURIComponent(dimensionNombre)}`)}
                            className="text-xs text-[#0c6c8b] hover:text-[#0a5a73] hover:underline cursor-pointer"
                          >
                            {indicador.subdimension}
                          </button>
                        )}
                      </div>
                    </div>
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
                          label={({ name, value }) => `${name}: ${value}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
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

            {/* Detalle de Subdimensiones - Clickable */}
            <div>
              <h2 className="text-2xl font-bold text-[#0c6c8b] mb-6">
                Detalle de Subdimensiones
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subdimensiones?.map((subdimension) => (
                  <Card 
                    key={subdimension.nombre} 
                    className="bg-white border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/kpis/subdimension?subdimension=${encodeURIComponent(subdimension.nombre)}&dimension=${encodeURIComponent(dimensionNombre)}`)}
                  >
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                          {subdimension.nombre}
                        </h3>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-4xl font-bold text-gray-900">
                              {Math.round(subdimension.score)}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">Comunitat Valenciana</div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="text-sm text-gray-600">España: <span className="font-semibold">{Math.round(subdimension.espana)}</span></div>
                            <div className="text-sm text-gray-600">UE: <span className="font-semibold">{Math.round(subdimension.ue)}</span></div>
                          </div>
                        </div>
                        <Progress value={subdimension.score} className="h-2" />
                      </div>
                      <div className="flex items-center justify-end mt-4">
                        <ArrowRight className="h-5 w-5 text-[#0c6c8b]" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Comparativa Regional */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[#0c6c8b]">
                  Comparativa Regional
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="nombre" 
                          angle={-45}
                          textAnchor="end"
                          height={120}
                          interval={0}
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                        />
                        <YAxis 
                          domain={[0, 100]}
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          ticks={[0, 25, 50, 75, 100]}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Comunitat Valenciana" fill="#0c6c8b" />
                        <Bar dataKey="Media España" fill="#3B82F6" />
                        <Bar dataKey="Media UE" fill="#93C5FD" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No hay datos disponibles para mostrar
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DimensionDetail;

