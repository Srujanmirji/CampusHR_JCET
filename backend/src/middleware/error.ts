import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (res.headersSent) {
    _next(error);
    return;
  }
  const status =
    error && typeof error === 'object' && 'status' in error
      ? error.status
      : 500;
  const statusCode =
    typeof status === 'number' &&
    Number.isInteger(status) &&
    status >= 400 &&
    status <= 599
      ? status
      : 500;
  if (statusCode >= 500) console.error('API request failed', error);
  res.status(statusCode).json({
    error: {
      code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST',
      message:
        statusCode >= 500
          ? 'An unexpected error occurred.'
          : 'The request could not be processed.',
    },
  });
};
