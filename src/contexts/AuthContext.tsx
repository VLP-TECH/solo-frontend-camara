import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string, razonSocial?: string, cif?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, razonSocial?: string, cif?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    // Update profile with razon_social and cif after user creation
    // Ensure active is set to false for new users (admin must activate them)
    if (!error && data.user) {
      // Build update object with only essential fields first
      // Optional fields will be added conditionally and errors handled gracefully
      const updateData: any = {
        active: false, // New users are inactive by default
      };
      
      // Try to include optional fields if provided (may not exist in DB)
      if (razonSocial) {
        updateData.razon_social = razonSocial;
      }
      if (cif) {
        updateData.cif = cif;
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', data.user.id);
      
      if (profileError) {
        // Log error but don't fail user creation if it's just a schema issue
        const errorMsg = profileError.message || '';
        
        if (errorMsg.includes('cif') || errorMsg.includes('razon_social')) {
          console.warn('Some columns may not exist in profiles table:', errorMsg);
          // Try update with only basic fields
          const { error: retryError } = await supabase
            .from('profiles')
            .update({
              active: false,
            })
            .eq('user_id', data.user.id);
          if (retryError) {
            // If even basic update fails, just log it but don't fail user creation
            console.warn('Could not update profile, but user was created:', retryError.message);
          }
        } else {
          console.error('Error updating profile:', profileError);
        }
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    try {
      // Try to invalidate the session on the server (global)
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.warn('Global signOut error:', (error as any)?.message || error);
      }
    } catch (e) {
      console.warn('Global signOut exception:', e);
    } finally {
      // Always clear local session to handle cross-domain previews or missing server session
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (e) {
        console.warn('Local signOut exception:', e);
      }
      // Fallback: hard clear possible Supabase auth keys
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (
            key.startsWith('sb-') ||
            key.includes('supabase') ||
            key.includes('auth-token')
          ) {
            toRemove.push(key);
          }
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn('LocalStorage cleanup error:', e);
      }
      setSession(null);
      setUser(null);
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};