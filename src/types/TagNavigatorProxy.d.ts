// -----------------------------------------------------
// 6W Tagger proxy types
// DS/TagNavigatorProxy/AbstractTagger6WProxy
// DS/TagNavigatorProxy/Tagger6WProxy
// DS/TagNavigatorProxy/Tagger6WProxyWithFilteringServices
// DS/TagNavigatorProxy/TagNavigatorProxy
// -----------------------------------------------------

export type Tagger6WValueType = 'integer' | 'string' | 'date';

export interface Tagger6WTag {
  type?: Tagger6WValueType;
  /** Hierarchical path of predicate URIs, e.g. "ds6w:who/ds6w:responsible". */
  sixw: string;
  /** Tag object URI or literal. For date, format "yyyy/mm/dd". */
  object: string;
  /** Display name (ignored for date types). */
  dispValue?: string;
  /** Number of subjects holding this tag (for summary data). */
  count?: number;
}

export type TaggerSubjectsTags = Record<string, Tagger6WTag[]>;

/** Filter structure returned by getCurrentFilter. */
export interface Filter6WTagger {
  /** All filters currently applied. */
  allfilters?: Record<string, Tagger6WTag[]>;
  /** Local filters for this proxy (FilteringOnServer mode only). */
  localfilters?: Record<string, Tagger6WTag[]>;
  /** Filtered subject URIs list (WithFilteringServices only). */
  filteredSubjectList?: string[];
  [key: string]: unknown;
}

/**
 * Base abstract proxy class.
 * Docs: DS_TagNavigatorProxy_AbstractTagger6WProxy
 */
export interface AbstractTagger6WProxy {
  /** Show this proxy's tags in the 6WTagger. */
  activate(): void;

  /**
   * Register a callback for filtering events.
   *
   * eventName:
   *  - 'onFilterChange' (FilteringOnServer)
   *  - 'onFilterSubjectsChange' (WithFilteringServices)
   */
  addEvent(
    eventName: 'onFilterChange',
    eventCallback: (filter: Filter6WTagger) => void,
    scope?: object
  ): void;

  addEvent(
    eventName: 'onFilterSubjectsChange',
    eventCallback: (filter: Filter6WTagger) => void,
    scope?: object
  ): void;

  addEvent(
    eventName: string,
    eventCallback: (filter: Filter6WTagger) => void,
    scope?: object
  ): void;

  /**
   * Add local filters for this proxy (FilteringOnServer only).
   */
  addLocalFilter(
    filter: Filter6WTagger['localfilters'],
    warn?: boolean
  ): void;

  /**
   * Clear all local filters (FilteringOnServer only).
   */
  clearLocalFilter(warn?: boolean): void;

  /** Hide this proxy's tags in the 6WTagger. */
  deactivate(): void;

  /**
   * Destroy the proxy, removing tags and connection to 6WTagger.
   * After this, any method call throws.
   */
  die(): void;

  /**
   * Focus tagger on given subjects.
   */
  focusOnSubjects(subjectUris: string[]): void;

  /**
   * Get current filter structure.
   */
  getCurrentFilter(): Filter6WTagger;

  /**
   * Remove specific local filters (FilteringOnServer only).
   */
  removeLocalFilter(
    filter: Filter6WTagger['localfilters'],
    warn?: boolean
  ): void;

  /**
   * Replace local filters (FilteringOnServer only).
   */
  setLocalFilter(
    filter: Filter6WTagger['localfilters'],
    warn?: boolean
  ): void;

  /**
   * Remove focus from subjects.
   */
  unfocus(): void;

  /** Remove all tags handled by this proxy. */
  unsetTags(): void;
}

/**
 * Tagger6WProxy (FilteringOnServer mode).
 * Docs: DS_TagNavigatorProxy_Tagger6WProxy
 */
export interface Tagger6WProxy extends AbstractTagger6WProxy {
  /**
   * Adds 6WTags into the 6WTagger without changing summaryData.
   */
  addSubjects(
    tagsdata: TaggerSubjectsTags
  ): Tagger6WProxy;

  /**
   * Sets tags and optional summary data.
   */
  setTags(
    tagsdata?: TaggerSubjectsTags,
    summaryData?: Tagger6WTag[]
  ): Tagger6WProxy;
}

/**
 * Tagger6WProxyWithFilteringServices (WithFilteringServices mode).
 * Docs: DS_TagNavigatorProxy_Tagger6WProxyWithFilteringServices
 */
export interface Tagger6WProxyWithFilteringServices extends AbstractTagger6WProxy {
  /**
   * Adds tags into the 6WTagger (incremental).
   */
  addSubjectsTags(
    subjectsTags: TaggerSubjectsTags
  ): Tagger6WProxyWithFilteringServices;

  /**
   * Sets / replaces all tags in the 6WTagger.
   */
  setSubjectsTags(
    subjectsTags: TaggerSubjectsTags
  ): Tagger6WProxyWithFilteringServices;
}

// TagNavigatorProxy factory module

export type TagNavigatorFilteringMode = 'FilteringOnServer' | 'WithFilteringServices';

export interface TagNavigatorProxyCreateOptions {
  /** Widget identifier (e.g. widget.id). */
  widgetId: string;
  /** Filtering mode for the proxy. */
  filteringMode: TagNavigatorFilteringMode;
  /**
   * Platform identifier (tenant). Required if subjects come from
   * 3DEXPERIENCE Platform.
   */
  tenant?: string;
}

export interface TagNavigatorProxy {
  /**
   * Filtering modes constants.
   *
   * Use as:
   *   TagNavigatorProxy.FilteringOnServer
   *   TagNavigatorProxy.WithFilteringServices
   */
  FilteringOnServer: TagNavigatorFilteringMode;
  WithFilteringServices: TagNavigatorFilteringMode;

  /**
   * Creates and returns a new Tagger6WProxy or Tagger6WProxyWithFilteringServices
   * depending on filteringMode.
   */
  createProxy(
    options: TagNavigatorProxyCreateOptions
  ): Tagger6WProxy | Tagger6WProxyWithFilteringServices;
}