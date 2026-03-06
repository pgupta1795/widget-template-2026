import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the platform API registry
vi.mock('@/lib/widget/api', () => ({
  getAPIs: vi.fn(),
}));

import { getAPIs } from '@/lib/widget/api';
import { ServiceError } from '../types';
import { wafAuthenticatedRequest, wafProxifiedRequest } from '../core/waf-transport';

const mockWAFData = {
  authenticatedRequest: vi.fn(),
  proxifiedRequest: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAPIs).mockReturnValue({ WAFData: mockWAFData } as any);
});

describe('wafAuthenticatedRequest', () => {
  it('resolves with ServiceResponse on onComplete', async () => {
    mockWAFData.authenticatedRequest.mockImplementation((_url: string, opts: any) => {
      opts.onComplete('{"ok":true}', { 'content-type': 'application/json' });
      return { cancel: vi.fn(), xhr: {} };
    });

    const result = await wafAuthenticatedRequest('https://3dspace.example.com/api', { type: 'json' });

    expect(result.data).toBe('{"ok":true}');
    expect(result.status).toBe(200);
    expect(result.statusText).toBe('OK');
    expect(result.headers).toEqual({ 'content-type': 'application/json' });
    expect(result.time).toBeGreaterThanOrEqual(0);
    expect(result.size).toBeGreaterThan(0);
  });

  it('rejects with ServiceError on onFailure', async () => {
    mockWAFData.authenticatedRequest.mockImplementation((_url: string, opts: any) => {
      const err = Object.assign(new Error('Forbidden'), { status: 403 });
      opts.onFailure(err, '{"error":"csrf"}', { 'x-error': 'csrf' });
      return { cancel: vi.fn(), xhr: {} };
    });

    await expect(
      wafAuthenticatedRequest('https://3dspace.example.com/api', {})
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('rejects with ServiceError on onTimeout', async () => {
    mockWAFData.authenticatedRequest.mockImplementation((_url: string, opts: any) => {
      opts.onTimeout();
      return { cancel: vi.fn(), xhr: {} };
    });

    const err = await wafAuthenticatedRequest('https://3dspace.example.com/api', {}).catch(e => e);
    expect(err).toBeInstanceOf(ServiceError);
    expect(err.status).toBe(408);
  });

  it('rejects with ServiceError(401) on onPassportError', async () => {
    mockWAFData.authenticatedRequest.mockImplementation((_url: string, opts: any) => {
      opts.onPassportError(new Error('Passport error'));
      return { cancel: vi.fn(), xhr: {} };
    });

    const err = await wafAuthenticatedRequest('https://3dspace.example.com/api', {}).catch(e => e);
    expect(err).toBeInstanceOf(ServiceError);
    expect(err.status).toBe(401);
  });

  it('passes onProgress callback to WAFData', async () => {
    const onProgress = vi.fn();
    mockWAFData.authenticatedRequest.mockImplementation((_url: string, opts: any) => {
      opts.onComplete('ok', {});
      return { cancel: vi.fn(), xhr: {} };
    });

    await wafAuthenticatedRequest('https://3dspace.example.com/api', { onProgress });
    expect(mockWAFData.authenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ onProgress })
    );
  });
});

describe('wafProxifiedRequest', () => {
  it('resolves with ServiceResponse on onComplete', async () => {
    mockWAFData.proxifiedRequest.mockImplementation((_url: string, opts: any) => {
      opts.onComplete('hello', {});
      return { cancel: vi.fn(), xhr: {} };
    });

    const result = await wafProxifiedRequest('https://external.example.com/api', { proxyType: 'ajax' });
    expect(result.data).toBe('hello');
    expect(result.status).toBe(200);
  });

  it('rejects with ServiceError on onFailure', async () => {
    mockWAFData.proxifiedRequest.mockImplementation((_url: string, opts: any) => {
      const err = Object.assign(new Error('Bad request'), { status: 400 });
      opts.onFailure(err, null, {});
      return { cancel: vi.fn(), xhr: {} };
    });

    const err = await wafProxifiedRequest('https://external.example.com/api', {}).catch(e => e);
    expect(err).toBeInstanceOf(ServiceError);
    expect(err.status).toBe(400);
  });

  it('rejects with ServiceError(408) on onTimeout', async () => {
    mockWAFData.proxifiedRequest.mockImplementation((_url: string, opts: any) => {
      opts.onTimeout();
      return { cancel: vi.fn(), xhr: {} };
    });

    const err = await wafProxifiedRequest('https://external.example.com/api', {}).catch(e => e);
    expect(err).toBeInstanceOf(ServiceError);
    expect(err.status).toBe(408);
  });

  it('passes proxy option to WAFData', async () => {
    mockWAFData.proxifiedRequest.mockImplementation((_url: string, opts: any) => {
      opts.onComplete('', {});
      return { cancel: vi.fn(), xhr: {} };
    });

    await wafProxifiedRequest('https://external.example.com/api', { proxyType: 'feed' });
    expect(mockWAFData.proxifiedRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ proxy: 'feed' })
    );
  });
});
