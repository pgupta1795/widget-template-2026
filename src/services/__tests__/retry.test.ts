import { describe, expect, it, vi } from 'vitest';
import { ServiceError } from '../types';
import { withRetry } from '../core/retry';

describe('withRetry', () => {
  it('resolves immediately if fn succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries up to maxAttempts when shouldRetry returns true', async () => {
    const err = new ServiceError(403, 'Forbidden', null, {});
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { maxAttempts: 3, delayMs: 0 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after maxAttempts are exhausted', async () => {
    const err = new ServiceError(403, 'Forbidden', null, {});
    const fn = vi.fn().mockRejectedValue(err);

    await expect(withRetry(fn, { maxAttempts: 2, delayMs: 0 })).rejects.toBeInstanceOf(ServiceError);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry when shouldRetry returns false', async () => {
    const err = new ServiceError(500, 'Server Error', null, {});
    const fn = vi.fn().mockRejectedValue(err);

    await expect(
      withRetry(fn, { maxAttempts: 3, shouldRetry: () => false, delayMs: 0 })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses isCsrfExpiry as default shouldRetry', async () => {
    const csrfErr = new ServiceError(403, 'Forbidden', null, {});
    const otherErr = new ServiceError(500, 'Error', null, {});
    const fn = vi.fn()
      .mockRejectedValueOnce(csrfErr)  // should retry
      .mockRejectedValue(otherErr);    // should NOT retry

    await expect(withRetry(fn, { maxAttempts: 3, delayMs: 0 })).rejects.toBeInstanceOf(ServiceError);
    // Called twice: first (403 → retry), second (500 → stop)
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('waits delayMs between retries', async () => {
    vi.useFakeTimers();
    const err = new ServiceError(403, 'Forbidden', null, {});
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxAttempts: 2, delayMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result).toBe('ok');
    vi.useRealTimers();
  });
});
