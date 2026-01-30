import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfile } from "@/hooks/useUserProfile";
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
  Shield,
  LogOut,
  Pencil,
  BarChart3,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  active: boolean;
  visible_to_users?: boolean;
}

interface SurveyQuestion {
  id: string;
  question_text: string;
  order_index: number;
}

interface SurveyResponse {
  id: string;
  user_id: string;
  answers: Record<string, string>;
  submitted_at: string;
}

interface ProfileInfo {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

function escapeCSV(value: string): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const Surveys = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [resultsSurvey, setResultsSurvey] = useState<{ id: string; title: string } | null>(null);
  const [resultsQuestions, setResultsQuestions] = useState<SurveyQuestion[]>([]);
  const [resultsResponses, setResultsResponses] = useState<SurveyResponse[]>([]);
  const [resultsProfiles, setResultsProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loadingResults, setLoadingResults] = useState(false);
  const { user, signOut } = useAuth();
  const { permissions, roles } = usePermissions();
  const { isAdmin, profile, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Solo admin y superadmin pueden crear encuestas
  const role = profile?.role?.toLowerCase().trim();
  const profileRoleIsAdmin = role === 'admin' || role === 'superadmin';
  const canCreateSurvey = isAdmin || roles.isAdmin || roles.isSuperAdmin || profileRoleIsAdmin;

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
      let list = data || [];
      // Usuarios y editores solo ven encuestas marcadas como visibles para ellos
      if (!permissions.canUploadDataSources) {
        list = list.filter((s) => s.visible_to_users !== false);
      }
      setSurveys(list);
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

  const handleVerResultados = async (survey: Survey) => {
    setResultsSurvey({ id: survey.id, title: survey.title });
    setShowResultsDialog(true);
    setLoadingResults(true);
    setResultsQuestions([]);
    setResultsResponses([]);
    setResultsProfiles({});
    try {
      const [questionsRes, responsesRes] = await Promise.all([
        supabase
          .from("survey_questions")
          .select("id, question_text, order_index")
          .eq("survey_id", survey.id)
          .order("order_index", { ascending: true }),
        supabase
          .from("survey_responses")
          .select("id, user_id, answers, submitted_at")
          .eq("survey_id", survey.id)
          .order("submitted_at", { ascending: true }),
      ]);
      if (questionsRes.error) throw questionsRes.error;
      if (responsesRes.error) throw responsesRes.error;
      const questions = (questionsRes.data || []) as SurveyQuestion[];
      const responses = (responsesRes.data || []) as SurveyResponse[];
      setResultsQuestions(questions);
      setResultsResponses(responses);
      const userIds = [...new Set(responses.map((r) => r.user_id))];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, email, first_name, last_name")
          .in("user_id", userIds);
        const map: Record<string, ProfileInfo> = {};
        (profilesData || []).forEach((p: ProfileInfo) => {
          map[p.user_id] = p;
        });
        setResultsProfiles(map);
      }
    } catch (err: any) {
      console.error("Error loading results:", err);
      toast.error("Error al cargar los resultados");
    } finally {
      setLoadingResults(false);
    }
  };

  const buildCSVAndDownload = () => {
    if (!resultsSurvey || resultsQuestions.length === 0) return;
    const headers = [
      "Fecha",
      "Usuario",
      "Email",
      ...resultsQuestions.map((q) => escapeCSV(q.question_text)),
    ];
    const rows = resultsResponses.map((r) => {
      const profile = resultsProfiles[r.user_id];
      const userLabel = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || r.user_id
        : r.user_id;
      const email = profile?.email ?? "";
      const cells = [
        new Date(r.submitted_at).toLocaleString("es-ES"),
        userLabel,
        email,
        ...resultsQuestions.map((q) => r.answers[q.id] ?? ""),
      ];
      return cells.map(escapeCSV).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resultados-${resultsSurvey.title.replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV descargado");
  };

  const menuItems = useMemo(() => {
    const items: Array<{
      icon: any;
      label: string;
      href: string;
      active?: boolean;
      disabled?: boolean;
    }> = [
      { icon: LayoutDashboard, label: "Dashboard General", href: "/dashboard" },
      { icon: Layers, label: "Dimensiones", href: "/dimensiones" },
      { icon: LineChart, label: "Todos los Indicadores", href: "/kpis" },
      { icon: Map, label: "Comparación Territorial", href: "/comparacion" },
      { icon: Clock, label: "Evolución Temporal", href: "/evolucion" },
      { icon: FileText, label: "Informes", href: "/informes" },
      { icon: MessageSquare, label: "Encuestas", href: "/encuestas", active: true },
      { icon: BookOpen, label: "Metodología", href: "/metodologia" },
    ];
    
    // Solo mostrar "Gestión de Usuarios" para admin y superadmin
    if (canCreateSurvey) {
      items.push({ icon: Shield, label: "Gestión de Usuarios", href: "/admin-usuarios" });
    }
    
    return items;
  }, [canCreateSurvey]);

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
          <a href="https://www.camaravalencia.com" target="_blank" rel="noopener noreferrer" className="block mb-4">
            <img src="/camara-valencia-blanco.png" alt="Cámara Valencia" className="h-10 w-auto object-contain" />
          </a>
          <p className="text-xs text-blue-200">Versión 2026</p>
          <p className="text-xs text-blue-200">Actualizado Febrero 2026</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-blue-100 text-[#0c6c8b] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Plataforma de Economía Digital</h2>
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
                {canCreateSurvey && (
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
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => handleStartSurvey(survey.id)}
                            className="w-full bg-[#0c6c8b] text-white hover:bg-[#0a5a73]"
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Participar
                          </Button>
                          {canCreateSurvey && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleVerResultados(survey);
                                }}
                                className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                              >
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Ver resultados
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate(`/encuestas/editar/${survey.id}`);
                                }}
                                className="w-full border-[#0c6c8b] text-[#0c6c8b] hover:bg-[#0c6c8b]/10"
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar encuesta
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Diálogo Ver resultados */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-[#0c6c8b]">
              Resultados: {resultsSurvey?.title}
            </DialogTitle>
            <DialogDescription>
              Respuestas de la encuesta. Puedes descargar todo en CSV.
            </DialogDescription>
          </DialogHeader>
          {loadingResults ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-[#0c6c8b]" />
            </div>
          ) : resultsResponses.length === 0 ? (
            <p className="text-gray-600 py-6 text-center">
              Aún no hay respuestas para esta encuesta.
            </p>
          ) : (
            <>
              <div className="flex-1 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Fecha</TableHead>
                      <TableHead className="whitespace-nowrap">Usuario</TableHead>
                      <TableHead className="whitespace-nowrap">Email</TableHead>
                      {resultsQuestions.map((q) => (
                        <TableHead key={q.id} className="max-w-[200px] truncate" title={q.question_text}>
                          {q.question_text.length > 30 ? q.question_text.slice(0, 30) + "…" : q.question_text}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultsResponses.map((r) => {
                      const profile = resultsProfiles[r.user_id];
                      const userLabel = profile
                        ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || r.user_id
                        : r.user_id;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {new Date(r.submitted_at).toLocaleString("es-ES")}
                          </TableCell>
                          <TableCell className="text-sm">{userLabel}</TableCell>
                          <TableCell className="text-sm">{profile?.email ?? "—"}</TableCell>
                          {resultsQuestions.map((q) => (
                            <TableCell key={q.id} className="max-w-[200px] truncate text-sm">
                              {r.answers[q.id] ?? "—"}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={buildCSVAndDownload}
                  className="bg-[#0c6c8b] text-white hover:bg-[#0a5a73]"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar CSV
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Surveys;
