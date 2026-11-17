// i18n/index.js
import { createEffect, createSignal, createMemo, createContext, useContext } from 'solid-js';
import { makePersisted } from '@solid-primitives/storage';
import { flatten, resolveTemplate, translator } from '@solid-primitives/i18n';

// Dictionaries (imported from separate files or defined here)
import en from './locales/en.js';
import es from './locales/es.js';
import zhCN from './locales/zh-CN.js';
import zhTW from './locales/zh-TW.js';

// Supported locales
const DICTIONARIES = {
	'zh-CN': zhCN,
	'zh-TW': zhTW,
	en,
	es,
};

// Locales offered in the language selector, in display order.
export const LOCALE_OPTIONS = [
	{ value: 'zh-CN', label: '简体中文' },
	{ value: 'zh-TW', label: '繁體中文' },
	{ value: 'en', label: 'English' },
	{ value: 'es', label: 'Español' },
];

export const SUPPORTED_LOCALES = LOCALE_OPTIONS.map((option) => option.value);

// Simplified Chinese is the out-of-the-box default.
export const DEFAULT_LOCALE = 'zh-CN';

/**
 * Normalizes a locale tag such as "zh-Hans-CN", "zh_TW" or "en-US" to one of
 * the supported locale codes, or null when the tag is not supported.
 * @param {string} value Raw locale tag.
 * @returns {string|null} Supported locale code.
 */
function normalizeLocale(value) {
	if (!value) {
		return null;
	}
	const normalized = String(value).toLowerCase().replace('_', '-');
	if (normalized.startsWith('zh')) {
		// Traditional Chinese: Taiwan, Hong Kong, Macau or an explicit Hant tag.
		return /(hant|tw|hk|mo)/.test(normalized) ? 'zh-TW' : 'zh-CN';
	}
	const base = normalized.split('-')[0];
	return SUPPORTED_LOCALES.includes(base) ? base : null;
}

/**
 * Detects the user's preferred locale.
 * Order: VITE_APP_LOCALE env var -> browser locale -> default to Simplified Chinese.
 * @returns {string} Detected locale.
 */
function detectLocale() {
	const envLocale = normalizeLocale(import.meta.env.VITE_APP_LOCALE);
	if (envLocale) {
		return envLocale;
	}

	const browserLocales = typeof navigator !== 'undefined'
		? (navigator.languages?.length ? navigator.languages : [navigator.language])
		: [];
	for (const browserLocale of browserLocales) {
		const normalized = normalizeLocale(browserLocale);
		if (normalized) {
			return normalized;
		}
	}

	return DEFAULT_LOCALE;
}

// Create persisted signal for locale
const [locale, setLocale] = makePersisted(
	createSignal(detectLocale()),
	{ storage: localStorage, name: 'locale' }
);

// Ignore values left behind by older builds or hand-edited storage.
if (!SUPPORTED_LOCALES.includes(locale())) {
	setLocale(DEFAULT_LOCALE);
}

// Create memoized flattened dictionary based on current locale
const dict = createMemo(() => flatten(DICTIONARIES[locale()] || DICTIONARIES[DEFAULT_LOCALE]));

// Translation function that uses the current dict
const t = createMemo(() => translator(dict, resolveTemplate));

// Create context
const I18nContext = createContext({ t, locale, setLocale });

/**
 * Provider component to wrap the app.
 * @param {Object} props - Component props.
 * @param {any} props.children - Child elements.
 * @returns {JSX.Element} Provider wrapper.
 */
export function I18nProvider(props) {
	createEffect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.lang = locale();
		}
	});

	return (
		<I18nContext.Provider value={{ t, locale, setLocale }}>
			{props.children}
		</I18nContext.Provider>
	);
}

/**
 * Hook to use i18n context.
 * @returns {{ t: Function, locale: () => string, setLocale: Function }} i18n utilities.
 */
export function useI18n() {
	const context = useContext(I18nContext);
	if (!context) {
		throw new Error('useI18n must be used within an I18nProvider');
	}
	return context;
}

// Export context for direct usage if needed
export { I18nContext };
