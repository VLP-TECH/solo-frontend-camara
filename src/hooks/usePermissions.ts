import { useUserProfile } from './useUserProfile';

export const usePermissions = () => {
  const { profile, isAdmin, loading } = useUserProfile();
  
  const isEditor = profile?.role === 'editor';
  const isUser = profile?.role === 'user' || !profile?.role;
  
  // Permisos específicos
  // Los admins siempre tienen acceso completo, incluso si active es false
  const canExportData = isAdmin || isEditor;
  const canDownloadReports = isAdmin || isEditor;
  const canUploadDataSources = isAdmin || isEditor;
  const canManageUsers = isAdmin;
  // Admin siempre puede ver datos, usuarios normales necesitan estar activos
  const canViewData = isAdmin || (profile?.active === true);
  const canAccessAdminPanel = isAdmin;
  
  return {
    profile,
    loading,
    roles: {
      isAdmin,
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