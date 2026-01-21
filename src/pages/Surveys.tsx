import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  LayoutDashboard,
  Layers,
  LineChart,
  Map,
  BookOpen,
  Clock,
  FileText,
  MessageSquare,
  FileText as FileTextIcon,
  Calendar,
  Users,
  Plus,
  Shield
} from "lucide-react";
import { toast } from "sonner";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  active: boolean;
}

const Surveys = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { permissions, roles } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSurveys();
  }, [permissions.canUploadDataSources]);

  const fetchSurveys = async () => {
    try {
      // Los admins pueden ver todas las encuestas, otros usuarios solo las activas
      let query = supabase
        .from("surveys")
        .select("*")
        .order("created_at", { ascending: false });

      // Si no es admin, solo mostrar encuestas activas
      if (!permissions.canUploadDataSources) {
        query = query.eq("active", true);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching surveys:", error);
        throw error;
      }
      setSurveys(data || []);
    } catch (error: any) {
      console.error("Error fetching surveys:", error);
      toast.error(`Error al cargar las encuestas: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSurvey = (surveyId: string) => {
    if (!user) {
      toast.error("Debes iniciar sesión para participar en encuestas");
      navigate("/auth");
      return;
    }
    navigate(`/encuestas/${surveyId}`);
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard General", href: "/dashboard" },
    { icon: Layers, label: "Dimensiones", href: "/dimensiones" },
    { icon: LineChart, label: "Todos los Indicadores", href: "/kpis" },
    { icon: Map, label: "Comparación Territorial", href: "/comparacion" },
    { icon: Clock, label: "Evolución Temporal", href: "/evolucion" },
    { icon: FileText, label: "Informes", href: "/informes" },
    { icon: MessageSquare, label: "Encuestas", href: "/encuestas", active: true },
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
            <h2 className="text-lg font-semibold">BRAINNOVA Economía Digital</h2>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-[#0c6c8b] mb-2">
                    Encuestas disponibles
                  </h1>
                  <p className="text-lg text-gray-600">
                    Participa en las encuestas del ecosistema digital valenciano
                  </p>
                </div>
                {permissions.canUploadDataSources && (
                  <Button
                    onClick={() => navigate("/encuestas/crear")}
                    size="lg"
                    className="bg-[#0c6c8b] text-white hover:bg-[#0a5a73] flex items-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Crear encuesta
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse bg-white">
                      <CardHeader>
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-full" />
                      </CardHeader>
                      <CardContent>
                        <div className="h-10 bg-gray-200 rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : surveys.length === 0 ? (
                <Card className="text-center py-12 bg-white">
                  <CardContent>
                    <FileTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-xl text-gray-600">
                      No hay encuestas disponibles en este momento
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {surveys.map((survey) => (
                    <Card key={survey.id} className="hover:shadow-lg transition-all duration-300 bg-white">
                      <CardHeader>
                        <CardTitle className="flex items-start gap-2">
                          <FileTextIcon className="h-5 w-5 text-[#0c6c8b] mt-1 flex-shrink-0" />
                          <span className="line-clamp-2">{survey.title}</span>
                        </CardTitle>
                        <CardDescription className="line-clamp-3">
                          {survey.description || "Sin descripción"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(survey.created_at).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'long'
                            })}
                          </span>
                        </div>
                        <Button
                          onClick={() => handleStartSurvey(survey.id)}
                          className="w-full bg-[#0c6c8b] text-white hover:bg-[#0a5a73]"
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Participar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Surveys;
