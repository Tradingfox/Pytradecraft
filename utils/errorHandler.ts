export interface ApiError {
  message: string;
  code?: string | number;
  details?: unknown;
}

export class AppError extends Error {
  code?: string | number;
  details?: unknown;

  constructor(message: string, code?: string | number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  errorMessage: string = 'An error occurred'
): Promise<{ data?: T; error?: ApiError }> => {
  try {
    const data = await operation();
    return { data };
  } catch (err) {
    const error: ApiError = {
      message: errorMessage,
      details: err
    };

    if (err instanceof Error) {
      error.message = err.message || errorMessage;
    }

    if (err && typeof err === 'object' && 'code' in err) {
      error.code = (err as { code: string | number }).code;
    }

    console.error(`${errorMessage}:`, err);
    return { error };
  }
};

export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new AppError(errorMessage, 'TIMEOUT')), timeoutMs)
    )
  ]);
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  exponentialBackoff: boolean = true
): Promise<T> => {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;

      if (attempt < maxRetries - 1) {
        const delay = exponentialBackoff ? delayMs * Math.pow(2, attempt) : delayMs;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

export const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    if ('message' in error) {
      return String(error.message);
    }
    return JSON.stringify(error);
  }

  return 'An unknown error occurred';
};
