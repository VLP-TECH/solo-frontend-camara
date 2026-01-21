import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  ArrowLeft,
  Send,
  Loader2,
  Shield
} from "lucide-react";
import { toast } from "sonner";

interface Survey {
  id: string;
  title: string;
  description: string | null;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  required: boolean;
  order_index: number;
}

const SurveyForm = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { roles } = usePermissions();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      toast.error("Debes iniciar sesión para responder encuestas");
      navigate("/auth");
      return;
    }
    fetchSurveyData();
  }, [id, user]);

  const fetchSurveyData = async () => {
    try {
      const [surveyResult, questionsResult] = await Promise.all([
        supabase.from("surveys").select("*").eq("id", id).single(),
        supabase
          .from("survey_questions")
          .select("*")
          .eq("survey_id", id)
          .order("order_index", { ascending: true }),
      ]);

      if (surveyResult.error) throw surveyResult.error;
      if (questionsResult.error) throw questionsResult.error;

      setSurvey(surveyResult.data);
      setQuestions(questionsResult.data || []);
    } catch (error) {
      console.error("Error fetching survey:", error);
      toast.error("Error al cargar la encuesta");
      navigate("/encuestas");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required questions
    const missingRequired = questions.some(
      (q) => q.required && !answers[q.id]
    );
    if (missingRequired) {
      toast.error("Por favor, responde todas las preguntas obligatorias");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("survey_responses").insert({
        survey_id: id,
        user_id: user!.id,
        answers: answers,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Ya has respondido esta encuesta");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Encuesta enviada correctamente");
      navigate("/encuestas");
    } catch (error) {
      console.error("Error submitting survey:", error);
      toast.error("Error al enviar la encuesta");
    } finally {
      setSubmitting(false);
    }
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

  if (loading) {
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
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-blue-100 hover:bg-blue-700/50"
                    }`}
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
          <header className="bg-blue-100 text-[#0c6c8b] px-6 py-4">
            <h2 className="text-lg font-semibold">BRAINNOVA Economía Digital</h2>
          </header>
          <main className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-[#0c6c8b] mx-auto mb-4" />
              <p className="text-gray-600">Cargando encuesta...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!survey) {
    return null;
  }

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
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate("/encuestas")}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a encuestas
            </Button>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-3xl text-[#0c6c8b]">{survey.title}</CardTitle>
                {survey.description && (
                  <CardDescription className="text-base text-gray-600">
                    {survey.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                  {questions.map((question, index) => (
                    <div key={question.id} className="space-y-4">
                      <Label className="text-base font-semibold text-gray-900">
                        {index + 1}. {question.question_text}
                        {question.required && (
                          <span className="text-red-600 ml-1">*</span>
                        )}
                      </Label>

                      {question.question_type === "text" && (
                        <Input
                          value={answers[question.id] || ""}
                          onChange={(e) =>
                            setAnswers({ ...answers, [question.id]: e.target.value })
                          }
                          required={question.required}
                          placeholder="Tu respuesta"
                        />
                      )}

                      {question.question_type === "textarea" && (
                        <Textarea
                          value={answers[question.id] || ""}
                          onChange={(e) =>
                            setAnswers({ ...answers, [question.id]: e.target.value })
                          }
                          required={question.required}
                          placeholder="Tu respuesta"
                          rows={4}
                        />
                      )}

                      {question.question_type === "multiple_choice" &&
                        question.options?.options && (
                          <RadioGroup
                            value={answers[question.id] || ""}
                            onValueChange={(value) =>
                              setAnswers({ ...answers, [question.id]: value })
                            }
                            required={question.required}
                          >
                            {question.options.options.map(
                              (option: string, optIndex: number) => (
                                <div
                                  key={optIndex}
                                  className="flex items-center space-x-2"
                                >
                                  <RadioGroupItem
                                    value={option}
                                    id={`${question.id}-${optIndex}`}
                                  />
                                  <Label
                                    htmlFor={`${question.id}-${optIndex}`}
                                    className="font-normal cursor-pointer"
                                  >
                                    {option}
                                  </Label>
                                </div>
                              )
                            )}
                          </RadioGroup>
                        )}
                    </div>
                  ))}

                  <div className="flex gap-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/encuestas")}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={submitting} 
                      className="flex-1 bg-[#0c6c8b] text-white hover:bg-[#0a5a73]"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {submitting ? "Enviando..." : "Enviar respuestas"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SurveyForm;
