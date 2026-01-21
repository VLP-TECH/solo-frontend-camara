import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  MessageSquare,
  Download,
  Eye,
  Filter,
  HelpCircle,
  Shield,
  LogOut
} from "lucide-react";

interface Report {
  id: string;
  title: string;
  description: string;
  date: string;
  pages: number;
  category: string;
  format: string;
  icon: any;
}

const Informes = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { roles } = usePermissions();
  const [selectedTerritorio, setSelectedTerritorio] = useState("Comunitat Valenciana");
  const [selectedAno, setSelectedAno] = useState("2024");
  const [selectedReferencia, setSelectedReferencia] = useState("Media UE");
  
  const [selectedAnoFilter, setSelectedAnoFilter] = useState("Todos los años");
  const [selectedDimensionFilter, setSelectedDimensionFilter] = useState("Todas las dimensiones");
  const [selectedFormatoFilter, setSelectedFormatoFilter] = useState("Todos los formatos");
  const [selectedCategoriaFilter, setSelectedCategoriaFilter] = useState("Todas las categorías");

  // Datos de ejemplo de informes
  const reports: Report[] = [
    {
      id: "1",
      title: "Informe Anual de Economía Digital 2024",
      description: "Análisis completo del estado de la economía digital en la Comunitat Valenciana con comparativas nacionales e internacionales.",
      date: "15 Nov 2024",
      pages: 128,
      category: "Informes anuales",
      format: "PDF",
      icon: FileText
    },
    {
      id: "2",
      title: "Informe Provincial de Transformación Digital",
      description: "Desglose territorial del Índice BRAINNOVA por provincias: Valencia, Alicante y Castellón. Incluye mapas y rankings.",
      date: "08 Nov 2024",
      pages: 84,
      category: "Informes territoriales",
      format: "PDF",
      icon: FileText
    },
    {
      id: "3",
      title: "Indicadores Sectoriales: Industria 4.0",
      description: "Estudio detallado de la adopción tecnológica en el sector industrial valenciano. Big Data, IA y automatización.",
      date: "02 Nov 2024",
      pages: 56,
      category: "Informes sectoriales",
      format: "PDF",
      icon: FileText
    },
    {
      id: "4",
      title: "Informe de Infraestructuras Digitales",
      description: "Análisis de cobertura 5G, fibra óptica, centros de datos y conectividad en toda la región. Evolución 2020-2024.",
      date: "25 Oct 2024",
      pages: 72,
      category: "Informes temáticos",
      format: "PDF",
      icon: FileText
    },
    {
      id: "5",
      title: "Informe de Capital Humano Digital",
      description: "Análisis de competencias digitales, formación y empleo TIC en la Comunitat Valenciana.",
      date: "18 Oct 2024",
      pages: 64,
      category: "Informes temáticos",
      format: "PDF",
      icon: FileText
    },
    {
      id: "6",
      title: "Informe de Emprendimiento Digital",
      description: "Ecosistema de startups, inversión en innovación y apoyo al emprendimiento tecnológico.",
      date: "10 Oct 2024",
      pages: 48,
      category: "Informes temáticos",
      format: "PDF",
      icon: FileText
    },
    {
      id: "7",
      title: "Informe Anual de Economía Digital 2023",
      description: "Análisis completo del estado de la economía digital en la Comunitat Valenciana con comparativas nacionales e internacionales.",
      date: "15 Nov 2023",
      pages: 120,
      category: "Informes anuales",
      format: "PDF",
      icon: FileText
    },
    {
      id: "8",
      title: "Datos Abiertos: Indicadores BRAINNOVA",
      description: "Repositorio completo de datos en formato abierto para análisis y visualización.",
      date: "01 Nov 2024",
      pages: 0,
      category: "Datos abiertos",
      format: "CSV",
      icon: FileText
    }
  ];

  const filteredReports = reports.filter(report => {
    const matchesAno = selectedAnoFilter === "Todos los años" || report.date.includes(selectedAnoFilter);
    const matchesCategoria = selectedCategoriaFilter === "Todas las categorías" || report.category === selectedCategoriaFilter;
    const matchesFormato = selectedFormatoFilter === "Todos los formatos" || report.format === selectedFormatoFilter;
    return matchesAno && matchesCategoria && matchesFormato;
  });

  const categories = [
    { name: "Informes anuales", count: reports.filter(r => r.category === "Informes anuales").length },
    { name: "Informes temáticos", count: reports.filter(r => r.category === "Informes temáticos").length },
    { name: "Informes sectoriales", count: reports.filter(r => r.category === "Informes sectoriales").length },
    { name: "Informes territoriales", count: reports.filter(r => r.category === "Informes territoriales").length },
    { name: "Datos abiertos", count: reports.filter(r => r.category === "Datos abiertos").length },
  ];

  const clearFilters = () => {
    setSelectedAnoFilter("Todos los años");
    setSelectedDimensionFilter("Todas las dimensiones");
    setSelectedFormatoFilter("Todos los formatos");
    setSelectedCategoriaFilter("Todas las categorías");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard General", href: "/dashboard" },
    { icon: Layers, label: "Dimensiones", href: "/dimensiones" },
    { icon: LineChart, label: "Todos los Indicadores", href: "/kpis" },
    { icon: Map, label: "Comparación Territorial", href: "/comparacion" },
    { icon: Clock, label: "Evolución Temporal", href: "/evolucion" },
    { icon: FileText, label: "Informes", href: "/informes", active: true },
    { icon: MessageSquare, label: "Encuestas", href: "/encuestas" },
    { icon: BookOpen, label: "Metodología", href: "/metodologia" },
    ...(roles.isAdmin ? [{ icon: Shield, label: "Gestión de Usuarios", href: "/admin-usuarios" }] : []),
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
              return (
                <button
                  key={item.label}
                  onClick={() => item.href && navigate(item.href)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors relative ${
                    isActive
                      ? "bg-[#0a5a73] text-white"
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
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Title Section */}
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-[#0c6c8b] mb-2">
                    Repositorio de Informes
                  </h1>
                  <p className="text-lg text-gray-600">
                    Accede a los informes generados a partir del Sistema de Indicadores BRAINNOVA.
                  </p>
                </div>

                {/* Search Filters */}
                <Card className="p-4 mb-6 bg-white">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Filtros de búsqueda</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <Select value={selectedAnoFilter} onValueChange={setSelectedAnoFilter}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todos los años">Todos los años</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2022">2022</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={selectedDimensionFilter} onValueChange={setSelectedDimensionFilter}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todas las dimensiones">Todas las dimensiones</SelectItem>
                        <SelectItem value="Transformación Digital">Transformación Digital</SelectItem>
                        <SelectItem value="Capital Humano">Capital Humano</SelectItem>
                        <SelectItem value="Infraestructura">Infraestructura</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={selectedFormatoFilter} onValueChange={setSelectedFormatoFilter}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todos los formatos">Todos los formatos</SelectItem>
                        <SelectItem value="PDF">PDF</SelectItem>
                        <SelectItem value="CSV">CSV</SelectItem>
                        <SelectItem value="Excel">Excel</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={selectedCategoriaFilter} onValueChange={setSelectedCategoriaFilter}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todas las categorías">Todas las categorías</SelectItem>
                        <SelectItem value="Informes anuales">Informes anuales</SelectItem>
                        <SelectItem value="Informes temáticos">Informes temáticos</SelectItem>
                        <SelectItem value="Informes sectoriales">Informes sectoriales</SelectItem>
                        <SelectItem value="Informes territoriales">Informes territoriales</SelectItem>
                        <SelectItem value="Datos abiertos">Datos abiertos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {filteredReports.length} informes encontrados
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-[#0c6c8b] hover:text-[#0a5a73]"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                </Card>

                {/* Reports Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredReports.map((report) => {
                    const Icon = report.icon;
                    return (
                      <Card key={report.id} className="bg-white hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-50 rounded-lg">
                                <Icon className="h-6 w-6 text-[#0c6c8b]" />
                              </div>
                              <div>
                                <span className="inline-block px-2 py-1 text-xs font-semibold bg-[#0c6c8b] text-white rounded">
                                  {report.format}
                                </span>
                              </div>
                            </div>
                          </div>
                          <CardTitle className="text-lg mb-2">{report.title}</CardTitle>
                          <CardDescription className="text-sm text-gray-600">
                            {report.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>{report.date}</span>
                              {report.pages > 0 && <span>{report.pages} págs</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                {report.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <Button
                                className="flex-1 bg-[#0c6c8b] text-white hover:bg-[#0a5a73]"
                                size="sm"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Descargar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="px-3"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* Categorías */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Categorías</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {categories.map((category) => (
                        <div
                          key={category.name}
                          className="flex items-center justify-between text-sm cursor-pointer hover:text-[#0c6c8b] transition-colors"
                          onClick={() => setSelectedCategoriaFilter(category.name)}
                        >
                          <span>{category.name}</span>
                          <span className="text-gray-500">{category.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Estadísticas */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Estadísticas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total informes</span>
                      <span className="text-sm font-semibold">{reports.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Último publicado</span>
                      <span className="text-sm font-semibold">Nov 2024</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Ayuda */}
                <Card className="bg-[#0c6c8b] text-white">
                  <CardHeader>
                    <div className="flex items-center space-x-2 mb-2">
                      <HelpCircle className="h-5 w-5" />
                      <CardTitle className="text-lg text-white">¿Necesitas ayuda?</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-blue-100 mb-4">
                      Contacta con nuestro equipo para solicitudes especiales
                    </p>
                    <Button
                      variant="outline"
                      className="w-full bg-white text-[#0c6c8b] hover:bg-gray-100"
                      size="sm"
                    >
                      Contactar →
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Informes;

