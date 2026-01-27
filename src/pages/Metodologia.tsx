import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  LayoutDashboard,
  Layers,
  LineChart,
  Map,
  BookOpen,
  Clock,
  FileText,
  CheckCircle2,
  Download,
  ArrowRight,
  MessageSquare,
  Shield,
  LogOut
} from "lucide-react";

const Metodologia = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { roles } = usePermissions();
  const { isAdmin, profile, loading: profileLoading } = useUserProfile();
  const [selectedTerritorio, setSelectedTerritorio] = useState("Comunitat Valenciana");
  const [selectedAno, setSelectedAno] = useState("2024");
  const [selectedReferencia, setSelectedReferencia] = useState("Media UE");

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // #region agent log
  const debugData = {isAdmin,rolesIsAdmin:roles.isAdmin,profileRole:profile?.role,profileLoading,hasUser:!!user,hasProfile:!!profile,profileRoleRaw:profile?.role,profileRoleType:typeof profile?.role,profileRoleLength:profile?.role?.length};
  console.log('🔍 [DEBUG] Metodologia render values:', debugData);
  try { localStorage.setItem('debug_metodologia_render', JSON.stringify({...debugData, timestamp: Date.now()})); } catch(e) {}
  fetch('http://127.0.0.1:7242/ingest/a8e4c967-55a9-4bdb-a1c8-6bca4e1372c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Metodologia.tsx:46',message:'Metodologia render values',data:debugData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  // Debug: verificar valores de admin
  console.log('Metodologia - Admin check:', {
    isAdmin,
    rolesIsAdmin: roles.isAdmin,
    profileRole: profile?.role,
    profileLoading,
    user: !!user,
    profile: profile
  });

  // El botón siempre debe estar activo para admins
  // Verificar directamente el rol del perfil para evitar problemas de timing
  // Solo deshabilitar si el perfil está cargado Y definitivamente NO es admin
  const profileRoleIsAdmin = profile?.role?.toLowerCase().trim() === 'admin';
  const isUserAdmin = isAdmin || roles.isAdmin || profileRoleIsAdmin;
  
  // Solo deshabilitar si:
  // 1. El usuario está autenticado Y
  // 2. El perfil ya se cargó (no está loading) Y
  // 3. Definitivamente NO es admin
  const shouldDisable = user && !profileLoading && !isUserAdmin;
  
  // #region agent log
  const debugShouldDisable = {hasUser:!!user,profileLoading,profileRole:profile?.role,profileRoleIsAdmin,isAdmin,rolesIsAdmin:roles.isAdmin,isUserAdmin,shouldDisable};
  console.log('🔍 [DEBUG] shouldDisable calculation:', debugShouldDisable);
  try { localStorage.setItem('debug_shouldDisable', JSON.stringify({...debugShouldDisable, timestamp: Date.now()})); } catch(e) {}
  fetch('http://127.0.0.1:7242/ingest/a8e4c967-55a9-4bdb-a1c8-6bca4e1372c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Metodologia.tsx:62',message:'shouldDisable calculation',data:debugShouldDisable,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  const menuItems = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a8e4c967-55a9-4bdb-a1c8-6bca4e1372c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Metodologia.tsx:64',message:'useMemo menuItems entry',data:{shouldDisable,isAdmin,rolesIsAdmin:roles.isAdmin,profileLoading,hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    console.log('Metodologia - menuItems calculation:', {
      shouldDisable,
      isAdmin,
      rolesIsAdmin: roles.isAdmin,
      profileLoading,
      user: !!user
    });
    
    const items = [
      { icon: LayoutDashboard, label: "Dashboard General", href: "/dashboard" },
      { icon: Layers, label: "Dimensiones", href: "/dimensiones" },
      { icon: LineChart, label: "Todos los Indicadores", href: "/kpis" },
      { icon: Map, label: "Comparación Territorial", href: "/comparacion" },
      { icon: Clock, label: "Evolución Temporal", href: "/evolucion" },
      { icon: FileText, label: "Informes", href: "/informes" },
      { icon: MessageSquare, label: "Encuestas", href: "/encuestas" },
      { icon: BookOpen, label: "Metodología", href: "/metodologia", active: true },
      { icon: Shield, label: "Gestión de Usuarios", href: "/admin-usuarios", disabled: shouldDisable },
    ];
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a8e4c967-55a9-4bdb-a1c8-6bca4e1372c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Metodologia.tsx:80',message:'useMemo menuItems exit',data:{gestiónDisabled:items[8].disabled,shouldDisable},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    return items;
  }, [isAdmin, roles.isAdmin, profileLoading, shouldDisable, user]);

  const dimensiones = [
    "Transformación Digital Empresarial",
    "Infraestructura Digital",
    "Emprendimiento e Innovación",
    "Sostenibilidad Digital",
    "Capital Humano",
    "Ecosistema y Colaboración",
    "Servicios Públicos Digitales"
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0c6c8b] text-white flex flex-col">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <div className="w-8 h-8 bg-[#0c6c8b] rounded"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold">BRAINNOVA</h1>
              <p className="text-xs text-blue-200">Economía Digital</p>
            </div>
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
                  {isActive && <ArrowRight className="h-4 w-4 ml-auto" />}
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-blue-600">
          <p className="text-xs text-blue-200">Versión 2025</p>
          <p className="text-xs text-blue-200">Actualizado Nov 2025</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-blue-100 text-[#0c6c8b] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">BRAINNOVA Economía Digital</h2>
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
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Title Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#0c6c8b] mb-2">
                Metodología BRAINNOVA
              </h1>
              <p className="text-lg text-gray-600">
                Marco metodológico del Sistema de Indicadores de Economía Digital
              </p>
            </div>

            {/* Introducción */}
            <Card className="p-6 bg-white">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-200 rounded-lg flex-shrink-0"></div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Introducción</h2>
                  <p className="text-gray-700 leading-relaxed">
                    El Índice BRAINNOVA de Economía Digital es un sistema integral de medición que evalúa el grado de desarrollo y madurez digital de territorios a través de 7 dimensiones, 28 subdimensiones y más de 80 indicadores específicos. La metodología se basa en estándares internacionales como el DESI (Digital Economy and Society Index) de la Comisión Europea, adaptado al contexto regional y autonómico español.
                  </p>
                </div>
              </div>
            </Card>

            {/* Estructura del Índice */}
            <Card className="p-6 bg-white">
              <div className="flex items-start space-x-4 mb-6">
                <div className="w-12 h-12 bg-blue-200 rounded-lg flex-shrink-0"></div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Estructura del Índice</h2>
                  <p className="text-gray-700 mb-4">
                    El índice se estructura en tres niveles jerárquicos que permiten análisis desde lo general a lo específico:
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Dimensiones</h3>
                  <p className="text-sm text-gray-600 mb-3">7 áreas estratégicas</p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Transformación Digital</li>
                    <li>• Capital Humano</li>
                    <li>• Infraestructura</li>
                    <li>• Ecosistema</li>
                    <li>• Emprendimiento</li>
                    <li>• Servicios Públicos</li>
                    <li>• Sostenibilidad</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Subdimensiones</h3>
                  <p className="text-sm text-gray-600 mb-3">28 componentes temáticos</p>
                  <p className="text-sm text-gray-700">
                    Cada dimensión se desglosa en 3-5 subdimensiones que capturan aspectos específicos del desarrollo digital.
                  </p>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Indicadores</h3>
                  <p className="text-sm text-gray-600 mb-3">+80 métricas cuantitativas</p>
                  <p className="text-sm text-gray-700">
                    Indicadores específicos con fórmulas de cálculo claras, fuentes de datos verificables y periodicidad definida.
                  </p>
                </div>
              </div>
            </Card>

            {/* Fuentes de Datos */}
            <Card className="p-6 bg-white">
              <div className="flex items-start space-x-4 mb-6">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex-shrink-0"></div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Fuentes de Datos</h2>
                  <p className="text-gray-700 mb-4">
                    Los datos provienen de fuentes oficiales y reconocidas a nivel nacional e internacional:
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Instituto Nacional de Estadística (INE)</p>
                    <p className="text-sm text-gray-600">Datos empresariales y población</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Eurostat</p>
                    <p className="text-sm text-gray-600">Comparativas europeas</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Ministerio de Asuntos Económicos</p>
                    <p className="text-sm text-gray-600">Digitalización administrativa</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Comisión Nacional de los Mercados (CNMC)</p>
                    <p className="text-sm text-gray-600">Infraestructuras y conectividad</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Observatorio Nacional de Tecnología</p>
                    <p className="text-sm text-gray-600">Adopción tecnológica</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Registros autonómicos</p>
                    <p className="text-sm text-gray-600">Datos regionales específicos</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Método de Cálculo */}
            <Card className="p-6 bg-white">
              <div className="flex items-start space-x-4 mb-6">
                <div className="w-12 h-12 bg-yellow-400 rounded-lg flex-shrink-0"></div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Método de Cálculo</h2>
                  <p className="text-gray-700 mb-4">
                    El índice utiliza un proceso de normalización y agregación en múltiples etapas:
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="border-l-4 border-yellow-400 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Normalización de Indicadores</h3>
                  <p className="text-gray-700 mb-2">
                    Cada indicador se normaliza a una escala de 0 a 100 mediante la fórmula:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                    Valor_Normalizado = ((Valor_Real - Valor_Mínimo) / (Valor_Máximo - Valor_Mínimo)) × 100
                  </div>
                </div>
                
                <div className="border-l-4 border-yellow-400 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Agregación a Subdimensiones</h3>
                  <p className="text-gray-700 mb-2">
                    Los indicadores normalizados se agregan mediante media ponderada según su relevancia estratégica:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                    Subdimensión = ∑ (Indicador_i × Peso_i) / ∑ Peso_i
                  </div>
                </div>
                
                <div className="border-l-4 border-yellow-400 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Agregación a Dimensiones</h3>
                  <p className="text-gray-700 mb-2">
                    Las subdimensiones se agregan con ponderación equilibrada:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                    Dimensión = ∑ (Subdimensión_j × Peso_j) / ∑ Peso_j
                  </div>
                </div>
                
                <div className="border-l-4 border-yellow-400 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Índice Global</h3>
                  <p className="text-gray-700 mb-2">
                    El índice global es la media ponderada de las 7 dimensiones con pesos iguales:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                    Índice_BRAINNOVA = (1/7) × ∑ Dimensión_k
                  </div>
                </div>
              </div>
            </Card>

            {/* Sistema de Ponderación */}
            <Card className="p-6 bg-white">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Sistema de Ponderación</h2>
                <p className="text-gray-700 mb-4">
                  Pesos asignados a cada dimensión en el cálculo del índice global:
                </p>
              </div>
              
              <div className="space-y-3">
                {dimensiones.map((dimension) => (
                  <div key={dimension} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{dimension}</span>
                      <span className="text-sm font-semibold text-gray-900">14.3%</span>
                    </div>
                    <Progress value={14.3} className="h-2" />
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mt-4 italic">
                * Actualmente todas las dimensiones tienen el mismo peso (14.3%), reflejando una visión equilibrada del desarrollo digital. Los pesos pueden ajustarse según prioridades estratégicas específicas.
              </p>
            </Card>

            {/* Calidad y Actualizaciones */}
            <Card className="p-6 bg-white">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Calidad y Actualizaciones</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Periodicidad</p>
                    <p className="text-sm text-gray-600">
                      El índice se actualiza anualmente, con datos de cierre a 31 de diciembre del año anterior.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Validación</p>
                    <p className="text-sm text-gray-600">
                      Todos los datos pasan por un proceso de validación cruzada con múltiples fuentes antes de su inclusión.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Transparencia</p>
                    <p className="text-sm text-gray-600">
                      Todas las fórmulas, fuentes y métodos de cálculo están disponibles públicamente para garantizar la replicabilidad.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Revisión</p>
                    <p className="text-sm text-gray-600">
                      La metodología se revisa cada 2-3 años para incorporar nuevas tendencias y tecnologías emergentes.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Referencia Metodológica */}
            <Card className="p-6 bg-white">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Referencia Metodológica</h2>
                <p className="text-gray-700 mb-4">
                  Para más información sobre la metodología completa, consulte el documento técnico "Marco Metodológico BRAINNOVA 2024" disponible en la sección de recursos.
                </p>
              </div>
              
              <Button
                className="bg-[#0c6c8b] text-white hover:bg-[#0a5a73]"
                size="lg"
              >
                <Download className="h-5 w-5 mr-2" />
                Descargar Documento Técnico
              </Button>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Metodologia;

