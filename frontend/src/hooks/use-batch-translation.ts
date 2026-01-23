import { useState, useEffect } from 'react';
import { TranslationService } from '@/services/TranslationService';
import i18n from '@/lib/i18-utils';

export function useBatchTranslation(texts: string[], namespace: string = "default") {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
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
    if (!texts.length || currentLang === 'en') {
      // Create identity map for English or empty texts
      const identityMap: Record<string, string> = {};
      texts.forEach(text => {
        identityMap[text] = text;
      });
      setTranslations(identityMap);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const translateBatch = async () => {
      try {
        // Get unique texts to avoid duplicate translations
        const uniqueTexts = [...new Set(texts.filter(text => text && text.trim() !== ''))];

        const items = uniqueTexts.map(text => ({
          text,
          lang: currentLang
        }));

        const translationMap = await TranslationService.batchTranslateItems(items, namespace);

        if (isMounted) {
          setTranslations(translationMap);
        }
      } catch (error) {
        if (isMounted) {
          // Fallback to original texts
          const fallbackMap: Record<string, string> = {};
          texts.forEach(text => {
            fallbackMap[text] = text;
          });
          setTranslations(fallbackMap);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    translateBatch();

    return () => {
      isMounted = false;
    };
  }, [texts, currentLang, namespace]);

  const getTranslation = (text: string): string => {
    return translations[text] || text;
  };

  return { getTranslation, loading };
}
