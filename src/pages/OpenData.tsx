import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  TrendingUp, 
  Users, 
  Network, 
  Wifi, 
  Target,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import NavigationHeader from "@/components/NavigationHeader";
import FooterSection from "@/components/FooterSection";
import { Button } from "@/components/ui/button";
import { fetchCSVWithEncoding } from "@/lib/csv-utils";

interface Indicator {
  dimension: string;
  subdimension: string;
  indicator: string;
  okko: string;
  dimensiones: string;
  description: string;
  formula: string;
  data: string;
  origin: string;
  importance: string;
  periodicity: string;
  source: string;
  bibliography: string;
}

const OpenData = () => {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDimension, setSelectedDimension] = useState<string>("all");

  useEffect(() => {
    loadIndicators();
  }, []);

  const loadIndicators = async () => {
    try {
      // Usar función helper para leer CSV con codificación correcta
      const text = await fetchCSVWithEncoding('/data/indicadores-kpis.csv');
      const lines = text.split('\n');
      const headers = lines[0].split(';');
      
      const data: Indicator[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(';');
          if (values.length >= 13) {
            data.push({
              dimension: values[0],
              subdimension: values[1],
              indicator: values[2],
              okko: values[3],
              dimensiones: values[4],
              description: values[5],
              formula: values[6],
              data: values[7],
              origin: values[8],
              importance: values[9],
              periodicity: values[10],
              source: values[11],
              bibliography: values[12]
            });
          }
        }
      }
      setIndicators(data);
    } catch (error) {
      console.error('Error loading indicators:', error);
    } finally {
      setLoading(false);
    }
  };

  const dimensions = [
    { 
      id: "all", 
      name: "Todos los Indicadores", 
      icon: Database,
      color: "text-primary" 
    },
    { 
      id: "Apoyo al emprendimiento", 
      name: "Emprendimiento e Innovación", 
      icon: TrendingUp,
      color: "text-blue-500" 
    },
    { 
      id: "Capital humano", 
      name: "Capital Humano", 
      icon: Users,
      color: "text-green-500" 
    },
    { 
      id: "Ecosistema", 
      name: "Ecosistema y Colaboración", 
      icon: Network,
      color: "text-purple-500" 
    },
    { 
      id: "Infraestructura", 
      name: "Infraestructura Digital", 
      icon: Wifi,
      color: "text-orange-500" 
    }
  ];

  const filteredIndicators = selectedDimension === "all" 
    ? indicators 
    : indicators.filter(ind => ind.dimension.includes(selectedDimension));

  const getImportanceColor = (importance: string) => {
    switch (importance.toLowerCase()) {
      case 'alta': return 'destructive';
      case 'media': return 'default';
      case 'baja': return 'secondary';
      default: return 'outline';
    }
  };

  const getImportanceIcon = (importance: string) => {
    switch (importance.toLowerCase()) {
      case 'alta': return <AlertCircle className="h-3 w-3" />;
      case 'media': return <Target className="h-3 w-3" />;
      default: return <CheckCircle2 className="h-3 w-3" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavigationHeader />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 mt-8">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Database className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Datos abiertos de Cámara de Valencia del ecosistema valenciano
          </h1>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Sistema de indicadores para medir y gestionar el desarrollo del ecosistema digital de Valencia
          </p>
        </div>

        {/* Project Management Section */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Gestión del Proyecto
            </CardTitle>
            <CardDescription className="text-base">
              Cómo utilizamos los KPIs para impulsar el ecosistema digital
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Metodología
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Hemos desarrollado un sistema integral de {indicators.length} indicadores organizados en 4 dimensiones principales 
                  para monitorear el progreso del ecosistema digital valenciano. Cada indicador cuenta con una fórmula de cálculo 
                  específica, fuentes de datos identificadas y periodicidad de medición.
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Objetivos
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Los KPIs nos permiten evaluar el rendimiento en áreas clave como emprendimiento, capital humano, 
                  colaboración e infraestructura. Medimos tanto aspectos cuantitativos como cualitativos para tener 
                  una visión completa del ecosistema.
                </p>
              </div>
            </div>

            <div className="bg-muted/50 p-6 rounded-lg mt-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Dimensiones Clave
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {dimensions.slice(1).map((dim) => (
                  <div key={dim.id} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                    <dim.icon className={`h-5 w-5 ${dim.color}`} />
                    <span className="text-sm font-medium">{dim.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Indicators Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Indicadores por Dimensión</h2>
            <Badge variant="outline" className="text-base px-4 py-2">
              {filteredIndicators.length} indicadores
            </Badge>
          </div>

          <Tabs defaultValue="all" className="w-full" onValueChange={setSelectedDimension}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto gap-2">
              {dimensions.map((dim) => (
                <TabsTrigger 
                  key={dim.id} 
                  value={dim.id}
                  className="flex items-center gap-2 py-3"
                >
                  <dim.icon className={`h-4 w-4 ${dim.color}`} />
                  <span className="hidden sm:inline">{dim.name}</span>
                  <span className="sm:hidden">{dim.name.split(' ')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {dimensions.map((dim) => (
              <TabsContent key={dim.id} value={dim.id} className="space-y-4 mt-6">
                {loading ? (
                  <div className="grid gap-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <CardHeader>
                          <div className="h-5 bg-muted rounded w-3/4" />
                          <div className="h-4 bg-muted rounded w-full mt-2" />
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : filteredIndicators.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No hay indicadores disponibles para esta dimensión
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {filteredIndicators.map((indicator, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-2 flex items-start gap-2">
                                <span className="flex-1">{indicator.indicator}</span>
                              </CardTitle>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {indicator.subdimension && (
                                  <Badge variant="outline" className="text-xs">
                                    {indicator.subdimension}
                                  </Badge>
                                )}
                                {indicator.importance && (
                                  <Badge 
                                    variant={getImportanceColor(indicator.importance)}
                                    className="text-xs flex items-center gap-1"
                                  >
                                    {getImportanceIcon(indicator.importance)}
                                    {indicator.importance}
                                  </Badge>
                                )}
                                {indicator.okko && (
                                  <Badge variant="secondary" className="text-xs">
                                    {indicator.okko}
                                  </Badge>
                                )}
                              </div>
                              <CardDescription className="text-sm leading-relaxed">
                                {indicator.description}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {indicator.formula && (
                            <div className="bg-muted/50 p-3 rounded-lg">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">
                                Fórmula de cálculo
                              </p>
                              <p className="text-sm font-mono">{indicator.formula}</p>
                            </div>
                          )}
                          
                          {indicator.data && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">
                                Datos necesarios
                              </p>
                              <p className="text-sm text-muted-foreground">{indicator.data}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            {indicator.origin && (
                              <div>
                                <span className="font-semibold">Origen: </span>
                                {indicator.origin}
                              </div>
                            )}
                            {indicator.periodicity && (
                              <div>
                                <span className="font-semibold">Periodicidad: </span>
                                {indicator.periodicity}
                              </div>
                            )}
                          </div>

                          {indicator.source && (
                            <div className="pt-2 border-t border-border">
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs"
                                onClick={() => window.open(indicator.source, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Ver fuente de datos
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

      </main>

      <FooterSection />
    </div>
  );
};

export default OpenData;
