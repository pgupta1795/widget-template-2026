import { describe, expect, it } from 'vitest';
import { ServiceError } from '../types';

describe('ServiceError', () => {
  it('constructs with status, statusText, response, headers', () => {
    const err = new ServiceError(403, 'Forbidden', { error: 'csrf' }, { 'x-csrf': 'abc' });
    expect(err.status).toBe(403);
    expect(err.statusText).toBe('Forbidden');
    expect(err.response).toEqual({ error: 'csrf' });
    expect(err.headers).toEqual({ 'x-csrf': 'abc' });
    expect(err.message).toBe('403 Forbidden');
  });

  it('isCsrfExpiry is true for 403', () => {
    const err = new ServiceError(403, 'Forbidden', null, {});
    expect(err.isCsrfExpiry).toBe(true);
    expect(err.isUnauthorized).toBe(false);
    expect(err.isTimeout).toBe(false);
  });

  it('isUnauthorized is true for 401', () => {
    const err = new ServiceError(401, 'Unauthorized', null, {});
    expect(err.isUnauthorized).toBe(true);
    expect(err.isCsrfExpiry).toBe(false);
  });

  it('isTimeout is true for 408', () => {
    const err = new ServiceError(408, 'Timeout', null, {});
    expect(err.isTimeout).toBe(true);
  });

  it('is an instance of Error', () => {
    const err = new ServiceError(500, 'Internal Server Error', null, {});
    expect(err).toBeInstanceOf(Error);
  });
});
