import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../http/client', () => ({
  httpClient: {
    get: vi.fn(),
    execute: vi.fn(),
  },
}));

import { httpClient } from '../http/client';
import { useWafMutation } from '../hooks/use-waf-mutation';
import { useWafQuery } from '../hooks/use-waf-query';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const ok = { data: { id: 1 }, status: 200, statusText: 'OK', headers: {}, time: 5, size: 10 };

beforeEach(() => vi.clearAllMocks());

describe('useWafQuery', () => {
  it('fetches data via httpClient.get and returns it', async () => {
    vi.mocked(httpClient.get).mockResolvedValue(ok as any);

    const { result } = renderHook(
      () => useWafQuery('https://example.com/api'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toEqual({ id: 1 });
    expect(httpClient.get).toHaveBeenCalledWith('https://example.com/api', expect.any(Object));
  });

  it('is disabled when enabled: false', () => {
    const { result } = renderHook(
      () => useWafQuery('https://example.com/api', { enabled: false }),
      { wrapper }
    );
    expect(result.current.isPending).toBe(true);
    expect(httpClient.get).not.toHaveBeenCalled();
  });
});

describe('useWafMutation', () => {
  it('calls httpClient.execute with correct method and body', async () => {
    vi.mocked(httpClient.execute).mockResolvedValue(ok as any);

    const { result } = renderHook(
      () => useWafMutation('POST', 'https://example.com/api'),
      { wrapper }
    );

    result.current.mutate({ name: 'test' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(httpClient.execute).toHaveBeenCalledWith(
      'POST',
      'https://example.com/api',
      expect.objectContaining({ data: { name: 'test' } })
    );
  });
});
