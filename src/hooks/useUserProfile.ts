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

  const isAdmin = profile?.role === 'admin';
  const isActive = profile?.active || false;

  return {
    profile,
    loading: loading || authLoading,
    isAdmin,
    isActive,
    refreshProfile: fetchProfile
  };
};