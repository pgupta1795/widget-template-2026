import {getAPIs,getWidget} from '@/lib/widget/api';

let cache: PlatformServices | null = null;
let pending: Promise<PlatformServices> | null = null;

type PlatformServices = {
  '3DSpace': string;
  '3DSwym': string;
  '3DPassport': string;
  '3DCompass': string;
  displayName: string;
  platformId: string;
}

function getPlatformUrls(): Promise<PlatformServices> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;

  const { i3DXCompassServices } = getAPIs();
  const widget = getWidget();
  const tenant = widget.getValue('tenant') || 'OnPremise';

  pending = new Promise<PlatformServices>((resolve, reject) => {
    i3DXCompassServices.getPlatformServices({
      platformId: tenant,
      onComplete(data: PlatformServices) {
        const services: PlatformServices = Array.isArray(data) ? data[0] : data;
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

export async function getPlatformURL(url: '3DSpace' | '3DSwym' | '3DPassport' | '3DCompass') {
  const urls = await getPlatformUrls();
  const spaceUrl = urls[url];
  if (!spaceUrl) throw new Error(`${url} URL not found in platform services`);
  return spaceUrl;
}