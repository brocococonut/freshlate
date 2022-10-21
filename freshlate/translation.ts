import { flattenObject, getNestedKeyValue, FUNCS, FUNC_NAMES } from "./util.ts";

const DYN_STR_REGEX =
  /\[\[~\s*(?:{(?<data_key>.*?)})\s*(?<cases>(?:\s*(?<case_key>(?:(?:[\w-])|(?:N?GTE?|N?LTE?|N?EQ|AND|N?BT|N?IN|X?OR)\((?:[^)]+)\))+)\s*:\s*`[^`]*`\s*\|*\s*)+)+\]\]/sg;
const DYN_CASEKEY_REGEX =
  /(?<case_key>(?:(?:[\w-])|(?:N?GTE?|N?LTE?|N?EQ|AND|N?BT|N?IN|X?OR)\((?:[^)]+)\))+)\s*:\s*`(?<content>[^`]*)`/sg;
/**
 * Function for handling
 */
const DYN_FUNC_REGEX =
  /(?<func>N?GTE?|N?LTE?|N?EQ|AND|N?BT|N?IN|X?OR)\((?<args>[^)]+)\)/s;

/**(?:N?GTE?|N?LTE?|N?EQ|AND|N?BT|N?IN|X?OR\((?:[^)]+)\))
 * Regex for inner content replacement
 */
const DYN_NESTED_REGEX = /\{\{(.*?)\}\}(?:\|\|(.*?)\|\|)?/sg;

/**
 * Regex to get the 1 (or 2) arguments of a function
 */
const DYN_ARG_REGEX =
  /(?<arg1>(?:string\s*:\s*\`(?<arg1_val_str>[^`]*)\`)|(?:key\s*:\s*(?:{(?<arg1_val_key>.*?)}))|(?:number\s*:\s*(?<arg1_val_num>[0-9]+(\.[0-9]+)?))|(?:boolean\s*:\s*(?<arg1_val_bool>true|false|1|0)))(?:\s*,\s*(?<arg2>(?:string\s*:\s*\`(?<arg2_val_str>[^`]*)\`)|(?:key\s*:\s*(?:{(?<arg2_val_key>.*?)}))|(?:number\s*:\s*(?<arg2_val_num>[0-9]+(\.[0-9]+)?))|(?:boolean\s*:\s*(?<arg2_val_bool>true|false|1|0))))?/s;

/**
 * The main translation/language class. This handles storage of languages,
 * translation/replacement of dynamic substrings, and the ability to add new
 * languages.
 */
export class LanguageService {
  /**
   * A map of language codes and their given translations
   */
  languages: {
    [key: string]: {
      [key: string]: string;
    };
  } = {};
  /**
   * The language code to fall back to if the language is not supported
   */
  fallback_language = "en";
  /**
   * A key to fall back to if the key is not found in the given language.
   * If the fallback key is not found, the fallback language will be checked.
   * If the fallback key isn't found in the fallback language either, the value returned will be "__NOT_FOUND__"
   */
  fallback_key = "error.unknown";
  /**
   * A list of languages that have been hydrated/updated post class initialisation
   */
  hydrated_languages: string[] = [];

  /**
   * Construct a new LangaugeService class with the given languages and fallbacks
   * @param languages The languages to use
   * @param fallback_language The fallback language to use
   * @param fallback_key The fallback key to use
   */
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

  /**
   * Returns an array of all supported languages
   * @returns Array of all the language codes supported
   */
  allSupported(): string[] {
    return Object.keys(this.languages);
  }

  /**
   * Add a new language into the languages object
   * @param code The language code to add
   * @param lang The language object to add
   */
  addLanguage(code: string, lang: Record<string, unknown>) {
    this.languages[code] = flattenObject(lang);
  }

  /**
   * Merge a new set of translations and keys into the language object
   * @param code The language code to use
   * @returns The language object for the given language code
   */
  hydrateLanguage(code: string, lang: Record<string, unknown>) {
    this.addLanguage(code, { ...this.languages[code], ...lang });
    this.setHydrated(code);
  }

  /**
   * Sets a language as hydrated
   * @param code The language code to set as hydrated
   */
  setHydrated(code: string) {
    this.hydrated_languages = Array.from(
      new Set([...this.hydrated_languages, code])
    );
  }

  /**
   * Checks to see if a language is hydrated/updated
   * @param code The language code to check
   * @returns Whether the language is hydrated
   */
  isHydrated(code: string) {
    return this.hydrated_languages.includes(code);
  }

  /**
   * Checks if a language is supported
   * @param code The language code to check
   * @returns Whether the language is supported
   */
  isSupported(code: string): boolean {
    return !!this.languages[code];
  }

  /**
   * Returns the value for a specific language and key
   * @param lang_code The language code to use
   * @param key The key to translate/use
   * @returns The value of the translation/localisation key if it exists
   */
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

  /**
   * Translates a key to a specific language, replacing substrings with necessary values as needed
   * @param key The key to translate/use
   * @param opts Options for the translation (lang, data, etc.)
   * @returns The translated string
   */
  t(key: string, opts: Record<string, unknown> = {}) {
    // Make sure the langauge is supported
    const found = this.getKey(
      (opts.lang || this.fallback_language) as string,
      key
    );

    // Find anything matching something similar to [[~ {object.nested.key} 1: `string` | 2: `{{object.second.nested.key}} string` | 3: `string` | ... | default: `string` ]]
    // and replace it with the correct string depending on the value of the object.nested.key
    const translated = found.replaceAll(
      DYN_STR_REGEX,
      (
        _matched_str: string,
        _key: string,
        _dyn_field: string,
        _case_key: string,
        _unk,
        _src_str: string,
        groups: { data_key: string; case_key: string, cases: string }
      ) => {
        let cur_val = getNestedKeyValue(opts, groups["data_key"]);

        if (cur_val === undefined) {
          cur_val = "default";
        }

        // collect all the options into an array
        // const options = dyn_field.matchAll(DYN_CASEKEY_REGEX);
        const options = groups.cases.matchAll(DYN_CASEKEY_REGEX);
        
        // Build an options map from the regex result iterable
        const options_map = new Map<string, string>();
        for (const option of options) {
          options_map.set(
            option.groups?.case_key as string,
            option.groups?.content as string
          );
        }

        // Handle running comparison functions on provided values
        let func_case_val: string | undefined = undefined;
        options_map.forEach((val, key) => {
          // If there's already a value, skip all future iterations
          if (func_case_val !== undefined) return;
          // If the key matches DYN_FUNC_REGEX, run it and if it returns true, set the value to func_case_val
          if (DYN_FUNC_REGEX.test(key)) {
            // Get the separated function name
            const func_name = key
              .substring(0, key.indexOf("("))
              .toUpperCase() as keyof typeof FUNCS;
            // Get the arguments and split them by commas, then trim the whitespace
            const {
              arg1,
              arg1_val_str,
              arg1_val_key,
              arg1_val_num,
              arg1_val_bool,
              arg2,
              arg2_val_str,
              arg2_val_key,
              arg2_val_num,
              arg2_val_bool,
            } = (DYN_ARG_REGEX.exec(key) || { groups: {} }).groups as {
              arg1?: string;
              arg1_val_str?: string;
              arg1_val_key?: string;
              arg1_val_num?: string;
              arg1_val_bool?: string;
              arg2?: string;
              arg2_val_str?: string;
              arg2_val_key?: string;
              arg2_val_num?: string;
              arg2_val_bool?: string;
            };

            // Make sure the function exists
            if (!FUNC_NAMES.includes(func_name)) {
              return;
            }

            // Get the function object to make sure the argument lengths meet the minimum for the function
            const func_obj = FUNCS[func_name as keyof typeof FUNCS];
            if (
              (func_obj.arg_count === 1 && !arg1) ||
              (func_obj.arg_count === 2 && !arg2)
            ) {
              return;
            }

            let arg1_val: string | number | boolean | undefined = undefined;
            let arg2_val: string | number | boolean | undefined = undefined;
            if (arg1?.startsWith("str") && arg1_val_str !== undefined) {
              arg1_val = arg1_val_str;
            } else if (arg1?.startsWith("key") && arg1_val_key !== undefined) {
              arg1_val = getNestedKeyValue(opts, arg1_val_key as string) as
                | string
                | number
                | boolean
                | undefined;
            } else if (arg1?.startsWith("num") && arg1_val_num !== undefined) {
              arg1_val = arg1_val_num.includes(".")
                ? Number.parseFloat(arg1_val_num as string)
                : Number.parseInt(arg1_val_num as string);
              if (Number.isNaN(arg1_val)) {
                arg1_val = undefined;
              }
            } else if (
              arg1?.startsWith("bool") &&
              arg1_val_bool !== undefined
            ) {
              switch (arg1_val_bool) {
                case "true":
                case "1":
                  arg1_val = true;
                  break;
                case "false":
                case "0":
                  arg1_val = false;
                  break;
                default:
                  arg1_val = undefined;
                  break;
              }
            }

            // If the function requires a second (really third if you count
            // the comparison passed in at the beginning of the dynamic
            // replacer) argument, parse it from the provided ar2 variables
            // from the regex
            if (func_obj.arg_count > 1) {
              if (arg2?.startsWith("str") && arg2_val_str !== undefined) {
                arg2_val = arg2_val_str;
              } else if (
                arg2?.startsWith("key") &&
                arg2_val_key !== undefined
              ) {
                arg2_val = getNestedKeyValue(opts, arg2_val_key as string) as
                  | string
                  | number
                  | boolean
                  | undefined;
              } else if (
                arg2?.startsWith("num") &&
                arg2_val_num !== undefined
              ) {
                arg2_val = arg2_val_num.includes(".")
                  ? Number.parseFloat(arg2_val_num as string)
                  : Number.parseInt(arg2_val_num as string);
                if (Number.isNaN(arg2_val)) {
                  arg2_val = undefined;
                }
              } else if (
                arg2?.startsWith("bool") &&
                arg2_val_bool !== undefined
              ) {
                switch (arg2_val_bool) {
                  case "true":
                  case "1":
                    arg2_val = true;
                    break;
                  case "false":
                  case "0":
                    arg2_val = false;
                    break;
                  default:
                    arg2_val = undefined;
                    break;
                }
              }
            }

            const arg1_valid_types = func_obj.arg_types[0];
            const arg2_valid_types = func_obj.arg_types[1] || [];

            // Make sure the type of the above variables match with whats allowed in the func_obj.arg_types array
            if (
              !(
                (arg1?.startsWith("str") &&
                  arg1_valid_types.includes("string")) ||
                (arg1?.startsWith("key") && arg1_valid_types.includes("key")) ||
                (arg1?.startsWith("num") &&
                  arg1_valid_types.includes("number")) ||
                (arg1?.startsWith("bool") &&
                  arg1_valid_types.includes("boolean"))
              )
            ) {
              // Exit out early if the type for the second variable is invalid
              return;
            }

            // Make sure the types of arg 2 are valid as well, or if the function only needs one argument, set it to true
            if (
              func_obj.arg_count !== 1 &&
              !(
                (arg2?.startsWith("str") &&
                  arg2_valid_types.includes("string")) ||
                (arg2?.startsWith("key") && arg2_valid_types.includes("key")) ||
                (arg2?.startsWith("num") &&
                  arg2_valid_types.includes("number")) ||
                (arg2?.startsWith("bool") &&
                  arg2_valid_types.includes("boolean"))
              )
            ) {
              // Exit out early if the type for the second variable is invalid
              return;
            }
            

            // If the types are valid, run the function
            const result = (
              func_obj.func as (a: string, b: string, c: string) => boolean
            )(cur_val as string, arg1_val as string, arg2_val as string);

            // If the result is true, set the value of this key to the
            // external func_case_val variable for further use
            if (result === true) {
              func_case_val = val;
              return;
            } else {
              return;
            }
          }
        });

        // If one of the functions above returned true, return the value of the case that matched
        if (func_case_val !== undefined) {
          return func_case_val;
        }

        // Cast the value to a string in case people are using numbers
        const val_str = new String(cur_val).toString()
        // If the current value is not in the options, use the default
        if (options_map.has(val_str as string)) {
          return options_map.get(val_str as string) as string;
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

  /**
   * Returns a new function for translating to a specific language replacing the t method
   * @param lang_code The language code to use
   * @returns Function taking place of the t method
   */
  getTranslationFunc(lang_code: string) {
    return (key: string, opts: Record<string, unknown> = {}) => {
      return this.t(key, { lang: lang_code, ...opts });
    };
  }
}

export const lang_svc = new LanguageService();
