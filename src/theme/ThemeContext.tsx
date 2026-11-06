import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeStyle = 'cute' | 'classic';

interface ThemeContextType {
  themeStyle: ThemeStyle;
  setThemeStyle: (style: ThemeStyle) => void;
  toggleThemeStyle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeStyle: 'cute',
  setThemeStyle: () => {},
  toggleThemeStyle: () => {},
});

const STORAGE_KEY = 't_nihon_theme_style';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeStyle, setThemeStyleState] = useState<ThemeStyle>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'classic' ? 'classic' : 'cute') as ThemeStyle;
  });

  const setThemeStyle = (style: ThemeStyle) => {
    setThemeStyleState(style);
    localStorage.setItem(STORAGE_KEY, style);
  };

  const toggleThemeStyle = () => {
    setThemeStyle(themeStyle === 'cute' ? 'classic' : 'cute');
  };

  useEffect(() => {
    if (themeStyle === 'cute') {
      document.documentElement.classList.add('theme-cute');
      document.documentElement.classList.remove('theme-classic');
    } else {
      document.documentElement.classList.add('theme-classic');
      document.documentElement.classList.remove('theme-cute');
    }
  }, [themeStyle]);

  return (
    <ThemeContext.Provider value={{ themeStyle, setThemeStyle, toggleThemeStyle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeStyle = () => useContext(ThemeContext);
