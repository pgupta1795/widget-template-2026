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

export async function get3DSpaceUrl(): Promise<string> {
  const urls = await getPlatformUrls();
  const spaceUrl = urls['3DSpace'];
  if (!spaceUrl) throw new Error('3DSpace URL not found in platform services');
  return spaceUrl;
}