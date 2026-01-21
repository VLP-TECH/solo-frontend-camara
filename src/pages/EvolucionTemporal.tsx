import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
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
  LayoutDashboard,
  Layers,
  LineChart,
  Map,
  BookOpen,
  Clock,
  FileText,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Shield,
  LogOut
} from "lucide-react";
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
  const [selectedTerritorio, setSelectedTerritorio] = useState("Comunitat Valenciana");
  const [selectedAno, setSelectedAno] = useState("2024");
  const [selectedReferencia, setSelectedReferencia] = useState("Media UE");
  const [selectedIndicador, setSelectedIndicador] = useState("Empresas con análisis Big Data - Transformación Digital");

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Datos para el gráfico de evolución por dimensiones
  const dimensionesData = [
    { year: 2020, "Capital Humano": 62, "Ecosistema": 58, "Emprendimiento": 50, "Infraestructura": 65, "Servicios Públicos": 60, "Sostenibilidad": 55, "Transformación Digital": 58 },
    { year: 2021, "Capital Humano": 64, "Ecosistema": 60, "Emprendimiento": 52, "Infraestructura": 68, "Servicios Públicos": 62, "Sostenibilidad": 57, "Transformación Digital": 60 },
    { year: 2022, "Capital Humano": 66, "Ecosistema": 62, "Emprendimiento": 54, "Infraestructura": 70, "Servicios Públicos": 64, "Sostenibilidad": 59, "Transformación Digital": 62 },
    { year: 2023, "Capital Humano": 68, "Ecosistema": 64, "Emprendimiento": 56, "Infraestructura": 72, "Servicios Públicos": 66, "Sostenibilidad": 61, "Transformación Digital": 64 },
    { year: 2024, "Capital Humano": 70, "Ecosistema": 66, "Emprendimiento": 58, "Infraestructura": 75, "Servicios Públicos": 68, "Sostenibilidad": 63, "Transformación Digital": 66 },
  ];

  // Datos para el gráfico del índice global
  const indiceGlobalData = [
    { year: 2020, valor: 58.3, cambio: null },
    { year: 2021, valor: 61.2, cambio: "+2.9" },
    { year: 2022, valor: 63.8, cambio: "+2.6" },
    { year: 2023, valor: 65.5, cambio: "+1.7" },
    { year: 2024, valor: 67.2, cambio: "+1.7" },
  ];

  // Datos para el gráfico de indicador específico
  const indicadorData = [
    { year: 2020, "Comunitat Valenciana": 10.0, "Media España": 9.2, "Media UE": 18.5 },
    { year: 2021, "Comunitat Valenciana": 11.2, "Media España": 10.1, "Media UE": 19.8 },
    { year: 2022, "Comunitat Valenciana": 12.5, "Media España": 11.0, "Media UE": 21.0 },
    { year: 2023, "Comunitat Valenciana": 13.6, "Media España": 12.0, "Media UE": 22.8 },
    { year: 2024, "Comunitat Valenciana": 14.2, "Media España": 12.8, "Media UE": 24.5 },
  ];

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard General", href: "/dashboard" },
    { icon: Layers, label: "Dimensiones", href: "/dimensiones" },
    { icon: LineChart, label: "Todos los Indicadores", href: "/kpis" },
    { icon: Map, label: "Comparación Territorial", href: "/comparacion" },
    { icon: Clock, label: "Evolución Temporal", href: "/evolucion", active: true },
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
                  <Select value={selectedIndicador} onValueChange={setSelectedIndicador}>
                    <SelectTrigger className="w-80 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Empresas con análisis Big Data - Transformación Digital">
                        Empresas con análisis Big Data - Transformación Digital
                      </SelectItem>
                      <SelectItem value="Especialistas TIC - Capital Humano">
                        Especialistas TIC - Capital Humano
                      </SelectItem>
                      <SelectItem value="Cobertura de fibra óptica - Infraestructura">
                        Cobertura de fibra óptica - Infraestructura
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600 mb-1">Crecimiento CV</p>
                      <h3 className="text-2xl font-bold text-gray-900">+39.2%</h3>
                      <p className="text-xs text-gray-600 mt-1">2020-2024</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600 mb-1">Crecimiento España</p>
                      <h3 className="text-2xl font-bold text-gray-900">+30.6%</h3>
                      <p className="text-xs text-gray-600 mt-1">2020-2024</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600 mb-1">Crecimiento UE</p>
                      <h3 className="text-2xl font-bold text-gray-900">+32.4%</h3>
                      <p className="text-xs text-gray-600 mt-1">2020-2024</p>
                    </CardContent>
                  </Card>
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
                        domain={[0, 28]}
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
                        strokeDasharray="5 5"
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Media España" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Media UE" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 4 }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
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
  );
};

export default EvolucionTemporal;

