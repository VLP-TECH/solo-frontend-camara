import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { 
  Database, 
  Settings, 
  RefreshCw, 
  Activity
} from 'lucide-react';
import NavigationHeader from '@/components/NavigationHeader';
import FooterSection from '@/components/FooterSection';
import { getDatabaseStats, triggerIngesta } from '@/lib/brainnova-admin-api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminConfig = () => {
  const { profile, loading, isAdmin, isActive } = useUserProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Estadísticas de la base de datos
  const { data: dbStats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['database-stats'],
    queryFn: getDatabaseStats,
    refetchInterval: 30000,
    retry: 1,
    retryDelay: 1000,
  });

  // Mutación para iniciar ingesta
  const { mutate: startIngesta, isPending: startingIngesta } = useMutation({
    mutationFn: triggerIngesta,
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Proceso de ingesta iniciado. Los datos se actualizarán en breve.",
      });
      // Refrescar estadísticas después de un breve delay
      setTimeout(() => {
        refetchStats();
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo iniciar la ingesta. Verifica que el backend esté disponible.",
        variant: "destructive",
      });
    },
  });

  // Función para subir base de datos
  const handleUploadDatabase = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/upload-database`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir la base de datos');
      }

      toast({
        title: "Éxito",
        description: "Base de datos subida correctamente",
      });

      setSelectedFile(null);
      refetchStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo subir la base de datos",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!profile || !isAdmin || !isActive) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />

      <main className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Settings className="h-8 w-8 text-primary" />
              Administración del backend
            </h1>
            <p className="text-muted-foreground">
              Visualiza estadísticas de la base de datos y configura el backend
            </p>
          </div>

          <Tabs defaultValue="estadisticas" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
              <TabsTrigger value="configuracion">Configuración</TabsTrigger>
            </TabsList>

            {/* Tab: Estadísticas */}
            <TabsContent value="estadisticas" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Estadísticas de la Base de Datos</h2>
                  <p className="text-muted-foreground">Datos actualizados en tiempo real desde Supabase</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchStats()}
                    disabled={loadingStats}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingStats ? 'animate-spin' : ''}`} />
                    Refrescar
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => startIngesta()}
                    disabled={startingIngesta}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${startingIngesta ? 'animate-spin' : ''}`} />
                    {startingIngesta ? 'Actualizando...' : 'Actualizar desde Backend'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Indicadores</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {loadingStats ? '...' : (dbStats?.total_indicadores || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total definidos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Resultados</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {loadingStats ? '...' : (dbStats?.total_resultados || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Valores calculados
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Datos Crudos</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {loadingStats ? '...' : (dbStats?.total_datos_crudos || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Datos sin procesar
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Datos Macro</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {loadingStats ? '...' : (dbStats?.total_datos_macro || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Datos macroeconómicos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Dimensiones</CardTitle>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {loadingStats ? '...' : (dbStats?.total_dimensiones || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dimensiones activas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Subdimensiones</CardTitle>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {loadingStats ? '...' : (dbStats?.total_subdimensiones || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Subdimensiones activas
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Configuración */}
            <TabsContent value="configuracion" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configuración del backend
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL del backend</Label>
                    <Input
                      value={import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-sm text-muted-foreground">
                      Configurado mediante variable de entorno
                    </p>
                  </div>
                  <Button variant="outline" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Verificar conexión
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <FooterSection />
    </div>
  );
};

export default AdminConfig;

