import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
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
  LogOut,
} from "lucide-react";
import { useAppMenuItems } from "@/hooks/useAppMenuItems";
import FloatingCamaraLogo from "@/components/FloatingCamaraLogo";
import { getAvailablePaisYPeriodo } from "@/lib/kpis-data";
import { getFiltrosGlobales } from "@/lib/brainnova-api";
import {
  getDashboardSnapshot,
  paisToTerritorioKey,
  type DashboardSnapshot,
  type TerritorioKey,
} from "@/lib/dashboard-snapshot";
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
const RADAR_DOMAIN: [number, number] = [0, 100];
const RADAR_TICKS = [0, 20, 40, 60, 80, 100];
const PROVINCIAS_CV: ReadonlyArray<TerritorioKey> = ["valencia", "alicante", "castellon"];
const PROVINCIA_DISPLAY: Record<string, string> = {
  valencia: "Valencia",
  alicante: "Alicante",
  castellon: "Castellón",
};
const PAISES_OPCIONES = [
  "Alicante",
  "Castellón",
  "Comunidad Valenciana",
  "España",
  "Valencia",
];

function RadarTicksAllAxes({
  cx,
  cy,
  startAngle,
  innerRadius,
  outerRadius,
}: {
  cx?: number;
  cy?: number;
  startAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
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

function RadarDimensionTick(props: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const x = props.x ?? 0;
  const y = props.y ?? 0;
  const value = String(props.payload?.value ?? "");
  const [dimension, topPais] = value.split("||");
  return (
    <g>
      <text x={x} y={y} textAnchor="middle" fill="#374151" fontSize={11}>
        <tspan x={x} dy="0">
          {dimension}
        </tspan>
        {topPais ? (
          <tspan x={x} dy="1.2em" fill="#16a34a">
            {topPais}
          </tspan>
        ) : null}
      </text>
    </g>
  );
}

const fmtIndice = (v: number | null | undefined) =>
  v == null || Number.isNaN(v)
    ? "—"
    : v.toLocaleString("es-ES", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const [radarAnoSelect, setRadarAnoSelect] = useState<string>("2024");
  const [radarPaisSelect, setRadarPaisSelect] = useState<string>("España");
  const [radarProvinciaSelect, setRadarProvinciaSelect] = useState<string>("");
  const [radarAno, setRadarAno] = useState<string>("2024");
  const [radarPaisAplicado, setRadarPaisAplicado] = useState<string>("España");
  const [radarProvincia, setRadarProvincia] = useState<string>("España");

  const periodoSnapshot = Number(radarAno) || 2024;

  const { data: snapshot, isPending: snapshotLoading, isFetching: snapshotFetching } =
    useQuery<DashboardSnapshot>({
      queryKey: ["dashboard-snapshot", periodoSnapshot],
      queryFn: () => getDashboardSnapshot(periodoSnapshot),
    });

  const { data: filtrosGlobales } = useQuery({
    queryKey: ["filtros-globales-radar"],
    queryFn: () => getFiltrosGlobales(),
  });

  const { data: availablePaisPeriodo } = useQuery({
    queryKey: ["available-pais-periodo"],
    queryFn: getAvailablePaisYPeriodo,
  });

  const aniosOpciones = useMemo<string[]>(() => {
    if (filtrosGlobales?.anios?.length) {
      return [...filtrosGlobales.anios].sort((a, b) => b - a).map(String);
    }
    if (availablePaisPeriodo?.periodos?.length) {
      return availablePaisPeriodo.periodos.map(String);
    }
    return ["2024", "2023", "2022", "2021", "2020"];
  }, [filtrosGlobales?.anios, availablePaisPeriodo?.periodos]);

  const isRadarSpain = radarPaisSelect === "España" || radarPaisSelect === "Spain";
  const showRadarProvincia = isRadarSpain;

  const handleRadarPaisChange = (pais: string) => {
    setRadarPaisSelect(pais);
    if (pais !== "España" && pais !== "Spain") setRadarProvinciaSelect("");
  };

  const handleMostrarRadar = () => {
    setRadarAno(radarAnoSelect);
    setRadarPaisAplicado(radarPaisSelect);
    setRadarProvincia(
      showRadarProvincia && radarProvinciaSelect && radarProvinciaSelect !== "_"
        ? radarProvinciaSelect
        : radarPaisSelect
    );
  };

  const isSpainWithProvince =
    (radarPaisAplicado === "España" || radarPaisAplicado === "Spain") &&
    PROVINCIAS_CV.some((p) => PROVINCIA_DISPLAY[p] === radarProvincia);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "https://brainnova.info/";
  };

  const radarDataDisplay = useMemo(() => {
    if (!snapshot) return [];
    const territorioKey: TerritorioKey = isSpainWithProvince
      ? paisToTerritorioKey(radarProvincia)
      : paisToTerritorioKey(radarProvincia);
    return snapshot.dimensiones.map((dim) => {
      const ueScore = dim.scoreUE;
      const topPais = dim.topUEPais;
      if (isSpainWithProvince) {
        return {
          dimension: dim.nombre,
          dimensionLabel: `${dim.nombre}||${topPais}`,
          ue: ueScore,
          espania: dim.scoresPorTerritorio.espana?.score ?? 0,
          provincia: dim.scoresPorTerritorio[territorioKey]?.score ?? 0,
        };
      }
      return {
        dimension: dim.nombre,
        dimensionLabel: `${dim.nombre}||${topPais}`,
        cv: dim.scoresPorTerritorio[territorioKey]?.score ?? 0,
        ue: ueScore,
      };
    });
  }, [snapshot, radarProvincia, isSpainWithProvince]);

  const indiceGlobalDashboard = useMemo(() => {
    if (!snapshot) return null;
    const cv = snapshot.indiceGlobal.comunitatValenciana;
    const esp = snapshot.indiceGlobal.espana;
    const de = snapshot.indiceGlobal.alemania;
    const alicante = snapshot.indiceGlobal.alicante;
    const castellon = snapshot.indiceGlobal.castellon;
    const valencia = snapshot.indiceGlobal.valencia;
    const relativoTopUE =
      cv != null && de != null && de > 0 ? (cv / de) * 100 : null;
    const valsProv = [alicante, castellon, valencia].filter(
      (v): v is number => v != null && !Number.isNaN(v)
    );
    const mediaProvincias =
      valsProv.length > 0
        ? valsProv.reduce((a, b) => a + b, 0) / valsProv.length
        : null;
    const relativoTerritoriosUE =
      mediaProvincias != null && de != null && de > 0
        ? (mediaProvincias / de) * 100
        : null;
    return {
      cv,
      esp,
      de,
      relativoTopUE,
      alicante,
      castellon,
      valencia,
      relativoTerritoriosUE,
    };
  }, [snapshot]);

  const dimensionMasFuerteCV = useMemo(() => {
    if (!snapshot) return null;
    const conDatos = snapshot.dimensiones
      .map((d) => ({
        nombre: d.nombre,
        score: d.scoresPorTerritorio.comunitatValenciana?.score ?? 0,
      }))
      .filter((d) => d.score > 0);
    if (!conDatos.length) return null;
    const max = conDatos.reduce((a, c) => (c.score > a.score ? c : a));
    return { nombre: max.nombre, score: Math.round(max.score * 10) / 10 };
  }, [snapshot]);

  const dimensionMasDebilCV = useMemo(() => {
    if (!snapshot) return null;
    const conDatos = snapshot.dimensiones
      .map((d) => ({
        nombre: d.nombre,
        score: d.scoresPorTerritorio.comunitatValenciana?.score ?? 0,
      }))
      .filter((d) => d.score > 0);
    if (!conDatos.length) return null;
    const min = conDatos.reduce((a, c) => (c.score < a.score ? c : a));
    return { nombre: min.nombre, score: Math.round(min.score * 10) / 10 };
  }, [snapshot]);

  const comparativaDimensionesDashboard = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.dimensiones.map((dim) => {
      const valencia = dim.scoresPorTerritorio.valencia?.score ?? 0;
      const alicante = dim.scoresPorTerritorio.alicante?.score ?? 0;
      const castellon = dim.scoresPorTerritorio.castellon?.score ?? 0;
      const max = Math.max(valencia, alicante, castellon);
      const destacado: "valencia" | "alicante" | "castellon" =
        max === valencia ? "valencia" : max === alicante ? "alicante" : "castellon";
      return { dimension: dim.nombre, valencia, alicante, castellon, destacado };
    });
  }, [snapshot]);

  const menuItems = useAppMenuItems();

  useEffect(() => {
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "auto";
    }
  }, []);

  return (
    <>
      <FloatingCamaraLogo />
      <div className="min-h-screen bg-gray-100 flex">
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (item.href) navigate(item.href);
                    }}
                    disabled={isDisabled}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors relative ${
                      isActive
                        ? "bg-[#0a5a73] text-white"
                        : isDisabled
                        ? "text-blue-300 opacity-50 cursor-not-allowed"
                        : "text-blue-100 hover:bg-[#0a5a73]/50"
                    }`}
                    style={isActive ? { borderLeft: "4px solid #4FD1C7" } : {}}
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

        <div className="flex-1 flex flex-col">
          <header className="bg-[#0c6c8b] text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold">Panel de Economía Digital</h2>
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

          <main className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#0c6c8b] mb-2">
                  Índice Global de Economía Digital BRAINNOVA
                </h1>
                <p className="text-lg text-gray-600">
                  Análisis integral del desarrollo de la economía digital.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="p-6 bg-white">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-semibold text-gray-700 mb-2">Índice Global</p>
                      {snapshotLoading ? (
                        <p className="text-sm text-gray-500">Calculando…</p>
                      ) : (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-600">Comunitat Valenciana</span>
                            <span className="font-semibold text-gray-900 tabular-nums">
                              {fmtIndice(indiceGlobalDashboard?.cv ?? null)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-600">España</span>
                            <span className="font-semibold text-gray-900 tabular-nums">
                              {fmtIndice(indiceGlobalDashboard?.esp ?? null)}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Relativo al top UE</p>
                            <p className="text-lg font-bold text-[#0c6c8b] tabular-nums">
                              {fmtIndice(indiceGlobalDashboard?.relativoTopUE ?? null)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <User className="h-8 w-8 text-gray-400 shrink-0" />
                  </div>
                </Card>

                <Card className="p-6 bg-white">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xl font-semibold text-gray-700 mb-1">
                        Dimensión más fuerte en Comunidad Valenciana
                      </p>
                      <h3 className="text-sm font-normal text-gray-900 mb-1">
                        {snapshotLoading
                          ? "Calculando…"
                          : dimensionMasFuerteCV?.nombre ?? "Sin datos"}
                      </h3>
                      <p className="text-2xl font-bold text-[#0c6c8b]">
                        {snapshotLoading
                          ? "—"
                          : fmtIndice(dimensionMasFuerteCV?.score ?? null)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">puntos</p>
                    </div>
                    <Wifi className="h-8 w-8 text-gray-400" />
                  </div>
                </Card>

                <Card className="p-6 bg-white">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xl font-semibold text-gray-700 mb-1">
                        Dimensión más débil en Comunidad Valenciana
                      </p>
                      <h3 className="text-sm font-normal text-gray-900 mb-1">
                        {snapshotLoading
                          ? "Calculando…"
                          : dimensionMasDebilCV?.nombre ?? "Sin datos"}
                      </h3>
                      <p className="text-2xl font-bold text-red-600">
                        {snapshotLoading
                          ? "—"
                          : fmtIndice(dimensionMasDebilCV?.score ?? null)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">puntos</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-400" />
                  </div>
                </Card>

                <Card className="p-6 bg-white">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-semibold text-gray-700 mb-2">Índice por territorio</p>
                      {snapshotLoading ? (
                        <p className="text-sm text-gray-500">Calculando…</p>
                      ) : (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-600">Alicante</span>
                            <span className="font-semibold text-gray-900 tabular-nums">
                              {fmtIndice(indiceGlobalDashboard?.alicante ?? null)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-600">Castellón</span>
                            <span className="font-semibold text-gray-900 tabular-nums">
                              {fmtIndice(indiceGlobalDashboard?.castellon ?? null)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-600">Valencia</span>
                            <span className="font-semibold text-gray-900 tabular-nums">
                              {fmtIndice(indiceGlobalDashboard?.valencia ?? null)}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Relativo al top UE</p>
                            <p className="text-lg font-bold text-[#0c6c8b] tabular-nums">
                              {fmtIndice(indiceGlobalDashboard?.relativoTerritoriosUE ?? null)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <Target className="h-8 w-8 text-gray-400 shrink-0" />
                  </div>
                </Card>
              </div>

              <Card className="p-6 bg-white mb-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Análisis por Dimensión</h2>
                    <p className="text-sm text-gray-600">
                      Índice BRAINNOVA por las 7 dimensiones
                      {isSpainWithProvince ? (
                        <>
                          {" "}
                          para <strong>Media UE</strong>, <strong>España</strong> y{" "}
                          <strong>{radarProvincia}</strong>
                        </>
                      ) : (
                        <>
                          {" "}
                          para <strong>{radarProvincia}</strong>
                        </>
                      )}{" "}
                      ({radarAno}).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Select value={radarAnoSelect} onValueChange={setRadarAnoSelect}>
                      <SelectTrigger className="w-28 bg-white">
                        <SelectValue placeholder="Año" />
                      </SelectTrigger>
                      <SelectContent>
                        {aniosOpciones.map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={radarPaisSelect} onValueChange={handleRadarPaisChange}>
                      <SelectTrigger className="w-44 bg-white">
                        <SelectValue placeholder="País" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAISES_OPCIONES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showRadarProvincia && (
                      <Select
                        value={radarProvinciaSelect || "_"}
                        onValueChange={(v) => setRadarProvinciaSelect(v === "_" ? "" : v)}
                      >
                        <SelectTrigger className="w-44 bg-white">
                          <SelectValue placeholder="Provincia (Castellón, Valencia, Alicante)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_">— Provincia —</SelectItem>
                          {(["Valencia", "Alicante", "Castellón"] as const).map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      onClick={handleMostrarRadar}
                      disabled={snapshotFetching}
                      className="bg-[#0c6c8b] hover:bg-[#0c6c8b]/90 text-white disabled:opacity-70"
                    >
                      {snapshotFetching ? "CALCULANDO..." : "MOSTRAR"}
                    </Button>
                  </div>
                </div>

                <div className="h-96">
                  {snapshotLoading ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      Cargando...
                    </div>
                  ) : radarDataDisplay.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      Sin datos para mostrar
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarDataDisplay}>
                        <PolarGrid stroke="#d1d5db" strokeOpacity={0.8} gridType="polygon" />
                        <PolarAngleAxis dataKey="dimensionLabel" tick={<RadarDimensionTick />} />
                        <PolarRadiusAxis
                          angle={90}
                          domain={RADAR_DOMAIN}
                          ticks={RADAR_TICKS}
                          tick={{ fontSize: 9, fill: "#6b7280" }}
                          tickFormatter={(v) => `${v}%`}
                          axisLine={false}
                        />
                        <Customized component={RadarTicksAllAxes} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const row = payload[0]?.payload as {
                              dimension: string;
                              cv?: number;
                              ue: number;
                              espania?: number;
                              provincia?: number;
                            };
                            return (
                              <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
                                <p className="font-semibold text-gray-900 mb-1">{row?.dimension}</p>
                                {isSpainWithProvince ? (
                                  <>
                                    <p className="text-[#F97316]">Media UE: {row?.ue ?? 0}</p>
                                    <p className="text-[#1E3A5F]">España: {row?.espania ?? 0}</p>
                                    <p className="text-[#059669]">
                                      {radarProvincia}: {row?.provincia ?? 0}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-[#1E3A5F]">
                                      {radarProvincia}: {row?.cv ?? 0}
                                    </p>
                                    <p className="text-[#F97316]">Media UE: {row?.ue ?? 0}</p>
                                  </>
                                )}
                              </div>
                            );
                          }}
                        />
                        {isSpainWithProvince ? (
                          <>
                            <Radar
                              name="Media UE"
                              dataKey="ue"
                              stroke="#F97316"
                              fill="#FB923C"
                              fillOpacity={0.2}
                              strokeDasharray="5 5"
                              strokeWidth={2}
                              dot={{ r: 4, fill: "#F97316" }}
                            />
                            <Radar
                              name="España"
                              dataKey="espania"
                              stroke="#1E3A5F"
                              fill="#1E3A5F"
                              fillOpacity={0.15}
                              strokeWidth={2}
                              dot={{ r: 4, fill: "#1E3A5F" }}
                            />
                            <Radar
                              name={radarProvincia}
                              dataKey="provincia"
                              stroke="#059669"
                              fill="#10B981"
                              fillOpacity={0.2}
                              strokeWidth={2}
                              dot={{ r: 4, fill: "#059669" }}
                            />
                          </>
                        ) : (
                          <>
                            <Radar
                              name={radarProvincia}
                              dataKey="cv"
                              stroke="#1E3A5F"
                              fill="#1E3A5F"
                              fillOpacity={0.15}
                              strokeWidth={2}
                              dot={{ r: 4, fill: "#1E3A5F" }}
                            />
                            <Radar
                              name="Media UE"
                              dataKey="ue"
                              stroke="#F97316"
                              fill="#FB923C"
                              fillOpacity={0.2}
                              strokeDasharray="5 5"
                              strokeWidth={2}
                              dot={{ r: 4, fill: "#F97316" }}
                            />
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
                <p className="text-xs text-gray-500 text-center mt-3">
                  País en verde = TOP UE de esa dimensión.
                </p>
              </Card>

              <Card className="p-6 bg-white mb-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Comparativa Detallada por Dimensiones
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  {snapshotLoading ? (
                    <div className="py-8 text-center text-gray-500">Cargando comparativa...</div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Dimensión
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                            Valencia
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                            Alicante
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                            Castellón
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparativaDimensionesDashboard.map((row) => (
                          <tr key={row.dimension} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-900">{row.dimension}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <span
                                  className={`text-sm font-medium ${
                                    row.destacado === "valencia"
                                      ? "text-green-600"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {fmtIndice(row.valencia)}
                                </span>
                                {row.destacado === "valencia" && (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <span
                                  className={`text-sm font-medium ${
                                    row.destacado === "alicante"
                                      ? "text-green-600"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {fmtIndice(row.alicante)}
                                </span>
                                {row.destacado === "alicante" && (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <span
                                  className={`text-sm font-medium ${
                                    row.destacado === "castellon"
                                      ? "text-green-600"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {fmtIndice(row.castellon)}
                                </span>
                                {row.destacado === "castellon" && (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>

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
