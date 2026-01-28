import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Loader2, Upload, Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateInformeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Seccion {
  id: string;
  titulo: string;
  contenido: string;
}

interface Grafica {
  id: string;
  seccionId: string;
  titulo: string;
  url: string;
  file?: File;
}

const CreateInformeDialog = ({ open, onOpenChange, onSuccess }: CreateInformeDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    category: "",
  });

  const [portada, setPortada] = useState({
    imagenUrl: "",
    imagenFile: null as File | null,
    organizacion: "CÁMARA DE COMERCIO DE VALENCIA",
    subtitulo: "",
    textoAdicional: "",
  });

  const [secciones, setSecciones] = useState<Seccion[]>([
    { id: "1", titulo: "Resumen Ejecutivo", contenido: "" },
  ]);

  const [graficas, setGraficas] = useState<Grafica[]>([]);

  const portadaImageInputRef = useRef<HTMLInputElement>(null);
  const graficaInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handlePortadaImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo de imagen",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "La imagen es demasiado grande. Máximo 10MB",
          variant: "destructive",
        });
        return;
      }
      setPortada({ ...portada, imagenFile: file });
    }
  };

  const handleAddSeccion = () => {
    const newId = String(secciones.length + 1);
    setSecciones([...secciones, { id: newId, titulo: "", contenido: "" }]);
  };

  const handleRemoveSeccion = (id: string) => {
    setSecciones(secciones.filter(s => s.id !== id));
    // Eliminar gráficas asociadas
    setGraficas(graficas.filter(g => g.seccionId !== id));
  };

  const handleSeccionChange = (id: string, field: 'titulo' | 'contenido', value: string) => {
    setSecciones(secciones.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleAddGrafica = (seccionId: string) => {
    const newId = `g-${Date.now()}`;
    setGraficas([...graficas, { id: newId, seccionId, titulo: "", url: "" }]);
  };

  const handleGraficaImageSelect = (graficaId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo de imagen",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "La imagen es demasiado grande. Máximo 10MB",
          variant: "destructive",
        });
        return;
      }
      setGraficas(graficas.map(g => g.id === graficaId ? { ...g, file } : g));
    }
  };

  const handleRemoveGrafica = (id: string) => {
    setGraficas(graficas.filter(g => g.id !== id));
  };

  const uploadImageToSupabase = async (file: File, path: string): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('informes')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('informes')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      // Fallback: crear URL local temporal
      return URL.createObjectURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast({
        title: "Error",
        description: "El título del informe es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Subir imagen de portada si existe
      let portadaImagenUrl = portada.imagenUrl;
      if (portada.imagenFile) {
        setUploadingImage('portada');
        portadaImagenUrl = await uploadImageToSupabase(portada.imagenFile, 'portadas');
      }

      // Subir gráficas
      const graficasConUrls = await Promise.all(
        graficas.map(async (grafica) => {
          if (grafica.file) {
            setUploadingImage(grafica.id);
            const url = await uploadImageToSupabase(grafica.file, 'graficas');
            return { ...grafica, url };
          }
          return grafica;
        })
      );

      // Preparar datos del informe
      const informeData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        category: formData.category,
        portada: {
          imagenUrl: portadaImagenUrl,
          organizacion: portada.organizacion,
          subtitulo: portada.subtitulo,
          textoAdicional: portada.textoAdicional,
        },
        secciones: secciones.filter(s => s.titulo || s.contenido),
        graficas: graficasConUrls.filter(g => g.url || g.titulo),
        created_at: new Date().toISOString(),
      };

      // Guardar en Supabase (tabla informes) o localStorage como fallback
      let savedSuccessfully = false;
      try {
        const { error: insertError } = await supabase
          .from('informes')
          // @ts-ignore: tabla informes puede no estar tipada
          .insert([informeData]);

        if (insertError) {
          console.warn('Error saving to Supabase, using localStorage fallback:', insertError);
          throw insertError;
        }
        
        savedSuccessfully = true;
        toast({
          title: "Éxito",
          description: "Informe creado correctamente",
        });
      } catch (error) {
        // Si falla Supabase, guardar en localStorage como fallback
        console.log('Using localStorage fallback for informe');
        const existingInformes = JSON.parse(localStorage.getItem('informes') || '[]');
        const newInforme = {
          id: `informe-${Date.now()}`,
          ...informeData,
        };
        existingInformes.push(newInforme);
        localStorage.setItem('informes', JSON.stringify(existingInformes));
        
        toast({
          title: "Informe guardado localmente",
          description: "El informe se guardó en el navegador. Para persistencia completa, configura la tabla 'informes' en Supabase.",
        });
      }

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        date: "",
        category: "",
      });
      setPortada({
        imagenUrl: "",
        imagenFile: null,
        organizacion: "CÁMARA DE COMERCIO DE VALENCIA",
        subtitulo: "",
        textoAdicional: "",
      });
      setSecciones([{ id: "1", titulo: "Resumen Ejecutivo", contenido: "" }]);
      setGraficas([]);
    } catch (error) {
      console.error("Error creating informe:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el informe. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadingImage(null);
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Imagen de Portada</Label>
                <div className="flex items-center gap-4">
                  <Input
                    ref={portadaImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePortadaImageSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => portadaImageInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {portada.imagenFile ? "Cambiar Imagen" : "Subir Imagen"}
                  </Button>
                  {portada.imagenFile && (
                    <span className="text-sm text-muted-foreground">
                      {portada.imagenFile.name}
                    </span>
                  )}
                  {portada.imagenFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPortada({ ...portada, imagenFile: null })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {portada.imagenFile && (
                  <div className="mt-2">
                    <img
                      src={URL.createObjectURL(portada.imagenFile)}
                      alt="Vista previa portada"
                      className="max-w-xs max-h-48 rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizacion">Organización</Label>
                <Input
                  id="organizacion"
                  value={portada.organizacion}
                  onChange={(e) => setPortada({ ...portada, organizacion: e.target.value })}
                  placeholder="Ej: CÁMARA DE COMERCIO DE VALENCIA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitulo">Subtítulo</Label>
                <Input
                  id="subtitulo"
                  value={portada.subtitulo}
                  onChange={(e) => setPortada({ ...portada, subtitulo: e.target.value })}
                  placeholder="Ej: Índice de Economía Digital de la Comunitat Valenciana"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="textoAdicional">Texto Adicional</Label>
                <Textarea
                  id="textoAdicional"
                  value={portada.textoAdicional}
                  onChange={(e) => setPortada({ ...portada, textoAdicional: e.target.value })}
                  placeholder="Ej: Análisis integral del ecosistema digital valenciano"
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contenido" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Secciones del Informe</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSeccion}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Sección
                </Button>
              </div>

              {secciones.map((seccion, index) => (
                <Card key={seccion.id}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">
                        Sección {index + 1}
                      </Label>
                      {secciones.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSeccion(seccion.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Título de la Sección</Label>
                      <Input
                        value={seccion.titulo}
                        onChange={(e) => handleSeccionChange(seccion.id, 'titulo', e.target.value)}
                        placeholder="Ej: Resumen Ejecutivo, Metodología, Dimensiones..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Contenido</Label>
                      <Textarea
                        value={seccion.contenido}
                        onChange={(e) => handleSeccionChange(seccion.id, 'contenido', e.target.value)}
                        placeholder="Escribe el contenido de esta sección..."
                        rows={6}
                        className="resize-none"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="graficas" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Gráficas e Imágenes</Label>
                <p className="text-sm text-muted-foreground">
                  Asocia gráficas a cada sección del informe
                </p>
              </div>

              {secciones.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Primero agrega secciones en la pestaña "Contenido"
                    </p>
                  </CardContent>
                </Card>
              ) : (
                secciones.map((seccion) => {
                  const graficasSeccion = graficas.filter(g => g.seccionId === seccion.id);
                  return (
                    <Card key={seccion.id}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-semibold">
                              {seccion.titulo || `Sección ${seccion.id}`}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Gráficas para esta sección
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddGrafica(seccion.id)}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Agregar Gráfica
                          </Button>
                        </div>

                        {graficasSeccion.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No hay gráficas para esta sección
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {graficasSeccion.map((grafica) => (
                              <div
                                key={grafica.id}
                                className="border rounded-lg p-4 space-y-3 bg-gray-50"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 space-y-2">
                                    <Input
                                      value={grafica.titulo}
                                      onChange={(e) =>
                                        setGraficas(
                                          graficas.map(g =>
                                            g.id === grafica.id
                                              ? { ...g, titulo: e.target.value }
                                              : g
                                          )
                                        )
                                      }
                                      placeholder="Título de la gráfica"
                                      className="max-w-md"
                                    />
                                    <div className="flex items-center gap-2">
                                      <Input
                                        ref={(el) => {
                                          graficaInputRefs.current[grafica.id] = el;
                                        }}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleGraficaImageSelect(grafica.id, e)}
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => graficaInputRefs.current[grafica.id]?.click()}
                                        className="flex items-center gap-2"
                                        disabled={uploadingImage === grafica.id}
                                      >
                                        {uploadingImage === grafica.id ? (
                                          <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Subiendo...
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="h-4 w-4" />
                                            {grafica.file ? "Cambiar" : "Subir Imagen"}
                                          </>
                                        )}
                                      </Button>
                                      {grafica.file && (
                                        <span className="text-xs text-muted-foreground">
                                          {grafica.file.name}
                                        </span>
                                      )}
                                    </div>
                                    {grafica.file && (
                                      <div className="mt-2">
                                        <img
                                          src={URL.createObjectURL(grafica.file)}
                                          alt="Vista previa"
                                          className="max-w-xs max-h-32 rounded border"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveGrafica(grafica.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
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
