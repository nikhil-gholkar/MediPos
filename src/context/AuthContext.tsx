import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  role: string | null;
  medicalId: string | null;
  isMedicalEnabled: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [medicalId, setMedicalId] = useState<string | null>(null);
  const [isMedicalEnabled, setIsMedicalEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Unified Profile Loader - Takes ONLY ONE argument (userId)
  const fetchUserProfile = async (userId: string) => {
    try {
      // 1. Fetch user role from profile ledger cleanly using maybeSingle() to avoid crashes
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      // Fallback Strategy: If trigger hasn't finished, parse role directly from Supabase metadata
      let activeRole = profileData?.role;
      if (!activeRole) {
        const { data: sessionData } = await supabase.auth.getUser();
        activeRole = sessionData?.user?.user_metadata?.role || 'medical_owner';
        
        // Self-Healing Step: Insert missing profile row automatically right now
        await supabase.from('profiles').insert([{ id: userId, role: activeRole }]);
      }

      setRole(activeRole);

      // 2. If user is a store manager, fetch their branch credentials safely
      if (activeRole === 'medical_owner') {
        const { data: medicalData, error: medicalError } = await supabase
          .from('medicals')
          .select('id, is_enabled')
          .eq('owner_id', userId)
          .maybeSingle();

        if (medicalError) throw medicalError;

        if (medicalData) {
          setMedicalId(medicalData.id);
          setIsMedicalEnabled(medicalData.is_enabled);
        } else {
          setMedicalId(null);
          setIsMedicalEnabled(true);
        }
      }
    } catch (err: any) {
      console.error("Critical internal session synchronization fault:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check active sessions on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchUserProfile(session.user.id); // Passing exactly one argument
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        fetchUserProfile(session.user.id); // Passing exactly one argument
      } else {
        setUser(null);
        setRole(null);
        setMedicalId(null);
        setIsMedicalEnabled(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, role, medicalId, isMedicalEnabled, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider statement block');
  }
  return context;
};