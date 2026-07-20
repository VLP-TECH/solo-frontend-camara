import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp,
  AlertTriangle,
  LogOut
} from "lucide-react";
import { useAppMenuItems } from "@/hooks/useAppMenuItems";
import FloatingCamaraLogo from "@/components/FloatingCamaraLogo";
import {
  getIndicadores,
  getDatosHistoricosIndicador,
  getDimensionesHistoricoEvolucion,
  type TerritorioEvolucionDimensiones,
} from "@/lib/kpis-data";
import { getIndiceGlobalHistorico } from "@/lib/dashboard-snapshot";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

/** Años del eje X compartidos por índice global, dimensiones e indicadores en esta vista. */
const YEARS_EVOLUCION = [2023, 2024, 2025, 2026] as const;

const TERRITORIO_DIMENSIONES_OPCIONES: {
  value: TerritorioEvolucionDimensiones;
  label: string;
}[] = [
  { value: "Valencia", label: "Valencia" },
  { value: "Castellón", label: "Castellón" },
  { value: "Alicante", label: "Alicante" },
  { value: "Comunitat Valenciana", label: "Comunidad Valenciana" },
  { value: "España", label: "España" },
  { value: "Top UE", label: "Top UE" },
];

const DIMENSION_LINE_COLORS = [
  "#3B82F6",
  "#F97316",
  "#EF4444",
  "#10B981",
  "#8B5CF6",
  "#EAB308",
  "#14B8A6",
  "#6366F1",
  "#EC4899",
  "#64748B",
];

/** Series fijas en gráficos de indicadores: provincias CV, España y máximo UE de referencia. */
const EVOLUCION_INDICADOR_SERIES = [
  { dataKey: "Valencia" as const, name: "Valencia", stroke: "#14B8A6", cardClass: "bg-teal-50 border-teal-200" },
  { dataKey: "Castellón" as const, name: "Castellón", stroke: "#8B5CF6", cardClass: "bg-violet-50 border-violet-200" },
  { dataKey: "Alicante" as const, name: "Alicante", stroke: "#EAB308", cardClass: "bg-amber-50 border-amber-200" },
  { dataKey: "España" as const, name: "España", stroke: "#3B82F6", cardClass: "bg-blue-50 border-blue-200" },
  { dataKey: "Top UE" as const, name: "Top UE", stroke: "#10B981", cardClass: "bg-emerald-50 border-emerald-200" },
];

