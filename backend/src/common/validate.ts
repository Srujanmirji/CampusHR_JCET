import type { z } from 'zod';
import { HttpError } from './http-error.js';

// Parses input or answers 400 with the first problem.
export function parse<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0]!;
    const field = issue.path.join('.');
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      field ? `${field}: ${issue.message}` : issue.message,
    );
  }
  return result.data;
}
