import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  Download,
  TrendingUp,
  ArrowRight,
  Loader2,
  MessageSquare,
  LogOut,
  Shield
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";
import {
  getDimensiones,
  getIndicadoresConDatos,
  getDatosHistoricosIndicador,
  type IndicadorConDatos,
} from "@/lib/kpis-data";
import { exportIndicadoresToCSV } from "@/lib/csv-export";

const KPIsDashboard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { roles } = usePermissions();
  const [selectedTerritorio, setSelectedTerritorio] = useState("Comunitat Valenciana");
  const [selectedAno, setSelectedAno] = useState("2024");
  const [selectedReferencia, setSelectedReferencia] = useState("Media UE");

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDimension, setSelectedDimension] = useState("Todas las dimensiones");

  // Obtener dimensiones
  const { data: dimensiones } = useQuery({
    queryKey: ["dimensiones"],
    queryFn: getDimensiones,
  });

  // Obtener todos los indicadores
  const { data: indicadores, isLoading } = useQuery({
    queryKey: ["todos-indicadores"],
    queryFn: () => getIndicadoresConDatos(),
  });

  // Filtrar indicadores
  const filteredIndicadores = indicadores?.filter((ind) => {
    const matchesSearch = !searchQuery || 
      ind.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDimension = selectedDimension === "Todas las dimensiones" || 
      ind.dimension === selectedDimension;
    
    return matchesSearch && matchesDimension;
  })
  // Ordenar: primero los activos (con datos), luego los inactivos
  .sort((a, b) => {
    const aActivo = a.activo || a.ultimoValor !== undefined;
    const bActivo = b.activo || b.ultimoValor !== undefined;
    if (aActivo && !bActivo) return -1; // a activo, b no -> a primero
    if (!aActivo && bActivo) return 1;  // a no activo, b sí -> b primero
    return 0; // ambos activos o inactivos -> mantener orden original
  }) || [];

  // Obtener datos históricos para gráficos de evolución
  const { data: historicoData } = useQuery({
    queryKey: ["historico-indicadores", filteredIndicadores?.map(i => i.nombre)],
    queryFn: async () => {
      if (!filteredIndicadores || filteredIndicadores.length === 0) return {};
      const historicos: Record<string, any[]> = {};
      for (const ind of filteredIndicadores.slice(0, 10)) {
        const data = await getDatosHistoricosIndicador(ind.nombre, selectedTerritorio, 5);
        if (data && data.length > 0) {
          historicos[ind.nombre] = data.map(d => ({
            periodo: d.periodo,
            valor: d.valor_calculado
          }));
        }
      }
      return historicos;
    },
    enabled: filteredIndicadores && filteredIndicadores.length > 0,
  });

  const handleExport = () => {
    if (filteredIndicadores) {
      exportIndicadoresToCSV(filteredIndicadores, "todos-indicadores");
    }
  };

  // Calcular valor normalizado (0-100)
  const getNormalizedValue = (valor: number | undefined): number => {
    if (!valor) return 0;
    // Normalización simple (ajustar según lógica de negocio)
    return Math.min(100, Math.max(0, (valor / 100) * 100));
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard General", href: "/dashboard" },
    { icon: Layers, label: "Dimensiones", href: "/dimensiones" },
    { icon: LineChart, label: "Todos los Indicadores", href: "/kpis", active: true },
    { icon: Map, label: "Comparación Territorial", href: "/comparacion" },
    { icon: Clock, label: "Evolución Temporal", href: "/evolucion" },
    { icon: FileText, label: "Informes", href: "/informes" },
    { icon: MessageSquare, label: "Encuestas", href: "/encuestas" },
    { icon: BookOpen, label: "Metodología", href: "/metodologia" },
    ...(roles.isAdmin ? [{ icon: Shield, label: "Gestión de Usuarios", href: "/admin-usuarios" }] : []),
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
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-[#0c6c8b] mb-2">
                Todos los Indicadores
              </h1>
              <p className="text-gray-600">
                Repositorio completo de todos los indicadores del Sistema BRAINNOVA. Filtra por dimensión o busca por nombre para encontrar métricas específicas.
              </p>
            </div>

            {/* Search and Filter Bar */}
            <Card className="p-4 mb-6 bg-white">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[300px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar indicador..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={selectedDimension} onValueChange={setSelectedDimension}>
                  <SelectTrigger className="w-64 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas las dimensiones">Todas las dimensiones</SelectItem>
                    {dimensiones?.map((dim) => (
                      <SelectItem key={dim.nombre} value={dim.nombre}>
                        {dim.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={handleExport}
                  className="bg-[#0c6c8b] text-white hover:bg-[#0a5a73]"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar datos
                </Button>
              </div>
            </Card>

            {/* Indicator Count */}
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Mostrando {filteredIndicadores.length} de {indicadores?.length || 0} indicadores
              </p>
            </div>

            {/* Indicators Table */}
            {isLoading ? (
              <Card className="p-12 text-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-[#0c6c8b] mx-auto mb-4" />
                <p className="text-gray-600">Cargando indicadores...</p>
              </Card>
            ) : (
              <Card className="bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Indicador</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Dimensión</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Valor Actual</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Normalizado</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Tendencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIndicadores.map((indicador, index) => {
                        const normalized = getNormalizedValue(indicador.ultimoValor);
                        const historico = historicoData?.[indicador.nombre] || [];
                        const hasData = indicador.activo || indicador.ultimoValor !== undefined;
                        const hasTrend = indicador.ultimoValor !== undefined;
                        
                        // Clases para indicadores sin datos (gris/deshabilitado)
                        const disabledClass = hasData ? "" : "opacity-50 bg-gray-50";
                        const textDisabledClass = hasData ? "" : "text-gray-400";
                        
                        return (
                          <tr 
                            key={`${indicador.nombre}-${index}`}
                            className={`border-b border-gray-100 transition-colors ${disabledClass} ${hasData ? "hover:bg-gray-50" : ""}`}
                          >
                            <td className="py-4 px-4">
                              <div>
                                <p className={`text-sm font-medium ${hasData ? "text-gray-900" : "text-gray-400"}`}>
                                  {indicador.nombre}
                                </p>
                                {indicador.subdimension && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/kpis/subdimension?subdimension=${encodeURIComponent(indicador.subdimension)}&dimension=${encodeURIComponent(indicador.dimension || "")}`);
                                    }}
                                    className={`text-xs mt-1 ${hasData ? "text-[#0c6c8b] hover:text-[#0a5a73] hover:underline cursor-pointer" : "text-gray-300 cursor-not-allowed"}`}
                                    disabled={!hasData}
                                  >
                                    {indicador.subdimension}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`text-sm ${hasData ? "text-gray-700" : "text-gray-400"}`}>
                                {indicador.dimension || "—"}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`text-sm font-medium ${hasData ? "text-gray-900" : "text-gray-400"}`}>
                                {indicador.ultimoValor !== undefined 
                                  ? `${indicador.ultimoValor.toFixed(1)}${indicador.ultimoValor > 1 ? '%' : ''}` 
                                  : "—"}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-medium w-16 ${hasData ? "text-gray-700" : "text-gray-400"}`}>
                                  {normalized.toFixed(3)}
                                </span>
                                <div className="flex-1">
                                  <Progress 
                                    value={normalized} 
                                    className={`h-2 ${hasData ? "" : "opacity-30"}`} 
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              {hasTrend ? (
                                <TrendingUp className={`h-5 w-5 mx-auto ${hasData ? "text-green-600" : "text-gray-400"}`} />
                              ) : (
                                <ArrowRight className="h-5 w-5 text-gray-400 mx-auto" />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default KPIsDashboard;
