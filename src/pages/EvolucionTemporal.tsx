import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "@/lib/kpis-data";
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const EvolucionTemporal = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { roles } = usePermissions();
  const { isAdmin, profile, loading: profileLoading } = useUserProfile();
  const [selectedIndicador, setSelectedIndicador] = useState<string>("");

  const handleSignOut = async () => {
    await signOut();
    window.location.href = 'https://brainnova.info/';
  };

  // Indicadores disponibles desde BD
  const { data: todosIndicadores } = useQuery({
    queryKey: ["indicadores-evolucion"],
    queryFn: getIndicadores,
  });

  const indicadorActual = selectedIndicador || todosIndicadores?.[0]?.nombre || "";

  // Datos históricos del indicador seleccionado (España + Comunitat Valenciana + Alemania como ref UE)
  const { data: historicoCVRaw } = useQuery({
    queryKey: ["historico-cv", indicadorActual],
    queryFn: () => getDatosHistoricosIndicador(indicadorActual, "Comunitat Valenciana", 20),
    enabled: !!indicadorActual,
  });
  const { data: historicoEspRaw } = useQuery({
    queryKey: ["historico-esp", indicadorActual],
    queryFn: () => getDatosHistoricosIndicador(indicadorActual, "España", 20),
    enabled: !!indicadorActual,
  });
  const { data: historicoUERaw } = useQuery({
    queryKey: ["historico-ue", indicadorActual],
    queryFn: () => getDatosHistoricosIndicador(indicadorActual, "Alemania", 20),
    enabled: !!indicadorActual,
  });

  const indicadorData = useMemo(() => {
    const cvMap = new Map((historicoCVRaw || []).map(d => [d.periodo, d.valor]));
    const espMap = new Map((historicoEspRaw || []).map(d => [d.periodo, d.valor]));
    const ueMap = new Map((historicoUERaw || []).map(d => [d.periodo, d.valor]));
    const allYears = [...new Set([...cvMap.keys(), ...espMap.keys(), ...ueMap.keys()])].sort();
    return allYears.map(year => ({
      year,
      "Comunitat Valenciana": cvMap.get(year) ?? null,
      "España": espMap.get(year) ?? null,
      "Ref. UE (Alemania)": ueMap.get(year) ?? null,
    }));
  }, [historicoCVRaw, historicoEspRaw, historicoUERaw]);

  // Datos estáticos para evolución por dimensiones e índice global (se mantienen como referencia)
  const dimensionesData = [
    { year: 2020, "Capital Humano": 62, "Ecosistema": 58, "Emprendimiento": 50, "Infraestructura": 65, "Servicios Públicos": 60, "Sostenibilidad": 55, "Transformación Digital": 58 },
    { year: 2021, "Capital Humano": 64, "Ecosistema": 60, "Emprendimiento": 52, "Infraestructura": 68, "Servicios Públicos": 62, "Sostenibilidad": 57, "Transformación Digital": 60 },
    { year: 2022, "Capital Humano": 66, "Ecosistema": 62, "Emprendimiento": 54, "Infraestructura": 70, "Servicios Públicos": 64, "Sostenibilidad": 59, "Transformación Digital": 62 },
    { year: 2023, "Capital Humano": 68, "Ecosistema": 64, "Emprendimiento": 56, "Infraestructura": 72, "Servicios Públicos": 66, "Sostenibilidad": 61, "Transformación Digital": 64 },
    { year: 2024, "Capital Humano": 70, "Ecosistema": 66, "Emprendimiento": 58, "Infraestructura": 75, "Servicios Públicos": 68, "Sostenibilidad": 63, "Transformación Digital": 66 },
  ];

  const indiceGlobalData = [
    { year: 2020, valor: 58.3, cambio: null },
    { year: 2021, valor: 61.2, cambio: "+2.9" },
    { year: 2022, valor: 63.8, cambio: "+2.6" },
    { year: 2023, valor: 65.5, cambio: "+1.7" },
    { year: 2024, valor: 67.2, cambio: "+1.7" },
  ];

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
              <h1 className="text-3xl font-bold text-[#0c6c8b] mb-2">
                Evolución Temporal
              </h1>
              <p className="text-lg text-gray-600">
                Análisis de la evolución del Índice BRAINNOVA y sus dimensiones a lo largo del tiempo
              </p>
            </div>

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Crecimiento Total</p>
                      <h3 className="text-2xl font-bold text-gray-900">+8.9</h3>
                      <p className="text-xs text-gray-600 mt-1">puntos (2020-2024)</p>
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
                      <h3 className="text-2xl font-bold text-gray-900">+3.6%</h3>
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
                      <h3 className="text-xl font-bold mb-1">Infraestructura</h3>
                      <p className="text-2xl font-bold">+7.0</p>
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
                      <h3 className="text-xl font-bold mb-1">Emprendimiento</h3>
                      <p className="text-2xl font-bold text-orange-600">+8.0</p>
                      <p className="text-xs text-gray-600 mt-1">pts</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Evolución por Dimensiones */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Evolución por Dimensiones (2020-2024)
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Trayectoria de las siete dimensiones del Índice BRAINNOVA
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={dimensionesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="year" 
                        stroke="#6b7280"
                        tick={{ fill: '#6b7280' }}
                      />
                      <YAxis 
                        domain={[40, 80]}
                        stroke="#6b7280"
                        tick={{ fill: '#6b7280' }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="Capital Humano" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Ecosistema" 
                        stroke="#F97316" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Emprendimiento" 
                        stroke="#EF4444" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Infraestructura" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Servicios Públicos" 
                        stroke="#8B5CF6" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Sostenibilidad" 
                        stroke="#EAB308" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Transformación Digital" 
                        stroke="#14B8A6" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Evolución del Índice Global */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Evolución del Índice Global BRAINNOVA
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Progresión del Índice global agregado
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={indiceGlobalData}>
                      <defs>
                        <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="year" 
                        stroke="#6b7280"
                        tick={{ fill: '#6b7280' }}
                      />
                      <YAxis 
                        domain={[50, 75]}
                        stroke="#6b7280"
                        tick={{ fill: '#6b7280' }}
                      />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="valor" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorValor)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-around mt-4 pt-4 border-t border-gray-200">
                  {indiceGlobalData.map((item) => (
                    <div key={item.year} className="text-center">
                      <p className="text-sm font-semibold text-gray-900">{item.year}</p>
                      <p className="text-lg font-bold text-[#0c6c8b]">{item.valor}</p>
                      {item.cambio && (
                        <p className="text-xs text-green-600">{item.cambio}</p>
                      )}
                    </div>
                  ))}
                </div>
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
                  <Select value={indicadorActual} onValueChange={setSelectedIndicador}>
                    <SelectTrigger className="w-96 bg-white">
                      <SelectValue placeholder="Seleccionar indicador..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {(todosIndicadores || []).map((ind) => (
                        <SelectItem key={ind.id ?? ind.nombre} value={ind.nombre}>
                          {ind.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {indicadorData.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-gray-500">
                    <p>{indicadorActual ? "No hay datos históricos para este indicador." : "Selecciona un indicador para ver su evolución."}</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {(["Comunitat Valenciana", "España", "Ref. UE (Alemania)"] as const).map((serie, idx) => {
                        const values = indicadorData.map(d => d[serie]).filter((v): v is number => v !== null && v !== undefined);
                        const first = values[0];
                        const last = values[values.length - 1];
                        const growth = first && last && first !== 0
                          ? (((last - first) / Math.abs(first)) * 100).toFixed(1)
                          : null;
                        const bgColors = ["bg-blue-50 border-blue-200", "bg-blue-50 border-blue-200", "bg-green-50 border-green-200"];
                        const years = indicadorData.map(d => d.year);
                        return (
                          <Card key={serie} className={bgColors[idx]}>
                            <CardContent className="p-4">
                              <p className="text-sm text-gray-600 mb-1">{serie}</p>
                              <h3 className="text-2xl font-bold text-gray-900">
                                {growth !== null ? `${Number(growth) >= 0 ? '+' : ''}${growth}%` : "—"}
                              </h3>
                              <p className="text-xs text-gray-600 mt-1">
                                {years.length >= 2 ? `${years[0]}-${years[years.length - 1]}` : ""}
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
                            tick={{ fill: '#6b7280' }}
                          />
                          <YAxis 
                            stroke="#6b7280"
                            tick={{ fill: '#6b7280' }}
                          />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="Comunitat Valenciana" 
                            stroke="#0c6c8b" 
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            connectNulls
                          />
                          <Line 
                            type="monotone" 
                            dataKey="España" 
                            stroke="#3B82F6" 
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            connectNulls
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Ref. UE (Alemania)" 
                            stroke="#10B981" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 4 }}
                            connectNulls
                          />
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

