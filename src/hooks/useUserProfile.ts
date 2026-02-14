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
  deleted_by_user?: boolean | null;
  deleted_at?: string | null;
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
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();


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
    }
  };

  // Comparación robusta del rol admin o superadmin (case-insensitive y trim)
  const role = profile?.role?.toLowerCase().trim();
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isActive = profile?.active || false;
  const isDeletedByUser = !!profile?.deleted_by_user;
  
  // Debug: log del rol para troubleshooting
  if (profile) {
    console.log('useUserProfile - Role check:', {
      role: profile.role,
      roleLowercase: profile.role?.toLowerCase().trim(),
      isAdmin,
      user_id: profile.user_id
    });
  }

  return {
    profile,
    loading: loading || authLoading,
    isAdmin,
    isActive,
    isDeletedByUser,
    refreshProfile: fetchProfile
  };
};