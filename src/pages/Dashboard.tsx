import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User,
  Target,
  Wifi,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  MessageSquare,
  LogOut
} from "lucide-react";
import { useAppMenuItems } from "@/hooks/useAppMenuItems";
import { BRAINNOVA_LOGO_SRC } from "@/lib/logo-assets";
import FloatingCamaraLogo from "@/components/FloatingCamaraLogo";
import { getDimensiones, getSubdimensionesConScores, getAvailablePaisYPeriodo } from "@/lib/kpis-data";
import { getBrainnovaScoresRadar, getFiltrosGlobales } from "@/lib/brainnova-api";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Customized,
} from "recharts";

const RADAR_TICKS_ALL_AXES = [20, 40, 60, 80, 100];

function RadarTicksAllAxes({ cx, cy, startAngle, innerRadius, outerRadius }: {
  cx?: number; cy?: number; startAngle?: number; innerRadius?: number; outerRadius?: number;
  [key: string]: unknown;
}) {
  if (!cx || !cy || outerRadius == null) return null;
  const numAxes = 7;
  const labels: JSX.Element[] = [];
  for (let axis = 0; axis < numAxes; axis++) {
    const angleDeg = (startAngle ?? 90) - (360 / numAxes) * axis;
    const angleRad = (angleDeg * Math.PI) / 180;
    for (const tick of RADAR_TICKS_ALL_AXES) {
      const r = (innerRadius ?? 0) + ((outerRadius - (innerRadius ?? 0)) * tick) / 100;
      const x = cx + r * Math.cos(angleRad);
      const y = cy - r * Math.sin(angleRad);
      labels.push(
        <text
          key={`${axis}-${tick}`}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={8}
          fill="#9ca3af"
          style={{ pointerEvents: "none" }}
        >
          {tick}
        </text>
      );
    }
  }
  return <g>{labels}</g>;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  
  const [selectedTerritorio, setSelectedTerritorio] = useState("España");
  const [selectedAno, setSelectedAno] = useState("2024");
  const [selectedReferencia, setSelectedReferencia] = useState("Media UE");

  // Análisis por dimensiones: selectores (año, país, provincia) + botón MOSTRAR aplica y recrea la gráfica
  const [radarAnoSelect, setRadarAnoSelect] = useState<string>("2024");
  const [radarPaisSelect, setRadarPaisSelect] = useState<string>("España");
  const [radarProvinciaSelect, setRadarProvinciaSelect] = useState<string>("");
  const [radarAno, setRadarAno] = useState<string>("2024");
  const [radarPaisAplicado, setRadarPaisAplicado] = useState<string>("España");
  const [radarProvincia, setRadarProvincia] = useState<string>("España");

  const { data: availablePaisPeriodo } = useQuery({
    queryKey: ["available-pais-periodo"],
    queryFn: getAvailablePaisYPeriodo,
  });

  const isRadarSpain = radarPaisSelect === "España" || radarPaisSelect === "Spain";
  const showRadarProvincia = isRadarSpain;

  const handleRadarPaisChange = (pais: string) => {
    setRadarPaisSelect(pais);
    if (pais !== "España" && pais !== "Spain") setRadarProvinciaSelect("");
  };

  const handleMostrarRadar = () => {
    setRadarAno(radarAnoSelect);
    setRadarPaisAplicado(radarPaisSelect);
    setRadarProvincia(showRadarProvincia && radarProvinciaSelect && radarProvinciaSelect !== "_" ? radarProvinciaSelect : radarPaisSelect);
  };

  const provinciasCV = ["Valencia", "Alicante", "Castellón"];
  const isSpainWithProvince = (radarPaisAplicado === "España" || radarPaisAplicado === "Spain") && provinciasCV.includes(radarProvincia);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = 'https://brainnova.info/';
  };

  const { data: dimensiones } = useQuery({
    queryKey: ["dimensiones"],
    queryFn: getDimensiones,
  });

  // Filtros reactivos desde el backend (GET /filtros-globales); fallback a listas estáticas
  const { data: filtrosGlobales } = useQuery({
    queryKey: ["filtros-globales-radar"],
    queryFn: () => getFiltrosGlobales(),
  });
  // Opciones de filtro: API (filtros-globales) > BD > estáticos; España siempre presente
  const paisesOpciones = [...new Set([
    "España",
    ...(filtrosGlobales?.provincias?.length
      ? filtrosGlobales.provincias
      : availablePaisPeriodo?.paises?.length
        ? availablePaisPeriodo.paises
        : ["Comunitat Valenciana", "Valencia", "Alicante", "Castellón"]
    ) as string[]
  ])];
  const provinciasCVOpciones = ["Valencia", "Alicante", "Castellón"] as const;
  const aniosOpciones = (filtrosGlobales?.anios?.length
    ? [...filtrosGlobales.anios].sort((a, b) => b - a)
    : availablePaisPeriodo?.periodos?.length
      ? availablePaisPeriodo.periodos.map(String)
      : [2024, 2023, 2022, 2021, 2020]
  ).map(String);

  const { data: radarData, isLoading: radarLoading, isFetching: radarFetching } = useQuery({
    queryKey: ["dashboard-radar-7dim", radarAno, radarPaisAplicado, radarProvincia],
    queryFn: async () => {
      const periodo = Number(radarAno) || 2024;
      const tresSeries = (radarPaisAplicado === "España" || radarPaisAplicado === "Spain") && provinciasCV.includes(radarProvincia);
      try {
        const data = await getBrainnovaScoresRadar(periodo);
        if (data?.length && !tresSeries) return data;
      } catch (e) {
        console.warn("Radar: backend no disponible, usando fallback Supabase", e);
      }
      if (!dimensiones?.length) return [];
      const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

      if (tresSeries) {
        const allSubsEspania = await Promise.all(
          dimensiones.map((dim) => getSubdimensionesConScores(dim.nombre, "España", periodo))
        );
        const allSubsProvincia = await Promise.all(
          dimensiones.map((dim) => getSubdimensionesConScores(dim.nombre, radarProvincia, periodo))
        );
        return dimensiones.map((dim, i) => {
          const subsE = allSubsEspania[i] || [];
          const subsP = allSubsProvincia[i] || [];
          const espania = subsE.length ? subsE.reduce((a, s) => a + s.score, 0) / subsE.length : 0;
          const provincia = subsP.length ? subsP.reduce((a, s) => a + s.score, 0) / subsP.length : 0;
          const ue = subsE.length ? subsE.reduce((a, s) => a + s.ue, 0) / subsE.length : 0;
          return {
            dimension: dim.nombre,
            ue: clamp(ue),
            espania: clamp(espania),
            provincia: clamp(provincia),
          };
        });
      }

      const allSubs = await Promise.all(
        dimensiones.map((dim) => getSubdimensionesConScores(dim.nombre, radarProvincia, periodo))
      );
      return dimensiones.map((dim, i) => {
        const subs = allSubs[i] || [];
        const cv = subs.length ? subs.reduce((a, s) => a + s.score, 0) / subs.length : 0;
        const ue = subs.length ? subs.reduce((a, s) => a + s.ue, 0) / subs.length : 0;
        return { dimension: dim.nombre, cv: clamp(cv), ue: clamp(ue) };
      });
    },
    enabled: true,
  });

  const radarDataDisplay = radarData ?? [];

  // Escala fija 0–100 según doc API Cámara (Top Europa = 100)
  const radarDomain: [number, number] = [0, 100];
  const radarTicks = [0, 20, 40, 60, 80, 100];

  const menuItems = useAppMenuItems();

  return (
    <>
      <FloatingCamaraLogo />
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
              const Icon = item.icon;
              const isActive = item.active;
              const isDisabled = item.disabled;
              return (
                <button
                  key={item.label}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (item.href) {
                      console.log('Navigating to:', item.href);
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
        <header className="bg-[#0c6c8b] text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">Plataforma de Economía Digital</h2>
            </div>
            
            <div className="flex items-center space-x-2">
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-white hover:bg-white/10 flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Salir</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {/* Title Section (el texto usa la provincia del selector de Análisis por Dimensiones) */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#0c6c8b] mb-2">
                Índice Global de Economía Digital BRAINNOVA
              </h1>
              <p className="text-lg text-gray-600">
                Análisis integral del desarrollo de la economía digital. Datos para <strong>{radarProvincia}</strong> · {radarAno}.
              </p>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="p-6 bg-white">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Índice Global</p>
                    <h3 className="text-3xl font-bold text-gray-900">67.2</h3>
                    <div className="flex items-center text-green-600 text-sm mt-2">
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      <span>+3.2 pts sobre 100</span>
                    </div>
                  </div>
                  <User className="h-8 w-8 text-gray-400" />
                </div>
              </Card>

              <Card className="p-6 bg-white">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Ranking CCAA</p>
                    <h3 className="text-3xl font-bold text-gray-900">5°</h3>
                    <div className="flex items-center text-green-600 text-sm mt-2">
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      <span>+1 posición de 17 comunidades</span>
                    </div>
                  </div>
                  <Target className="h-8 w-8 text-gray-400" />
                </div>
              </Card>

              <Card className="p-6 bg-white">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Dimensión Más Fuerte</p>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Infraestructura</h3>
                    <p className="text-2xl font-bold text-[#0c6c8b]">75.0</p>
                    <p className="text-xs text-gray-500 mt-1">puntos</p>
                  </div>
                  <Wifi className="h-8 w-8 text-gray-400" />
                </div>
              </Card>

              <Card className="p-6 bg-white">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Dimensión Más Débil</p>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Emprendimiento</h3>
                    <p className="text-2xl font-bold text-red-600">58.0</p>
                    <p className="text-xs text-gray-500 mt-1">puntos</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-400" />
                </div>
              </Card>
            </div>

            {/* Analysis by Dimensions - Índice BRAINNOVA: 7 dimensiones */}
            <Card className="p-6 bg-white mb-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Análisis por Dimensiones
                  </h2>
                  <p className="text-sm text-gray-600">
                    Índice BRAINNOVA por las 7 dimensiones
                    {isSpainWithProvince
                      ? <> para <strong>Media UE</strong>, <strong>España</strong> y <strong>{radarProvincia}</strong></>
                      : <> para <strong>{radarProvincia}</strong></>
                    } ({radarAno}).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={radarAnoSelect} onValueChange={setRadarAnoSelect}>
                    <SelectTrigger className="w-28 bg-white">
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      {aniosOpciones.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={radarPaisSelect} onValueChange={handleRadarPaisChange}>
                    <SelectTrigger className="w-44 bg-white">
                      <SelectValue placeholder="País" />
                    </SelectTrigger>
                    <SelectContent>
                      {paisesOpciones.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showRadarProvincia && (
                    <Select value={radarProvinciaSelect || "_"} onValueChange={(v) => setRadarProvinciaSelect(v === "_" ? "" : v)}>
                      <SelectTrigger className="w-44 bg-white">
                        <SelectValue placeholder="Provincia (Castellón, Valencia, Alicante)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">— Provincia —</SelectItem>
                        {provinciasCVOpciones.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    onClick={handleMostrarRadar}
                    disabled={radarFetching}
                    className="bg-[#0c6c8b] hover:bg-[#0c6c8b]/90 text-white disabled:opacity-70"
                  >
                    {radarFetching ? "CALCULANDO..." : "MOSTRAR"}
                  </Button>
                </div>
              </div>
              
              <div className="h-96">
                {radarLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Cargando...</div>
                ) : radarDataDisplay.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Sin datos para mostrar</div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarDataDisplay}>
                    <PolarGrid stroke="#d1d5db" strokeOpacity={0.8} gridType="polygon" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <PolarRadiusAxis
                      angle={90}
                      domain={radarDomain}
                      ticks={radarTicks}
                      tick={{ fontSize: 9, fill: "#6b7280" }}
                      tickFormatter={(v) => `${v}%`}
                      axisLine={false}
                    />
                    <Customized component={RadarTicksAllAxes} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload as { dimension: string; cv?: number; ue: number; espania?: number; provincia?: number };
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
                            <p className="font-semibold text-gray-900 mb-1">{row?.dimension}</p>
                            {isSpainWithProvince ? (
                              <>
                                <p className="text-[#F97316]">Media UE: {row?.ue ?? 0}</p>
                                <p className="text-[#1E3A5F]">España: {row?.espania ?? 0}</p>
                                <p className="text-[#059669]">{radarProvincia}: {row?.provincia ?? 0}</p>
                              </>
                            ) : (
                              <>
                                <p className="text-[#1E3A5F]">{radarProvincia}: {row?.cv ?? 0}</p>
                                <p className="text-[#F97316]">Media UE: {row?.ue ?? 0}</p>
                              </>
                            )}
                          </div>
                        );
                      }}
                    />
                    {isSpainWithProvince ? (
                      <>
                        <Radar name="Media UE" dataKey="ue" stroke="#F97316" fill="#FB923C" fillOpacity={0.2} strokeDasharray="5 5" strokeWidth={2} dot={{ r: 4, fill: "#F97316" }} />
                        <Radar name="España" dataKey="espania" stroke="#1E3A5F" fill="#1E3A5F" fillOpacity={0.15} strokeWidth={2} dot={{ r: 4, fill: "#1E3A5F" }} />
                        <Radar name={radarProvincia} dataKey="provincia" stroke="#059669" fill="#10B981" fillOpacity={0.2} strokeWidth={2} dot={{ r: 4, fill: "#059669" }} />
                      </>
                    ) : (
                      <>
                        <Radar name={radarProvincia} dataKey="cv" stroke="#1E3A5F" fill="#1E3A5F" fillOpacity={0.15} strokeWidth={2} dot={{ r: 4, fill: "#1E3A5F" }} />
                        <Radar name="Media UE" dataKey="ue" stroke="#F97316" fill="#FB923C" fillOpacity={0.2} strokeDasharray="5 5" strokeWidth={2} dot={{ r: 4, fill: "#F97316" }} />
                      </>
                    )}
                  </RadarChart>
                </ResponsiveContainer>
                )}
              </div>
              
              <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 mt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-[#F97316]" />
                  <span className="text-sm text-gray-600">Media UE</span>
                </div>
                {isSpainWithProvince ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-[#1E3A5F]" />
                      <span className="text-sm text-gray-600">España</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-[#059669]" />
                      <span className="text-sm text-gray-600">{radarProvincia}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-[#1E3A5F]" />
                    <span className="text-sm text-gray-600">{radarProvincia}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Strategic Indicators Table */}
            <Card className="p-6 bg-white">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Indicadores Estratégicos Clave
                </h2>
                <p className="text-sm text-gray-600">
                  Principales métricas de rendimiento comparadas con referencias nacionales e internacionales
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Indicador</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Valor Actual</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Media Nacional</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Top Europeo</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Tendencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">Empresas con análisis Big Data</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-700 font-medium">14.2%</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-600">12.8%</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-600">24.5%</td>
                      <td className="py-3 px-4 text-center">
                        <TrendingUp className="h-5 w-5 text-green-600 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">Especialistas TIC</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-700 font-medium">4.8% empleados</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-600">4.5% empleados</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-600">8.9% empleados</td>
                      <td className="py-3 px-4 text-center">
                        <TrendingUp className="h-5 w-5 text-green-600 mx-auto" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
    </>
  );
};

export default Dashboard;
