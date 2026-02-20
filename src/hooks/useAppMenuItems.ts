import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  LayoutDashboard,
  Layers,
  LineChart,
  Map,
  BookOpen,
  Clock,
  FileText,
  MessageSquare,
  Shield,
  Database,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export interface AppMenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
  disabled?: boolean;
}

/**
 * Menú lateral único para toda la app. Mismas secciones en Dashboard, Dimensiones, KPIs, etc.
 * active se calcula según la ruta actual.
 */
export function useAppMenuItems(): AppMenuItem[] {
  const { pathname } = useLocation();
  const { isAdmin, roles } = usePermissions();
  const { profile } = useUserProfile();

  const role = profile?.role?.toLowerCase().trim();
  const profileRoleIsAdmin = role === "admin" || role === "superadmin";
  const isUserAdmin = isAdmin || roles.isAdmin || roles.isSuperAdmin || profileRoleIsAdmin;

  return useMemo(() => {
    const base: AppMenuItem[] = [
      { icon: LayoutDashboard, label: "Dashboard General", href: "/dashboard" },
      { icon: Layers, label: "Dimensiones", href: "/dimensiones" },
      { icon: LineChart, label: "Todos los Indicadores", href: "/kpis" },
      { icon: Map, label: "Comparación Territorial", href: "/comparacion" },
      { icon: Clock, label: "Evolución Temporal", href: "/evolucion" },
      { icon: FileText, label: "Informes", href: "/informes" },
      { icon: MessageSquare, label: "Encuestas", href: "/encuestas" },
      { icon: BookOpen, label: "Metodología", href: "/metodologia" },
      { icon: UserCog, label: "Editar usuario", href: "/editar-usuario" },
    ];

    if (isUserAdmin) {
      base.push({ icon: Database, label: "Carga de datos (CSV)", href: "/carga-datos" });
      base.push({ icon: Shield, label: "Gestión de Usuarios", href: "/admin-usuarios" });
    }

    // Marcar active según la ruta actual (incluye subrutas: /dimensiones/xxx, /evolucion, etc.)
    const normalized = pathname.replace(/\/$/, "") || "/";
    return base.map((item) => {
      const hrefNorm = item.href.replace(/\/$/, "") || "/";
      const active =
        normalized === hrefNorm ||
        (hrefNorm !== "/" && normalized.startsWith(hrefNorm + "/"));
      return { ...item, active };
    });
  }, [isUserAdmin, pathname]);
}