const EvolucionTemporal = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { roles } = usePermissions();
  const { isAdmin, profile, loading: profileLoading } = useUserProfile();
  const [selectedIndicador, setSelectedIndicador] = useState<string>("");
  const [searchIndicador, setSearchIndicador] = useState<string>("");
  const [territorioDimensiones, setTerritorioDimensiones] =
    useState<TerritorioEvolucionDimensiones>("Valencia");

  const handleSignOut = async () => {
    await signOut();
    window.location.href = 'https://brainnova.info/';
  };

  // Indicadores disponibles desde BD
  const { data: todosIndicadores } = useQuery({
    queryKey: ["indicadores-evolucion"],
    queryFn: getIndicadores,
  });

  const normalizeText = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const indicadoresFiltrados = useMemo(() => {
    const q = normalizeText(searchIndicador);
    if (!q) return todosIndicadores || [];
    return (todosIndicadores || []).filter((ind) =>
      normalizeText(ind.nombre || "").includes(q)
    );
  }, [todosIndicadores, searchIndicador]);

  const indicadorActual =
    selectedIndicador ||
    indicadoresFiltrados?.[0]?.nombre ||
    todosIndicadores?.[0]?.nombre ||
    "";


  const {
    data: historicoIndicadorSeries,
    isPending: historicoIndicadorLoading,
  } = useQuery({
    queryKey: ["historico-indicador-evolucion", indicadorActual],
    queryFn: async () => {
      if (!indicadorActual) return null;
      const limit = 20;
      const [
        valencia,
        castellon,
        alicante,
        espana,
        alemania,
        francia,
        italia,
        paisesBajos,
      ] = await Promise.all([
        getDatosHistoricosIndicador(indicadorActual, "Valencia", limit),
        getDatosHistoricosIndicador(indicadorActual, "Castellón", limit),
        getDatosHistoricosIndicador(indicadorActual, "Alicante", limit),
        getDatosHistoricosIndicador(indicadorActual, "España", limit),
        getDatosHistoricosIndicador(indicadorActual, "Alemania", limit),
        getDatosHistoricosIndicador(indicadorActual, "Francia", limit),
        getDatosHistoricosIndicador(indicadorActual, "Italia", limit),
        getDatosHistoricosIndicador(indicadorActual, "Países Bajos", limit),
      ]);
      return {
        valencia,
        castellon,
        alicante,
        espana,
        alemania,
        francia,
        italia,
        paisesBajos,
      };
    },
    enabled: !!indicadorActual,
  });

  const indicadorData = useMemo(() => {
    if (!historicoIndicadorSeries) return [];
    const toMap = (arr: { periodo: number; valor: number }[] | undefined) =>
      new Map((arr ?? []).map((d) => [d.periodo, d.valor]));
    const valMap = toMap(historicoIndicadorSeries.valencia);
    const casMap = toMap(historicoIndicadorSeries.castellon);
    const aliMap = toMap(historicoIndicadorSeries.alicante);
    const espMap = toMap(historicoIndicadorSeries.espana);
    const topMaps = [
      espMap,
      toMap(historicoIndicadorSeries.alemania),
      toMap(historicoIndicadorSeries.francia),
      toMap(historicoIndicadorSeries.italia),
      toMap(historicoIndicadorSeries.paisesBajos),
    ];
    return [...YEARS_EVOLUCION].map((year) => {
      const topVals = topMaps
        .map((m) => m.get(year))
        .filter((v): v is number => v != null && Number.isFinite(v));
      const topUE = topVals.length > 0 ? Math.max(...topVals) : null;
      return {
        year,
        Valencia: valMap.get(year) ?? null,
        "Castellón": casMap.get(year) ?? null,
        Alicante: aliMap.get(year) ?? null,
        España: espMap.get(year) ?? null,
        "Top UE": topUE,
      };
    });
  }, [historicoIndicadorSeries]);

  /** Referencia estática de dimensiones (solo tarjetas resumen KPI); mismos años que el resto de la página. */
  const dimensionesDataReferencia = useMemo(
    () =>
      [
        {
          year: 2023,
          "Capital Humano": 68,
          Ecosistema: 64,
          Emprendimiento: 56,
          Infraestructura: 72,
          "Servicios Públicos": 66,
          Sostenibilidad: 61,
          "Transformación Digital": 64,
        },
        {
          year: 2024,
          "Capital Humano": 70,
          Ecosistema: 66,
          Emprendimiento: 58,
          Infraestructura: 75,
          "Servicios Públicos": 68,
          Sostenibilidad: 63,
          "Transformación Digital": 66,
        },
        {
          year: 2025,
          "Capital Humano": 72,
          Ecosistema: 68,
          Emprendimiento: 60,
          Infraestructura: 77,
          "Servicios Públicos": 70,
          Sostenibilidad: 65,
          "Transformación Digital": 68,
        },
      ] as const,
    []
  );

  const yearsIndiceGlobal = useMemo(() => [...YEARS_EVOLUCION], []);

  const {
    data: indiceGlobalHistorico = [],
    isPending: indiceGlobalLoading,
    isError: indiceGlobalError,
    error: indiceGlobalErrorDetail,
  } = useQuery({
    queryKey: ["indice-global-historico-comparativo", yearsIndiceGlobal],
    queryFn: () => getIndiceGlobalHistorico(yearsIndiceGlobal),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const indiceGlobalData = useMemo(() => {
    return indiceGlobalHistorico.map((row, i, arr) => {
      const prev = i > 0 ? arr[i - 1] : null;
      const ref = row.valencia ?? row.espana ?? row.topUE;
      const prevRef = prev
        ? (prev.valencia ?? prev.espana ?? prev.topUE)
        : null;
      let cambio: string | null = null;
      if (ref != null && prevRef != null && prevRef !== 0) {
        const delta = ref - prevRef;
        cambio = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`;
      }
      return {
        year: row.year,
        valencia: row.valencia,
        castellon: row.castellon,
        alicante: row.alicante,
        espana: row.espana,
        topUE: row.topUE,
        cambio,
      };
    });
  }, [indiceGlobalHistorico]);

  const resumenCV = useMemo(() => {
    const valenciaRows = indiceGlobalData.filter(
      (r) => r.valencia != null && Number.isFinite(Number(r.valencia))
    );
    const first = valenciaRows[0];
    const last = valenciaRows[valenciaRows.length - 1];

    const crecimientoTotal =
      first?.valencia != null && last?.valencia != null
        ? Number(last.valencia) - Number(first.valencia)
        : null;

    const yearSpan =
      first?.year != null && last?.year != null ? Number(last.year) - Number(first.year) : 0;
    const cagr =
      first?.valencia != null &&
      last?.valencia != null &&
      Number(first.valencia) > 0 &&
      yearSpan > 0
        ? (Math.pow(Number(last.valencia) / Number(first.valencia), 1 / yearSpan) - 1) * 100
        : null;

    const dimensionKeys = [
      "Capital Humano",
      "Ecosistema",
      "Emprendimiento",
      "Infraestructura",
      "Servicios Públicos",
      "Sostenibilidad",
      "Transformación Digital",
    ] as const;
    const firstDim = dimensionesDataReferencia[0];
    const lastDim = dimensionesDataReferencia[dimensionesDataReferencia.length - 1];
    const evoluciones = dimensionKeys
      .map((k) => ({ nombre: k, delta: Number(lastDim?.[k] ?? 0) - Number(firstDim?.[k] ?? 0) }))
      .filter((d) => Number.isFinite(d.delta));
    const mejor = evoluciones.length
      ? evoluciones.reduce((acc, cur) => (cur.delta > acc.delta ? cur : acc))
      : null;
    const atencion = evoluciones.length
      ? evoluciones.reduce((acc, cur) => (cur.delta < acc.delta ? cur : acc))
      : null;

    const rango = first && last ? `${first.year}-${last.year}` : "sin rango";
    return { crecimientoTotal, cagr, mejor, atencion, rango };
  }, [indiceGlobalData, dimensionesDataReferencia]);

  const {
    data: dimensionesEvolucion,
    isPending: dimensionesEvolucionLoading,
    isError: dimensionesEvolucionError,
    error: dimensionesEvolucionErrorDetail,
  } = useQuery({
    queryKey: ["dimensiones-evolucion-brainnova", territorioDimensiones, [...YEARS_EVOLUCION]],
    queryFn: () =>
      getDimensionesHistoricoEvolucion(territorioDimensiones, [...YEARS_EVOLUCION]),
    staleTime: 5 * 60 * 1000,
  });

  const dimensionesChartRows = dimensionesEvolucion?.rows ?? [];
  const dimensionNombresChart = dimensionesEvolucion?.dimensionNombres ?? [];

  // Verificar si el usuario es admin o superadmin
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
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Title Section */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-[#0c6c8b] mb-2">
                Evolución Temporal
              </h1>
              <p className="text-lg text-gray-600">
                Análisis de la evolución del Índice BRAINNOVA y sus dimensiones a lo largo del tiempo
              </p>
            </div>

            {/* Key Performance Indicators */}
            <div>
              <h2 className="text-lg font-semibold text-[#0c6c8b] mb-3">
                Indicadores de evolución · Valencia (índice global)
              </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Crecimiento Total</p>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {resumenCV.crecimientoTotal != null
                          ? `${resumenCV.crecimientoTotal >= 0 ? "+" : ""}${resumenCV.crecimientoTotal.toFixed(1)}`
                          : "—"}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">puntos ({resumenCV.rango})</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">CAGR</p>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {resumenCV.cagr != null
                          ? `${resumenCV.cagr >= 0 ? "+" : ""}${resumenCV.cagr.toFixed(1)}%`
                          : "—"}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">Tasa anual compuesta</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0c6c8b] text-white">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-blue-200 mb-1">Mejor Evolución</p>
                      <h3 className="text-xl font-bold mb-1">
                        {resumenCV.mejor?.nombre ?? "—"}
                      </h3>
                      <p className="text-2xl font-bold">
                        {resumenCV.mejor != null
                          ? `${resumenCV.mejor.delta >= 0 ? "+" : ""}${resumenCV.mejor.delta.toFixed(1)}`
                          : "—"}
                      </p>
                      <p className="text-xs text-blue-200 mt-1">pts</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Área de Atención</p>
                      <h3 className="text-xl font-bold mb-1">
                        {resumenCV.atencion?.nombre ?? "—"}
                      </h3>
                      <p className="text-2xl font-bold text-orange-600">
                        {resumenCV.atencion != null
                          ? `${resumenCV.atencion.delta >= 0 ? "+" : ""}${resumenCV.atencion.delta.toFixed(1)}`
                          : "—"}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">pts</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>

            {/* Evolución del Índice Global */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Evolución del Índice Global BRAINNOVA
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Valencia, Castellón, Alicante, España y Top UE (máximo entre referencia UE por año)
                </p>
              </CardHeader>
              <CardContent>
                {indiceGlobalError ? (
                  <div className="h-80 flex flex-col items-center justify-center gap-2 text-center px-4">
                    <p className="text-red-600 font-medium">No se pudo cargar el índice global.</p>
                    <p className="text-sm text-gray-600">
                      {indiceGlobalErrorDetail instanceof Error
                        ? indiceGlobalErrorDetail.message
                        : String(indiceGlobalErrorDetail ?? "Error desconocido")}
                    </p>
                    <p className="text-xs text-gray-500">
                      Revisa la consola del navegador y la conexión con Supabase.
                    </p>
                  </div>
                ) : indiceGlobalLoading ? (
                  <div className="h-80 flex items-center justify-center text-gray-500">
                    Cargando índice global desde la base de datos… (puede tardar unos segundos la primera vez)
                  </div>
                ) : indiceGlobalData.length === 0 ||
                  indiceGlobalData.every(
                    (d) =>
                      d.valencia == null &&
                      d.castellon == null &&
                      d.alicante == null &&
                      d.espana == null &&
                      d.topUE == null
                  ) ? (
                  <div className="h-80 flex items-center justify-center text-gray-500">
                    No hay datos suficientes en la base para calcular el índice global en estos años.
                  </div>
                ) : (
                  <>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={indiceGlobalData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="year"
                            stroke="#6b7280"
                            tick={{ fill: "#6b7280" }}
                          />
                          <YAxis
                            domain={[0, 100]}
                            stroke="#6b7280"
                            tick={{ fill: "#6b7280" }}
                          />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="valencia"
                            name="Valencia"
                            stroke="#14B8A6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            dataKey="castellon"
                            name="Castellón"
                            stroke="#8B5CF6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            dataKey="alicante"
                            name="Alicante"
                            stroke="#EAB308"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            dataKey="espana"
                            name="España"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            dataKey="topUE"
                            name="Top UE"
                            stroke="#10B981"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-around gap-2 mt-4 pt-4 border-t border-gray-200">
                      {indiceGlobalData.map((item) => (
                        <div key={item.year} className="text-center min-w-[5rem]">
                          <p className="text-sm font-semibold text-gray-900">{item.year}</p>
                          <p className="text-xs text-teal-600">
                            Val.: {item.valencia != null ? item.valencia : "—"}
                          </p>
                          <p className="text-xs text-violet-600">
                            Cast.: {item.castellon != null ? item.castellon : "—"}
                          </p>
                          <p className="text-xs text-amber-600">
                            Alic.: {item.alicante != null ? item.alicante : "—"}
                          </p>
                          <p className="text-xs text-blue-600">
                            ES: {item.espana != null ? item.espana : "—"}
                          </p>
                          <p className="text-xs text-emerald-600">
                            Top UE: {item.topUE != null ? item.topUE : "—"}
                          </p>
                          {item.cambio && item.valencia != null && (
                            <p className="text-xs text-green-600 mt-0.5">Δ Valencia {item.cambio}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Evolución por Dimensiones */}
            <Card className="bg-white">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      Evolución por dimensiones BRAINNOVA
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Trayectoria por dimensión según territorio (scores 0–100 desde datos BRAINNOVA).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm text-gray-600 whitespace-nowrap">Territorio</span>
                    <Select
                      value={territorioDimensiones}
                      onValueChange={(v) =>
                        setTerritorioDimensiones(v as TerritorioEvolucionDimensiones)
                      }
                    >
                      <SelectTrigger className="w-[min(100%,14rem)] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TERRITORIO_DIMENSIONES_OPCIONES.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {dimensionesEvolucionError ? (
                  <div className="h-96 flex flex-col items-center justify-center gap-2 text-center px-4">
                    <p className="text-red-600 font-medium">No se pudieron cargar las dimensiones.</p>
                    <p className="text-sm text-gray-600">
                      {dimensionesEvolucionErrorDetail instanceof Error
                        ? dimensionesEvolucionErrorDetail.message
                        : String(dimensionesEvolucionErrorDetail ?? "Error desconocido")}
                    </p>
                  </div>
                ) : dimensionesEvolucionLoading ? (
                  <div className="h-96 flex items-center justify-center text-gray-500">
                    Cargando dimensiones por territorio…
                  </div>
                ) : dimensionNombresChart.length === 0 ||
                  dimensionesChartRows.every((row) =>
                    dimensionNombresChart.every((n) => row[n] == null)
                  ) ? (
                  <div className="h-96 flex items-center justify-center text-gray-500 text-center px-4">
                    No hay datos de dimensiones para este territorio en los años mostrados.
                  </div>
                ) : (
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={dimensionesChartRows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="year"
                          stroke="#6b7280"
                          tick={{ fill: "#6b7280" }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          stroke="#6b7280"
                          tick={{ fill: "#6b7280" }}
                        />
                        <Tooltip />
                        <Legend />
                        {dimensionNombresChart.map((nombre, idx) => (
                          <Line
                            key={nombre}
                            type="monotone"
                            dataKey={nombre}
                            name={nombre}
                            stroke={DIMENSION_LINE_COLORS[idx % DIMENSION_LINE_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            connectNulls
                          />
                        ))}
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Evolución de Indicadores Específicos */}
            <Card className="bg-white">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      Evolución de Indicadores Específicos
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Input
                        value={searchIndicador}
                        onChange={(e) => setSearchIndicador(e.target.value)}
                        placeholder="Buscar indicador..."
                        className="w-64 bg-white"
                      />
                      {searchIndicador.trim() && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto">
                          {indicadoresFiltrados.length > 0 ? (
                            indicadoresFiltrados.slice(0, 12).map((ind) => (
                              <button
                                key={ind.id ?? ind.nombre}
                                type="button"
                                onClick={() => {
                                  setSelectedIndicador(ind.nombre);
                                  setSearchIndicador("");
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              >
                                {ind.nombre}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
                          )}
                        </div>
                      )}
                    </div>
                    <Select value={indicadorActual} onValueChange={setSelectedIndicador}>
                    <SelectTrigger className="w-96 bg-white">
                      <SelectValue placeholder="Seleccionar indicador..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {(indicadoresFiltrados || []).map((ind) => (
                        <SelectItem key={ind.id ?? ind.nombre} value={ind.nombre}>
                          {ind.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {historicoIndicadorLoading ? (
                  <div className="h-80 flex items-center justify-center text-gray-500">
                    Cargando series por territorio…
                  </div>
                ) : indicadorData.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-gray-500">
                    <p>{indicadorActual ? "No hay datos históricos para este indicador." : "Selecciona un indicador para ver su evolución."}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      Comparativa fija: Valencia, Castellón, Alicante, España y Top UE (máximo entre España, Alemania, Francia, Italia y Países Bajos por año).
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                      {EVOLUCION_INDICADOR_SERIES.map(({ dataKey, name, cardClass }) => {
                        const values = indicadorData
                          .map((d) => d[dataKey])
                          .filter((v): v is number => v !== null && v !== undefined);
                        const first = values[0];
                        const last = values[values.length - 1];
                        const growth =
                          first != null && last != null && first !== 0
                            ? (((last - first) / Math.abs(first)) * 100).toFixed(1)
                            : null;
                        const years = indicadorData.map((d) => d.year);
                        return (
                          <Card key={dataKey} className={cardClass}>
                            <CardContent className="p-4">
                              <p className="text-sm text-gray-600 mb-1">{name}</p>
                              <h3 className="text-2xl font-bold text-gray-900">
                                {growth !== null
                                  ? `${Number(growth) >= 0 ? "+" : ""}${growth}%`
                                  : "—"}
                              </h3>
                              <p className="text-xs text-gray-600 mt-1">
                                {years.length >= 2
                                  ? `${years[0]}-${years[years.length - 1]}`
                                  : ""}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={indicadorData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="year"
                            stroke="#6b7280"
                            tick={{ fill: "#6b7280" }}
                          />
                          <YAxis stroke="#6b7280" tick={{ fill: "#6b7280" }} />
                          <Tooltip />
                          <Legend />
                          {EVOLUCION_INDICADOR_SERIES.map(({ dataKey, name, stroke }) => (
                            <Line
                              key={dataKey}
                              type="monotone"
                              dataKey={dataKey}
                              name={name}
                              stroke={stroke}
                              strokeWidth={2}
                              strokeDasharray={dataKey === "Top UE" ? "5 5" : undefined}
                              dot={{ r: 4 }}
                              connectNulls
                            />
                          ))}
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tendencias Clave */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Tendencias Clave
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <strong>Crecimiento sostenido:</strong> El Índice global ha crecido un 15.3% en los últimos 5 años, con una aceleración en 2023-2024.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <strong>Infraestructura lidera:</strong> La dimensión de Infraestructura Digital muestra la mejor evolución (+10.3%) impulsada por el despliegue de fibra y 5G.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <strong>Convergencia europea:</strong> La brecha con la media UE se ha reducido en 3.8 puntos, indicando una convergencia positiva.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <strong>Emprendimiento emergente:</strong> Aunque partía de niveles más bajos, Emprendimiento muestra una CAGR del 3.8%, la más alta del conjunto.
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
    </>
  );
};

export default EvolucionTemporal;

