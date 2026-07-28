import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../../assets/locales/en.json';
import am from '../../assets/locales/am.json';
import om from '../../assets/locales/om.json';
import so from '../../assets/locales/so.json';
import ti from '../../assets/locales/ti.json';
import ar from '../../assets/locales/ar.json';
import type { Language } from '../types';
import { DEFAULT_LANGUAGE, LANGUAGES } from './languages';

// Re-exported for existing call sites; canonical list now lives in languages.ts.
export const SUPPORTED_LANGUAGES = LANGUAGES;

/**
 * Initialise i18next once at app startup.
 * Must be called synchronously before any component renders so that
 * the first render already has the correct language loaded.
 *
 * Uses `initImmediate: false` so the init is synchronous — no async
 * waterfall on first render, no flash of English before the real language.
 */
export function initI18n(savedLanguage?: string): void {
  const lng = (savedLanguage as Language) ?? DEFAULT_LANGUAGE;

  if (i18n.isInitialized) {
    // Already initialised (e.g. hot-reload). Just switch language if needed.
    if (i18n.language !== lng) {
      i18n.changeLanguage(lng);
    }
    return;
  }

  i18n.use(initReactI18next).init({
    lng,
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      am: { translation: am },
      om: { translation: om },
      so: { translation: so },
      ti: { translation: ti },
      ar: { translation: ar },
    },
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3',
    // Synchronous init — resources are already bundled, no async loading needed.
    initImmediate: false,
  });
}

/**
 * Change the active language and await the switch so that all
 * `useTranslation()` hooks re-render before navigation continues.
 *
 * Always await this before calling router.replace/push — otherwise
 * the next screen renders in the old language for one frame.
 */
export async function changeLanguage(lang: Language): Promise<void> {
  await i18n.changeLanguage(lang);
}

export default i18n;