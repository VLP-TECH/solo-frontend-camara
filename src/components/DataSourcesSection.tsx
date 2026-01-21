import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  Database, 
  Globe, 
  BarChart3, 
  Zap, 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
  Calendar,
  FileText,
  TrendingUp
} from "lucide-react";
import { getDataSources, getDataSourcesStats, type DataSource } from "@/lib/data-sources";
import { supabase } from "@/integrations/supabase/client";

const DataSourcesSection = () => {
  const { permissions, loading } = usePermissions();
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Obtener fuentes de datos reales
  const { data: dataSources, isLoading: loadingSources } = useQuery({
    queryKey: ["data-sources"],
    queryFn: getDataSources,
    refetchInterval: 300000, // Actualizar cada 5 minutos
  });

  // Obtener estadísticas de fuentes
  const { data: stats } = useQuery({
    queryKey: ["data-sources-stats"],
    queryFn: getDataSourcesStats,
    refetchInterval: 300000,
  });

  // Obtener indicadores detallados de la fuente seleccionada
  const { data: sourceIndicators } = useQuery({
    queryKey: ["source-indicators", selectedSource?.nombre],
    queryFn: async () => {
      if (!selectedSource) return [];
      
      const { data, error } = await supabase
        .from("definicion_indicadores")
        .select("nombre, importancia, formula, origen_indicador, nombre_subdimension")
        .eq("fuente", selectedSource.nombre)
        .order("nombre");

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSource && isDialogOpen,
  });

  const handleViewDetails = (source: DataSource) => {
    setSelectedSource(source);
    setIsDialogOpen(true);
  };

  if (loading || loadingSources) {
    return (
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando fuentes de datos...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!permissions.canViewData) {
    return (
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Acceso Restringido
            </h2>
            <p className="text-muted-foreground">
              Tu cuenta necesita ser activada para ver los datos. Contacta con un administrador.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Mapeo de iconos y colores según el tipo de fuente
  const getSourceIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case "europeo":
        return Globe;
      case "gubernamental":
        return Zap;
      case "autonómico":
        return Database;
      default:
        return BarChart3;
    }
  };

  const getSourceColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case "europeo":
        return "bg-accent/10 text-accent";
      case "gubernamental":
        return "bg-success/10 text-success";
      case "autonómico":
        return "bg-secondary/10 text-secondary";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  const integrationMethods = [
    {
      title: "APIs REST",
      description: "Integración directa con servicios oficiales",
      technologies: ["OAuth 2.0", "JWT", "Rate Limiting"],
      status: "Implementado"
    },
    {
      title: "Web Scraping",
      description: "Extracción automatizada de datos públicos",
      technologies: ["Selenium", "Puppeteer", "Scrapy"],
      status: "En desarrollo"
    },
    {
      title: "ETL Pipelines",
      description: "Procesamiento y normalización de datos",
      technologies: ["Apache Airflow", "Pandas", "SQL"],
      status: "Implementado"
    },
    {
      title: "Real-time Streaming",
      description: "Datos en tiempo real y alertas",
      technologies: ["Apache Kafka", "WebSockets", "Redis"],
      status: "Planificado"
    }
  ];

  return (
    <section id="data" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="flex flex-col lg:flex-row items-center justify-between mb-6">
            <div className="text-left lg:flex-1">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Fuentes de Datos e Integración
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl">
                Infraestructura técnica para la captura, procesamiento y almacenamiento automatizado 
                de datos del ecosistema digital valenciano
              </p>
              {stats && (
                <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                  <span>📊 {stats.totalFuentes} fuentes</span>
                  <span>📈 {stats.totalIndicadores} indicadores</span>
                  <span>💾 {stats.totalResultados.toLocaleString()} resultados</span>
                  <span>✅ {stats.fuentesActivas} activas</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Sources Grid */}
        {dataSources && dataSources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {dataSources.map((source) => {
              const Icon = getSourceIcon(source.tipo);
              const color = getSourceColor(source.tipo);
              
              return (
                <Card key={source.nombre} className="p-6 hover:shadow-medium transition-all duration-300 bg-gradient-card border-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex items-center space-x-2">
                      {source.status === 'active' ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-warning" />
                      )}
                      <Badge variant={source.status === 'active' ? 'default' : 'secondary'}>
                        {source.status === 'active' ? 'Activo' : 'Mantenimiento'}
                      </Badge>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground mb-2">{source.nombre}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tipo: {source.tipo} • Actualización: {source.frecuencia}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="text-xs text-muted-foreground">
                      Última actualización: {new Date(source.ultimaActualizacion).toLocaleDateString('es-ES')}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{source.totalIndicadores} indicadores</span>
                      <span>•</span>
                      <span>{source.totalResultados.toLocaleString()} resultados</span>
                    </div>
                    {source.indicadores.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {source.indicadores.map((indicator, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {indicator.length > 30 ? indicator.substring(0, 30) + "..." : indicator}
                          </Badge>
                        ))}
                        {source.totalIndicadores > source.indicadores.length && (
                          <Badge variant="outline" className="text-xs">
                            +{source.totalIndicadores - source.indicadores.length} más
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewDetails(source)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver detalles
                    </Button>
                    {permissions.canUploadDataSources && (
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualizar
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center bg-gradient-card border-0 mb-12">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No hay fuentes de datos disponibles en este momento
            </p>
          </Card>
        )}

        {/* Dialog para detalles de fuente */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            {selectedSource && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl flex items-center gap-2">
                    {(() => {
                      const Icon = getSourceIcon(selectedSource.tipo);
                      const color = getSourceColor(selectedSource.tipo);
                      return (
                        <div className={`p-2 rounded-lg ${color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                      );
                    })()}
                    {selectedSource.nombre}
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    Información detallada sobre esta fuente de datos
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Información general */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Tipo</span>
                      </div>
                      <p className="text-lg font-semibold">{selectedSource.tipo}</p>
                    </Card>
                    <Card className="p-4 bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Indicadores</span>
                      </div>
                      <p className="text-lg font-semibold">{selectedSource.totalIndicadores}</p>
                    </Card>
                    <Card className="p-4 bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Resultados</span>
                      </div>
                      <p className="text-lg font-semibold">{selectedSource.totalResultados.toLocaleString()}</p>
                    </Card>
                    <Card className="p-4 bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Última actualización</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {new Date(selectedSource.ultimaActualizacion).toLocaleDateString('es-ES')}
                      </p>
                    </Card>
                  </div>

                  {/* Estado y frecuencia */}
                  <div className="flex items-center gap-4">
                    <Badge variant={selectedSource.status === 'active' ? 'default' : 'secondary'} className="text-sm">
                      {selectedSource.status === 'active' ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Activo
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Mantenimiento
                        </>
                      )}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Frecuencia: {selectedSource.frecuencia}
                    </span>
                  </div>

                  {/* Lista de indicadores */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Indicadores ({selectedSource.totalIndicadores})</h4>
                    {sourceIndicators && sourceIndicators.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {sourceIndicators.map((indicator, idx) => (
                          <Card key={idx} className="p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-foreground mb-1">{indicator.nombre}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {indicator.importancia && (
                                    <Badge 
                                      variant={
                                        indicator.importancia.toLowerCase().includes('alta') ? 'default' : 
                                        indicator.importancia.toLowerCase().includes('media') ? 'secondary' : 
                                        'outline'
                                      }
                                      className="text-xs"
                                    >
                                      {indicator.importancia}
                                    </Badge>
                                  )}
                                  {indicator.origen_indicador && (
                                    <Badge variant="outline" className="text-xs">
                                      {indicator.origen_indicador}
                                    </Badge>
                                  )}
                                  {indicator.nombre_subdimension && (
                                    <Badge variant="outline" className="text-xs">
                                      {indicator.nombre_subdimension}
                                    </Badge>
                                  )}
                                </div>
                                {indicator.formula && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Fórmula: {indicator.formula}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Cargando indicadores...</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Technical Architecture */}
        <Card className="p-8 bg-gradient-card border-0">
          <h3 className="text-2xl font-semibold text-foreground mb-6 text-center">
            Arquitectura Técnica de Datos
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Database className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-lg font-semibold text-foreground">Captura</h4>
              <p className="text-muted-foreground text-sm">
                APIs, Web Scraping, ETL automático desde fuentes oficiales
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                <RefreshCw className="h-8 w-8 text-accent" />
              </div>
              <h4 className="text-lg font-semibold text-foreground">Procesamiento</h4>
              <p className="text-muted-foreground text-sm">
                Normalización, validación y enriquecimiento de datos
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                <BarChart3 className="h-8 w-8 text-success" />
              </div>
              <h4 className="text-lg font-semibold text-foreground">Visualización</h4>
              <p className="text-muted-foreground text-sm">
                Dashboards interactivos y informes automatizados
              </p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default DataSourcesSection;