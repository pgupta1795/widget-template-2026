import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/widget/api', () => ({
  getAPIs: vi.fn(),
  getWidget: vi.fn(),
}));

import { getAPIs, getWidget } from '@/lib/widget/api';
import { getPlatformUrls, is3DXUrl, resetPlatformResolver } from '../core/platform-resolver';

const mockServices = {
  getPlatformServices: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  resetPlatformResolver(); // clear singleton cache between tests
  vi.mocked(getWidget).mockReturnValue({ getValue: () => 'OnPremise' } as any);
  vi.mocked(getAPIs).mockReturnValue({ i3DXCompassServices: mockServices } as any);
});

describe('getPlatformUrls', () => {
  it('resolves 3DX platform URL map on first call', async () => {
    mockServices.getPlatformServices.mockImplementation(({ onComplete }: any) => {
      onComplete([{ '3DSpace': 'https://3dspace.example.com', '3DCompass': 'https://compass.example.com' }]);
    });

    const urls = await getPlatformUrls();
    expect(urls['3DSpace']).toBe('https://3dspace.example.com');
    expect(urls['3DCompass']).toBe('https://compass.example.com');
  });

  it('returns cached result on second call without re-fetching', async () => {
    mockServices.getPlatformServices.mockImplementation(({ onComplete }: any) => {
      onComplete([{ '3DSpace': 'https://3dspace.example.com' }]);
    });

    await getPlatformUrls();
    await getPlatformUrls();

    expect(mockServices.getPlatformServices).toHaveBeenCalledTimes(1);
  });

  it('rejects when onFailure is called', async () => {
    mockServices.getPlatformServices.mockImplementation(({ onFailure }: any) => {
      onFailure(new Error('network error'));
    });

    await expect(getPlatformUrls()).rejects.toThrow('network error');
  });
});

describe('is3DXUrl', () => {
  it('returns true for URLs starting with a known platform URL', async () => {
    mockServices.getPlatformServices.mockImplementation(({ onComplete }: any) => {
      onComplete([{ '3DSpace': 'https://3dspace.example.com' }]);
    });

    expect(await is3DXUrl('https://3dspace.example.com/resources/v1/application/CSRF')).toBe(true);
  });

  it('returns false for external URLs', async () => {
    mockServices.getPlatformServices.mockImplementation(({ onComplete }: any) => {
      onComplete([{ '3DSpace': 'https://3dspace.example.com' }]);
    });

    expect(await is3DXUrl('https://api.external.com/data')).toBe(false);
  });
});
