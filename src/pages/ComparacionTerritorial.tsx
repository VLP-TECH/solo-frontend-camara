import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  MessageSquare,
  MapPin,
  TrendingUp,
  Award,
  Shield,
  LogOut
} from "lucide-react";

const ComparacionTerritorial = () => {
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

  const provincias = [
    { nombre: "Valencia", indice: 69.5, ranking: 1, dimensionDestacada: "Capital Humano", puntosDimension: 74, color: "#3B82F6" },
    { nombre: "Alicante", indice: 66.8, ranking: 2, dimensionDestacada: "Infraestructura Digital", puntosDimension: 76, color: "#3B82F6" },
    { nombre: "Castellón", indice: 64.3, ranking: 3, dimensionDestacada: "Transformación Digital", puntosDimension: 70, color: "#3B82F6" },
  ];

  const comparativaDimensiones = [
    { dimension: "Transformación Digital", valencia: 68, alicante: 66, castellon: 70, destacado: "castellon" },
    { dimension: "Capital Humano", valencia: 74, alicante: 70, castellon: 68, destacado: "valencia" },
    { dimension: "Infraestructura Digital", valencia: 75, alicante: 76, castellon: 72, destacado: "alicante" },
    { dimension: "Ecosistema", valencia: 65, alicante: 63, castellon: 61, destacado: "valencia" },
    { dimension: "Emprendimiento", valencia: 60, alicante: 58, castellon: 54, destacado: "valencia" },
    { dimension: "Servicios Públicos", valencia: 72, alicante: 68, castellon: 66, destacado: "valencia" },
    { dimension: "Sostenibilidad", valencia: 64, alicante: 62, castellon: 60, destacado: "valencia" },
  ];

  const getColorForIndex = (indice: number) => {
    if (indice >= 70) return "bg-green-500";
    if (indice >= 60) return "bg-blue-400";
    if (indice >= 50) return "bg-orange-400";
    return "bg-red-500";
  };

  const getLabelForIndex = (indice: number) => {
    if (indice >= 70) return "Excelente";
    if (indice >= 60) return "Bueno";
    if (indice >= 50) return "Medio";
    return "Bajo";
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard General", href: "/dashboard" },
    { icon: Layers, label: "Dimensiones", href: "/dimensiones" },
    { icon: LineChart, label: "Todos los Indicadores", href: "/kpis" },
    { icon: Map, label: "Comparación Territorial", href: "/comparacion", active: true },
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
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Title Section */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-[#0c6c8b] mb-2">
                Comparación Territorial
              </h1>
              <p className="text-lg text-gray-600">
                Análisis comparativo del índice BRAINNOVA por provincias de la Comunitat Valenciana
              </p>
            </div>

            {/* Mapa Provincial */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Mapa Provincial - Índice BRAINNOVA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between gap-8">
                  {/* Funnel Chart Representation */}
                  <div className="flex-1 flex flex-col items-center space-y-4">
                    {provincias.map((provincia, index) => {
                      const widthPercentage = (provincia.indice / 70) * 100;
                      const maxWidth = 300;
                      const minWidth = 150;
                      const actualWidth = Math.max(minWidth, (maxWidth * widthPercentage) / 100);
                      
                      return (
                        <div key={provincia.nombre} className="w-full flex items-center justify-center">
                          <div 
                            className={`${getColorForIndex(provincia.indice)} rounded-lg p-4 text-white flex items-center justify-between`}
                            style={{ 
                              width: `${actualWidth}px`,
                              minHeight: '60px'
                            }}
                          >
                            <span className="font-semibold text-lg">{provincia.nombre}</span>
                            <div className="bg-white rounded-full w-14 h-14 flex items-center justify-center ml-4">
                              <span className="text-gray-900 font-bold text-lg">{provincia.indice}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="ml-8 flex-shrink-0">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Índice BRAINNOVA</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span className="text-sm text-gray-600">&gt;70 - Excelente</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-blue-400 rounded"></div>
                        <span className="text-sm text-gray-600">60-69 - Bueno</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-orange-400 rounded"></div>
                        <span className="text-sm text-gray-600">50-59 - Medio</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span className="text-sm text-gray-600">&lt;50 - Bajo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Province Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {provincias.map((provincia) => (
                <Card key={provincia.nombre} className="bg-white">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-5 w-5 text-[#0c6c8b]" />
                        <CardTitle className="text-lg">{provincia.nombre}</CardTitle>
                      </div>
                      {provincia.ranking === 1 && (
                        <Award className="h-6 w-6 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">Ranking #{provincia.ranking}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Índice Global</p>
                      <h3 className="text-3xl font-bold text-[#0c6c8b]">{provincia.indice}</h3>
                      <Progress value={provincia.indice} className="h-2 mt-2" />
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Dimensión Destacada</p>
                      <p className="font-semibold text-gray-900">{provincia.dimensionDestacada}</p>
                      <p className="text-2xl font-bold text-[#0c6c8b] mt-1">{provincia.puntosDimension}</p>
                      <p className="text-xs text-gray-500">puntos</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed Comparison Table */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Comparativa Detallada por Dimensiones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Dimensión</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Valencia</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Alicante</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Castellón</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparativaDimensiones.map((row) => (
                        <tr key={row.dimension} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-900">{row.dimension}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <span className={`text-sm font-medium ${
                                row.destacado === "valencia" ? "text-green-600" : "text-gray-700"
                              }`}>
                                {row.valencia}
                              </span>
                              {row.destacado === "valencia" && (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <span className={`text-sm font-medium ${
                                row.destacado === "alicante" ? "text-green-600" : "text-gray-700"
                              }`}>
                                {row.alicante}
                              </span>
                              {row.destacado === "alicante" && (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <span className={`text-sm font-medium ${
                                row.destacado === "castellon" ? "text-green-600" : "text-gray-700"
                              }`}>
                                {row.castellon}
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
                </div>
              </CardContent>
            </Card>

            {/* Territorial Analysis */}
            <Card className="bg-[#0c6c8b] text-white">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <p className="text-white/90 leading-relaxed">
                      Valencia lidera el ranking provincial (69.5 pts) destacando en Capital Humano, seguida de Alicante (66.8 pts) con fortaleza en Infraestructura Digital. Castellón (64.3 pts) muestra oportunidades de mejora especialmente en Apoyo al emprendimiento e innovación.
                    </p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="bg-white/10 rounded-lg p-4 text-center min-w-[120px]">
                      <p className="text-xs text-blue-200 mb-1">Brecha Provincial</p>
                      <p className="text-2xl font-bold">5.2</p>
                      <p className="text-xs text-blue-200">puntos</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 text-center min-w-[120px]">
                      <p className="text-xs text-blue-200 mb-1">Media Regional</p>
                      <p className="text-2xl font-bold">66.9</p>
                      <p className="text-xs text-blue-200">puntos</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 text-center min-w-[120px]">
                      <p className="text-xs text-blue-200 mb-1">Tendencia</p>
                      <div className="flex items-center justify-center space-x-1">
                        <TrendingUp className="h-5 w-5" />
                        <p className="text-lg font-bold">Convergente</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ComparacionTerritorial;

