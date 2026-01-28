import { useUserProfile } from './useUserProfile';

export const usePermissions = () => {
  const { profile, isAdmin, loading } = useUserProfile();
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a8e4c967-55a9-4bdb-a1c8-6bca4e1372c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePermissions.ts:3',message:'usePermissions entry',data:{isAdminFromHook:isAdmin,hasProfile:!!profile,role:profile?.role,loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
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
  
  const returnValue = {
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

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a8e4c967-55a9-4bdb-a1c8-6bca4e1372c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePermissions.ts:35',message:'usePermissions return',data:{rolesIsAdmin:returnValue.roles.isAdmin,isAdminFromHook:isAdmin},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  return returnValue;
};