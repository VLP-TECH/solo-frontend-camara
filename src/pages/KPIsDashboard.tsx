import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfile } from "@/hooks/useUserProfile";
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
  Search,
  Download,
  TrendingUp,
  ArrowRight,
  Loader2,
  MessageSquare,
  LogOut,
  CircleHelp,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppMenuItems } from "@/hooks/useAppMenuItems";
import FloatingCamaraLogo from "@/components/FloatingCamaraLogo";
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
  getComparativaIndicadoresKPIs,
  COMPARATIVA_TERRITORIOS_KPIS,
  type IndicadorConDatos,
} from "@/lib/kpis-data";
import { exportIndicadoresToCSV } from "@/lib/csv-export";

const NORMALIZADO_COLUMNA_AYUDA =
  "El valor indicado (0-100) muestra la distancia del territorio seleccionado con respecto al valor máximo existente en el indicador consultado. Este valor se calcula mediante una metodología min-max.";

const KPIsDashboard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { roles } = usePermissions();
  const { isAdmin, profile, loading: profileLoading } = useUserProfile();
  const [selectedTerritorio, setSelectedTerritorio] = useState("Comunitat Valenciana");
  const [selectedAno, setSelectedAno] = useState("2024");
  const [selectedReferencia, setSelectedReferencia] = useState("Media UE");

  const handleSignOut = async () => {
    await signOut();
    window.location.href = 'https://brainnova.info/';
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

  const { data: comparativaIndicadores = {} } = useQuery({
    queryKey: ["comparativa-indicadores-kpis", selectedTerritorio, filteredIndicadores?.map((i) => i.nombre)],
    queryFn: () => getComparativaIndicadoresKPIs((filteredIndicadores || []).map((i) => i.nombre), selectedTerritorio),
    enabled: !!filteredIndicadores && filteredIndicadores.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const orderedIndicadores = useMemo(() => {
    if (!filteredIndicadores?.length) return [];
    const hasComparativaData = (nombre: string): boolean => {
      const c = comparativaIndicadores?.[nombre];
      return c?.territorio != null || c?.espana != null;
    };
    return [...filteredIndicadores].sort((a, b) => {
      const aCmp = hasComparativaData(a.nombre);
      const bCmp = hasComparativaData(b.nombre);
      if (aCmp && !bCmp) return -1;
      if (!aCmp && bCmp) return 1;
      return 0;
    });
  }, [filteredIndicadores, comparativaIndicadores]);

  const handleExport = () => {
    if (filteredIndicadores) {
      exportIndicadoresToCSV(filteredIndicadores, "todos-indicadores");
    }
  };


  // Formatea un valor con su unidad (ej. "493.921.730 EUR", "61,9 % Empresas").
  // Enteros grandes sin decimales; el resto con 1 decimal.
  const fmtValorUnidad = (valor: number, unidad: string | null | undefined): string => {
    const num = valor.toLocaleString("es-ES", {
      maximumFractionDigits: Math.abs(valor) >= 1000 ? 0 : 1,
    });
    return unidad ? `${num} ${unidad}` : num;
  };

  const menuItems = useAppMenuItems();

  return (
    <>
      <FloatingCamaraLogo />
      <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0c6c8b] text-white flex flex-col">
        <div className="p-6">
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
        
        <div className="mt-auto p-6">
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
              <h2 className="text-lg font-semibold">Panel de Economía Digital</h2>
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
              {import.meta.env.DEV && (
                <p className="text-xs text-gray-500 mt-2">
                  http://localhost:8080/kpis
                </p>
              )}
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

                <Select value={selectedTerritorio} onValueChange={setSelectedTerritorio}>
                  <SelectTrigger className="w-56 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPARATIVA_TERRITORIOS_KPIS.map((territorio) => (
                      <SelectItem key={territorio} value={territorio}>
                        {territorio}
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
                Mostrando {orderedIndicadores.length} de {indicadores?.length || 0} indicadores
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
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Normalizado</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#0c6c8b] hover:bg-[#0c6c8b]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c6c8b]/30"
                                  aria-label="¿Qué significa la columna Normalizado?"
                                >
                                  <CircleHelp className="h-4 w-4" aria-hidden />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="max-w-sm w-[min(100vw-2rem,22rem)] text-sm text-muted-foreground"
                                align="center"
                              >
                                <p className="font-semibold text-foreground mb-2">Columna Normalizado</p>
                                <p className="leading-relaxed">{NORMALIZADO_COLUMNA_AYUDA}</p>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">{selectedTerritorio}</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">España</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">TOP UE</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Tendencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedIndicadores.map((indicador, index) => {
                        const comparativa = comparativaIndicadores?.[indicador.nombre];
                        // Columna "%": score Min-Max real (territorio seleccionado, o España si
                        // el territorio no tiene dato). Antes usaba min(100, valor), que clampaba
                        // a 100% cualquier indicador de valor absoluto.
                        const normalized =
                          comparativa?.scoreTerritorio ?? comparativa?.scoreEspana ?? 0;
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
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-medium w-16 ${hasData ? "text-gray-700" : "text-gray-400"}`}>
                                  {normalized.toFixed(1)}%
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
                              <span className={`text-sm font-semibold ${hasData ? "text-gray-700" : "text-gray-400"}`}>
                                {comparativa?.territorio != null ? Number(comparativa.territorio).toFixed(1) : "—"}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              {comparativa?.espana != null ? (
                                <span className={`text-sm font-semibold ${hasData ? "text-gray-700" : "text-gray-400"}`}>
                                  {fmtValorUnidad(Number(comparativa.espana), comparativa.unidad)}
                                </span>
                              ) : comparativa?.espanaSoloProvincial ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 text-sm font-semibold text-gray-400 underline decoration-dotted underline-offset-2 hover:text-[#0c6c8b] focus-visible:outline-none"
                                      aria-label="Por qué no hay valor nacional de España"
                                    >
                                      — <CircleHelp className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="max-w-xs text-sm text-muted-foreground" align="center">
                                    <p className="font-semibold text-foreground mb-1">Sin valor nacional</p>
                                    <p className="leading-relaxed">
                                      Este indicador solo tiene datos <b>provinciales</b> (Valencia, Madrid…); no existe un
                                      valor agregado de España, por eso se muestra «—» en vez del máximo de una provincia.
                                    </p>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <span className="text-sm font-semibold text-gray-400">—</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`text-sm font-semibold ${hasData ? "text-gray-700" : "text-gray-400"}`}>
                                {comparativa?.topUE != null ? Number(comparativa.topUE).toFixed(1) : "—"}
                              </span>
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
    </>
  );
};

export default KPIsDashboard;
