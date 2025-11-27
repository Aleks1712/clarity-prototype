import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { translations, LanguageCode, getTranslation } from '@/lib/i18n';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: keyof typeof translations.nb) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<LanguageCode>('nb');

  useEffect(() => {
    if (user) {
      fetchLanguagePreference();
    }
  }, [user]);

  const fetchLanguagePreference = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', user.id)
      .single();

    if (data?.preferred_language) {
      setLanguageState(data.preferred_language as LanguageCode);
    }
  };

  const setLanguage = async (lang: LanguageCode) => {
    if (!user) {
      setLanguageState(lang);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ preferred_language: lang })
      .eq('id', user.id);

    if (!error) {
      setLanguageState(lang);
    }
  };

  const t = (key: keyof typeof translations.nb): string => {
    return getTranslation(language, key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
