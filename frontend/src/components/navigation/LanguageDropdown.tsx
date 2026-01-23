import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸', country: 'US' },
  { code: 'es', name: 'Español', flag: '🇪🇸', country: 'ES' },
  { code: 'pt', name: 'Português', flag: '🇧🇷', country: 'BR' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', country: 'FR' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', country: 'RU' },
  { code: 'kk', name: 'Қазақ тілі', flag: '🇰🇿', country: 'KZ' },
  { code: 'uz', name: 'Oʻzbek', flag: '🇺🇿', country: 'UZ' },
];

export const LanguageDropdown: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  // Find current language from the languages array
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageSelect = (language: (typeof languages)[0]) => {
    i18n.changeLanguage(language.code);
    setIsOpen(false);
  };

  const displayText = isMobile
    ? `${currentLanguage.code.toUpperCase()}(${currentLanguage.country})`
    : `${currentLanguage.code.toUpperCase()} (${currentLanguage.name.split('(')[1]?.replace(')', '') || currentLanguage.name.split(' ')[0]})`;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <div
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <Button
            variant="outline"
            className="flex justify-center items-center gap-2 px-3 py-2 rounded-lg border-navbar-foreground text-navbar-foreground hover:bg-hover-bg transition-colors bg-brand-yellow max-sm:px-2 max-sm:py-1 max-sm:text-xs"
            aria-label="Language selector"
          >
            <span className="text-xs font-medium leading-[18px] text-brand-dark">
              {displayText}
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="globe-icon w-4 h-4 text-brand-dark max-sm:w-3 max-sm:h-3">
              <path d="M8.00065 1.33301C6.68211 1.33301 5.39318 1.724 4.29685 2.45654C3.20052 3.18909 2.34604 4.23028 1.84146 5.44845C1.33687 6.66663 1.20485 8.00707 1.46209 9.30028C1.71932 10.5935 2.35426 11.7814 3.28661 12.7137C4.21896 13.6461 5.40685 14.281 6.70005 14.5382C7.99326 14.7955 9.3337 14.6635 10.5519 14.1589C11.7701 13.6543 12.8112 12.7998 13.5438 11.7035C14.2763 10.6071 14.6673 9.31822 14.6673 7.99967C14.6673 7.1242 14.4949 6.25729 14.1599 5.44845C13.8248 4.63961 13.3338 3.90469 12.7147 3.28563C12.0956 2.66657 11.3607 2.17551 10.5519 1.84048C9.74304 1.50545 8.87613 1.33301 8.00065 1.33301V1.33301ZM6.85999 13.195C6.13292 13.0289 5.44884 12.712 4.85204 12.2647C4.25523 11.8175 3.75902 11.2499 3.39552 10.5987C3.03201 9.94744 2.80933 9.22715 2.74188 8.48441C2.67444 7.74167 2.76373 6.99305 3.00399 6.28701L3.17199 6.30034C3.52739 6.46988 3.84197 6.7142 4.09419 7.01659C4.34641 7.31897 4.53031 7.67229 4.63332 8.05234C4.74412 8.4913 4.95698 8.8979 5.25458 9.23907C5.55219 9.58023 5.92613 9.84632 6.34599 10.0157C7.15132 10.387 7.31999 11.4283 6.85999 13.195ZM9.38665 6.99967C9.3866 6.94642 9.3801 6.89337 9.36732 6.84167C9.24667 6.2951 9.00746 5.7817 8.66659 5.33773C8.32572 4.89376 7.89152 4.53007 7.39465 4.27234C6.81132 3.90234 6.44932 3.67234 6.35199 2.94501C7.38992 2.5953 8.51042 2.57409 9.56084 2.88427C10.6113 3.19444 11.5405 3.82092 12.222 4.67834C11.2487 4.82434 10.72 6.24834 10.72 6.99901C10.6488 7.10908 10.5494 7.19806 10.4322 7.25669C10.3149 7.31531 10.1841 7.34144 10.0533 7.33234C9.92261 7.34151 9.79184 7.31548 9.67459 7.25698C9.55735 7.19848 9.45792 7.10963 9.38665 6.99967ZM10.528 12.6483L10.0567 11.2357C10.0794 10.9147 10.2175 10.6128 10.4454 10.3856C10.6733 10.1585 10.9756 10.0214 11.2967 9.99967L12.7227 10.4337C12.2298 11.3753 11.4651 12.1469 10.528 12.6483V12.6483Z" fill="currentColor" />
            </svg>
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48 bg-popover border-none rounded-lg shadow-lg p-1"
        align="end"
        sideOffset={4}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md text-brand-dark hover:bg-white/20 focus:bg-white/20 ${
              currentLanguage.code === language.code ? 'bg-white/30 font-medium' : ''
            }`}
            onClick={() => handleLanguageSelect(language)}
          >
            <span className="text-lg">{language.flag}</span>
            <span className="text-sm">{language.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
