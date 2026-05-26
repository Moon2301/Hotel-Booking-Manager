import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  /** On hero / dark header — icon only, light colored */
  variant?: 'default' | 'on-dark';
}

export function ThemeToggle({
  className = '',
  variant = 'default',
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const base =
    variant === 'on-dark'
      ? 'rounded-full border border-white/25 bg-white/10 p-2 text-white transition hover:border-mango-accent hover:bg-white/15'
      : 'rounded-full border border-slate-300 bg-slate-200 p-2 text-slate-700 transition hover:border-mango-accent hover:bg-slate-300 dark:border-white/15 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`${base} ${className}`}
      aria-label={isDark ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
      title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
