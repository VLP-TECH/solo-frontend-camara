import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { useAppMenuItems } from "@/hooks/useAppMenuItems";
import FloatingCamaraLogo from "@/components/FloatingCamaraLogo";
import { toast } from "sonner";

interface Question {
  question_text: string;
  question_type: string;
  options: string[];
  required: boolean;
}

const CreateSurvey = () => {
  const { user } = useAuth();
  const { permissions, roles } = usePermissions();
  const { isAdmin, profile, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [visibleToUsers, setVisibleToUsers] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([
    { question_text: "", question_type: "text", options: [], required: true }
  ]);
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    navigate("/encuestas");
    return null;
  }

  // Verificar si el usuario es admin o superadmin
  const menuItems = useAppMenuItems();

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { question_text: "", question_type: "text", options: [], required: true }
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options.push("");
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex);
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    if (questions.length === 0) {
      toast.error("Añade al menos una pregunta");
      return;
    }

    const invalidQuestion = questions.find(q => !q.question_text.trim());
    if (invalidQuestion) {
      toast.error("Todas las preguntas deben tener texto");
      return;
    }

    const invalidMultipleChoice = questions.find(
      q => q.question_type === "multiple_choice" && q.options.length < 2
    );
    if (invalidMultipleChoice) {
      toast.error("Las preguntas de opción múltiple deben tener al menos 2 opciones");
      return;
    }

    setSubmitting(true);
    try {
      // Create survey
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .insert({
          title,
          description: description || null,
          created_by: user.id,
          active,
          visible_to_users: visibleToUsers,
        })
        .select()
        .single();

      if (surveyError) throw surveyError;

      // Create questions
      const questionsToInsert = questions.map((q, index) => ({
        survey_id: surveyData.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.question_type === "multiple_choice" ? { options: q.options } : null,
        order_index: index + 1,
        required: q.required
      }));

      const { error: questionsError } = await supabase
        .from("survey_questions")
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast.success("Encuesta creada exitosamente");
      navigate("/encuestas");
    } catch (error) {
      console.error("Error creating survey:", error);
      toast.error("Error al crear la encuesta");
    } finally {
      setSubmitting(false);
    }
  };

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
            <h2 className="text-lg font-semibold">Plataforma de Economía Digital</h2>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-[#0c6c8b] mb-2">
                    Crear nueva encuesta
                  </h1>
                  <p className="text-lg text-gray-600">
                    Completa el formulario para crear una nueva encuesta
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate("/encuestas")}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Volver
                </Button>
              </div>

              <Card className="shadow-lg bg-white">
                <CardHeader className="pb-6">
                  <CardTitle className="text-2xl text-[#0c6c8b]">Información de la encuesta</CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Survey Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título de la encuesta"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descripción de la encuesta"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={active}
                    onCheckedChange={setActive}
                  />
                  <Label htmlFor="active">Encuesta activa</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="visible_to_users"
                    checked={visibleToUsers}
                    onCheckedChange={setVisibleToUsers}
                  />
                  <Label htmlFor="visible_to_users">Visible para usuarios (rol user y editor)</Label>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-semibold">Preguntas</h3>
                  <Button type="button" onClick={addQuestion} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir pregunta
                  </Button>
                </div>

                {questions.map((question, qIndex) => (
                  <Card key={qIndex} className="p-6 shadow-md border-2">
                    <div className="space-y-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-5">
                          <div className="space-y-2">
                            <Label className="text-base font-semibold">Pregunta {qIndex + 1} *</Label>
                            <Input
                              value={question.question_text}
                              onChange={(e) =>
                                updateQuestion(qIndex, "question_text", e.target.value)
                              }
                              placeholder="Texto de la pregunta"
                              required
                              className="text-base py-6"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Tipo de pregunta</Label>
                              <Select
                                value={question.question_type}
                                onValueChange={(value) =>
                                  updateQuestion(qIndex, "question_type", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Texto corto</SelectItem>
                                  <SelectItem value="textarea">Texto largo</SelectItem>
                                  <SelectItem value="multiple_choice">Opción múltiple</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-end">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id={`required-${qIndex}`}
                                  checked={question.required}
                                  onCheckedChange={(checked) =>
                                    updateQuestion(qIndex, "required", checked)
                                  }
                                />
                                <Label htmlFor={`required-${qIndex}`}>Obligatoria</Label>
                              </div>
                            </div>
                          </div>

                          {/* Multiple choice options */}
                          {question.question_type === "multiple_choice" && (
                            <div className="space-y-2 pl-4 border-l-2 border-muted">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Opciones</Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addOption(qIndex)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Añadir opción
                                </Button>
                              </div>
                              {question.options.map((option, oIndex) => (
                                <div key={oIndex} className="flex gap-2">
                                  <Input
                                    value={option}
                                    onChange={(e) =>
                                      updateOption(qIndex, oIndex, e.target.value)
                                    }
                                    placeholder={`Opción ${oIndex + 1}`}
                                    required
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeOption(qIndex, oIndex)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(qIndex)}
                          disabled={questions.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Submit */}
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
                  <Save className="mr-2 h-4 w-4" />
                  {submitting ? "Guardando..." : "Crear encuesta"}
                </Button>
              </div>
            </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
    </>
  );
};

export default CreateSurvey;