import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem('peerdrop_theme') as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch {}
    return 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem('peerdrop_theme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    let darkMode = false;

    if (mode === 'dark') {
      darkMode = true;
    } else if (mode === 'light') {
      darkMode = false;
    } else {
      darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (darkMode) {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }

    setIsDark(darkMode);
  }, []);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      setThemeState(mode);
      try {
        localStorage.setItem('peerdrop_theme', mode);
      } catch {}
      applyTheme(mode);
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(() => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    setTheme(nextMode);
  }, [isDark, setTheme]);

  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const stored = localStorage.getItem('peerdrop_theme');
      if (!stored || stored === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
