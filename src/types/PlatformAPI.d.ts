// -----------------------------------------------------
// DS/PlatformAPI/PlatformAPI
// Docs: CAAWebAppsTaWidgetComm (Publish/Subscribe Protocol)
// -----------------------------------------------------

export type PlatformTopic = string;

/** Subscription token returned by subscribe, passed to unsubscribe. */
export type PlatformSubscription = string;

export interface PlatformAPI {
  /**
   * Publish an event with a topic and optional JSON-serializable payload.
   */
  publish<TData = unknown>(
    topic: PlatformTopic,
    data?: TData
  ): void;

  /**
   * Subscribe to a topic. Returns a subscription token to pass to unsubscribe.
   */
  subscribe<TData = unknown>(
    topic: PlatformTopic,
    callback: (data: TData) => void
  ): PlatformSubscription;

  /**
   * Unsubscribe a previously created subscription.
   */
  unsubscribe(subscription: PlatformSubscription): void;
}