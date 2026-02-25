import type {ClassValue} from 'clsx'
import {clsx} from 'clsx'
import {twMerge} from 'tailwind-merge'
import {logger} from "./logger"
import {getAPIs,getWidget} from "./widget/api"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const GET_CSRF_TOKEN_URL = "/resources/v1/application/CSRF";

export type CsrfResponse = {
  csrf: {
    name: string;
    value: string;
  };
}

export async function get3DSpaceUrl(): Promise<string> {
  const { i3DXCompassServices } = getAPIs();
  logger.info("i3DXCompassServices", i3DXCompassServices);
  const widget = getWidget();
  const tenant = widget.getValue("tenant") || "OnPremise";
  logger.info("tenant", tenant);

  return new Promise((resolve, reject) => {
    (i3DXCompassServices as any).getPlatformServices({
      tenant,
      onComplete: (data: any) => {
        const services = Array.isArray(data) ? data[0] : data;
        logger.info("services : ", services);
        const url = services["3DSpace"];
        logger.info("3DSpace URL : ", url);
        if (url) resolve(url);
        else reject(new Error("3DSpace service URL not found"));
      },
      onFailure: (err: any) => {
        logger.error("Failed to get platform services", err);
        reject(err);
      }
    });
  });
}

/**
 * Fetches a CSRF token from the 3DSpace application.
 */
export async function fetchCsrfToken(): Promise<string> {
  const spaceUrl = await get3DSpaceUrl();
  logger.info("spaceUrl : ", spaceUrl);
  const { WAFData } = getAPIs();
  const url = `${spaceUrl}${GET_CSRF_TOKEN_URL}`;
  logger.info("url : ", url);

  return new Promise((resolve, reject) => {
    (WAFData as any).authenticatedRequest(url, {
      method: "GET",
      onComplete: (data: string) => {
        try {
          const response: CsrfResponse = JSON.parse(data);
          logger.info("response : ", response);
          resolve(response.csrf.value);
        } catch (e) {
          logger.error("Failed to parse CSRF response", e);
          reject(new Error("Failed to parse CSRF response"));
        }
      },
      onFailure: (err: any) => {
        logger.error("CSRF request failed", err);
        reject(err);
      }
    });
  });
}
