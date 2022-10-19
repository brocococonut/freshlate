import { Options, setup } from "./shared.ts";
import { lang_svc } from "./translation.ts";

type State = [string, string][];

export default function hydrate(options: Options, state: Record<string, Record<string, string>>) {
  options.languages = state

  let language = document.body.lang

  // If no language was passed in, try to get it from the browser
  if (!language || language === "") {
    // Loop through the languages in the browser and find the first one that
    // is supported
    for (let i = 0; i < navigator.languages.length; i++) {
      const nav_lang = navigator.languages[i];
      
      // If the language is supported, set it and break out of the loop
      if (lang_svc.isSupported(nav_lang)) {
        language = nav_lang;
        break;
      }
    }
  }
  
  setup(options, 'en');  
}