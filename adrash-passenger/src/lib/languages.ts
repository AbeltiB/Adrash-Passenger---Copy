// src/lib/languages.ts
//
// Single source of truth for "what languages does this app support and how
// do we talk to the backend about them." Before this file existed, the same
// { en:'En', am:'Am', om:'Om' } mapping (and its inverse) was independently
// hand-maintained in three places — the splash-screen language selector, the
// agreements hooks, and the profile screen's language switcher — with no
// shared type, so adding a language meant remembering to update all three
// (and nothing would warn you if you missed one; it would just silently
// misbehave for whichever spot got skipped).

import type { Language } from '../types';
import type { ApiLanguage } from '../api/types';

export interface LanguageOption {
    code: Language;
    apiCode: ApiLanguage;
    /** English name — used where the surrounding text is itself in English. */
    label: string;
    /** Name written in its own script — used in the actual language picker. */
    nativeLabel: string;
}

export const LANGUAGES: LanguageOption[] = [
    { code: 'en', apiCode: 'En', label: 'English',  nativeLabel: 'English' },
    { code: 'am', apiCode: 'Am', label: 'Amharic',  nativeLabel: 'አማርኛ' },
    { code: 'om', apiCode: 'Om', label: 'Oromiffa', nativeLabel: 'Afaan Oromoo' },
    { code: 'so', apiCode: 'So', label: 'Somali',   nativeLabel: 'Soomaali' },
    { code: 'ti', apiCode: 'Ti', label: 'Tigrigna', nativeLabel: 'ትግርኛ' },
    { code: 'ar', apiCode: 'Ar', label: 'Arabic',   nativeLabel: 'العربية' },
];

const BY_CODE    = new Map(LANGUAGES.map((l) => [l.code, l]));
const BY_API_CODE = new Map(LANGUAGES.map((l) => [l.apiCode, l]));

export const DEFAULT_LANGUAGE: Language = 'en';

/** i18next language codes can carry a region suffix ('en-US'); normalise
 *  before lookup so that never fails to match. */
function baseCode(code: string | undefined | null): string {
    return (code ?? '').split('-')[0] ?? '';
}

export function isSupportedLanguage(code: string | undefined | null): code is Language {
    return BY_CODE.has(baseCode(code) as Language);
}

/** Client i18n code ('am') → API's expected wire value ('Am'). Never throws —
 *  an unrecognised code falls back to English rather than sending `undefined`
 *  to an endpoint that requires this param. */
export function toApiLanguage(code: string | undefined | null): ApiLanguage {
    return BY_CODE.get(baseCode(code) as Language)?.apiCode ?? 'En';
}

/** API wire value ('Am') → client i18n code ('am'). Falls back to English for
 *  the same reason. */
export function fromApiLanguage(apiCode: string | undefined | null): Language {
    if (!apiCode) return DEFAULT_LANGUAGE;
    return BY_API_CODE.get(apiCode as ApiLanguage)?.code ?? DEFAULT_LANGUAGE;
}

export function languageLabel(code: string | undefined | null): string {
    return BY_CODE.get(baseCode(code) as Language)?.nativeLabel ?? code ?? '';
}
