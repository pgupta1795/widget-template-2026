import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/widget/api', () => ({
  getAPIs: vi.fn(),
  getWidget: vi.fn(),
}));
vi.mock('../core/platform-resolver', () => ({
  getPlatformUrls: vi.fn(),
}));
vi.mock('../core/waf-transport', () => ({
  wafAuthenticatedRequest: vi.fn(),
}));

import { getAPIs, getWidget } from '@/lib/widget/api';
import { getPlatformUrls } from '../core/platform-resolver';
import { wafAuthenticatedRequest } from '../core/waf-transport';
import { getToken, invalidate, resetCsrfManager } from '../core/csrf-manager';

beforeEach(() => {
  vi.clearAllMocks();
  resetCsrfManager();
  vi.mocked(getPlatformUrls).mockResolvedValue({ '3DSpace': 'https://3dspace.example.com' });
  vi.mocked(getWidget).mockReturnValue({ getValue: () => null } as any);
  vi.mocked(getAPIs).mockReturnValue({} as any);
});

describe('getToken', () => {
  it('fetches and returns CSRF token', async () => {
    vi.mocked(wafAuthenticatedRequest).mockResolvedValue({
      data: { csrf: { name: 'ENO_CSRF_TOKEN', value: 'abc123' } },
      status: 200, statusText: 'OK', headers: {}, time: 10, size: 50,
    });

    const token = await getToken();
    expect(token).toEqual({ name: 'ENO_CSRF_TOKEN', value: 'abc123' });
    expect(wafAuthenticatedRequest).toHaveBeenCalledWith(
      'https://3dspace.example.com/resources/v1/application/CSRF',
      expect.objectContaining({ type: 'json' })
    );
  });

  it('returns cached token on second call without re-fetching', async () => {
    vi.mocked(wafAuthenticatedRequest).mockResolvedValue({
      data: { csrf: { name: 'ENO_CSRF_TOKEN', value: 'abc123' } },
      status: 200, statusText: 'OK', headers: {}, time: 10, size: 50,
    });

    await getToken();
    await getToken();
    expect(wafAuthenticatedRequest).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after invalidate()', async () => {
    vi.mocked(wafAuthenticatedRequest).mockResolvedValue({
      data: { csrf: { name: 'ENO_CSRF_TOKEN', value: 'abc123' } },
      status: 200, statusText: 'OK', headers: {}, time: 10, size: 50,
    });

    await getToken();
    invalidate();
    await getToken();
    expect(wafAuthenticatedRequest).toHaveBeenCalledTimes(2);
  });

  it('rejects if CSRF fetch fails', async () => {
    const { ServiceError } = await import('../types');
    vi.mocked(wafAuthenticatedRequest).mockRejectedValue(
      new ServiceError(500, 'Internal Server Error', null, {})
    );

    await expect(getToken()).rejects.toThrow('500 Internal Server Error');
  });

  it('allows re-fetch after a failed getToken()', async () => {
    const { ServiceError } = await import('../types');
    vi.mocked(wafAuthenticatedRequest)
      .mockRejectedValueOnce(new ServiceError(500, 'Internal Server Error', null, {}))
      .mockResolvedValue({
        data: { csrf: { name: 'ENO_CSRF_TOKEN', value: 'fresh123' } },
        status: 200, statusText: 'OK', headers: {}, time: 10, size: 50,
      });

    await expect(getToken()).rejects.toThrow('500 Internal Server Error');
    // After failure, pending should be cleared — next call should succeed
    const token = await getToken();
    expect(token).toEqual({ name: 'ENO_CSRF_TOKEN', value: 'fresh123' });
    expect(wafAuthenticatedRequest).toHaveBeenCalledTimes(2);
  });
});
