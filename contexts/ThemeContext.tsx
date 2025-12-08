
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeColor, BackgroundTheme } from '../types';

interface ThemeContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  backgroundTheme: BackgroundTheme;
  setBackgroundTheme: (theme: BackgroundTheme) => void;
  customBgImage: string | null;
  setCustomBgImage: (image: string | null) => void;
  bgOpacity: number;
  setBgOpacity: (opacity: number) => void;
  getBackgroundImage: () => string | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Color State
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => {
    const savedTheme = localStorage.getItem('planflow_theme_color');
    const validThemes: ThemeColor[] = [
      'indigo', 'blue', 'emerald', 'rose', 'amber', 'violet',
      'slate', 'teal', 'cyan', 'fuchsia', 'pink', 'orange'
    ];
    if (savedTheme && validThemes.includes(savedTheme as ThemeColor)) {
        return savedTheme as ThemeColor;
    }
    return 'indigo';
  });

  // Background State
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>(() => {
    const savedBg = localStorage.getItem('planflow_bg_theme');
    const validBgs: BackgroundTheme[] = ['DEFAULT', 'SUMMER', 'WARM', 'CYBER', 'CUSTOM'];
    if (savedBg && validBgs.includes(savedBg as BackgroundTheme)) {
      return savedBg as BackgroundTheme;
    }
    return 'DEFAULT';
  });

  // Custom Image State (stored as Base64/DataURL)
  const [customBgImage, setCustomBgImage] = useState<string | null>(() => {
    return localStorage.getItem('planflow_custom_bg_image');
  });

  // Opacity State (0.1 to 1.0)
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    const savedOpacity = localStorage.getItem('planflow_bg_opacity');
    return savedOpacity ? parseFloat(savedOpacity) : 0.8;
  });

  useEffect(() => {
    localStorage.setItem('planflow_theme_color', themeColor);
  }, [themeColor]);

  useEffect(() => {
    localStorage.setItem('planflow_bg_theme', backgroundTheme);
  }, [backgroundTheme]);

  useEffect(() => {
    if (customBgImage) {
      // Basic check to avoid localStorage quota issues if possible, though strict check requires try/catch on setItem
      try {
        localStorage.setItem('planflow_custom_bg_image', customBgImage);
      } catch (e) {
        console.error("Failed to save custom image", e);
      }
    } else {
      localStorage.removeItem('planflow_custom_bg_image');
    }
  }, [customBgImage]);

  useEffect(() => {
    localStorage.setItem('planflow_bg_opacity', bgOpacity.toString());
  }, [bgOpacity]);

  const getBackgroundImage = () => {
    switch (backgroundTheme) {
      case 'SUMMER': 
        return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop';
      case 'WARM':
        return 'https://images.unsplash.com/photo-1618588507085-c79565432917?q=80&w=2000&auto=format&fit=crop';
      case 'CYBER':
        return 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2000&auto=format&fit=crop';
      case 'CUSTOM':
        return customBgImage;
      default:
        return null;
    }
  };

  return (
    <ThemeContext.Provider value={{ 
        themeColor, setThemeColor, 
        backgroundTheme, setBackgroundTheme,
        customBgImage, setCustomBgImage,
        bgOpacity, setBgOpacity,
        getBackgroundImage 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};