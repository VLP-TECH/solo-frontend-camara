import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  TrendingUp, 
  ArrowUpRight,
  Loader2,
  Database,
  Building,
  BarChart3,
  Target,
  ArrowRight
} from "lucide-react";
import {
  getDashboardStats,
  getFeaturedKPIs,
} from "@/lib/dashboard-data";

const DashboardSection = () => {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [selectedPais] = useState("España");
  
  // Obtener estadísticas del dashboard
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    refetchInterval: 60000, // Actualizar cada minuto
  });

  // Obtener KPIs destacados
  const { data: featuredKPIs, isLoading: kpisLoading } = useQuery({
    queryKey: ["featured-kpis", selectedPais],
    queryFn: () => getFeaturedKPIs(selectedPais, 3),
    refetchInterval: 60000,
  });

  const isLoading = permissionsLoading || statsLoading || kpisLoading;

  if (isLoading) {
    return (
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando datos del dashboard...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!permissions.canViewData) {
    return (
      <section className="py-20 bg-muted/30">
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

  // Preparar indicadores con datos reales
  const indicators = [
    {
      title: "Total Indicadores",
      value: stats?.totalIndicadores?.toLocaleString() || "0",
      change: "",
      trend: "up" as const,
      icon: Database,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      title: "Total Resultados",
      value: stats?.totalResultados?.toLocaleString() || "0",
      change: "",
      trend: "up" as const,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Dimensiones",
      value: stats?.totalDimensiones?.toString() || "0",
      change: "",
      trend: "up" as const,
      icon: Building,
      color: "text-accent",
      bgColor: "bg-accent/10"
    },
    {
      title: "Datos Crudos",
      value: stats?.totalDatosCrudos?.toLocaleString() || "0",
      change: "",
      trend: "up" as const,
      icon: Database,
      color: "text-secondary",
      bgColor: "bg-secondary/10"
    }
  ];


  return (
    <section id="dashboard" className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Dashboard del Ecosistema Digital
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Monitorización en tiempo real de los indicadores clave del desarrollo digital valenciano
          </p>
          {stats && (
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <span>📊 {stats.totalIndicadores} indicadores</span>
              <span>📈 {stats.totalResultados.toLocaleString()} resultados</span>
              <span>📁 {stats.totalDimensiones} dimensiones</span>
              <span>💾 {stats.totalDatosCrudos.toLocaleString()} datos crudos</span>
            </div>
          )}
        </div>

        {/* Key Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {indicators.map((indicator) => (
            <Card key={indicator.title} className="p-6 hover:shadow-medium transition-all duration-300 bg-gradient-card border-0">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${indicator.bgColor}`}>
                  <indicator.icon className={`h-6 w-6 ${indicator.color}`} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-foreground mb-1">{indicator.value}</h3>
              <p className="text-muted-foreground text-sm">{indicator.title}</p>
              {indicator.change && (
                <div className="flex items-center space-x-1 text-success mt-2">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="text-sm font-medium">{indicator.change}</span>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Featured KPIs Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2 flex items-center">
                <Target className="h-6 w-6 mr-2 text-primary" />
                KPIs Destacados
              </h3>
              <p className="text-muted-foreground">
                Indicadores clave con los valores más recientes
              </p>
            </div>
            <Button 
              variant="default" 
              size="lg"
              onClick={() => window.location.href = '/kpis'}
              className="flex items-center"
            >
              <BarChart3 className="mr-2 h-5 w-5" />
              Ver Todos los KPIs
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {featuredKPIs && featuredKPIs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredKPIs.map((kpi, index) => (
                <Card 
                  key={`${kpi.nombre}-${index}`} 
                  className="p-6 hover:shadow-lg transition-all duration-300 bg-gradient-card border-0"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
                        {kpi.nombre}
                      </h4>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {kpi.dimension}
                        </Badge>
                        {kpi.importancia === "Alta" && (
                          <Badge variant="default" className="text-xs bg-primary">
                            Alta Importancia
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-primary">
                        {kpi.valor.toLocaleString('es-ES', { 
                          maximumFractionDigits: 2,
                          minimumFractionDigits: 0
                        })}
                      </span>
                      {kpi.unidad && (
                        <span className="text-xl text-muted-foreground font-medium">
                          {kpi.unidad}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Período: {kpi.periodo}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {kpi.subdimension}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center bg-gradient-card border-0">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No hay KPIs destacados disponibles en este momento
              </p>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/kpis'}
              >
                Ver Todos los KPIs
              </Button>
            </Card>
          )}
        </div>

      </div>
    </section>
  );
};

export default DashboardSection;