import { getAPIs, getWidget } from '@/lib/widget/api';

let cache: Record<string, string> | null = null;
let pending: Promise<Record<string, string>> | null = null;

export function resetPlatformResolver(): void {
  cache = null;
  pending = null;
}

export function getPlatformUrls(): Promise<Record<string, string>> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;

  const { i3DXCompassServices } = getAPIs();
  const widget = getWidget();
  const tenant = widget.getValue('tenant') || 'OnPremise';

  pending = new Promise<Record<string, string>>((resolve, reject) => {
    (i3DXCompassServices as any).getPlatformServices({
      tenant,
      onComplete(data: any) {
        const services: Record<string, string> = Array.isArray(data) ? data[0] : data;
        cache = Object.freeze(services);
        pending = null;
        resolve(cache);
      },
      onFailure(err: Error) {
        pending = null;
        reject(err);
      },
    });
  });

  return pending;
}

export async function is3DXUrl(url: string): Promise<boolean> {
  const urls = await getPlatformUrls();
  return Object.values(urls).some(base => url.startsWith(base));
}
