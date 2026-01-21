import { useState } from "react";
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
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import NavigationHeader from "@/components/NavigationHeader";
import FooterSection from "@/components/FooterSection";

interface Question {
  question_text: string;
  question_type: string;
  options: string[];
  required: boolean;
}

const CreateSurvey = () => {
  const { user } = useAuth();
  const { permissions } = usePermissions();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([
    { question_text: "", question_type: "text", options: [], required: true }
  ]);
  const [submitting, setSubmitting] = useState(false);

  if (!user || !permissions.canUploadDataSources) {
    navigate("/encuestas");
    return null;
  }

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
          active
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
    <div className="min-h-screen flex flex-col bg-background">
      <NavigationHeader />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 mt-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/encuestas")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a encuestas
        </Button>

        <Card className="shadow-lg">
          <CardHeader className="pb-8">
            <CardTitle className="text-4xl">Crear nueva encuesta</CardTitle>
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
                <Button type="submit" disabled={submitting} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {submitting ? "Guardando..." : "Crear encuesta"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <FooterSection />
    </div>
  );
};

export default CreateSurvey;