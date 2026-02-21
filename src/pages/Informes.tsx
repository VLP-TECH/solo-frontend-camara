import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText,
  LogOut,
  Download,
  Eye,
  Upload,
  Loader2,
  Plus,
  AlertCircle
} from "lucide-react";
import { useAppMenuItems } from "@/hooks/useAppMenuItems";
import { BRAINNOVA_LOGO_SRC, CAMARA_VALENCIA_LOGO_SRC } from "@/lib/logo-assets";
import FloatingCamaraLogo from "@/components/FloatingCamaraLogo";
import { InformeContent } from "@/components/InformeBrainnova2025";
import CreateInformeDialog from "@/components/CreateInformeDialog";

interface Informe {
  id: string;
  title: string;
  description: string;
  date: string;
  pages: number;
  category: string;
  format: string;
  pdfUrl?: string;
}

// URL pública del PDF en Supabase Storage (bucket informes, público). Si la BD/Storage no devuelven URL, se usa esta para visualizar.
const BRAINNOVA_2025_PDF_URL = "https://aoykpiievtadhwssugvs.supabase.co/storage/v1/object/public/informes/brainnova-2025-1771591990981.pdf";

const DEFAULT_INFORMES: Informe[] = [
  {
    id: "brainnova-2025",
    title: "Informe BRAINNOVA 2025",
    description: "Informe completo del Índice BRAINNOVA 2025 sobre el estado de la economía digital en la Comunitat Valenciana. Análisis exhaustivo de dimensiones, indicadores y comparativas territoriales.",
    date: "Enero 2025",
    pages: 14,
    category: "Informes anuales",
    format: "PDF + HTML",
    pdfUrl: BRAINNOVA_2025_PDF_URL
  }
];

