import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';
import { Button } from './ui/Button';

const languages = [
  { code: 'en', name: 'English', flag: '/flags/gb.svg' },
  { code: 'hu', name: 'Magyar', flag: '/flags/hu.svg' },
  { code: 'ro', name: 'Română', flag: '/flags/ro.svg' },
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLangCode = i18n.language || 'en';
  // Sometimes i18n returns 'en-US', handle this by taking first 2 chars
  const currentLang = languages.find(l => l.code === currentLangCode.substring(0, 2)) || languages[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-9 overflow-hidden rounded-full p-1"
        title="Change Language"
      >
        <img src={currentLang.flag} alt={currentLang.name} className="h-full w-full object-cover rounded-full" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 rounded-md shadow-lg bg-card border border-border ring-1 ring-black ring-opacity-5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={cn(
                  "w-full text-left flex items-center px-4 py-2 text-sm transition-colors",
                  currentLang.code === lang.code ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                role="menuitem"
              >
                <img src={lang.flag} alt={lang.name} className="h-4 w-4 mr-3 object-cover rounded-sm border border-border" />
                {lang.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
