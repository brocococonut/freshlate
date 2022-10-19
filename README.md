
# Freshlate

A small plugin for Fresh to handle translations. It may be rough around the edges for now, but suits my needs (and hopefully yours) decently enough.


## Support

For support, feel free to open an issue!


## Installation

Install freshlate by adding the import and setting it up in fresh

```ts
import languagePlugin from "https://deno.land/x/freshlate/mod.ts";
import languageConfig from "./translate.config.ts";

await start(manifest, {
  plugins: [twindPlugin(twindConfig), languagePlugin({ ...languageConfig })],
});
```
Example `translate.config.ts` file
```ts
import type { Options } from "https://deno.land/x/freshlate/mod.ts";

export default {
  selfURL: import.meta.url,
  languages: {
    en: {},
  },
  fetch_url: "/api/translation/{{lang}}",
  fallback_language: "en",
} as Options;

```
## Usage/Examples

#### Example Fresh `main.ts` file
```ts
/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import languagePlugin from "freshlate";
import languageConfig from "./translate.config.ts";

await start(manifest, {
  plugins: [languagePlugin({ languageConfig })],
});
```

#### Example `translate.config.ts` file
```ts
import type { Options } from "freshlate";

export default {
  selfURL: import.meta.url,
  languages: {
    en: {
        common: {
            languages: {
                en: "English",
                es: "Spanish
            }
        }
    },
    es: {
        common: {
            languages: {
                en: "Inglés",
                es: "Español"
            }
        }
    }
  },
  fetch_url: "/api/translation/{{lang}}",
} as Options;
```

#### Example component with translation
```typescript
export function Button() {
  return (
    <button
      class="px-2 py-1 border(gray-100 2) hover:bg-gray-200"
      data-t-key="common.languages.es"
    >
      Spanish {/* This will be replaced by the translation service  */}
    </button>
  );
}
```

#### Example with formatting and data replacement
What translation tool would be feature-complete(ish) without a formatter and data inserter?
The general formatting of a dynamic translation key follows the following:
* starts with `[[~`
* ends with `]]`
* first parameter is a key on the params object (can be as deeply nested as you want) and must be wrapped in curly braces; examples:
    * `{a_key_on_the_root_object}` - root level key
    * `{parent.child_key}` - Nested key
    * `{key.deeply.nested.0.and_in_array}` - Nested deeply and within an array
    * `{key.still.2.1.3.nested.deeply.}` - Nested deeply within multi-dimensional arrays
* next parameter onwards is a format option key. The key can be a string but can not include spaces but only supports the regex values `\w-`; examples:
    * valid: test_case
    * valid: test-case
    * valid: testCase
    * invalid: test case
    * invalid: test(case)
    * invalid: test.case
* key followed by colon, and value of test case is wrapped in backticks
* each parameter should be separated by a lone pipe character
* optionally, a `default` case can be passed in at the end to handle edge cases
* optionally, you can embed a value in a format case using double squigly lines; examples:
    * `test_case: `\`Here's my embeded data {{data_key}}\``
* optionally, embedded values can have fallback strings spanning multiple lines. They should be surrounded by double pipes, and can't contain double pipes; examples:
    * `{{key}}||oops, nothing here||`

If we put all that together and format it to our liking, we get something like the following:
(new lines should be treated as spaces)
```
[[~
    {key}
	 test_case_1: `test 2` |
	 test_case_2: `{{key}} {{key2}}||no key found||` |
	 default: `oops, no cases matched`
]]
```
The above would only look pretty outside of a JSON file though. The return characters are purely decorative outside of the case formats
The regex that handles the parsing of the above can be found in `/freshlate/translation.ts`
Here's the regex to save you the trouble though:
```ts
const DYN_STR_REGEX =
  /\[\[~\s*(?:{(.*?)})\s*((?:\s*[\w-]+\s*:\s*`[^`]*`\s*\|*\s*)*\s*(?:default\s*:\s*`[^`]*`\s*){0,1})\]\]/gs;
```

Here's an example properly showing how this would be used in the real-world
```ts
// /translate.config.ts
...    
        common: {
            counter: 'You have [[~ {count} 0: `no apples` | 1: `one apple` | default: `{{count}} apples` ]]'
        }
...
// --------------------------- //

// /components/button.ts
export function Button() {
  return (
    <button
      class="px-2 py-1 border(gray-100 2) hover:bg-gray-200"
      data-t-key="common.counter"
      data-t-key-params={{count: 10}}
    >
      Apples {/* This will be replaced by
                 the translation service and
                 should read "You have 10 apples" */}
    </button>
  );
}
```

#### Example with formatting and data replacement, as well as data fallback
If a value doesn't exist for the provided key, you can provide a fallback value. This can be anything but must not contain the sequence `||` and must begin and end with `||`
```ts
// /translate.config.ts
...    
        common: {
            counter: 'You have [[~ {count} 0: `no apples` | 1: `one apple` | default: `{{count}}||inappropriate|| apples` ]]'
        }
...
// --------------------------- //

// /components/button.ts
export function Button() {
  return (
    <button
      class="px-2 py-1 border(gray-100 2) hover:bg-gray-200"
      data-t-key="common.counter"
      data-t-key-params={{other_count: 10}}
    >
      Apples {/* The text nodes here will be replaced by
                 the translation service and
                 should read "You have inappropriate apples" */}
    </button>
  );
}
```
## Authors

- [@brocococonut](https://www.github.com/brocococonut)


## License

[MIT](https://choosealicense.com/licenses/mit/)

