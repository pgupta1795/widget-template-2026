import { ServiceError, type RetryConfig } from '../types';

const DEFAULT_SHOULD_RETRY = (error: ServiceError) => error.isCsrfExpiry;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
): Promise<T> {
  const { maxAttempts, shouldRetry = DEFAULT_SHOULD_RETRY, delayMs = 0 } = config;
  let lastError: ServiceError;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      attempts++;
      if (!(err instanceof ServiceError)) throw err;
      lastError = err;
      if (attempts >= maxAttempts || !shouldRetry(err)) throw err;
      if (delayMs > 0) await delay(delayMs);
    }
  }

  throw lastError!;
}
