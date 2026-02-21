import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Eye, FileText, X, Maximize2, Minimize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const InformeBrainnova2025 = () => {
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showHtmlViewer, setShowHtmlViewer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const pdfUrl = "/informes/InformeBrainnova_2025.pdf";

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-white to-blue-50 hover:shadow-xl transition-all border-2 border-[#0c6c8b]">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#0c6c8b] rounded-lg shadow-md">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-[#0c6c8b] text-white rounded-full">
                PDF + HTML
              </span>
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                Nuevo
              </span>
            </div>
          </div>
        </div>
        <CardTitle className="text-xl mb-2 text-[#0c6c8b] font-bold">Informe BRAINNOVA 2025</CardTitle>
        <CardDescription className="text-sm text-gray-700 leading-relaxed">
          Informe completo del Índice BRAINNOVA 2025 sobre el estado de la economía digital en la Comunitat Valenciana. 
          Análisis exhaustivo de dimensiones, indicadores y comparativas territoriales. Disponible en formato PDF y HTML interactivo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Enero 2025</span>
            <span>14 págs</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
              Informes anuales
            </span>
          </div>
          
          {/* Tabs para ver PDF o contenido web */}
          <Tabs defaultValue="web" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="web">Ver Online</TabsTrigger>
              <TabsTrigger value="pdf">Ver PDF</TabsTrigger>
            </TabsList>
            
            <TabsContent value="web" className="mt-4">
              <div className="border rounded-lg p-6 bg-white max-h-[600px] overflow-y-auto shadow-inner">
                <InformeContent />
              </div>
            </TabsContent>
            
            <TabsContent value="pdf" className="mt-4">
              <div className="border rounded-lg bg-white relative">
                <div className="absolute top-2 right-2 z-10 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="h-8"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <iframe
                  src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-[600px] border-0"
                  title="Informe BRAINNOVA 2025"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-2 pt-2">
            <Button
              className="flex-1 bg-[#0c6c8b] text-white hover:bg-[#0a5a73]"
              size="sm"
              onClick={() => setShowHtmlViewer(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Online
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.download = 'InformeBrainnova_2025.pdf';
                link.click();
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="px-3"
              onClick={() => setShowPdfViewer(true)}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Dialog para ver contenido HTML en pantalla completa */}
      <Dialog open={showHtmlViewer} onOpenChange={setShowHtmlViewer}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 border-b">
            <DialogTitle className="text-2xl font-bold text-[#0c6c8b]">
              Informe BRAINNOVA 2025
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              Versión HTML - Enero 2025
            </p>
          </DialogHeader>
          <div className="relative w-full h-[80vh] overflow-y-auto p-6 bg-gray-50">
            <InformeContent />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver PDF en pantalla completa */}
      <Dialog open={showPdfViewer} onOpenChange={setShowPdfViewer}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 border-b">
            <DialogTitle>Informe BRAINNOVA 2025 - PDF</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[80vh]">
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full border-0"
              title="Informe BRAINNOVA 2025"
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Componente con el contenido del informe en formato web
const InformeContent = ({ pdfUrl }: { pdfUrl?: string | null }) => {
  const downloadPdfUrl = pdfUrl && pdfUrl.startsWith('http') ? pdfUrl : '/informes/InformeBrainnova_2025.pdf';
  const downloadFileName = pdfUrl && pdfUrl.includes('/') ? pdfUrl.split('/').pop() || 'InformeBrainnova_2025.pdf' : 'InformeBrainnova_2025.pdf';

  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      {/* Portada */}
      <div className="text-center mb-10 pb-8 border-b-2 border-[#0c6c8b]">
        <div className="mb-4">
          <div className="inline-block px-6 py-2 bg-[#0c6c8b] text-white rounded-lg mb-4">
            <span className="text-sm font-semibold">CÁMARA DE COMERCIO DE VALENCIA</span>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-[#0c6c8b] mb-3">
          Informe BRAINNOVA 2025
        </h1>
        <p className="text-xl text-gray-700 font-medium mb-2">
          Índice de Economía Digital de la Comunitat Valenciana
        </p>
        <p className="text-base text-gray-600 mt-4">
          Análisis integral del ecosistema digital valenciano
        </p>
        <div className="mt-6 pt-4 border-t border-gray-300">
          <p className="text-sm text-gray-500">
            Enero 2025 | 14 páginas
          </p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[#0c6c8b] mb-5 pb-2 border-b border-[#0c6c8b]">
          1. Resumen Ejecutivo
        </h2>
        <div className="bg-blue-50 p-5 rounded-lg mb-4 border-l-4 border-[#0c6c8b]">
          <p className="text-gray-800 leading-relaxed font-medium mb-3">
            El Informe BRAINNOVA 2025 presenta un análisis exhaustivo del estado de la economía digital 
            en la Comunitat Valenciana. Este informe evalúa múltiples dimensiones del ecosistema digital 
            mediante un conjunto de indicadores que permiten medir el progreso y comparar el desempeño 
            con otras regiones.
          </p>
          <p className="text-gray-700 leading-relaxed">
            El índice BRAINNOVA proporciona una visión integral que abarca desde la transformación digital 
            empresarial hasta las infraestructuras tecnológicas, pasando por el capital humano digital y 
            otros aspectos clave del ecosistema digital valenciano.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-3xl font-bold text-[#0c6c8b] mb-2">4+</div>
            <div className="text-sm text-gray-600">Dimensiones Evaluadas</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-3xl font-bold text-[#0c6c8b] mb-2">50+</div>
            <div className="text-sm text-gray-600">Indicadores Analizados</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-3xl font-bold text-[#0c6c8b] mb-2">2025</div>
            <div className="text-sm text-gray-600">Año de Referencia</div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[#0c6c8b] mb-5 pb-2 border-b border-[#0c6c8b]">
          2. Metodología
        </h2>
        <p className="text-gray-700 leading-relaxed mb-5">
          El índice BRAINNOVA se construye a partir de múltiples dimensiones, cada una de las cuales 
          se compone de subdimensiones e indicadores específicos. La metodología permite:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-[#0c6c8b] mb-2 flex items-center">
              <span className="w-6 h-6 bg-[#0c6c8b] text-white rounded-full flex items-center justify-center text-xs mr-2">1</span>
              Medición Objetiva
            </h3>
            <p className="text-sm text-gray-600">
              Evaluación cuantitativa del estado de la economía digital mediante indicadores verificables y datos oficiales.
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-[#0c6c8b] mb-2 flex items-center">
              <span className="w-6 h-6 bg-[#0c6c8b] text-white rounded-full flex items-center justify-center text-xs mr-2">2</span>
              Comparación Temporal
            </h3>
            <p className="text-sm text-gray-600">
              Análisis de la evolución a lo largo del tiempo para identificar tendencias y cambios en el ecosistema digital.
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-[#0c6c8b] mb-2 flex items-center">
              <span className="w-6 h-6 bg-[#0c6c8b] text-white rounded-full flex items-center justify-center text-xs mr-2">3</span>
              Comparación Territorial
            </h3>
            <p className="text-sm text-gray-600">
              Benchmarking con otras comunidades autónomas y países de la Unión Europea para contextualizar el desempeño.
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-[#0c6c8b] mb-2 flex items-center">
              <span className="w-6 h-6 bg-[#0c6c8b] text-white rounded-full flex items-center justify-center text-xs mr-2">4</span>
              Identificación de Oportunidades
            </h3>
            <p className="text-sm text-gray-600">
              Detección de áreas de mejora y fortalezas para orientar políticas y estrategias de transformación digital.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[#0c6c8b] mb-5 pb-2 border-b border-[#0c6c8b]">
          3. Dimensiones Evaluadas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-[#0c6c8b] mb-2">
              Transformación Digital Empresarial
            </h3>
            <p className="text-sm text-gray-600">
              Mide el grado de adopción de tecnologías digitales por parte de las empresas, 
              incluyendo uso de IA, Big Data, cloud computing y automatización.
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-[#0c6c8b] mb-2">
              Capital Humano Digital
            </h3>
            <p className="text-sm text-gray-600">
              Evalúa las competencias digitales de la población, formación en TIC y empleo 
              relacionado con tecnologías de la información.
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-semibold text-[#0c6c8b] mb-2">
              Infraestructuras Digitales
            </h3>
            <p className="text-sm text-gray-600">
              Analiza la cobertura y calidad de las infraestructuras tecnológicas: fibra óptica, 
              5G, centros de datos y conectividad.
            </p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <h3 className="font-semibold text-[#0c6c8b] mb-2">
              Emprendimiento e Innovación
            </h3>
            <p className="text-sm text-gray-600">
              Examina el ecosistema de startups, inversión en I+D+i y apoyo al emprendimiento 
              tecnológico.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[#0c6c8b] mb-5 pb-2 border-b border-[#0c6c8b]">
          4. Principales Hallazgos
        </h2>
        <div className="space-y-4">
          <div className="p-4 border-l-4 border-[#0c6c8b] bg-blue-50">
            <h3 className="font-semibold mb-2">Evolución Positiva</h3>
            <p className="text-sm text-gray-700">
              La Comunitat Valenciana muestra una evolución positiva en la mayoría de las dimensiones 
              evaluadas, con mejoras significativas en transformación digital empresarial y capital humano.
            </p>
          </div>
          <div className="p-4 border-l-4 border-green-500 bg-green-50">
            <h3 className="font-semibold mb-2">Fortalezas Identificadas</h3>
            <p className="text-sm text-gray-700">
              Se identifican fortalezas en infraestructuras digitales y en el ecosistema de 
              emprendimiento, posicionando a la región como referente en innovación tecnológica.
            </p>
          </div>
          <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
            <h3 className="font-semibold mb-2">Áreas de Mejora</h3>
            <p className="text-sm text-gray-700">
              Existen oportunidades de mejora en la adopción de tecnologías avanzadas por parte de 
              las pymes y en la formación continua en competencias digitales.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[#0c6c8b] mb-5 pb-2 border-b border-[#0c6c8b]">
          5. Comparativa Territorial
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          El informe incluye comparativas detalladas con otras comunidades autónomas españolas y 
          con la media de la Unión Europea, permitiendo contextualizar el desempeño de la 
          Comunitat Valenciana.
        </p>
        <p className="text-gray-700 leading-relaxed">
          Los datos muestran que la región se encuentra en una posición competitiva, con indicadores 
          que superan la media nacional en varias dimensiones clave.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[#0c6c8b] mb-5 pb-2 border-b border-[#0c6c8b]">
          6. Recomendaciones Estratégicas
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg border-l-4 border-blue-500 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm mr-3">1</span>
              Digitalización de Pymes
            </h3>
            <p className="text-gray-700 text-sm ml-11">
              Fomentar la digitalización de las pymes mediante programas específicos de apoyo, asesoramiento técnico y ayudas económicas para la adopción de tecnologías digitales.
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border-l-4 border-green-500 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm mr-3">2</span>
              Formación en Competencias Digitales
            </h3>
            <p className="text-gray-700 text-sm ml-11">
              Ampliar la oferta formativa en competencias digitales avanzadas, tanto para profesionales en activo como para estudiantes y desempleados.
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border-l-4 border-purple-500 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm mr-3">3</span>
              Infraestructuras de Conectividad
            </h3>
            <p className="text-gray-700 text-sm ml-11">
              Continuar invirtiendo en infraestructuras de conectividad de última generación, especialmente en zonas rurales y áreas menos desarrolladas.
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border-l-4 border-orange-500 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm mr-3">4</span>
              Ecosistema de Innovación
            </h3>
            <p className="text-gray-700 text-sm ml-11">
              Reforzar el ecosistema de innovación y emprendimiento tecnológico mediante incentivos fiscales, espacios de coworking y programas de aceleración.
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border-l-4 border-red-500 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm mr-3">5</span>
              Colaboración Público-Privada
            </h3>
            <p className="text-gray-700 text-sm ml-11">
              Promover la colaboración público-privada en proyectos de transformación digital que generen valor para toda la sociedad valenciana.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10 pt-6 border-t-2 border-gray-300">
        <h2 className="text-2xl font-bold text-[#0c6c8b] mb-5 pb-2 border-b border-[#0c6c8b]">
          7. Datos y Fuentes
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Los datos utilizados en este informe provienen de fuentes oficiales y encuestas realizadas 
          específicamente para el proyecto BRAINNOVA. Entre las fuentes principales se encuentran:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>Instituto Nacional de Estadística (INE)</li>
          <li>Eurostat</li>
          <li>Encuestas propias de la Cámara de Comercio de Valencia</li>
          <li>Datos de organismos públicos y privados</li>
        </ul>
      </section>

      <div className="mt-10 pt-8 border-t-2 border-gray-300">
        <div className="bg-gradient-to-r from-[#0c6c8b] to-[#0a5a73] text-white p-6 rounded-lg text-center">
          <h3 className="text-xl font-bold mb-3">¿Necesitas más información?</h3>
          <p className="text-blue-100 mb-4 text-sm">
            Para más información detallada, consulta el PDF completo del informe o accede a los 
            dashboards interactivos disponibles en la plataforma BRAINNOVA.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const link = document.createElement('a');
                link.href = downloadPdfUrl;
                link.download = downloadFileName;
                link.rel = 'noopener noreferrer';
                link.click();
              }}
              className="bg-white text-[#0c6c8b] hover:bg-gray-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF Completo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/dashboard'}
              className="bg-transparent border-white text-white hover:bg-white/10"
            >
              Ver Dashboards Interactivos
            </Button>
          </div>
        </div>
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>© 2025 Cámara de Comercio de Valencia | BRAINNOVA - Índice de Economía Digital</p>
        </div>
      </div>
    </div>
  );
};

export default InformeBrainnova2025;
export { InformeContent };
