import api from "./api";
import i18n from "@/lib/i18-utils";

export interface TranslationResult {
  text: string;
  found: boolean;
  auto: boolean;
}

export interface BatchTranslationResult {
  results: TranslationResult[];
}

export const TranslationService = {
  async translate(text: string, lang?: string): Promise<string> {
    if (!text || text.trim() === '') return text;

    try {
      const targetLang = lang || i18n.language;
      if (targetLang === 'en') return text; // No need to translate to English

      const { data } = await api.get<TranslationResult>('/i18n/translate/', {
        params: { text: text.trim(), lang: targetLang }
      });

      return data.found ? data.text : text;
    } catch (error) {
      console.warn('Translation failed, using original text:', error);
      return text;
    }
  },

  async batchTranslate(texts: string[], lang?: string): Promise<string[]> {
    if (!texts.length) return texts;

    try {
      const targetLang = lang || i18n.language;
      if (targetLang === 'en') return texts; // No need to translate to English

      const filteredTexts = texts.filter(text => text && text.trim() !== '');
      if (!filteredTexts.length) return texts;

      const { data } = await api.post<BatchTranslationResult>('/i18n/translate/', {
        texts: filteredTexts.map(text => text.trim()),
        lang: targetLang
      });

      let resultIndex = 0;
      return texts.map(text => {
        if (!text || text.trim() === '') return text;
        const result = data.results[resultIndex++];
        return result?.found ? result.text : text;
      });
    } catch (error) {
      console.warn('Batch translation failed, using original texts:', error);
      return texts;
    }
  },

  async batchTranslateItems(items: { text: string; lang?: string }[], namespace: string = "default"): Promise<Record<string, string>> {
    if (!items.length) return {};

    try {
      const { data } = await api.post('/i18n/translate/batch/', {
        namespace,
        items: items.map(item => ({
          text: item.text.trim(),
          lang: item.lang || i18n.language
        }))
      });

      // Create a map of original text to translated text
      const translationMap: Record<string, string> = {};
      items.forEach((item, index) => {
        const result = data.results?.[index];
        translationMap[item.text] = result?.found ? result.text : item.text;
      });

      return translationMap;
    } catch (error) {
      console.warn('Batch translation failed, using original texts:', error);
      // Return original texts as fallback
      const fallbackMap: Record<string, string> = {};
      items.forEach(item => {
        fallbackMap[item.text] = item.text;
      });
      return fallbackMap;
    }
  }
};
