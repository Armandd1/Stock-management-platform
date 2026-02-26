import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/Button';
import { useTheme } from './theme-provider';
import { useTranslation } from 'react-i18next';

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      title={t('common.toggleTheme')}
      className="text-muted-foreground hover:text-foreground relative w-9 h-9"
    >
      <Sun
        className={`h-5 w-5 absolute transition-all ${theme === 'dark' ? 'scale-0 rotate-90' : 'scale-100 rotate-0'}`}
      />
      <Moon
        className={`h-5 w-5 absolute transition-all ${theme === 'dark' ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`}
      />
    </Button>
  );
}
