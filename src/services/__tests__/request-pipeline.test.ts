import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/waf-transport', () => ({
  wafAuthenticatedRequest: vi.fn(),
  wafProxifiedRequest: vi.fn(),
}));
vi.mock('../core/csrf-manager', () => ({
  getToken: vi.fn(),
  invalidate: vi.fn(),
}));

import { wafAuthenticatedRequest, wafProxifiedRequest } from '../core/waf-transport';
import { getToken, invalidate } from '../core/csrf-manager';
import { ServiceError } from '../types';
import { executePipeline } from '../http/request-pipeline';

const okResponse = { data: 'result', status: 200, statusText: 'OK', headers: {}, time: 5, size: 10 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(wafAuthenticatedRequest).mockResolvedValue(okResponse as any);
  vi.mocked(wafProxifiedRequest).mockResolvedValue(okResponse as any);
  vi.mocked(getToken).mockResolvedValue({ name: 'ENO_CSRF_TOKEN', value: 'tok123' });
});

describe('executePipeline — transport selection', () => {
  it('uses authenticatedRequest for 3DX URLs by default', async () => {
    await executePipeline('GET', 'https://3dspace.example.com/api', {}, {});
    expect(wafAuthenticatedRequest).toHaveBeenCalled();
    expect(wafProxifiedRequest).not.toHaveBeenCalled();
  });

  it('uses authenticatedRequest even for non-3DX URLs when useProxy is not set', async () => {
    await executePipeline('GET', 'https://external.example.com/api', {}, {});
    expect(wafAuthenticatedRequest).toHaveBeenCalled();
  });

  it('uses proxifiedRequest when useProxy is true', async () => {
    await executePipeline('GET', 'https://external.example.com/api', { useProxy: true }, {});
    expect(wafProxifiedRequest).toHaveBeenCalled();
    expect(wafAuthenticatedRequest).not.toHaveBeenCalled();
  });
});

describe('executePipeline — URL building', () => {
  it('appends params to URL as query string', async () => {
    await executePipeline('GET', 'https://3dspace.example.com/api', { params: { foo: 'bar', baz: '1' } }, {});
    expect(wafAuthenticatedRequest).toHaveBeenCalledWith(
      expect.stringContaining('foo=bar'),
      expect.any(Object)
    );
  });
});

describe('executePipeline — CSRF injection', () => {
  it('injects CSRF header for POST requests', async () => {
    await executePipeline('POST', 'https://3dspace.example.com/api', {}, {});
    expect(getToken).toHaveBeenCalled();
    expect(wafAuthenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ ENO_CSRF_TOKEN: 'tok123' }),
      })
    );
  });

  it('does NOT inject CSRF for GET requests', async () => {
    await executePipeline('GET', 'https://3dspace.example.com/api', {}, {});
    expect(getToken).not.toHaveBeenCalled();
  });

  it('uses csrfOverride when provided, skipping getToken()', async () => {
    await executePipeline('POST', 'https://3dspace.example.com/api', { csrfOverride: 'my-token' }, {});
    expect(getToken).not.toHaveBeenCalled();
    expect(wafAuthenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ ENO_CSRF_TOKEN: 'my-token' }),
      })
    );
  });

  it('invalidates CSRF and retries on 403', async () => {
    const csrfErr = new ServiceError(403, 'Forbidden', null, {});
    vi.mocked(wafAuthenticatedRequest)
      .mockRejectedValueOnce(csrfErr)
      .mockResolvedValue(okResponse as any);

    const result = await executePipeline('POST', 'https://3dspace.example.com/api', {}, { retry: { maxAttempts: 2 } });
    expect(invalidate).toHaveBeenCalled();
    expect(wafAuthenticatedRequest).toHaveBeenCalledTimes(2);
    expect(result.data).toBe('result');
  });
});

describe('executePipeline — default headers', () => {
  it('merges defaultHeaders from ServiceConfig into request', async () => {
    await executePipeline('GET', 'https://3dspace.example.com/api', {}, { defaultHeaders: { 'X-App': 'widget' } });
    expect(wafAuthenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ 'X-App': 'widget' }) })
    );
  });
});

describe('executePipeline — defaultTimeout', () => {
  it('applies config.defaultTimeout when opts.timeout is not set', async () => {
    await executePipeline('GET', 'https://3dspace.example.com/api', {}, { defaultTimeout: 15000 });
    expect(wafAuthenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeout: 15000 })
    );
  });

  it('uses opts.timeout over config.defaultTimeout when both provided', async () => {
    await executePipeline('GET', 'https://3dspace.example.com/api', { timeout: 5000 }, { defaultTimeout: 15000 });
    expect(wafAuthenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeout: 5000 })
    );
  });
});
