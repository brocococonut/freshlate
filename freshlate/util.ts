/**
 * Flatten an object into a single level using dot notation
 * @param obj Object to flatten
 * @param cur_key Current key if has recursed
 * @returns Flattened object using dot notation
 * @example flattenObject({a: {b: {c: 'd'}}}) // {a.b.c: 'd'}
 * @example flattenObject({a: [{b: 'c'}]}) // {a.0.b: 'c'}
 * @example flattenObject({a: [{b: {c: 'd'}}, 'e']}) // {a.0.b.c: 'd', a.1: 'e'}
 */
export const flattenObject = (
  obj: Record<string, unknown>,
  cur_key = ""
): Record<string, string> => {
  const flattened: Record<string, string> = {};

  const handleTypes = (val: unknown, key = "") => {
    if (Array.isArray(val)) {
      val.forEach((item, index) => {
        handleTypes(item, `${key}.${index}`);
      });
    } else if (typeof val === "object") {
      Object.assign(
        flattened,
        flattenObject(val as Record<string, unknown>, key)
      );
    } else {
      flattened[key] = val as string;
    }
  };

  Object.keys(obj).forEach((key: string) => {
    const val = obj[key];

    handleTypes(val, `${cur_key}${cur_key ? "." : ""}${key}`);
  });

  return flattened;
};

/**
 * Get a nested key value from an object
 * @param obj Object to get the nested key of
 * @param key Key to get the value of
 * @returns The value of the nested key or undefined
 */
export const getNestedKeyValue = (
  obj: Record<string, unknown>,
  key: string
): unknown | undefined => {
  const keys = key.split(".");
  let cur_obj = obj;

  for (let i = 0; i < keys.length; i++) {
    const cur_key = keys[i]
    if (cur_obj[cur_key] === undefined) {
      return undefined;
    } else {
      cur_obj = cur_obj[cur_key] as Record<string, unknown>;
    }
  }


  return cur_obj;
};

export const funcGT = (a: number | string, b: number | string) => a > b;
export const funcGTE = (a: number | string, b: number | string) => a >= b;
export const funcNGT = (a: number | string, b: number | string) =>
  !funcGT(a, b);
export const funcNGTE = (a: number | string, b: number | string) =>
  !funcGTE(a, b);
export const funcLT = (a: number | string, b: number | string) => a < b;
export const funcLTE = (a: number | string, b: number | string) => a <= b;
export const funcNLT = (a: number | string, b: number | string) =>
  !funcLT(a, b);
export const funcNLTE = (a: number | string, b: number | string) =>
  !funcLTE(a, b);
export const funcEQ = (a: number | string, b: number | string) => a === b;
export const funcNEQ = (a: number | string, b: number | string) => a !== b;
export const funcAND = (a: boolean, b: boolean) => a && b;
export const funcBT = (
  a: number | string,
  b: number | string,
  c: number | string
) => funcGT(a, b) && funcLT(a, c);
export const funcNBT = (
  a: number | string,
  b: number | string,
  c: number | string
) => !funcBT(a, b, c);
export const funcIN = (a: number | string, b: (number | string)[] | string) =>
  b.includes(a as string);
export const funcNIN = (a: number | string, b: (number | string)[] | string) =>
  !funcIN(a, b);
export const funcOR = (a: boolean, b: boolean) => a || b;
export const funcXOR = (a: boolean, b: boolean) => a !== b;

export const FUNCS = {
  GT: {
    arg_count: 1,
    arg_types: [["number", "string", "key"]],
    func: funcGT,
  },
  GTE: {
    arg_count: 1,
    arg_types: [["number", "string", "key"]],
    func: funcGTE,
  },
  NGT: {
    arg_count: 1,
    arg_types: [["number", "string", "key"]],
    func: funcNGT,
  },
  NGTE: {
    arg_count: 1,
    arg_types: [["number", "string", "key"]],
    func: funcNGTE,
  },
  LT: {
    arg_count: 1,
    arg_types: [["number", "string", "key"]],
    func: funcLT,
  },
  LTE: {
    arg_count: 1,
    arg_types: [["number", "string", "key"]],
    func: funcLTE,
  },
  NLT: {
    arg_count: 1,
    arg_types: [["number", "string", "key"]],
    func: funcNLT,
  },
  NLTE: {
    arg_count: 1,
    arg_types: [["number", "string", "key"]],
    func: funcNLTE,
  },
  EQ: {
    arg_count: 1,
    arg_types: [["number", "string", "key", "boolean"]],
    func: funcEQ,
  },
  NEQ: {
    arg_count: 1,
    arg_types: [["number", "string", "key", "boolean"]],
    func: funcNEQ,
  },
  AND: {
    arg_count: 1,
    arg_types: [["number", "string", "key", "boolean"]],
    func: funcAND,
  },
  BT: {
    arg_count: 2,
    arg_types: [
      ["number", "string", "key"],
      ["number", "string", "key"],
    ],
    func: funcBT,
  },
  NBT: {
    arg_count: 2,
    arg_types: [
      ["number", "string", "key"],
      ["number", "string", "key"],
    ],
    func: funcNBT,
  },
  IN: {
    arg_count: 1,
    arg_types: [["key"]],
    func: funcIN,
  },
  NIN: {
    arg_count: 1,
    arg_types: [["key"]],
    func: funcNIN,
  },
  OR: {
    arg_count: 1,
    arg_types: [["key", "boolean"]],
    func: funcOR,
  },
  XOR: {
    arg_count: 1,
    arg_types: [["key", "boolean"]],
    func: funcXOR,
  },
};
export const FUNC_NAMES = Object.keys(FUNCS);

// regex to handle the following:

// regex that matches GT, GTE, NGT, NGTE, LT, LTE, NLT, NLTE, EQ, NEQ, AND, BT, NBT, IN, NIN, OR, XOR
