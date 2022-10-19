import { flattenObject, getNestedKeyValue } from "./util.ts";

const DYN_STR_REGEX =
  /\[\[~\s*(?:{(.*?)})\s*((?:\s*[\w-]+\s*:\s*`[^`]*`\s*\|*\s*)*\s*(?:default\s*:\s*`[^`]*`\s*){0,1})\]\]/gs;
const DYN_NESTED_REGEX = /\{\{(.*?)\}\}(?:\|\|(.*?)\|\|)?/gs;

export class LanguageService {
  languages: {
    [key: string]: {
      [key: string]: string;
    };
  } = {};
  fallback_language = "en";
  fallback_key = "error.unknown";
  hydrated_languages: string[] = [];

  constructor(
    languages: {
      [key: string]: Record<string, unknown>;
    } = {},
    fallback_language = "en",
    fallback_key = "error.unknown"
  ) {
    for (const key in languages) {
      this.addLanguage(key, languages[key]);
    }

    this.fallback_key = fallback_key;
    this.fallback_language = fallback_language;
  }

  allSupported(): string[] {
    return Object.keys(this.languages);
  }

  addLanguage(code: string, lang: Record<string, unknown>) {
    this.languages[code] = flattenObject(lang);
  }

  hydrateLanguage(code: string, lang: Record<string, unknown>) {
    this.addLanguage(code, { ...this.languages[code], ...lang });
    this.setHydrated(code);
  }

  setHydrated(code: string) {
    this.hydrated_languages = Array.from(
      new Set([...this.hydrated_languages, code])
    );
  }

  isHydrated(code: string) {
    return this.hydrated_languages.includes(code);
  }

  isSupported(code: string): boolean {
    return !!this.languages[code];
  }

  getKey(lang_code: string, key: string): string {
    let lang = (lang_code || this.fallback_language) as string;
    if (!this.isSupported(lang)) {
      lang = this.fallback_language;
    }

    // Get the value from the language object for further processing
    const found =
      this.languages[lang]?.[key] ||
      this.languages[lang]?.[this.fallback_key] ||
      this.languages?.[this.fallback_language]?.[key] ||
      this.languages?.[this.fallback_language]?.[this.fallback_key] ||
      "__NOT_FOUND__";

    return found;
  }

  t(key: string, opts: Record<string, unknown> = {}) {
    // Make sure the langauge is supported
    const found = this.getKey((opts.lang || this.fallback_language) as string, key)

    // Find anything matching something similar to [[~ {object.nested.key} 1: `string` | 2: `{{object.second.nested.key}} string` | 3: `string` | ... | default: `string` ]]
    // and replace it with the correct string depending on the value of the object.nested.key
    const translated = found.replace(
      DYN_STR_REGEX,
      (_matched_str, key, dyn_fields: string) => {
        let cur_val = getNestedKeyValue(opts, key) as string;

        if (cur_val === undefined) {
          cur_val = "default";
        }

        if (typeof cur_val !== "string") {
          cur_val = new String(cur_val).toString();
        }

        // collect all the options into an array
        const options = dyn_fields.matchAll(
          /(?<key>[\w.]+):\s*`(?<content>[^`]*)`/gs
        );

        // Build an options map from the regex result iterable
        const options_map = new Map<string, string>();
        for (const option of options) {
          options_map.set(
            option.groups?.key as string,
            option.groups?.content as string
          );
        }

        // If the current value is not in the options, use the default
        if (options_map.has(cur_val)) {
          return options_map.get(cur_val) as string;
        } else if (options_map.has("default")) {
          return options_map.get("default") as string;
        } else {
          return "[fallback_key_missing]";
        }
      }
    );

    // Proceed to replace any instances of {{object.nested.key}} (optionally formatted with a fallback string as {{}}||fallback string|| )  with their appropriate values
    const formatted = translated.replaceAll(
      DYN_NESTED_REGEX,
      (_match, key, fallback) => {
        const val = getNestedKeyValue(opts, key);
        if (val === undefined) {
          return fallback || "[no_value]";
        }

        return val as string;
      }
    );

    return formatted;
  }
}

export const lang_svc = new LanguageService();
