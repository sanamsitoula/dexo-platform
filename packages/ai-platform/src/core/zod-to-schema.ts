import { z } from 'zod';

/**
 * Minimal Zod → JSON Schema converter — covers the subset of Zod actually
 * used by Dexo AI tools (object/string/number/boolean/enum/array/optional).
 * Avoids pulling in the full `zod-to-json-schema` package for a handful of
 * simple tool-argument shapes.
 */
export function zodToJsonSchema(schema: z.ZodType<any>): Record<string, any> {
  const def = (schema as any)._def;

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType<any>>;
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);
      if (!value.isOptional()) required.push(key);
    }
    return { type: 'object', properties, ...(required.length ? { required } : {}) };
  }
  if (schema instanceof z.ZodString) {
    const desc = def.description;
    return { type: 'string', ...(desc ? { description: desc } : {}) };
  }
  if (schema instanceof z.ZodNumber) return { type: 'number' };
  if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
  if (schema instanceof z.ZodEnum) return { type: 'string', enum: def.values };
  if (schema instanceof z.ZodArray) return { type: 'array', items: zodToJsonSchema(def.type) };
  if (schema instanceof z.ZodOptional) return zodToJsonSchema(def.innerType);
  if (schema instanceof z.ZodDefault) return zodToJsonSchema(def.innerType);
  return { type: 'string' };
}
