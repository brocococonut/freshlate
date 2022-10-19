import { Options, setup } from "./shared.ts";

type State = [string, string][];

export default function hydrate(options: Options, state: Record<string, Record<string, string>>) {
  options.languages = state
  
  setup(options, 'en');  
}