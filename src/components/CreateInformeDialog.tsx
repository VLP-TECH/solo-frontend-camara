import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";

interface SeccionInforme {
  id: string;
  titulo: string;
  contenido: string;
  graficas: string[]; // URLs de las gráficas
}

interface InformeData {
  titulo: string;
  subtitulo: string;
  fecha: string;
  descripcion: string;
  portada: {
    organizacion: string;
    titulo: string;
    subtitulo: string;
    descripcion: string;
  };
  resumenEjecutivo: {
    contenido: string;
    estadisticas: {
      dimensiones: string;
      indicadores: string;
      anio: string;
    };
  };
  metodologia: {
    contenido: string;
    puntos: Array<{ titulo: string; descripcion: string }>;
  };
  dimensiones: Array<{
    titulo: string;
    descripcion: string;
    graficas?: string[];
  }>;
  hallazgos: Array<{
    titulo: string;
    contenido: string;
    tipo: "positivo" | "fortaleza" | "mejora";
    graficas?: string[];
  }>;
  comparativaTerritorial: {
    contenido: string;
    graficas?: string[];
  };
  recomendaciones: Array<{
    titulo: string;
    descripcion: string;
    graficas?: string[];
  }>;
  datosFuentes: {
    contenido: string;
    fuentes: string[];
  };
}

