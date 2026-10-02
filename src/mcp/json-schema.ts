import { z } from "zod";

type JsonSchema = Record<string, any>;

export function jsonSchemaToZod(schema: JsonSchema): z.ZodType {
  if (!schema || typeof schema !== "object") return z.any();

  if (schema.const !== undefined) return z.literal(schema.const as any);
  if (Array.isArray(schema.enum)) {
    if (schema.enum.length === 0) return z.never();
    if (schema.enum.every((value: unknown) => typeof value === "string")) {
      return z.enum(schema.enum as [string, ...string[]]);
    }
    return z.union(schema.enum.map((value: unknown) => z.literal(value as any)) as any);
  }

  if (Array.isArray(schema.anyOf)) {
    return z.union(schema.anyOf.map((item: JsonSchema) => jsonSchemaToZod(item)) as any);
  }
  if (Array.isArray(schema.oneOf)) {
    return z.union(schema.oneOf.map((item: JsonSchema) => jsonSchemaToZod(item)) as any);
  }
  if (Array.isArray(schema.allOf)) {
    return schema.allOf.reduce(
      (acc: z.ZodType, item: JsonSchema) => z.intersection(acc, jsonSchemaToZod(item)),
      z.any(),
    );
  }

  let value: any;
  switch (schema.type) {
    case "string":
      value = z.string();
      if (typeof schema.minLength === "number") value = value.min(schema.minLength);
      if (typeof schema.maxLength === "number") value = value.max(schema.maxLength);
      if (typeof schema.pattern === "string") value = value.regex(new RegExp(schema.pattern));
      break;
    case "integer":
      value = z.number().int();
      if (typeof schema.minimum === "number") value = value.min(schema.minimum);
      if (typeof schema.maximum === "number") value = value.max(schema.maximum);
      break;
    case "number":
      value = z.number();
      if (typeof schema.minimum === "number") value = value.min(schema.minimum);
      if (typeof schema.maximum === "number") value = value.max(schema.maximum);
      break;
    case "boolean":
      value = z.boolean();
      break;
    case "null":
      value = z.null();
      break;
    case "array":
      value = z.array(schema.items ? jsonSchemaToZod(schema.items) : z.any());
      if (typeof schema.minItems === "number") value = value.min(schema.minItems);
      if (typeof schema.maxItems === "number") value = value.max(schema.maxItems);
      break;
    case "object": {
      const shape: Record<string, z.ZodType> = {};
      for (const [name, property] of Object.entries(schema.properties ?? {})) {
        let field = jsonSchemaToZod(property as JsonSchema);
        if (!(schema.required ?? []).includes(name)) field = field.optional();
        shape[name] = field;
      }
      value = z.object(shape);
      if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        value = (value as any).catchall(jsonSchemaToZod(schema.additionalProperties));
      }
      break;
    }
    default:
      value = z.any();
      break;
  }

  if (schema.nullable === true) value = value.nullable();
  if (schema.description) value = value.describe(String(schema.description));
  if (schema.default !== undefined) value = value.default(schema.default as any);

  return value;
}
