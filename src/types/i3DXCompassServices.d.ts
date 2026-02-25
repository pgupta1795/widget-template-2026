// -----------------------------------------------------
// DS/i3DXCompassServices/i3DXCompassServices
// Docs: module-DS_i3DXCompassServices_i3DXCompassServices
// -----------------------------------------------------

/**
 * 3DXContent envelope used in getCompatibleApps.
 * Only fields needed by docs are typed; others are allowed as unknown.
 */
export interface ThreeDXContentItem {
  envId: string;
  serviceId: string;
  contextId: string;
  objectId: string;
  objectType: string;
  displayName: string;
  [key: string]: unknown;
}

export interface ThreeDXContent {
  protocol: '3DXContent';
  version: string;
  source: string;
  target: string;
  data: {
    items: ThreeDXContentItem[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface CompassAppDescriptor {
  /** Application identifier (used as appId). */
  name: string;
  /** Application title. */
  text: string;
  /** Icon resource / id. */
  icon: string;
  [key: string]: unknown;
}

export interface GetCompatibleAppsOptions {
  content: ThreeDXContent;
  onComplete(apps: CompassAppDescriptor[]): void;
}

export interface PlatformServicesEntry {
  platformId: string;
  displayName: string;
  // Service URLs (3DSwym, 3DCompass, 3DPassport, 3DSpace, 3DDrive, exchange, ...)
  [serviceName: string]: string;
}

export interface GetPlatformServicesOptionsBase {
  onComplete(data: PlatformServicesEntry | PlatformServicesEntry[] | undefined): void;
  onFailure?(error: Error): void;
}

export interface GetPlatformServicesOptionsWithId extends GetPlatformServicesOptionsBase {
  platformId: string;
}

export interface GetPlatformServicesOptionsAll extends GetPlatformServicesOptionsBase {
  platformId?: '' | null | undefined;
}

export type GetPlatformServicesOptions =
  | GetPlatformServicesOptionsWithId
  | GetPlatformServicesOptionsAll;

export interface ServiceUrlEntry {
  platformId: string;
  url: string | undefined;
}

export interface GetServiceUrlOptionsBase {
  onComplete(data: string | ServiceUrlEntry[] | undefined): void;
  onFailure?(error: Error): void;
}

export interface GetServiceUrlOptionsWithPlatform extends GetServiceUrlOptionsBase {
  serviceName: string;
  platformId: string;
}

export interface GetServiceUrlOptionsAllPlatforms extends GetServiceUrlOptionsBase {
  serviceName: string;
  platformId?: '' | null | undefined;
}

export type GetServiceUrlOptions =
  | GetServiceUrlOptionsWithPlatform
  | GetServiceUrlOptionsAllPlatforms;

export interface i3DXCompassServices {
  getCompatibleApps(options: GetCompatibleAppsOptions): void;
  getPlatformServices(options: GetPlatformServicesOptions): void;
  getServiceUrl(options: GetServiceUrlOptions): void;
}
