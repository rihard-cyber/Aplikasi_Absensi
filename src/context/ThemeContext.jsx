import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('app_theme') || 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    try { localStorage.setItem('app_theme', theme); } catch {}
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const themes = ['dark', 'light', 'aurora', 'neon'];

  const toggleTheme = () => {
    setTheme(prev => {
      const currentIndex = themes.indexOf(prev);
      const nextIndex = (currentIndex + 1) % themes.length;
      return themes[nextIndex];
    });
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, themes }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
