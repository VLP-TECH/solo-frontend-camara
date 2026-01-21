import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NavigationHeader from "@/components/NavigationHeader";
import FooterSection from "@/components/FooterSection";
import { BackendStatus } from "@/components/BackendStatus";
import {
  Target,
  Loader2,
  AlertCircle,
  Calculator,
  TrendingUp,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getFiltrosGlobales,
  calculateBrainnovaScore,
} from "@/lib/brainnova-api";
import type { BrainnovaScoreResponse } from "@/lib/brainnova-types";

const BrainnovaScore = () => {
  const [paisSeleccionado, setPaisSeleccionado] = useState<string>("");
  const [anioSeleccionado, setAnioSeleccionado] = useState<number | null>(null);
  const [sectorSeleccionado, setSectorSeleccionado] = useState<string>("");
  const [tamanoSeleccionado, setTamanoSeleccionado] = useState<string>("");
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState<string>("");

  // Carga inicial: solo países
  const {
    data: filtrosIniciales,
    isLoading: loadingFiltrosIniciales,
  } = useQuery({
    queryKey: ["filtros-globales", "inicial"],
    queryFn: () => getFiltrosGlobales(),
    retry: 1,
    retryDelay: 1000,
  });

  // Cargar años y provincias cuando se selecciona país
  const {
    data: filtrosPorPais,
    isLoading: loadingFiltrosPais,
  } = useQuery({
    queryKey: ["filtros-globales", "pais", paisSeleccionado],
    queryFn: () =>
      getFiltrosGlobales({
        pais: paisSeleccionado,
      }),
    enabled: !!paisSeleccionado,
    retry: 1,
    retryDelay: 1000,
  });

  // Cargar sectores y tamaños cuando se selecciona año
  const {
    data: filtrosPorAnio,
    isLoading: loadingFiltrosAnio,
  } = useQuery({
    queryKey: ["filtros-globales", "anio", paisSeleccionado, anioSeleccionado],
    queryFn: () =>
      getFiltrosGlobales({
        pais: paisSeleccionado,
        periodo: anioSeleccionado!,
      }),
    enabled: !!paisSeleccionado && !!anioSeleccionado,
    retry: 1,
    retryDelay: 1000,
  });

  // Mutación para calcular el score
  const {
    mutate: calcularScore,
    data: resultadoScore,
    isLoading: calculando,
    error: errorCalculo,
  } = useMutation({
    mutationFn: calculateBrainnovaScore,
    onSuccess: () => {
      toast({
        title: "Cálculo completado",
        description: "El Brainnova score se ha calculado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo calcular el score",
        variant: "destructive",
      });
    },
  });

  // Resetear selecciones cuando cambia el país
  useEffect(() => {
    if (paisSeleccionado) {
      setAnioSeleccionado(null);
      setSectorSeleccionado("");
      setTamanoSeleccionado("");
      setProvinciaSeleccionada("");
    }
  }, [paisSeleccionado]);

  // Resetear sector y tamaño cuando cambia el año
  useEffect(() => {
    if (anioSeleccionado) {
      setSectorSeleccionado("");
      setTamanoSeleccionado("");
    }
  }, [anioSeleccionado]);

  const handleCalcular = () => {
    if (!paisSeleccionado || !anioSeleccionado) {
      toast({
        title: "Campos requeridos",
        description: "Debes seleccionar al menos País y Año",
        variant: "destructive",
      });
      return;
    }

    calcularScore({
      pais: paisSeleccionado,
      periodo: anioSeleccionado,
      sector: sectorSeleccionado || undefined,
      tamano_empresa: tamanoSeleccionado || undefined,
      provincia: provinciaSeleccionada || undefined,
    });
  };

  const puedeCalcular =
    paisSeleccionado && anioSeleccionado && !calculando;

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />

      <main className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-2">
              <Target className="h-8 w-8 text-primary" />
              Calculadora Brainnova score
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Calcula el índice ponderado del ecosistema digital según tus criterios
            </p>
          </div>

          {/* Estado del backend */}
          <BackendStatus />

          {/* Formulario de filtros */}
          <Card className="p-6 mb-8 bg-gradient-card border-0">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-primary" />
              Parámetros de cálculo
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Selector de País */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  País <span className="text-destructive">*</span>
                </label>
                <Select
                  value={paisSeleccionado}
                  onValueChange={setPaisSeleccionado}
                  disabled={loadingFiltrosIniciales}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un país" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingFiltrosIniciales ? (
                      <SelectItem value="loading" disabled>
                        Cargando países...
                      </SelectItem>
                    ) : filtrosIniciales?.paises && filtrosIniciales.paises.length > 0 ? (
                      filtrosIniciales.paises.map((pais) => (
                        <SelectItem key={pais} value={pais}>
                          {pais}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>
                        No hay países disponibles
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de Año */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Año <span className="text-destructive">*</span>
                </label>
                <Select
                  value={anioSeleccionado?.toString() || ""}
                  onValueChange={(value) =>
                    setAnioSeleccionado(value ? parseInt(value) : null)
                  }
                  disabled={
                    !paisSeleccionado ||
                    loadingFiltrosPais ||
                    !filtrosPorPais?.anios?.length
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un año" />
                  </SelectTrigger>
                  <SelectContent>
                    {filtrosPorPais?.anios
                      ?.sort((a, b) => b - a)
                      .map((anio) => (
                        <SelectItem key={anio} value={anio.toString()}>
                          {anio}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de Provincia */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Provincia
                </label>
                <Select
                  value={provinciaSeleccionada}
                  onValueChange={setProvinciaSeleccionada}
                  disabled={
                    !paisSeleccionado ||
                    loadingFiltrosPais ||
                    !filtrosPorPais?.provincias?.length
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        filtrosPorPais?.provincias?.length
                          ? "Selecciona una provincia"
                          : "(Nacional)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filtrosPorPais?.provincias?.map((provincia) => (
                      <SelectItem key={provincia} value={provincia}>
                        {provincia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de Sector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Sector
                </label>
                <Select
                  value={sectorSeleccionado}
                  onValueChange={setSectorSeleccionado}
                  disabled={
                    !anioSeleccionado ||
                    loadingFiltrosAnio ||
                    !filtrosPorAnio?.sectores?.length
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        filtrosPorAnio?.sectores?.length
                          ? "Selecciona un sector"
                          : "(No aplica / Todos)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filtrosPorAnio?.sectores?.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de Tamaño de Empresa */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Tamaño de empresa
                </label>
                <Select
                  value={tamanoSeleccionado}
                  onValueChange={setTamanoSeleccionado}
                  disabled={
                    !anioSeleccionado ||
                    loadingFiltrosAnio ||
                    !filtrosPorAnio?.tamanos_empresa?.length
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        filtrosPorAnio?.tamanos_empresa?.length
                          ? "Selecciona un tamaño"
                          : "(No aplica / Todos)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filtrosPorAnio?.tamanos_empresa?.map((tamano) => (
                      <SelectItem key={tamano} value={tamano}>
                        {tamano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleCalcular}
                disabled={!puedeCalcular || calculando}
                size="lg"
              >
                {calculando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculando...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calcular score
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Resultado */}
          {resultadoScore && (
            <Card className="p-6 bg-gradient-card border-0">
              <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                Resultado del cálculo
              </h3>

              <div className="space-y-4">
                <div className="bg-primary/10 p-6 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">
                    Brainnova score
                  </div>
                  <div className="text-4xl font-bold text-foreground">
                    {resultadoScore.indice_ponderado?.toFixed(2) || "N/A"}
                  </div>
                </div>

                {resultadoScore.desglose && (
                  <div>
                    <h4 className="text-lg font-semibold text-foreground mb-4">
                      Desglose por indicador
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(resultadoScore.desglose).map(
                        ([indicador, valor]) => (
                          <div
                            key={indicador}
                            className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                          >
                            <span className="text-sm text-foreground">
                              {indicador}
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                              {typeof valor === "number"
                                ? valor.toFixed(2)
                                : valor}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {errorCalculo && (
            <Card className="p-6 bg-destructive/10 border-destructive/20">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <h4 className="font-semibold text-foreground">
                    Error en el cálculo
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {errorCalculo instanceof Error
                      ? errorCalculo.message
                      : "Ocurrió un error al calcular el score"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Verifica que el backend esté corriendo en {import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {!resultadoScore && !errorCalculo && !calculando && (
            <Card className="p-6 bg-muted/50 border-0">
              <div className="flex flex-col items-center justify-center py-12">
                <Calculator className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Completa los campos requeridos y haz clic en "Calcular score" para ver los resultados
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>

      <FooterSection />
    </div>
  );
};

export default BrainnovaScore;

