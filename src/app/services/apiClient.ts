import type {EnvVariable,HttpMethod,KeyValue,ResponseData} from '@/lib/types/api';

function substituteVars(str: string, vars: EnvVariable[]): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const found = vars.find(v => v.key === key);
    return found ? found.value : `{{${key}}}`;
  });
}

export async function executeRequest(
  config: {
    method: HttpMethod;
    url: string;
    headers: KeyValue[];
    params: KeyValue[];
    body: string;
    bodyType: string;
  },
  envVars: EnvVariable[]
): Promise<ResponseData> {
  let url = substituteVars(config.url, envVars);

  const headers: Record<string, string> = {};
  config.headers.forEach(h => {
    if (h.enabled && h.key.trim()) {
      headers[substituteVars(h.key, envVars)] = substituteVars(h.value, envVars);
    }
  });

  // Build query params
  try {
    const urlObj = new URL(url);
    config.params.forEach(p => {
      if (p.enabled && p.key.trim()) {
        urlObj.searchParams.set(
          substituteVars(p.key, envVars),
          substituteVars(p.value, envVars)
        );
      }
    });
    url = urlObj.toString();
  } catch {
    // URL might be relative or invalid, continue anyway
  }

  let data: any = undefined;
  if (['POST', 'PUT', 'PATCH'].includes(config.method) && config.body.trim()) {
    const processed = substituteVars(config.body, envVars);
    if (config.bodyType === 'json') {
      try {
        data = JSON.parse(processed);
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
      } catch {
        data = processed;
      }
    } else {
      data = processed;
    }
  }

  const start = performance.now();

  try {
    const response = await fetch(url, {
		method: config.method.toLowerCase() as any,
		headers,
		body: data
	})

    const time = Math.round(performance.now() - start);
    const responseData = response.text;
    const size = new Blob([typeof responseData === 'string' ? responseData : JSON.stringify(responseData)]).size;

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(
        Object.entries(response.headers || {}).filter(([, v]) => v != null) as [string, string][]
      ),
      data: responseData,
      time,
      size,
    };
  } catch (error: any) {
    const time = Math.round(performance.now() - start);
    if (error.response) {
      return {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers || {},
        data: error.response.data,
        time,
        size: 0,
      };
    }
    return {
      status: 0,
      statusText: 'Network Error',
      headers: {},
      data: { error: error.message || 'Request failed. This may be due to CORS restrictions.' },
      time,
      size: 0,
    };
  }
}
