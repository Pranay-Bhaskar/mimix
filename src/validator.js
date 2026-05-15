/**
 * src/validator.js
 * Translates JSON Schema configurations into executable Zod schemas.
 */
import { z } from 'zod';

export function buildZodSchema(jsonSchema) {
  if (!jsonSchema ||!jsonSchema.type) {
    return z.any(); 
  }

  switch (jsonSchema.type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'array':
      if (jsonSchema.items) {
        return z.array(buildZodSchema(jsonSchema.items));
      }
      return z.array(z.any());
    case 'object':
      const shape = {};
      if (jsonSchema.properties) {
        for (const [key, value] of Object.entries(jsonSchema.properties)) {
          let fieldSchema = buildZodSchema(value);
          
          if (!jsonSchema.required ||!jsonSchema.required.includes(key)) {
            fieldSchema = fieldSchema.optional();
          }
          shape[key] = fieldSchema;
        }
      }
      return z.object(shape).strict(); 
    default:
      return z.any();
  }
}