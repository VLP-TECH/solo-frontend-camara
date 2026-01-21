import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
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
  LayoutDashboard,
  Layers,
  LineChart,
  Map,
  BookOpen,
  Clock,
  FileText,
  User,
  Target,
  Wifi,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  MessageSquare,
  LogOut,
  Shield
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from "recharts";

const Dashboard = () => {
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

  // Datos del gráfico radar (ejemplo)
  const radarData = [
    { dimension: "Transformación Digital", cv: 65, ue: 60, topUE: 85 },
    { dimension: "Capital Humano", cv: 70, ue: 65, topUE: 90 },
    { dimension: "Infraestructura Digital", cv: 75, ue: 70, topUE: 95 },
    { dimension: "Ecosistema y Colaboración", cv: 68, ue: 63, topUE: 88 },
    { dimension: "Emprendimiento e Innovación", cv: 58, ue: 55, topUE: 80 },
    { dimension: "Servicios Públicos", cv: 72, ue: 68, topUE: 92 },
    { dimension: "Sostenibilidad Digital", cv: 66, ue: 62, topUE: 87 },
  ];

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard General", href: "/dashboard", active: true },
    { icon: Layers, label: "Dimensiones", href: "/dimensiones" },
    { icon: LineChart, label: "Todos los Indicadores", href: "/kpis" },
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
        <header className="bg-[#0c6c8b] text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">BRAINNOVA Economía Digital</h2>
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
            {/* Title Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#0c6c8b] mb-2">
                Índice Global de Economía Digital BRAINNOVA
              </h1>
              <p className="text-lg text-gray-600">
                Análisis integral del desarrollo de la economía digital en Comunitat Valenciana
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

            {/* Analysis by Dimensions */}
            <Card className="p-6 bg-white mb-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Análisis por Dimensiones
                </h2>
                <p className="text-sm text-gray-600">
                  Comparativa del índice BRAINNOVA CV vs Media UE
                </p>
              </div>
              
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="Comunitat Valenciana"
                      dataKey="cv"
                      stroke="#0c6c8b"
                      fill="#0c6c8b"
                      fillOpacity={0.6}
                    />
                    <Radar
                      name="Media UE"
                      dataKey="ue"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.3}
                      strokeDasharray="5 5"
                    />
                    <Radar
                      name="Top UE"
                      dataKey="topUE"
                      stroke="#93C5FD"
                      fill="#93C5FD"
                      fillOpacity={0.1}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex items-center justify-center space-x-6 mt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-[#0c6c8b]"></div>
                  <span className="text-sm text-gray-600">Comunitat Valenciana</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-[#3B82F6]"></div>
                  <span className="text-sm text-gray-600">Media UE</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-[#93C5FD]"></div>
                  <span className="text-sm text-gray-600">Top UE</span>
                </div>
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
  );
};

export default Dashboard;
