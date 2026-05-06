import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from '../../assets/locales/en.json';
import am from '../../assets/locales/am.json';
import om from '../../assets/locales/om.json';

const SUPPORTED = ['en', 'am', 'om'] as const;
export type SupportedLanguage = typeof SUPPORTED[number];

function getDeviceLang(): SupportedLanguage {
    const code = Localization.getLocales()[0]?.languageCode ?? 'en';
    return SUPPORTED.includes(code as SupportedLanguage) ? (code as SupportedLanguage) : 'en';
}

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            am: { translation: am },
            om: { translation: om },
        },
        lng: getDeviceLang(),
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        compatibilityJSON: 'v3',
    });

export default i18n;