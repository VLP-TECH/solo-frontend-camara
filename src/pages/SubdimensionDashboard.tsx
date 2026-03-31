import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LineChart,
  LogOut,
  TrendingUp
} from "lucide-react";
import { useAppMenuItems } from "@/hooks/useAppMenuItems";
import FloatingCamaraLogo from "@/components/FloatingCamaraLogo";
import {
  getIndicadoresPorSubdimension,
  getDatosHistoricosIndicador,
  getSubdimensiones,
  getDimensiones,
  type IndicadorConDatos
} from "@/lib/kpis-data";

const SubdimensionDashboard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { roles } = usePermissions();
  const { isAdmin, profile, loading: profileLoading } = useUserProfile();
  const [searchParams] = useSearchParams();
  const subdimensionNombre = searchParams.get("subdimension") || "";
  const dimensionNombre = searchParams.get("dimension") || "";
  const territorioAplicado = searchParams.get("territorio") || "España";
  const anoAplicado = Number(searchParams.get("ano") || "2024");

  const handleSignOut = async () => {
    await signOut();
    window.location.href = 'https://brainnova.info/';
  };

  // Obtener información de la subdimensión
  const { data: subdimensiones } = useQuery({
    queryKey: ["subdimensiones"],
    queryFn: () => getSubdimensiones(),
  });

  const { data: dimensiones } = useQuery({
    queryKey: ["dimensiones"],
    queryFn: () => getDimensiones(),
  });

  const subdimensionInfo = subdimensiones?.find(sub => sub.nombre === subdimensionNombre);
  const dimensionNombreFinal = dimensionNombre || subdimensionInfo?.nombre_dimension || "";
  const dimensionInfo = dimensiones?.find(dim => dim.nombre === dimensionNombreFinal);

  // Obtener indicadores de la subdimensión
  const { data: indicadores, isLoading } = useQuery({
    queryKey: ["indicadores-subdimension", subdimensionNombre],
    queryFn: () => getIndicadoresPorSubdimension(subdimensionNombre),
    enabled: !!subdimensionNombre,
  });

  // Comparativa por indicador en el territorio/año aplicados, más España y referencia UE
  const { data: comparativaIndicadores, isFetching: comparativaFetching } = useQuery({
    queryKey: ["comparativa-subdimension-indicadores", indicadores?.map(i => i.nombre), territorioAplicado, anoAplicado],
    queryFn: async () => {
      if (!indicadores) return {};
      const uePaises = ["Alemania", "Francia", "Italia", "Países Bajos"];
      const territoryAliases: Record<string, string[]> = {
        "Comunidad Valenciana": ["Comunidad Valenciana", "Comunitat Valenciana", "CV"],
      };
      const getAliases = (territorio: string): string[] =>
        territoryAliases[territorio] ?? [territorio];
      const getValorAnual = async (indicador: string, territorio: string, year: number) => {
        for (const alias of getAliases(territorio)) {
          const rows = await getDatosHistoricosIndicador(indicador, alias, 20);
          const rowYear = rows.find((r) => Number(r.periodo) === year);
          if (rowYear && Number.isFinite(Number(rowYear.valor))) return Number(rowYear.valor);
        }
        return null;
      };

      const data: Record<string, { territorio: number | null; espana: number | null; mediaUE: number | null; topUE: number | null }> = {};
      await Promise.all(
        indicadores.map(async (ind) => {
          const [territorio, espana, ...ueValsRaw] = await Promise.all([
            getValorAnual(ind.nombre, territorioAplicado, anoAplicado),
            getValorAnual(ind.nombre, "España", anoAplicado),
            ...uePaises.map((p) => getValorAnual(ind.nombre, p, anoAplicado)),
          ]);
          const ueVals = ueValsRaw.filter((v): v is number => v != null && Number.isFinite(v));
          const mediaUE = ueVals.length ? ueVals.reduce((a, b) => a + b, 0) / ueVals.length : null;
          const topUE = ueVals.length ? Math.max(...ueVals) : null;
          data[ind.nombre] = { territorio, espana, mediaUE, topUE };
        })
      );
      return data;
    },
    enabled: !!indicadores && indicadores.length > 0,
  });

  // Verificar si el usuario es admin o superadmin
  const menuItems = useAppMenuItems();

  if (!subdimensionNombre) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Subdimensión no encontrada</h1>
          <Button onClick={() => navigate("/kpis")}>Volver a KPIs</Button>
        </div>
      </div>
    );
  }

  const totalIndicadores = indicadores?.length || 0;
  const fmt = (v: number | null | undefined) =>
    v == null || Number.isNaN(v)
      ? "—"
      : v.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <>
      <FloatingCamaraLogo />
      <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0c6c8b] text-white flex flex-col">
        <div className="p-6">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
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
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isDisabled
                      ? "text-blue-300 opacity-50 cursor-not-allowed"
                      : "text-blue-100 hover:bg-[#0a5a73]/50"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="mt-auto p-6">
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
              <h2 className="text-lg font-semibold">Panel de Economía Digital</h2>
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
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Title Section */}
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-2">
                <LineChart className="h-8 w-8 text-[#0c6c8b]" />
                <h1 className="text-3xl font-bold text-[#0c6c8b]">
                  Dashboard completo de KPIs
                </h1>
              </div>
              <p className="text-lg text-gray-600">
                Indicadores de la subdimensión para {territorioAplicado} · {anoAplicado}
              </p>
            </div>

            {/* Dimension Navigation */}
            {dimensionInfo && (
              <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/dimensiones/detalle?dimension=${encodeURIComponent(dimensionInfo.nombre)}&territorio=${encodeURIComponent(territorioAplicado)}&ano=${encodeURIComponent(String(anoAplicado))}`
                    )
                  }
                  className="text-sm font-semibold text-gray-700 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  {dimensionInfo.nombre}
                </button>
                <span className="text-sm text-gray-500">→</span>
                <span className="text-sm font-semibold text-[#0c6c8b] px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  {subdimensionNombre}
                </span>
              </div>
            )}

            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold text-gray-900">
                  Indicadores de la subdimensión ({totalIndicadores})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">Cargando indicadores...</div>
                ) : !indicadores?.length ? (
                  <div className="text-center py-8 text-gray-500">No hay indicadores para esta subdimensión.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Indicador</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">{territorioAplicado}</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">España</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Media UE</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Top UE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {indicadores.map((indicador) => {
                          const comp = comparativaIndicadores?.[indicador.nombre];
                          return (
                            <tr key={indicador.nombre} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm text-gray-900">{indicador.nombre}</td>
                              <td className="py-3 px-4 text-sm text-center font-medium text-gray-800">{fmt(comp?.territorio)}</td>
                              <td className="py-3 px-4 text-sm text-center text-gray-700">{fmt(comp?.espana)}</td>
                              <td className="py-3 px-4 text-sm text-center text-gray-700">{fmt(comp?.mediaUE)}</td>
                              <td className="py-3 px-4 text-sm text-center text-gray-700">{fmt(comp?.topUE)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {comparativaFetching && (
                      <p className="text-xs text-gray-500 mt-3">Calculando comparativas para {territorioAplicado} y {anoAplicado}...</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
    </>
  );
};

export default SubdimensionDashboard;

