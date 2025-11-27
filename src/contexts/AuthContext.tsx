import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type AppRole = 'parent' | 'employee' | 'admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: AppRole | null;
  userRoles: AppRole[];
  selectedRole: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  selectRole: (role: AppRole) => void;
  clearSelectedRole: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(() => {
    // Restore selected role from sessionStorage
    const stored = sessionStorage.getItem('selectedRole');
    return stored as AppRole | null;
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Computed userRole based on selectedRole or priority
  const userRole: AppRole | null = selectedRole || (
    userRoles.includes('admin') ? 'admin' :
    userRoles.includes('employee') ? 'employee' :
    userRoles.includes('parent') ? 'parent' : null
  );

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetching
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setUserRoles([]);
          setSelectedRole(null);
          sessionStorage.removeItem('selectedRole');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    console.log('Fetched roles:', data, 'Error:', error);
    
    if (data && data.length > 0) {
      const roles = data.map(r => r.role as AppRole);
      console.log('User roles array:', roles);
      setUserRoles(roles);
    } else {
      setUserRoles([]);
    }
  };

  const selectRole = (role: AppRole) => {
    setSelectedRole(role);
    sessionStorage.setItem('selectedRole', role);
  };

  const clearSelectedRole = () => {
    setSelectedRole(null);
    sessionStorage.removeItem('selectedRole');
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      // Clear selected role on new login to show role selector
      clearSelectedRole();
      navigate('/');
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    if (!error) {
      navigate('/');
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRoles([]);
    setSelectedRole(null);
    sessionStorage.removeItem('selectedRole');
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      userRole, 
      userRoles,
      selectedRole,
      loading, 
      signIn, 
      signUp, 
      signOut,
      selectRole,
      clearSelectedRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
