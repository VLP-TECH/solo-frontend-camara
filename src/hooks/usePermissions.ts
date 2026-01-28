import { useUserProfile } from './useUserProfile';

export const usePermissions = () => {
  const { profile, isAdmin, loading } = useUserProfile();
  
  const isEditor = profile?.role === 'editor';
  const isUser = (profile?.role === 'user' || !profile?.role) && !isAdmin;
  const isSuperAdmin = profile?.role?.toLowerCase().trim() === 'superadmin';
  
  // Permisos específicos
  // Los admins y superadmins siempre tienen acceso completo, incluso si active es false
  const canExportData = isAdmin || isEditor;
  const canDownloadReports = isAdmin || isEditor;
  const canUploadDataSources = isAdmin || isEditor;
  const canManageUsers = isAdmin; // Admin y superadmin pueden gestionar usuarios
  // Admin y superadmin siempre pueden ver datos, usuarios normales necesitan estar activos
  const canViewData = isAdmin || (profile?.active === true);
  const canAccessAdminPanel = isAdmin;
  
  return {
    profile,
    loading,
    roles: {
      isAdmin,
      isSuperAdmin,
      isEditor, 
      isUser
    },
    permissions: {
      canExportData,
      canDownloadReports,
      canUploadDataSources,
      canManageUsers,
      canViewData,
      canAccessAdminPanel
    }
  };
};