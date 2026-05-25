// useTheme

'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const THEME_KEY = 'weekly-planner-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  const isDark = theme === 'dark';

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const initialTheme = savedTheme ?? 'light';

    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = isDark ? 'light' : 'dark';

    setTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  }

  return {
    theme,
    isDark,
    toggleTheme,
  };
}