const Informes = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { roles } = usePermissions();
  const { isAdmin, loading: profileLoading, profile } = useUserProfile();
  const { toast } = useToast();
  const [selectedInforme, setSelectedInforme] = useState<Informe | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadingInformeId, setUploadingInformeId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [pdfCacheBuster, setPdfCacheBuster] = useState(0);
  const [informesLoading, setInformesLoading] = useState(true);
  const [retryingPdf, setRetryingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buscar PDF en Storage por id de informe (nombre tipo "brainnova-2025-123.pdf")
  const getPdfUrlFromStorage = async (informeId: string): Promise<string | undefined> => {
    const findInList = (items: { name?: string }[] | null, prefix: string): string | undefined => {
      if (!items || !Array.isArray(items)) return undefined;
      const match = items.find(
        (f) => typeof f.name === 'string' && f.name.startsWith(prefix) && f.name.endsWith('.pdf')
      );
      return match ? match.name : undefined;
    };
    try {
      // Listar raíz del bucket (sin sortBy por compatibilidad)
      const { data: rootFiles, error: rootError } = await supabase.storage
        .from('informes')
        .list('', { limit: 200 });
      let fileName = findInList(rootFiles, `${informeId}-`);
      if (fileName) {
        const { data: urlData } = supabase.storage.from('informes').getPublicUrl(fileName);
        return urlData.publicUrl;
      }
      // Si hay subcarpetas, buscar también (ej. carpeta "informes" dentro del bucket)
      if (rootFiles && Array.isArray(rootFiles)) {
        for (const item of rootFiles) {
          const name = item?.name;
          if (typeof name === 'string' && name && !name.includes('.')) {
            const { data: subFiles } = await supabase.storage.from('informes').list(name, { limit: 200 });
            fileName = findInList(subFiles, `${informeId}-`);
            if (fileName) {
              const { data: urlData } = supabase.storage.from('informes').getPublicUrl(`${name}/${fileName}`);
              return urlData.publicUrl;
            }
          }
        }
      }
      if (rootError) console.warn('[Informes] Storage list error:', rootError.message);
      // Fallback: si es el informe BRAINNOVA 2025 y no se encontró en el listado, usar la URL pública conocida
      if (informeId.toLowerCase() === "brainnova-2025") return BRAINNOVA_2025_PDF_URL;
    } catch (e) {
      console.warn('[Informes] No se pudo listar Storage para', informeId, e);
      if (informeId.toLowerCase() === "brainnova-2025") return BRAINNOVA_2025_PDF_URL;
    }
    return undefined;
  };

  // Cargar informes desde Supabase (o usar lista por defecto) y enriquecer con PDFs desde Storage si faltan
  useEffect(() => {
    let cancelled = false;
    const loadInformes = async () => {
      try {
        const { data, error } = await supabase
          .from('informes' as any)
          .select('*');

        if (cancelled) return;
        
        let list: Informe[] = [];
        
        if (error || !data || data.length === 0) {
          list = [...DEFAULT_INFORMES];
        } else {
          list = data.map((row: any) => {
            const rawId = String(row.id ?? '').trim();
            const id = rawId.toLowerCase() === 'brainnova-2025' ? 'brainnova-2025' : rawId;
            return {
              id,
              title: String(row.title ?? row.titulo ?? ''),
              description: String(row.description ?? row.descripcion ?? ''),
              date: String(row.date ?? row.fecha ?? ''),
              pages: Number(row.pages ?? row.paginas) || 0,
              category: String(row.category ?? row.categoria ?? ''),
              format: String(row.format ?? row.formato ?? 'PDF'),
              pdfUrl: (row.pdf_url ?? row.pdfUrl ?? row.url_pdf) ? String(row.pdf_url ?? row.pdfUrl ?? row.url_pdf) : undefined
            };
          });
        }

        // Para cada informe sin pdfUrl, buscar en Storage (así al cerrar sesión y volver se recupera el link)
        const enriched = await Promise.all(
          list.map(async (inf) => {
            if (inf.pdfUrl) return inf;
            const urlFromStorage = await getPdfUrlFromStorage(inf.id);
            if (urlFromStorage) {
              await supabase.rpc('upsert_informe_pdf', { p_id: inf.id, p_pdf_url: urlFromStorage }).catch(() => {});
              return { ...inf, pdfUrl: urlFromStorage };
            }
            return inf;
          })
        );

        // En producción: asegurar siempre URL del PDF para Informe BRAINNOVA 2025 aunque falle Storage/BD
        const final = enriched.map((inf) =>
          inf.id === 'brainnova-2025' && !inf.pdfUrl
            ? { ...inf, pdfUrl: BRAINNOVA_2025_PDF_URL }
            : inf
        );

        if (!cancelled) setInformes(final);
      } catch (e) {
        if (!cancelled) {
          console.warn('Error cargando informes:', e);
          setInformes(DEFAULT_INFORMES);
        }
      } finally {
        if (!cancelled) setInformesLoading(false);
      }
    };
    loadInformes();
    return () => { cancelled = true; };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const [informes, setInformes] = useState<Informe[]>(DEFAULT_INFORMES);

  const handleInformeClick = (informe: Informe) => {
    const withPdf = informe.id === 'brainnova-2025' && !informe.pdfUrl
      ? { ...informe, pdfUrl: BRAINNOVA_2025_PDF_URL }
      : informe;
    setSelectedInforme(withPdf);
    setShowPreview(true);
    setPdfLoadError(false);
    setPdfCacheBuster(Date.now());
  };

  // Si se abre el detalle sin pdfUrl, intentar una vez más desde Storage (p. ej. listado cargó antes de que existiera el PDF)
  useEffect(() => {
    if (!showPreview || !selectedInforme?.id || selectedInforme.pdfUrl) return;
    let cancelled = false;
    getPdfUrlFromStorage(selectedInforme.id).then((url) => {
      if (cancelled || !url) return;
      setSelectedInforme((prev) => (prev ? { ...prev, pdfUrl: url } : null));
      setInformes((prev) =>
        prev.map((inf) => (inf.id === selectedInforme.id ? { ...inf, pdfUrl: url } : inf))
      );
      setPdfCacheBuster(Date.now());
    });
    return () => { cancelled = true; };
  }, [showPreview, selectedInforme?.id, selectedInforme?.pdfUrl]);

  /** URL absoluta del PDF para iframe y descarga (evita rutas relativas que no cargan bien) */
  const getAbsolutePdfUrl = (pdfUrl?: string | null): string => {
    if (!pdfUrl) return '';
    if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) return pdfUrl;
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
    const path = pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`;
    return `${window.location.origin}${base}${path}`;
  };

  const handleDownload = (pdfUrl?: string) => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = getAbsolutePdfUrl(pdfUrl);
      link.download = pdfUrl.split('/').pop() || 'informe.pdf';
      link.click();
    }
  };

  const handleUploadClick = (informe: Informe, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedInforme(informe);
    setShowUploadDialog(true);
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo PDF",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          title: "Error",
          description: "El archivo es demasiado grande. Máximo 50MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadPDF = async () => {
    if (!selectedFile || !selectedInforme) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo PDF",
        variant: "destructive",
      });
      return;
    }

    // En producción la subida requiere sesión activa; sin ella Storage rechaza por RLS
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Sesión requerida",
        description: "Debes tener la sesión iniciada para subir PDFs. Cierra sesión, vuelve a entrar y prueba de nuevo.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${selectedInforme.id}-${Date.now()}.pdf`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('informes')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Supabase Storage upload error:', uploadError);
        const msg = uploadError.message || "No se pudo subir el PDF.";
        const isBucketMissing =
          msg.toLowerCase().includes('bucket') ||
          msg.toLowerCase().includes('not found') ||
          msg.toLowerCase().includes('does not exist');
        const isPolicy =
          msg.toLowerCase().includes('policy') ||
          msg.toLowerCase().includes('row-level security') ||
          msg.toLowerCase().includes('rls');
        let suggestion = msg;
        if (isBucketMissing) {
          suggestion = "Crea el bucket 'informes' en Supabase: Storage → New bucket → nombre 'informes', público. Luego en Policies añade INSERT para 'authenticated'.";
        } else if (isPolicy) {
          suggestion = "En Supabase Storage → bucket 'informes' → Policies: permite INSERT a usuarios 'authenticated'. Ejecuta la migración de políticas si no lo has hecho.";
        }
        toast({
          title: "Error al subir el PDF",
          description: suggestion,
          variant: "destructive",
        });
        return;
      }

      const { data: urlData } = supabase.storage.from('informes').getPublicUrl(filePath);
      const newPdfUrl = urlData.publicUrl;

      // Guardar URL en BD: intentar función RPC primero, luego métodos directos como fallback
      let savedToDB = false;
      
      // Método 1: Función RPC (más robusto, evita problemas de esquema)
      const { error: rpcError } = await supabase.rpc('upsert_informe_pdf', {
        p_id: selectedInforme.id,
        p_pdf_url: newPdfUrl,
      });
      
      if (!rpcError) {
        savedToDB = true;
        console.log('[Informes] pdf_url guardado en Supabase via RPC:', selectedInforme.id, newPdfUrl);
      } else {
        console.warn('[Informes] Función RPC no disponible, intentando update directo:', rpcError.message);
        
        // Método 2: Update directo simple (solo pdf_url)
        const { data: updatedRows, error: updateError } = await supabase
          .from('informes' as any)
          .update({ pdf_url: newPdfUrl })
          .eq('id', selectedInforme.id)
          .select('id');
        
        if (!updateError && updatedRows && updatedRows.length > 0) {
          savedToDB = true;
          console.log('[Informes] pdf_url guardado via update directo:', selectedInforme.id);
        } else {
          // Método 3: Insert mínimo (solo id + pdf_url)
          const { error: insertError } = await supabase
            .from('informes' as any)
            .insert({ id: selectedInforme.id, pdf_url: newPdfUrl });
          
          if (!insertError) {
            savedToDB = true;
            console.log('[Informes] pdf_url guardado via insert directo:', selectedInforme.id);
          } else {
            console.error('[Informes] No se pudo guardar pdf_url en BD:', insertError.message);
            toast({
              title: "PDF subido pero no guardado en BD",
              description: "El PDF está en Storage pero no se pudo guardar la referencia. Ejecuta en Supabase SQL Editor las migraciones de la tabla informes y la función upsert_informe_pdf.",
              variant: "destructive",
            });
          }
        }
      }

      const updatedInforme = { ...selectedInforme, pdfUrl: newPdfUrl };
      setInformes(prev =>
        prev.map(inf => (inf.id === selectedInforme.id ? updatedInforme : inf))
      );
      setSelectedInforme(updatedInforme);
      setPdfCacheBuster(Date.now());

      toast({
        title: "Éxito",
        description: "PDF subido a Supabase Storage. Ya puedes verlo o descargarlo.",
      });

      if (!showPreview) setShowPreview(true);
      setShowUploadDialog(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      toast({
        title: "Error al subir PDF",
        description: error?.message || "No se pudo subir el PDF. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const menuItems = useAppMenuItems();

  return (
    <>
      <FloatingCamaraLogo />
      <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0c6c8b] text-white flex flex-col">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <img
              src={BRAINNOVA_LOGO_SRC}
              alt="Brainnova"
              className="h-40 w-auto object-contain"
            />
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
            <img src={CAMARA_VALENCIA_LOGO_SRC} alt="Cámara Valencia" className="h-40 w-auto object-contain" />
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
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">Plataforma de Economía Digital</h2>
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
          <div className="max-w-7xl mx-auto">
            {/* Title Section */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-[#0c6c8b] mb-3">
                  Repositorio de Informes
                </h1>
                <p className="text-lg text-gray-600">
                  Accede a los informes generados a partir del Sistema de Indicadores BRAINNOVA.
                </p>
              </div>
              {isAdmin && (
                <Button
                  className="bg-[#0c6c8b] text-white hover:bg-[#0a5a73]"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Informe
                </Button>
              )}
            </div>

            {/* Lista de Informes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {informes.map((informe) => (
                <Card 
                  key={informe.id} 
                  className="bg-white hover:shadow-lg transition-all cursor-pointer border-2 hover:border-[#0c6c8b]"
                  onClick={() => handleInformeClick(informe)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileText className="h-6 w-6 text-[#0c6c8b]" />
                        </div>
                        <div>
                          <span className="inline-block px-2 py-1 text-xs font-semibold bg-[#0c6c8b] text-white rounded">
                            {informe.format}
                          </span>
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-lg mb-2">{informe.title}</CardTitle>
                    <CardDescription className="text-sm text-gray-600 line-clamp-3">
                      {informe.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>{informe.date}</span>
                        {informe.pages > 0 && <span>{informe.pages} págs</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {informe.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          className="flex-1 bg-[#0c6c8b] text-white hover:bg-[#0a5a73]"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInformeClick(informe);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Informe
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(informe.pdfUrl);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-3 border-green-500 text-green-700 hover:bg-green-50"
                            onClick={(e) => handleUploadClick(informe, e)}
                            title="Subir nuevo PDF (Admin)"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>

        {/* Modal de Previsualización */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-6xl max-h-[90vh] p-0">
            <DialogHeader className="px-6 pt-6 border-b">
              <DialogTitle className="text-2xl font-bold text-[#0c6c8b]">
                {selectedInforme?.title}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                {selectedInforme?.date} • {selectedInforme?.pages} páginas
              </p>
            </DialogHeader>
            <div className="p-6">
              <Tabs defaultValue="html" className="w-full" key={selectedInforme?.pdfUrl}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="html">Ver Online (HTML)</TabsTrigger>
                  <TabsTrigger
                    value="pdf"
                    onClick={() => setPdfLoadError(false)}
                  >
                    Ver PDF
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="html" className="mt-4">
                  <div className="border rounded-lg bg-gray-50 max-h-[70vh] overflow-y-auto p-6">
                    <InformeContent />
                  </div>
                </TabsContent>
                
                <TabsContent value="pdf" className="mt-4">
                  <div className="border rounded-lg bg-white relative min-h-[70vh] overflow-hidden">
                    {!selectedInforme?.pdfUrl ? (
                      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
                        <FileText className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No hay PDF disponible
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Este informe no tiene archivo PDF asociado. Un administrador puede subir uno.
                        </p>
                        <Button
                          variant="outline"
                          disabled={retryingPdf}
                          onClick={async () => {
                            if (!selectedInforme?.id) return;
                            setRetryingPdf(true);
                            try {
                              const url = await getPdfUrlFromStorage(selectedInforme.id);
                              if (url) {
                                setSelectedInforme((prev) => (prev ? { ...prev, pdfUrl: url } : null));
                                setInformes((prev) =>
                                  prev.map((inf) => (inf.id === selectedInforme.id ? { ...inf, pdfUrl: url } : inf))
                                );
                                setPdfCacheBuster(Date.now());
                              } else {
                                toast({ title: "No encontrado", description: "No se encontró el PDF en Storage.", variant: "destructive" });
                              }
                            } finally {
                              setRetryingPdf(false);
                            }
                          }}
                        >
                          {retryingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Reintentar buscar PDF
                        </Button>
                      </div>
                    ) : pdfLoadError ? (
                      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No se pudo cargar el PDF (404 o error de red)
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          El archivo puede no estar disponible en el servidor o la ruta no es correcta. Prueba a abrirlo en una nueva pestaña o a descargarlo.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          <Button
                            onClick={() => window.open(getAbsolutePdfUrl(selectedInforme?.pdfUrl), '_blank', 'noopener,noreferrer')}
                            variant="outline"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Abrir en nueva pestaña
                          </Button>
                          <Button
                            onClick={() => handleDownload(selectedInforme?.pdfUrl)}
                            className="bg-[#0c6c8b] text-white hover:bg-[#0a5a73]"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar PDF
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <iframe
                        key={`${selectedInforme?.pdfUrl}-${pdfCacheBuster}`}
                        src={`${getAbsolutePdfUrl(selectedInforme?.pdfUrl)}?t=${pdfCacheBuster}#toolbar=1&navpanes=1&scrollbar=1`}
                        className="w-full min-h-[70vh] h-[70vh] border-0 block"
                        style={{ minHeight: '70vh' }}
                        title={`PDF: ${selectedInforme?.title}`}
                        onError={() => {
                          console.error('Error loading PDF in iframe');
                          setPdfLoadError(true);
                        }}
                        onLoad={(e) => {
                          try {
                            const iframe = e.target as HTMLIFrameElement;
                            if (iframe.contentWindow === null) {
                              setPdfLoadError(true);
                            }
                          } catch {
                            // CORS: el PDF puede haberse cargado igual
                          }
                        }}
                      />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex items-center gap-2 mt-4 pt-4 border-t flex-wrap">
                <Button
                  className="flex-1 min-w-[140px] bg-[#0c6c8b] text-white hover:bg-[#0a5a73]"
                  onClick={() => handleDownload(selectedInforme?.pdfUrl)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
                {selectedInforme?.pdfUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(getAbsolutePdfUrl(selectedInforme?.pdfUrl), '_blank', 'noopener,noreferrer')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Abrir PDF en nueva pestaña
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para subir PDF (solo admin) */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Subir PDF del Informe</DialogTitle>
              <DialogDescription>
                Selecciona un archivo PDF para reemplazar el informe actual de "{selectedInforme?.title}".
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pdf-upload">Archivo PDF</Label>
                <Input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600">
                    Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Button
                  className="flex-1 bg-[#0c6c8b] text-white hover:bg-[#0a5a73]"
                  onClick={handleUploadPDF}
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Subir PDF
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadDialog(false);
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para crear nuevo informe */}
        <CreateInformeDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            // Recargar la lista de informes
            // Por ahora solo mostrar mensaje, luego se puede conectar con la BD
            toast({
              title: "Éxito",
              description: "Informe creado correctamente. Recarga la página para verlo.",
            });
          }}
        />
      </div>
    </div>
    </>
  );
};

export default Informes;

