import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  razon_social: string | null;
  cif: string | null;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useUserProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !authLoading) {
      fetchProfile();
    } else if (!user) {
      setProfile(null);
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    if (!user) return;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a8e4c967-55a9-4bdb-a1c8-6bca4e1372c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useUserProfile.ts:32',message:'fetchProfile entry',data:{userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // #region agent log
      const debugSupabase = {hasError:!!error,hasData:!!data,role:data?.role,roleType:typeof data?.role,roleLength:data?.role?.length,errorMessage:error?.message,roleRaw:data?.role,roleCharCodes:data?.role?.split('').map(c=>c.charCodeAt(0))};
      console.log('🔍 [DEBUG] Supabase response:', debugSupabase);
      try { localStorage.setItem('debug_supabase_response', JSON.stringify({...debugSupabase, timestamp: Date.now()})); } catch(e) {}
      fetch('http://127.0.0.1:7242/ingest/a8e4c967-55a9-4bdb-a1c8-6bca4e1372c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useUserProfile.ts:42',message:'Supabase response',data:debugSupabase,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (error) {
        console.error('Error fetching profile:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        setProfile(null);
      } else {
        setProfile(data);
        if (!data) {
          console.warn('No profile found for user:', user.id);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a8e4c967-55a9-4bdb-a1c8-6bca4e1372c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useUserProfile.ts:63',message:'fetchProfile exit',data:{loading:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    }
  };

  // Comparación robusta del rol admin (case-insensitive y trim)
  const isAdmin = profile?.role?.toLowerCase().trim() === 'admin';
  const isActive = profile?.active || false;
  
  // #region agent log
  const debugIsAdmin = {hasProfile:!!profile,role:profile?.role,roleLowercase:profile?.role?.toLowerCase()?.trim(),isAdmin,comparisonResult:profile?.role?.toLowerCase()?.trim() === 'admin',roleAfterLowercase:profile?.role?.toLowerCase(),roleAfterTrim:profile?.role?.toLowerCase()?.trim()};
  console.log('🔍 [DEBUG] isAdmin calculation:', debugIsAdmin);
  try { localStorage.setItem('debug_isAdmin_calc', JSON.stringify({...debugIsAdmin, timestamp: Date.now()})); } catch(e) {}
  fetch('http://127.0.0.1:7242/ingest/a8e4c967-55a9-4bdb-a1c8-6bca4e1372c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useUserProfile.ts:67',message:'isAdmin calculation',data:debugIsAdmin,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  // Debug: log del rol para troubleshooting
  if (profile) {
    console.log('useUserProfile - Role check:', {
      role: profile.role,
      roleLowercase: profile.role?.toLowerCase().trim(),
      isAdmin,
      user_id: profile.user_id
    });
  }

  const returnValue = {
    profile,
    loading: loading || authLoading,
    isAdmin,
    isActive,
    refreshProfile: fetchProfile
  };

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a8e4c967-55a9-4bdb-a1c8-6bca4e1372c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useUserProfile.ts:87',message:'useUserProfile return',data:{isAdmin:returnValue.isAdmin,loading:returnValue.loading,hasProfile:!!returnValue.profile,role:returnValue.profile?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  return returnValue;
};