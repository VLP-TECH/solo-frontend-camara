import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard,
  Layers,
  LineChart,
  Map,
  BookOpen,
  Clock,
  FileText,
  MessageSquare,
  LogOut,
  Shield,
  Download,
  GraduationCap,
  TrendingUp,
  UserCog
} from "lucide-react";
import {
  getIndicadoresPorSubdimension,
  getDistribucionPorSubdimension,
  getDatosHistoricosIndicador,
  getSubdimensiones,
  getDimensiones,
  type IndicadorConDatos
} from "@/lib/kpis-data";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { exportIndicadoresToCSV } from "@/lib/csv-export";

const COLORS = ['#0c6c8b', '#3B82F6', '#F97316', '#10B981', '#8B5CF6', '#EF4444'];

const SubdimensionDashboard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { roles } = usePermissions();
  const { isAdmin, profile, loading: profileLoading } = useUserProfile();
  const [searchParams] = useSearchParams();
  const subdimensionNombre = searchParams.get("subdimension") || "";
  const dimensionNombre = searchParams.get("dimension") || "";

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Obtener información de la subdimensión
  const { data: subdimensiones } = useQuery({
    queryKey: ["subdimensiones"],
    queryFn: () => getSubdimensiones(),
  });

  const { data: dimensiones } = useQuery({
    queryKey: ["dimensiones"],
    queryFn: () => getDimensiones(),
  });

  const subdimensionInfo = subdimensiones?.find(sub => sub.nombre === subdimensionNombre);
  const dimensionNombreFinal = dimensionNombre || subdimensionInfo?.nombre_dimension || "";
  const dimensionInfo = dimensiones?.find(dim => dim.nombre === dimensionNombreFinal);

  // Obtener indicadores de la subdimensión
  const { data: indicadores, isLoading } = useQuery({
    queryKey: ["indicadores-subdimension", subdimensionNombre],
    queryFn: () => getIndicadoresPorSubdimension(subdimensionNombre),
    enabled: !!subdimensionNombre,
  });

  // Obtener distribución por subdimensión si tenemos la dimensión
  const { data: distribucion } = useQuery({
    queryKey: ["distribucion-subdimension", dimensionNombreFinal],
    queryFn: () => getDistribucionPorSubdimension(dimensionNombreFinal),
    enabled: !!dimensionNombreFinal,
  });

  // Obtener datos históricos para todos los indicadores
  const { data: historicoData } = useQuery({
    queryKey: ["historico-subdimension", indicadores?.map(i => i.nombre)],
    queryFn: async () => {
      if (!indicadores) return {};
      const data: Record<string, Array<{ periodo: number; valor: number }>> = {};
      await Promise.all(
        indicadores.map(async (ind) => {
          if (ind.ultimoValor !== undefined) {
            const historico = await getDatosHistoricosIndicador(ind.nombre, "Comunitat Valenciana", 10);
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

  // Preparar datos para el gráfico de línea (evolución histórica)
  const lineData: Array<{ periodo: number; [key: string]: number | string }> = [];
  
  if (historicoData && indicadores) {
    const periodos = new Set<number>();
    indicadores.forEach(ind => {
      const historico = historicoData[ind.nombre] || [];
      historico.forEach(d => periodos.add(d.periodo));
    });
    
    Array.from(periodos).sort().forEach(periodo => {
      const punto: { periodo: number; [key: string]: number | string } = { periodo };
      indicadores.forEach(ind => {
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
      exportIndicadoresToCSV(indicadores, `subdimension-${subdimensionNombre}`);
    }
  };

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
      { icon: Layers, label: "Dimensiones", href: "/dimensiones" },
      { icon: LineChart, label: "Todos los Indicadores", href: "/kpis" },
      { icon: Map, label: "Comparación Territorial", href: "/comparacion" },
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

  if (!subdimensionNombre) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Subdimensión no encontrada</h1>
          <Button onClick={() => navigate("/kpis")}>Volver a KPIs</Button>
        </div>
      </div>
    );
  }

  const totalIndicadores = indicadores?.length || 0;
  const pesoDimension = dimensionInfo?.peso || 0;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0c6c8b] text-white flex flex-col">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <img
              src={`${import.meta.env.BASE_URL}brainnova-logo.png`}
              alt="Brainnova"
              className="h-40 w-auto object-contain"
            />
          </div>
          
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
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
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isDisabled
                      ? "text-blue-300 opacity-50 cursor-not-allowed"
                      : "text-blue-100 hover:bg-[#0a5a73]/50"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="mt-auto p-6">
          <a href="https://www.camaravalencia.com" target="_blank" rel="noopener noreferrer" className="block mb-4">
            <img src="/camara-valencia-blanco.png" alt="Cámara Valencia" className="h-40 w-auto object-contain" />
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
              <h2 className="text-lg font-semibold">Plataforma de Economía Digital</h2>
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
            {dimensionInfo && (
              <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                <span className="text-sm font-semibold text-gray-700 px-3 py-2 bg-white rounded-lg border border-gray-200">
                  {dimensionInfo.nombre}
                </span>
                <span className="text-sm text-gray-500">→</span>
                <span className="text-sm font-semibold text-[#0c6c8b] px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  {subdimensionNombre}
                </span>
              </div>
            )}

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
                      {dimensionInfo && (
                        <div className="text-xs text-gray-500">
                          Peso: {pesoDimension}%
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
                          <p className="text-xs text-gray-500">
                            {indicador.subdimension}
                          </p>
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default SubdimensionDashboard;

