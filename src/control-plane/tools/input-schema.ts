export type InputField = {
  path: string;
  type: "string" | "number" | "integer" | "boolean" | "array" | "object" | "enum" | "unknown";
  required: boolean;
  description?: string;
  enum?: string[];
};

const schemas = new Map<string, unknown>();
type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object" ? value as RecordValue : null;
}

function definition(value: unknown): RecordValue {
  const current = record(value);
  return record(current?._def) ?? record(current?.def) ?? {};
}

export function registerToolInputSchema(name: string, schema: unknown) {
  if (schema !== undefined) schemas.set(name, schema);
}

function schemaType(schema: unknown): InputField["type"] {
  const current = record(schema);
  if (!current) return "unknown";
  const def = definition(schema);
  const typeName = String(def.typeName ?? def.type ?? current.typeName ?? current.type ?? "");
  if (Array.isArray(current.enum) || Array.isArray(current.options)) return "enum";
  if (typeName === "ZodString" || typeName === "string") return "string";
  if (typeName === "ZodBoolean" || typeName === "boolean") return "boolean";
  if (typeName === "integer") return "integer";
  if (typeName === "ZodNumber" || typeName === "number") {
    const checks = Array.isArray(def.checks) ? def.checks : [];
    const integer = checks.some((check) => {
      const checkRecord = record(check);
      const checkDef = record(checkRecord?.def) ?? {};
      return checkRecord?.kind === "int" || checkRecord?.type === "number" && checkDef.format === "safeint";
    });
    return integer ? "integer" : "number";
  }
  if (typeName === "ZodArray" || typeName === "array") return "array";
  if (typeName === "ZodObject" || typeName === "object") return "object";
  if (typeName === "ZodEnum" || typeName === "ZodNativeEnum" || typeName === "enum") return "enum";
  if (["ZodOptional", "ZodDefault", "ZodNullable", "ZodReadonly", "ZodBranded", "ZodCatch", "ZodEffects", "optional", "default", "nullable", "readonly", "pipe", "transform"].includes(typeName)) {
    return schemaType(def.innerType ?? def.schema ?? def.in);
  }
  return "unknown";
}

function unwrap(schema: unknown): unknown {
  let current = schema;
  for (let i = 0; i < 8; i++) {
    const currentRecord = record(current);
    if (!currentRecord) break;
    const def = definition(current);
    const typeName = String(def.typeName ?? def.type ?? currentRecord.typeName ?? currentRecord.type ?? "");
    if (["ZodOptional", "ZodDefault", "ZodNullable", "ZodReadonly", "ZodBranded", "ZodCatch", "optional", "default", "nullable", "readonly", "catch"].includes(typeName)) {
      current = def.innerType ?? def.schema;
    } else if (["ZodEffects", "transform", "pipe"].includes(typeName)) {
      current = def.schema ?? def.in ?? def.innerType;
    } else {
      break;
    }
  }
  return current;
}

function shapeOf(schema: unknown): RecordValue | null {
  const current = record(unwrap(schema));
  if (!current) return null;
  const def = definition(current);
  const typeName = String(def.typeName ?? def.type ?? current.typeName ?? current.type ?? "");
  if (record(current.properties)) return record(current.properties);
  if (typeName === "ZodObject" || typeName === "object") {
    const shape = typeof def.shape === "function" ? (def.shape as () => unknown)() : def.shape;
    return record(shape);
  }
  // MCP tools commonly pass a Zod raw shape instead of a ZodObject.
  if (Object.values(current).some((value) => {
    const child = record(value);
    return !!child && (!!child._def || !!child.def);
  })) return current;
  return null;
}

function isOptional(schema: unknown): boolean {
  const current = record(schema);
  if (!current) return false;
  const def = definition(schema);
  const typeName = String(def.typeName ?? def.type ?? current.typeName ?? current.type ?? "");
  return ["ZodOptional", "ZodDefault", "optional", "default"].includes(typeName) || current.required === false;
}

function enumValues(schema: unknown): string[] | undefined {
  const current = record(unwrap(schema));
  if (!current) return undefined;
  const def = definition(current);
  const values = def.values ?? def.entries ?? current.options ?? current.enum;
  if (Array.isArray(values)) {
    const strings = values.filter((value): value is string => typeof value === "string");
    return strings.length ? strings : undefined;
  }
  if (values && typeof values === "object") {
    const strings = Object.values(values).filter((value): value is string => typeof value === "string");
    return strings.length ? [...new Set(strings)] : undefined;
  }
  return undefined;
}

export function getToolInputFields(name: string): InputField[] {
  const root = schemas.get(name);
  if (!root) return [];
  const result: InputField[] = [];
  const visit = (schema: unknown, prefix: string, depth: number, parentRequired: boolean) => {
    if (depth > 4 || result.length >= 100) return;
    const unwrapped = record(unwrap(schema));
    const shape = shapeOf(schema);
    if (!shape) return;
    const jsonRequired = Array.isArray(unwrapped?.required) ? unwrapped.required.filter((item): item is string => typeof item === "string") : null;
    const isJsonSchema = !!record(unwrapped?.properties);
    for (const [key, child] of Object.entries(shape)) {
      if (!/^[A-Za-z0-9_$-]+$/.test(key) || ["__proto__", "prototype", "constructor"].includes(key)) continue;
      const path = prefix ? prefix + "." + key : key;
      const type = schemaType(child);
      const optional = isOptional(child) || (isJsonSchema && !jsonRequired?.includes(key));
      const values = enumValues(child);
      const childRecord = record(child);
      const childDef = definition(child);
      const description = typeof childRecord?.description === "string" ? childRecord.description : typeof childDef.description === "string" ? childDef.description : undefined;
      result.push({ path, type, required: parentRequired && !optional, ...(description ? { description } : {}), ...(values ? { enum: values } : {}) });
      if (type === "object") visit(child, path, depth + 1, parentRequired && !optional);
    }
  };
  visit(root, "", 0, true);
  return result;
}

export function hasToolInputField(name: string, path: string): boolean {
  return getToolInputFields(name).some((field) => field.path === path);
}

export function validateCustomRuleFields(rule: { conditions: { field: string }[] }, toolNames: string[]): string | null {
  for (const condition of rule.conditions) {
    if (!condition.field.startsWith("args.")) continue;
    const path = condition.field.slice(5);
    for (const name of toolNames) {
      if (!hasToolInputField(name, path)) return "Field " + condition.field + " tidak tersedia pada tool " + name;
    }
  }
  return null;
}
