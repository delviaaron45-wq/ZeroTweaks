// i18n Configuration.
//
// The language is persisted in the settings store, so it is read back on
// startup and applied before the first render.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { es } from './locales/es';

export const SUPPORTED_LANGUAGES = [
  { code: 'es', native: 'Español', name: 'Spanish' },
  { code: 'en', native: 'English', name: 'English' },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const STORAGE_KEY = 'zerotweaks-settings';

export function isSupportedLanguage(code: string | undefined | null): code is SupportedLanguageCode {
  return !!code && SUPPORTED_LANGUAGES.some(l => l.code === code);
}

/** Reads the persisted language so the UI starts in the right language. */
export function readPersistedLanguage(): SupportedLanguageCode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { language?: string } };
      const language = parsed?.state?.language;
      if (isSupportedLanguage(language)) return language;
    }
  } catch {
    /* fall through to the system language */
  }
  // Fall back to the language configured in Windows.
  const system = (navigator?.language ?? 'es').toLowerCase();
  return system.startsWith('en') ? 'en' : 'es';
}

/** Applies a language to the document and to i18next. */
export function applyLanguage(code: string): void {
  if (!isSupportedLanguage(code)) return;
  void i18n.changeLanguage(code);
  document.documentElement.lang = code;
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: readPersistedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

applyLanguage(readPersistedLanguage());

export default i18n;
