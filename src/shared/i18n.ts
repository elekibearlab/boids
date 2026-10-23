/**
 * Language on screen. ?lang=en in the URL shows English.
 * This file and ui/LanguageSwitch.tsx know nothing about this app, so another app can copy them as they are
 */
export type Lang = 'ja' | 'en';

/**
 * Screen text for each language.
 * Names of patterns and presets (data/) also use this type
 */
export type LocalizedText = Record<Lang, string>;

/** Name of the URL parameter. A site that embeds the app (Lab) sends the language with this name */
const LANG_PARAMETER = 'lang';

/** Languages in the language switch. It is small, so both languages use a short label of the same width */
export const LANGS = [
  { id: 'ja', name: 'JA' },
  { id: 'en', name: 'EN' },
] as const satisfies readonly { id: Lang; name: string }[];

/**
 * Gets the language from ?lang= in the URL. Uses Japanese if the value is unknown.
 * To switch, the page opens again with a new ?lang= (languageUrl). So this is set only once, when the page loads
 */
export const LANG: Lang =
  new URLSearchParams(location.search).get(LANG_PARAMETER) === 'en' ? 'en' : 'ja';

/**
 * Whether the page is inside another page (an iframe).
 * A site that embeds the app passes ?lang= and has its own language switch. So the switch in the app is hidden,
 * otherwise there would be two switches, and the one in the app would change only the inside
 */
export const EMBEDDED = window.self !== window.top;

/**
 * Picks the text for the current language.
 *
 * @param text Text for each language
 */
export function t(text: LocalizedText): string {
  return text[LANG];
}

/**
 * URL of this page in another language. Other parameters and the # stay, so only the language changes and the screen stays the same.
 * Read it when it is used, because the # changes while the page is open
 *
 * @param lang Language to open
 */
export function languageUrl(lang: Lang): string {
  const parameters = new URLSearchParams(location.search);
  parameters.set(LANG_PARAMETER, lang);
  return `?${parameters}${location.hash}`;
}