interface CreateInformeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateInformeDialog = ({ open, onOpenChange, onSuccess }: CreateInformeDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basico");
  
  const [informeData, setInformeData] = useState<InformeData>({
    titulo: "",
    subtitulo: "",
    fecha: new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
    descripcion: "",
    portada: {
      organizacion: "CÁMARA DE COMERCIO DE VALENCIA",
      titulo: "",
      subtitulo: "",
      descripcion: ""
    },
    resumenEjecutivo: {
      contenido: "",
      estadisticas: {
        dimensiones: "",
        indicadores: "",
        anio: new Date().getFullYear().toString()
      }
    },
    metodologia: {
      contenido: "",
      puntos: [
        { titulo: "Medición Objetiva", descripcion: "" },
        { titulo: "Comparación Temporal", descripcion: "" },
        { titulo: "Comparación Territorial", descripcion: "" },
        { titulo: "Identificación de Oportunidades", descripcion: "" }
      ]
    },
    dimensiones: [],
    hallazgos: [],
    comparativaTerritorial: {
      contenido: ""
    },
    recomendaciones: [],
    datosFuentes: {
      contenido: "",
      fuentes: []
    }
  });

  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleImageUpload = async (sectionKey: string, subKey?: string, index?: number) => {
    const inputKey = subKey ? `${sectionKey}-${subKey}${index !== undefined ? `-${index}` : ''}` : sectionKey;
    const input = fileInputRefs.current[inputKey];
    
    if (!input?.files?.[0]) return;

    const file = input.files[0];
    
    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de imagen",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "Error",
        description: "La imagen es demasiado grande. Máximo 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingImages(prev => ({ ...prev, [inputKey]: true }));

    try {
      const fileName = `${sectionKey}-${Date.now()}-${file.name}`;
      const filePath = `informes/graficas/${fileName}`;

      // Intentar subir a Supabase Storage
      let imageUrl = '';
      
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('informes')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('informes')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
      } catch (storageError) {
        // Fallback: usar URL local
        imageUrl = `/informes/graficas/${fileName}`;
      }

      // Actualizar el estado con la nueva imagen
      setInformeData(prev => {
        const newData = { ...prev };
        
        if (sectionKey === 'dimensiones' && index !== undefined) {
          if (!newData.dimensiones[index].graficas) {
            newData.dimensiones[index].graficas = [];
          }
          newData.dimensiones[index].graficas!.push(imageUrl);
        } else if (sectionKey === 'hallazgos' && index !== undefined) {
          if (!newData.hallazgos[index].graficas) {
            newData.hallazgos[index].graficas = [];
          }
          newData.hallazgos[index].graficas!.push(imageUrl);
        } else if (sectionKey === 'comparativaTerritorial') {
          if (!newData.comparativaTerritorial.graficas) {
            newData.comparativaTerritorial.graficas = [];
          }
          newData.comparativaTerritorial.graficas!.push(imageUrl);
        } else if (sectionKey === 'recomendaciones' && index !== undefined) {
          if (!newData.recomendaciones[index].graficas) {
            newData.recomendaciones[index].graficas = [];
          }
          newData.recomendaciones[index].graficas!.push(imageUrl);
        }
        
        return newData;
      });

      toast({
        title: "Éxito",
        description: "Gráfica subida correctamente",
      });

      // Limpiar input
      if (input) input.value = '';
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo subir la imagen",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(prev => ({ ...prev, [inputKey]: false }));
    }
  };

  const removeImage = (sectionKey: string, imageIndex: number, subIndex?: number) => {
    setInformeData(prev => {
      const newData = { ...prev };
      
      if (sectionKey === 'dimensiones' && subIndex !== undefined) {
        newData.dimensiones[subIndex].graficas = newData.dimensiones[subIndex].graficas?.filter((_, i) => i !== imageIndex);
      } else if (sectionKey === 'hallazgos' && subIndex !== undefined) {
        newData.hallazgos[subIndex].graficas = newData.hallazgos[subIndex].graficas?.filter((_, i) => i !== imageIndex);
      } else if (sectionKey === 'comparativaTerritorial') {
        newData.comparativaTerritorial.graficas = newData.comparativaTerritorial.graficas?.filter((_, i) => i !== imageIndex);
      } else if (sectionKey === 'recomendaciones' && subIndex !== undefined) {
        newData.recomendaciones[subIndex].graficas = newData.recomendaciones[subIndex].graficas?.filter((_, i) => i !== imageIndex);
      }
      
      return newData;
    });
  };

  const addDimension = () => {
    setInformeData(prev => ({
      ...prev,
      dimensiones: [...prev.dimensiones, { titulo: "", descripcion: "" }]
    }));
  };

  const addHallazgo = () => {
    setInformeData(prev => ({
      ...prev,
      hallazgos: [...prev.hallazgos, { titulo: "", contenido: "", tipo: "positivo" }]
    }));
  };

  const addRecomendacion = () => {
    setInformeData(prev => ({
      ...prev,
      recomendaciones: [...prev.recomendaciones, { titulo: "", descripcion: "" }]
    }));
  };

  const addFuente = () => {
    setInformeData(prev => ({
      ...prev,
      datosFuentes: {
        ...prev.datosFuentes,
        fuentes: [...prev.datosFuentes.fuentes, ""]
      }
    }));
  };

  const handleSubmit = async () => {
    // Validaciones básicas
    if (!informeData.titulo || !informeData.portada.titulo) {
      toast({
        title: "Error",
        description: "Por favor completa al menos el título del informe",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Guardar en Supabase (tabla informes)
      const { data, error } = await supabase
        .from('informes')
        .insert({
          titulo: informeData.titulo,
          subtitulo: informeData.subtitulo,
          descripcion: informeData.descripcion,
          fecha: informeData.fecha,
          contenido: informeData,
          activo: true,
          creado_por: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) {
        // Si la tabla no existe, guardar en localStorage como fallback
        console.warn('Error saving to database, using localStorage:', error);
        const informesLocal = JSON.parse(localStorage.getItem('informes') || '[]');
        const newInforme = {
          id: `informe-${Date.now()}`,
          ...informeData,
          createdAt: new Date().toISOString()
        };
        informesLocal.push(newInforme);
        localStorage.setItem('informes', JSON.stringify(informesLocal));
      }

      toast({
        title: "Éxito",
        description: "Informe creado correctamente",
      });

      // Reset form
      setInformeData({
        titulo: "",
        subtitulo: "",
        fecha: new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        descripcion: "",
        portada: {
          organizacion: "CÁMARA DE COMERCIO DE VALENCIA",
          titulo: "",
          subtitulo: "",
          descripcion: ""
        },
        resumenEjecutivo: {
          contenido: "",
          estadisticas: {
            dimensiones: "",
            indicadores: "",
            anio: new Date().getFullYear().toString()
          }
        },
        metodologia: {
          contenido: "",
          puntos: [
            { titulo: "Medición Objetiva", descripcion: "" },
            { titulo: "Comparación Temporal", descripcion: "" },
            { titulo: "Comparación Territorial", descripcion: "" },
            { titulo: "Identificación de Oportunidades", descripcion: "" }
          ]
        },
        dimensiones: [],
        hallazgos: [],
        comparativaTerritorial: {
          contenido: ""
        },
        recomendaciones: [],
        datosFuentes: {
          contenido: "",
          fuentes: []
        }
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating informe:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el informe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#0c6c8b]">
            Crear Nuevo Informe
          </DialogTitle>
          <DialogDescription>
            Completa las secciones del informe. Puedes subir gráficas para cada sección.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basico">Básico</TabsTrigger>
            <TabsTrigger value="portada">Portada</TabsTrigger>
            <TabsTrigger value="contenido">Contenido</TabsTrigger>
            <TabsTrigger value="graficas">Gráficas</TabsTrigger>
            <TabsTrigger value="fuentes">Fuentes</TabsTrigger>
          </TabsList>

          {/* Tab Básico */}
          <TabsContent value="basico" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título del Informe *</Label>
              <Input
                id="titulo"
                value={informeData.titulo}
                onChange={(e) => setInformeData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ej: Informe BRAINNOVA 2025"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitulo">Subtítulo</Label>
              <Input
                id="subtitulo"
                value={informeData.subtitulo}
                onChange={(e) => setInformeData(prev => ({ ...prev, subtitulo: e.target.value }))}
                placeholder="Ej: Índice de Economía Digital de la Comunitat Valenciana"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                value={informeData.fecha}
                onChange={(e) => setInformeData(prev => ({ ...prev, fecha: e.target.value }))}
                placeholder="Ej: Enero 2025"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={informeData.descripcion}
                onChange={(e) => setInformeData(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción breve del informe"
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Tab Portada */}
          <TabsContent value="portada" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="org">Organización</Label>
              <Input
                id="org"
                value={informeData.portada.organizacion}
                onChange={(e) => setInformeData(prev => ({
                  ...prev,
                  portada: { ...prev.portada, organizacion: e.target.value }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portada-titulo">Título en Portada *</Label>
              <Input
                id="portada-titulo"
                value={informeData.portada.titulo}
                onChange={(e) => setInformeData(prev => ({
                  ...prev,
                  portada: { ...prev.portada, titulo: e.target.value }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portada-subtitulo">Subtítulo en Portada</Label>
              <Input
                id="portada-subtitulo"
                value={informeData.portada.subtitulo}
                onChange={(e) => setInformeData(prev => ({
                  ...prev,
                  portada: { ...prev.portada, subtitulo: e.target.value }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portada-desc">Descripción en Portada</Label>
              <Textarea
                id="portada-desc"
                value={informeData.portada.descripcion}
                onChange={(e) => setInformeData(prev => ({
                  ...prev,
                  portada: { ...prev.portada, descripcion: e.target.value }
                }))}
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Tab Contenido */}
          <TabsContent value="contenido" className="space-y-6 mt-4">
            {/* Resumen Ejecutivo */}
            <Card>
              <CardHeader>
                <CardTitle>1. Resumen Ejecutivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Contenido</Label>
                  <Textarea
                    value={informeData.resumenEjecutivo.contenido}
                    onChange={(e) => setInformeData(prev => ({
                      ...prev,
                      resumenEjecutivo: { ...prev.resumenEjecutivo, contenido: e.target.value }
                    }))}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Dimensiones</Label>
                    <Input
                      value={informeData.resumenEjecutivo.estadisticas.dimensiones}
                      onChange={(e) => setInformeData(prev => ({
                        ...prev,
                        resumenEjecutivo: {
                          ...prev.resumenEjecutivo,
                          estadisticas: { ...prev.resumenEjecutivo.estadisticas, dimensiones: e.target.value }
                        }
                      }))}
                      placeholder="Ej: 4+"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Indicadores</Label>
                    <Input
                      value={informeData.resumenEjecutivo.estadisticas.indicadores}
                      onChange={(e) => setInformeData(prev => ({
                        ...prev,
                        resumenEjecutivo: {
                          ...prev.resumenEjecutivo,
                          estadisticas: { ...prev.resumenEjecutivo.estadisticas, indicadores: e.target.value }
                        }
                      }))}
                      placeholder="Ej: 50+"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Año</Label>
                    <Input
                      value={informeData.resumenEjecutivo.estadisticas.anio}
                      onChange={(e) => setInformeData(prev => ({
                        ...prev,
                        resumenEjecutivo: {
                          ...prev.resumenEjecutivo,
                          estadisticas: { ...prev.resumenEjecutivo.estadisticas, anio: e.target.value }
                        }
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metodología */}
            <Card>
              <CardHeader>
                <CardTitle>2. Metodología</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Contenido</Label>
                  <Textarea
                    value={informeData.metodologia.contenido}
                    onChange={(e) => setInformeData(prev => ({
                      ...prev,
                      metodologia: { ...prev.metodologia, contenido: e.target.value }
                    }))}
                    rows={3}
                  />
                </div>
                {informeData.metodologia.puntos.map((punto, index) => (
                  <div key={index} className="space-y-2 p-4 border rounded-lg">
                    <Input
                      value={punto.titulo}
                      onChange={(e) => {
                        const nuevosPuntos = [...informeData.metodologia.puntos];
                        nuevosPuntos[index].titulo = e.target.value;
                        setInformeData(prev => ({
                          ...prev,
                          metodologia: { ...prev.metodologia, puntos: nuevosPuntos }
                        }));
                      }}
                      placeholder="Título del punto"
                    />
                    <Textarea
                      value={punto.descripcion}
                      onChange={(e) => {
                        const nuevosPuntos = [...informeData.metodologia.puntos];
                        nuevosPuntos[index].descripcion = e.target.value;
                        setInformeData(prev => ({
                          ...prev,
                          metodologia: { ...prev.metodologia, puntos: nuevosPuntos }
                        }));
                      }}
                      placeholder="Descripción"
                      rows={2}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Dimensiones */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>3. Dimensiones Evaluadas</CardTitle>
                <Button type="button" size="sm" onClick={addDimension}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Dimensión
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {informeData.dimensiones.map((dimension, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-2">
                    <Input
                      value={dimension.titulo}
                      onChange={(e) => {
                        const nuevasDimensiones = [...informeData.dimensiones];
                        nuevasDimensiones[index].titulo = e.target.value;
                        setInformeData(prev => ({ ...prev, dimensiones: nuevasDimensiones }));
                      }}
                      placeholder="Título de la dimensión"
                    />
                    <Textarea
                      value={dimension.descripcion}
                      onChange={(e) => {
                        const nuevasDimensiones = [...informeData.dimensiones];
                        nuevasDimensiones[index].descripcion = e.target.value;
                        setInformeData(prev => ({ ...prev, dimensiones: nuevasDimensiones }));
                      }}
                      placeholder="Descripción"
                      rows={2}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nuevasDimensiones = informeData.dimensiones.filter((_, i) => i !== index);
                        setInformeData(prev => ({ ...prev, dimensiones: nuevasDimensiones }));
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Hallazgos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>4. Principales Hallazgos</CardTitle>
                <Button type="button" size="sm" onClick={addHallazgo}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Hallazgo
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {informeData.hallazgos.map((hallazgo, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-2">
                    <Input
                      value={hallazgo.titulo}
                      onChange={(e) => {
                        const nuevosHallazgos = [...informeData.hallazgos];
                        nuevosHallazgos[index].titulo = e.target.value;
                        setInformeData(prev => ({ ...prev, hallazgos: nuevosHallazgos }));
                      }}
                      placeholder="Título del hallazgo"
                    />
                    <Textarea
                      value={hallazgo.contenido}
                      onChange={(e) => {
                        const nuevosHallazgos = [...informeData.hallazgos];
                        nuevosHallazgos[index].contenido = e.target.value;
                        setInformeData(prev => ({ ...prev, hallazgos: nuevosHallazgos }));
                      }}
                      placeholder="Contenido"
                      rows={2}
                    />
                    <div className="flex items-center gap-2">
                      <Label>Tipo:</Label>
                      <select
                        value={hallazgo.tipo}
                        onChange={(e) => {
                          const nuevosHallazgos = [...informeData.hallazgos];
                          nuevosHallazgos[index].tipo = e.target.value as "positivo" | "fortaleza" | "mejora";
                          setInformeData(prev => ({ ...prev, hallazgos: nuevosHallazgos }));
                        }}
                        className="px-3 py-1 border rounded"
                      >
                        <option value="positivo">Evolución Positiva</option>
                        <option value="fortaleza">Fortaleza</option>
                        <option value="mejora">Área de Mejora</option>
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nuevosHallazgos = informeData.hallazgos.filter((_, i) => i !== index);
                        setInformeData(prev => ({ ...prev, hallazgos: nuevosHallazgos }));
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Comparativa Territorial */}
            <Card>
              <CardHeader>
                <CardTitle>5. Comparativa Territorial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={informeData.comparativaTerritorial.contenido}
                  onChange={(e) => setInformeData(prev => ({
                    ...prev,
                    comparativaTerritorial: { ...prev.comparativaTerritorial, contenido: e.target.value }
                  }))}
                  rows={4}
                  placeholder="Contenido sobre comparativa territorial"
                />
              </CardContent>
            </Card>

            {/* Recomendaciones */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>6. Recomendaciones Estratégicas</CardTitle>
                <Button type="button" size="sm" onClick={addRecomendacion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Recomendación
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {informeData.recomendaciones.map((recomendacion, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-2">
                    <Input
                      value={recomendacion.titulo}
                      onChange={(e) => {
                        const nuevasRecomendaciones = [...informeData.recomendaciones];
                        nuevasRecomendaciones[index].titulo = e.target.value;
                        setInformeData(prev => ({ ...prev, recomendaciones: nuevasRecomendaciones }));
                      }}
                      placeholder="Título de la recomendación"
                    />
                    <Textarea
                      value={recomendacion.descripcion}
                      onChange={(e) => {
                        const nuevasRecomendaciones = [...informeData.recomendaciones];
                        nuevasRecomendaciones[index].descripcion = e.target.value;
                        setInformeData(prev => ({ ...prev, recomendaciones: nuevasRecomendaciones }));
                      }}
                      placeholder="Descripción"
                      rows={2}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nuevasRecomendaciones = informeData.recomendaciones.filter((_, i) => i !== index);
                        setInformeData(prev => ({ ...prev, recomendaciones: nuevasRecomendaciones }));
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Datos y Fuentes */}
            <Card>
              <CardHeader>
                <CardTitle>7. Datos y Fuentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Contenido</Label>
                  <Textarea
                    value={informeData.datosFuentes.contenido}
                    onChange={(e) => setInformeData(prev => ({
                      ...prev,
                      datosFuentes: { ...prev.datosFuentes, contenido: e.target.value }
                    }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Fuentes</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addFuente}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Fuente
                    </Button>
                  </div>
                  {informeData.datosFuentes.fuentes.map((fuente, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={fuente}
                        onChange={(e) => {
                          const nuevasFuentes = [...informeData.datosFuentes.fuentes];
                          nuevasFuentes[index] = e.target.value;
                          setInformeData(prev => ({
                            ...prev,
                            datosFuentes: { ...prev.datosFuentes, fuentes: nuevasFuentes }
                          }));
                        }}
                        placeholder="Nombre de la fuente"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const nuevasFuentes = informeData.datosFuentes.fuentes.filter((_, i) => i !== index);
                          setInformeData(prev => ({
                            ...prev,
                            datosFuentes: { ...prev.datosFuentes, fuentes: nuevasFuentes }
                          }));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Gráficas */}
          <TabsContent value="graficas" className="space-y-6 mt-4">
            {/* Gráficas para Dimensiones */}
            {informeData.dimensiones.map((dimension, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>Gráficas - {dimension.titulo || `Dimensión ${index + 1}`}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      ref={(el) => fileInputRefs.current[`dimensiones-dimension-${index}`] = el}
                      onChange={() => handleImageUpload('dimensiones', 'dimension', index)}
                      className="hidden"
                      id={`dimension-${index}`}
                    />
                    <Label htmlFor={`dimension-${index}`} className="cursor-pointer">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => document.getElementById(`dimension-${index}`)?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingImages[`dimensiones-dimension-${index}`] ? 'Subiendo...' : 'Subir Gráfica'}
                      </Button>
                    </Label>
                  </div>
                  {dimension.graficas && dimension.graficas.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      {dimension.graficas.map((url, imgIndex) => (
                        <div key={imgIndex} className="relative border rounded-lg p-2">
                          <img src={url} alt={`Gráfica ${imgIndex + 1}`} className="w-full h-auto rounded" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeImage('dimensiones', imgIndex, index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Gráficas para Hallazgos */}
            {informeData.hallazgos.map((hallazgo, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>Gráficas - {hallazgo.titulo || `Hallazgo ${index + 1}`}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      ref={(el) => fileInputRefs.current[`hallazgos-hallazgo-${index}`] = el}
                      onChange={() => handleImageUpload('hallazgos', 'hallazgo', index)}
                      className="hidden"
                      id={`hallazgo-${index}`}
                    />
                    <Label htmlFor={`hallazgo-${index}`} className="cursor-pointer">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => document.getElementById(`hallazgo-${index}`)?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingImages[`hallazgos-hallazgo-${index}`] ? 'Subiendo...' : 'Subir Gráfica'}
                      </Button>
                    </Label>
                  </div>
                  {hallazgo.graficas && hallazgo.graficas.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      {hallazgo.graficas.map((url, imgIndex) => (
                        <div key={imgIndex} className="relative border rounded-lg p-2">
                          <img src={url} alt={`Gráfica ${imgIndex + 1}`} className="w-full h-auto rounded" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeImage('hallazgos', imgIndex, index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Gráficas para Comparativa Territorial */}
            <Card>
              <CardHeader>
                <CardTitle>Gráficas - Comparativa Territorial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    ref={(el) => fileInputRefs.current['comparativaTerritorial'] = el}
                    onChange={() => handleImageUpload('comparativaTerritorial')}
                    className="hidden"
                    id="comparativa"
                  />
                  <Label htmlFor="comparativa" className="cursor-pointer">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => document.getElementById('comparativa')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingImages['comparativaTerritorial'] ? 'Subiendo...' : 'Subir Gráfica'}
                    </Button>
                  </Label>
                </div>
                {informeData.comparativaTerritorial.graficas && informeData.comparativaTerritorial.graficas.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {informeData.comparativaTerritorial.graficas.map((url, imgIndex) => (
                      <div key={imgIndex} className="relative border rounded-lg p-2">
                        <img src={url} alt={`Gráfica ${imgIndex + 1}`} className="w-full h-auto rounded" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removeImage('comparativaTerritorial', imgIndex)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráficas para Recomendaciones */}
            {informeData.recomendaciones.map((recomendacion, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>Gráficas - {recomendacion.titulo || `Recomendación ${index + 1}`}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      ref={(el) => fileInputRefs.current[`recomendaciones-recomendacion-${index}`] = el}
                      onChange={() => handleImageUpload('recomendaciones', 'recomendacion', index)}
                      className="hidden"
                      id={`recomendacion-${index}`}
                    />
                    <Label htmlFor={`recomendacion-${index}`} className="cursor-pointer">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => document.getElementById(`recomendacion-${index}`)?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingImages[`recomendaciones-recomendacion-${index}`] ? 'Subiendo...' : 'Subir Gráfica'}
                      </Button>
                    </Label>
                  </div>
                  {recomendacion.graficas && recomendacion.graficas.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      {recomendacion.graficas.map((url, imgIndex) => (
                        <div key={imgIndex} className="relative border rounded-lg p-2">
                          <img src={url} alt={`Gráfica ${imgIndex + 1}`} className="w-full h-auto rounded" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeImage('recomendaciones', imgIndex, index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Tab Fuentes */}
          <TabsContent value="fuentes" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Fuentes de Datos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Contenido sobre fuentes</Label>
                  <Textarea
                    value={informeData.datosFuentes.contenido}
                    onChange={(e) => setInformeData(prev => ({
                      ...prev,
                      datosFuentes: { ...prev.datosFuentes, contenido: e.target.value }
                    }))}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lista de Fuentes</Label>
                  {informeData.datosFuentes.fuentes.map((fuente, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={fuente}
                        onChange={(e) => {
                          const nuevasFuentes = [...informeData.datosFuentes.fuentes];
                          nuevasFuentes[index] = e.target.value;
                          setInformeData(prev => ({
                            ...prev,
                            datosFuentes: { ...prev.datosFuentes, fuentes: nuevasFuentes }
                          }));
                        }}
                        placeholder="Nombre de la fuente"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const nuevasFuentes = informeData.datosFuentes.fuentes.filter((_, i) => i !== index);
                          setInformeData(prev => ({
                            ...prev,
                            datosFuentes: { ...prev.datosFuentes, fuentes: nuevasFuentes }
                          }));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addFuente}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Fuente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2 pt-4 border-t">
          <Button
            className="flex-1 bg-[#0c6c8b] text-white hover:bg-[#0a5a73]"
            onClick={handleSubmit}
            disabled={loading || !informeData.titulo}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Informe"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInformeDialog;
