import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface CreateInformeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateInformeDialog = ({ open, onOpenChange, onSuccess }: CreateInformeDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    category: "",
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Aquí iría la lógica para guardar el informe
      // Por ahora solo cerramos el diálogo y llamamos onSuccess
      await new Promise((resolve) => setTimeout(resolve, 500));
      onSuccess();
      onOpenChange(false);
      // Reset form
      setFormData({
        title: "",
        description: "",
        date: "",
        category: "",
      });
    } catch (error) {
      console.error("Error creating informe:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Informe</DialogTitle>
          <DialogDescription>
            Completa la información básica del informe. Puedes agregar más detalles después.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basico" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basico">Básico</TabsTrigger>
            <TabsTrigger value="portada">Portada</TabsTrigger>
            <TabsTrigger value="contenido">Contenido</TabsTrigger>
            <TabsTrigger value="graficas">Gráficas</TabsTrigger>
          </TabsList>

          <TabsContent value="basico" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título del Informe *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej: Informe BRAINNOVA 2025"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción breve del informe..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="text"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  placeholder="Ej: Enero 2025"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ej: Informes anuales"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="portada" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Configuración de portada del informe. Esta sección se puede expandir más adelante.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contenido" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Agrega las secciones y contenido del informe. Esta funcionalidad se puede expandir más adelante.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="graficas" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Sube gráficas e imágenes para el informe. Esta funcionalidad se puede expandir más adelante.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.title}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Crear Informe"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInformeDialog;
