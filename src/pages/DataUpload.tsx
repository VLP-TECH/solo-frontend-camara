import { useState, useRef, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Database, Upload, AlertCircle, CheckCircle2, Info, Download } from "lucide-react";
import { downloadCSV, convertToCSV } from "@/lib/csv-export";
import { useToast } from "@/hooks/use-toast";

type SupportedTable =
  | "definicion_indicadores"
  | "resultado_indicadores"
  | "datos_crudos"
  | "datos_macro";

const DataUpload = () => {
  const navigate = useNavigate();
  const { roles, loading: permissionsLoading } = usePermissions();
  const { profile, isAdmin, loading: profileLoading } = useUserProfile();
  const { toast } = useToast();

  const [selectedTable, setSelectedTable] = useState<SupportedTable | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rowsInserted, setRowsInserted] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Verificación robusta: usar isAdmin del hook (que ya incluye admin y superadmin)
  // o verificar directamente el rol del perfil como fallback
  const role = profile?.role?.toLowerCase().trim();
  const isAdminLike = isAdmin || roles.isAdmin || roles.isSuperAdmin || role === 'admin' || role === 'superadmin';
  const isLoading = permissionsLoading || profileLoading;

  // Debug: log para troubleshooting
  console.log('🔍 DataUpload - Permissions check:', {
    profileRole: profile?.role,
    roleLowercase: role,
    isAdmin,
    rolesIsAdmin: roles.isAdmin,
    rolesIsSuperAdmin: roles.isSuperAdmin,
    isAdminLike,
    isLoading,
    permissionsLoading,
    profileLoading
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setError(null);
    setSuccessMessage(null);
    setRowsInserted(null);
  };

  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  const generateExampleCSV = (table: SupportedTable): string => {
    const examples: Record<SupportedTable, any[]> = {
      definicion_indicadores: [
        {
          nombre: "Ejemplo Indicador 1",
          dimension: "Transformación Digital",
          subdimension: "Adopción Tecnológica",
          descripcion: "Descripción del indicador ejemplo",
          formula: "valor1 / valor2 * 100",
          unidad_medida: "Porcentaje",
          fuente: "INE",
          periodicidad: "Anual",
          importancia: "Alta"
        },
        {
          nombre: "Ejemplo Indicador 2",
          dimension: "Capital Humano",
          subdimension: "Competencias Digitales",
          descripcion: "Descripción del segundo indicador ejemplo",
          formula: "suma(valores) / total",
          unidad_medida: "Índice",
          fuente: "Eurostat",
          periodicidad: "Semestral",
          importancia: "Media"
        }
      ],
      resultado_indicadores: [
        {
          nombre_indicador: "Ejemplo Indicador 1",
          periodo: 2024,
          valor_calculado: 65.5,
          pais: "España",
          provincia: "Valencia",
          sector: "Servicios",
          tamano_empresa: "Grande",
          fecha_calculo: "2024-01-15"
        },
        {
          nombre_indicador: "Ejemplo Indicador 2",
          periodo: 2024,
          valor_calculado: 72.3,
          pais: "España",
          provincia: "Alicante",
          sector: "Industria",
          tamano_empresa: "Mediana",
          fecha_calculo: "2024-01-15"
        }
      ],
      datos_crudos: [
        {
          nombre_dato: "Población total",
          valor: 2500000,
          unidad: "Personas",
          fecha: "2024-01-01",
          fuente: "INE",
          territorio: "Comunitat Valenciana",
          categoria: "Demografía"
        },
        {
          nombre_dato: "Empresas TIC",
          valor: 1250,
          unidad: "Empresas",
          fecha: "2024-01-01",
          fuente: "DIRCE",
          territorio: "Comunitat Valenciana",
          categoria: "Empresarial"
        }
      ],
      datos_macro: [
        {
          indicador: "PIB per cápita",
          valor: 25000,
          unidad: "Euros",
          año: 2024,
          territorio: "Comunitat Valenciana",
          fuente: "INE",
          tipo: "Macroeconómico"
        },
        {
          indicador: "Tasa de desempleo",
          valor: 12.5,
          unidad: "Porcentaje",
          año: 2024,
          territorio: "Comunitat Valenciana",
          fuente: "EPA",
          tipo: "Laboral"
        }
      ]
    };

    const exampleData = examples[table];
    return convertToCSV(exampleData);
  };

  const handleDownloadExample = (table: SupportedTable) => {
    const csvContent = generateExampleCSV(table);
    const filename = `ejemplo_${table}_${new Date().toISOString().split("T")[0]}.csv`;
    downloadCSV(csvContent, filename);
  };

  const parseCsvText = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      throw new Error("El archivo CSV está vacío.");
    }

    // Detectar delimitador: primero punto y coma, luego coma
    const detectDelimiter = (line: string): ";" | "," => {
      const semicolons = (line.match(/;/g) || []).length;
      const commas = (line.match(/,/g) || []).length;
      if (semicolons === 0 && commas === 0) return ";";
      return semicolons >= commas ? ";" : ",";
    };

    const delimiter = detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map((h) => h.trim());

    const rows = lines.slice(1).map((line) => {
      const cols = line.split(delimiter).map((c) => c.trim());
      // Rellenar columnas faltantes con null
      while (cols.length < headers.length) {
        cols.push("");
      }
      return cols;
    });

    return { headers, rows };
  };

  const handleUpload = async () => {
    setError(null);
    setSuccessMessage(null);
    setRowsInserted(null);

    if (!isAdminLike) {
      setError("Solo los usuarios administradores pueden subir datos.");
      return;
    }

    if (!selectedTable) {
      setError("Selecciona primero la tabla de destino.");
      return;
    }

    if (!file) {
      setError("Selecciona un archivo CSV para continuar.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("El archivo debe tener extensión .csv");
      return;
    }

    try {
      setUploading(true);

      // Leer el archivo CSV
      const text = await file.text();
      const { headers, rows } = parseCsvText(text);

      if (headers.length === 0) {
        throw new Error("No se han detectado columnas en el CSV.");
      }

      console.log(`📊 Procesando CSV: ${headers.length} columnas, ${rows.length} filas`);

      // Construir objetos { columna: valor }
      // Limpiar y normalizar los datos
      const payload = rows
        .map((cols, rowIndex) => {
          const row: Record<string, any> = {};
          headers.forEach((header, index) => {
            const key = header.trim();
            if (!key) return;
            
            let value = cols[index]?.trim() || null;
            
            // Intentar convertir valores numéricos
            if (value !== null && value !== '') {
              // Si parece un número, intentar convertirlo
              const numValue = Number(value);
              if (!isNaN(numValue) && value !== '') {
                value = numValue;
              }
            }
            
            row[key] = value;
          });
          
          // Filtrar filas completamente vacías
          const hasData = Object.values(row).some(v => v !== null && v !== '');
          return hasData ? row : null;
        })
        .filter((row): row is Record<string, any> => row !== null);

      if (payload.length === 0) {
        throw new Error("No se han encontrado filas de datos válidas en el CSV.");
      }

      console.log(`✅ Datos procesados: ${payload.length} filas válidas para insertar`);

      // Insertar en Supabase en bloques para evitar límites de tamaño
      const chunkSize = 500;
      let totalInserted = 0;
      let totalErrors = 0;
      const errors: string[] = [];

      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const chunkNumber = Math.floor(i / chunkSize) + 1;
        const totalChunks = Math.ceil(payload.length / chunkSize);
        
        console.log(`📤 Insertando chunk ${chunkNumber}/${totalChunks} (${chunk.length} filas)...`);

        try {
          const { data, error: insertError } = await supabase
            .from(selectedTable)
            // @ts-ignore: tablas administrativas no tipadas en el cliente actual
            .insert(chunk)
            .select();

          if (insertError) {
            console.error(`❌ Error en chunk ${chunkNumber}:`, insertError);
            errors.push(`Chunk ${chunkNumber}: ${insertError.message}`);
            totalErrors += chunk.length;
            
            // Si es un error crítico (no de validación), detener
            if (insertError.code === 'PGRST116' || insertError.code === '23505') {
              // Error de constraint o duplicado - continuar con siguiente chunk
              continue;
            } else if (insertError.code && !insertError.code.startsWith('23')) {
              // Error no relacionado con constraints - lanzar error
              throw insertError;
            }
          } else {
            const insertedCount = data?.length || chunk.length;
            totalInserted += insertedCount;
            console.log(`✅ Chunk ${chunkNumber} insertado: ${insertedCount} filas`);
          }
        } catch (chunkError: any) {
          console.error(`❌ Error crítico en chunk ${chunkNumber}:`, chunkError);
          errors.push(`Chunk ${chunkNumber}: ${chunkError.message || 'Error desconocido'}`);
          totalErrors += chunk.length;
          
          // Si es un error crítico, detener el proceso
          if (chunkError.code && !chunkError.code.startsWith('23')) {
            throw chunkError;
          }
        }
      }

      // Mostrar resultado final
      if (totalInserted > 0) {
        setRowsInserted(totalInserted);
        if (totalErrors > 0) {
          const message = `Se han subido correctamente ${totalInserted} filas a la tabla "${selectedTable}". ${totalErrors} filas tuvieron errores.`;
          setSuccessMessage(message);
          toast({
            title: "Subida parcialmente exitosa",
            description: message,
            variant: "default",
          });
          if (errors.length > 0) {
            console.warn('Errores parciales:', errors);
          }
        } else {
          const message = `✅ Se han subido correctamente ${totalInserted} filas a la tabla "${selectedTable}".`;
          setSuccessMessage(message);
          toast({
            title: "Subida exitosa",
            description: `Se insertaron ${totalInserted} filas en la tabla "${selectedTable}".`,
          });
        }
        
        // Limpiar el archivo seleccionado después de una subida exitosa
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setFile(null);
      } else {
        throw new Error(
          `No se pudieron insertar datos. Errores: ${errors.join('; ')}`
        );
      }
    } catch (err: any) {
      console.error("❌ Error uploading CSV:", err);
      const errorMessage = err.message || "Ha ocurrido un error al procesar el CSV.";
      setError(`Error: ${errorMessage}`);
      
      toast({
        title: "Error al subir CSV",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Mostrar detalles adicionales en consola para debugging
      if (err.details) {
        console.error("Detalles del error:", err.details);
      }
      if (err.hint) {
        console.error("Hint:", err.hint);
      }
    } finally {
      setUploading(false);
    }
  };

  // Mostrar loading mientras se verifican los permisos
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0c6c8b] mx-auto mb-4"></div>
              <p className="text-muted-foreground">Verificando permisos...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verificar acceso solo después de que termine la carga
  if (!isAdminLike) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Acceso restringido
            </CardTitle>
            <CardDescription>
              Solo los usuarios con rol administrador o superadmin pueden acceder a la carga de datos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Si crees que esto es un error, contacta con el administrador del sistema.
            </p>
            <p className="text-xs text-muted-foreground">
              Rol actual: {profile?.role || 'No disponible'}
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Volver al dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar simplificado: reutilizamos el patrón visual del dashboard */}
      <aside className="hidden md:flex w-64 bg-[#0c6c8b] text-white flex-col">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <img
              src={`${import.meta.env.BASE_URL}brainnova-logo.png`}
              alt="Brainnova"
              className="h-40 w-auto object-contain"
            />
          </div>

          <nav className="space-y-2">
            <button
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left text-blue-100 hover:bg-[#0a5a73]/50"
              onClick={() => navigate("/dashboard")}
            >
              <Database className="h-5 w-5" />
              <span className="text-sm font-medium">Volver al Dashboard</span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6">
          <a href="https://www.camaravalencia.com" target="_blank" rel="noopener noreferrer" className="block mb-4">
            <img src="/camara-valencia-blanco.png" alt="Cámara Valencia" className="h-40 w-auto object-contain" />
          </a>
          <p className="text-xs text-blue-200">Versión 2026</p>
          <p className="text-xs text-blue-200">Actualizado Febrero 2026</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-[#0c6c8b] text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">Carga de datos (CSV)</h2>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-gray-50">
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-[#0c6c8b]" />
                  Subir CSV a la base de datos
                </CardTitle>
                <CardDescription>
                  Selecciona la tabla de destino y el archivo CSV. Las cabeceras del CSV deben coincidir con los
                  nombres de columnas de la tabla en Supabase.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-3">
                    <Label>Tabla de destino en Supabase</Label>
                    <Select
                      value={selectedTable}
                      onValueChange={(value) => setSelectedTable(value as SupportedTable)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona la tabla donde quieres cargar los datos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="definicion_indicadores">
                          definicion_indicadores (definición de indicadores)
                        </SelectItem>
                        <SelectItem value="resultado_indicadores">
                          resultado_indicadores (resultados calculados)
                        </SelectItem>
                        <SelectItem value="datos_crudos">
                          datos_crudos (datos fuente originales)
                        </SelectItem>
                        <SelectItem value="datos_macro">
                          datos_macro (indicadores macroeconómicos)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Plantillas con botones de descarga */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Descargar plantilla CSV de ejemplo:</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadExample("definicion_indicadores")}
                          className="justify-start"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          <span className="text-xs">definicion_indicadores</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadExample("resultado_indicadores")}
                          className="justify-start"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          <span className="text-xs">resultado_indicadores</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadExample("datos_crudos")}
                          className="justify-start"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          <span className="text-xs">datos_crudos</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadExample("datos_macro")}
                          className="justify-start"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          <span className="text-xs">datos_macro</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Archivo CSV</Label>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSelectFileClick}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Seleccionar CSV
                      </Button>
                      <span className="text-sm text-muted-foreground truncate">
                        {file ? file.name : "Ningún archivo seleccionado"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Asegúrate de que el archivo esté en formato CSV (.csv) y que la primera fila contenga los
                      nombres de las columnas.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading || !file || !selectedTable}
                    className="bg-[#0c6c8b] hover:bg-[#0a5a73]"
                  >
                    {uploading ? "Subiendo..." : "Subir a base de datos"}
                  </Button>
                </div>

                <Card className="bg-muted/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      Requisitos del CSV
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    <p>• La primera fila debe contener los nombres de las columnas exactamente como en la base de datos.</p>
                    <p>• El separador puede ser punto y coma (;) o coma (,), se detecta automáticamente.</p>
                    <p>• Las columnas que no existan en la tabla serán ignoradas por Supabase.</p>
                    <p>• Los tipos de datos deben ser compatibles (por ejemplo, números donde se esperan números).</p>
                  </CardContent>
                </Card>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error al subir CSV</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {successMessage && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertTitle>Datos cargados correctamente</AlertTitle>
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                )}

                {rowsInserted !== null && !error && (
                  <p className="text-xs text-muted-foreground">
                    Filas insertadas: <span className="font-semibold">{rowsInserted}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DataUpload;

