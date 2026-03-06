import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../http/request-pipeline', () => ({
  executePipeline: vi.fn(),
}));

import { executePipeline } from '../http/request-pipeline';
import { createHttpClient } from '../http/client';

const ok = { data: 'ok', status: 200, statusText: 'OK', headers: {}, time: 5, size: 2 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(executePipeline).mockResolvedValue(ok as any);
});

describe('createHttpClient', () => {
  it('get() calls executePipeline with GET method', async () => {
    const client = createHttpClient();
    await client.get('https://example.com/api');
    expect(executePipeline).toHaveBeenCalledWith('GET', 'https://example.com/api', {}, expect.any(Object));
  });

  it('post() calls executePipeline with POST and serializes body into opts.data', async () => {
    const client = createHttpClient();
    const body = { name: 'test' };
    await client.post('https://example.com/api', body);
    expect(executePipeline).toHaveBeenCalledWith(
      'POST',
      'https://example.com/api',
      expect.objectContaining({ data: JSON.stringify(body) }),
      expect.any(Object)
    );
  });

  it('post() does not override Content-Type if caller already set it', async () => {
    const client = createHttpClient();
    await client.post('https://example.com/api', { x: 1 }, { headers: { 'Content-Type': 'text/plain' } });
    expect(executePipeline).toHaveBeenCalledWith(
      'POST',
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'text/plain' }) }),
      expect.any(Object)
    );
  });

  it('put(), patch(), delete() pass correct methods', async () => {
    const client = createHttpClient();
    await client.put('https://example.com/api', {});
    expect(executePipeline).toHaveBeenCalledWith('PUT', expect.any(String), expect.any(Object), expect.any(Object));

    await client.patch('https://example.com/api', {});
    expect(executePipeline).toHaveBeenCalledWith('PATCH', expect.any(String), expect.any(Object), expect.any(Object));

    await client.delete('https://example.com/api');
    expect(executePipeline).toHaveBeenCalledWith('DELETE', expect.any(String), expect.any(Object), expect.any(Object));
  });

  it('execute() passes method and opts directly', async () => {
    const client = createHttpClient();
    await client.execute('PATCH', 'https://example.com/api', { timeout: 5000 });
    expect(executePipeline).toHaveBeenCalledWith('PATCH', 'https://example.com/api', { timeout: 5000 }, expect.any(Object));
  });

  it('merges ServiceConfig defaults into pipeline calls', async () => {
    const client = createHttpClient({ defaultTimeout: 10000, defaultHeaders: { 'X-App': 'widget' } });
    await client.get('https://example.com/api');
    expect(executePipeline).toHaveBeenCalledWith(
      'GET',
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ defaultTimeout: 10000, defaultHeaders: { 'X-App': 'widget' } })
    );
  });
});
