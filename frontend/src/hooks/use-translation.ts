import { useState, useEffect, useCallback } from 'react';
import { TranslationService } from '@/services/TranslationService';
import i18n from '@/lib/i18-utils';

export function useTranslatedText(text: string | null | undefined): string {
  const [translatedText, setTranslatedText] = useState<string>(text || '');
  const [currentLang, setCurrentLang] = useState(i18n.language);

  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLang(i18n.language);
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    if (!text || text.trim() === '') {
      setTranslatedText(text || '');
      return;
    }

    let isMounted = true;

    const translateText = async () => {
      try {
        const translated = await TranslationService.translate(text, currentLang);
        if (isMounted) {
          setTranslatedText(translated);
        }
      } catch (error) {
        if (isMounted) {
          setTranslatedText(text);
        }
      }
    };

    translateText();

    return () => {
      isMounted = false;
    };
  }, [text, currentLang]);

  return translatedText;
}

export function useTranslatedTexts(texts: (string | null | undefined)[]): string[] {
  const [translatedTexts, setTranslatedTexts] = useState<string[]>(
    texts.map(text => text || '')
  );
  const [currentLang, setCurrentLang] = useState(i18n.language);

  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLang(i18n.language);
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    if (!texts.length) {
      setTranslatedTexts([]);
      return;
    }

    let isMounted = true;

    const translateTexts = async () => {
      try {
        const cleanTexts = texts.map(text => text || '');
        const translated = await TranslationService.batchTranslate(cleanTexts, currentLang);
        if (isMounted) {
          setTranslatedTexts(translated);
        }
      } catch (error) {
        if (isMounted) {
          setTranslatedTexts(texts.map(text => text || ''));
        }
      }
    };

    translateTexts();

    return () => {
      isMounted = false;
    };
  }, [texts, currentLang]);

  return translatedTexts;
}
