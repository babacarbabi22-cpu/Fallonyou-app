export interface ChatBroadcastRecipient {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  bufferedAmount?: number;
}

/**
 * Revalidate recipients immediately before emitting each chat event. Per-recipient
 * failures are contained so asynchronous notifications cannot reject unobserved.
 */
export async function broadcastAuthorized<T extends ChatBroadcastRecipient>(
  recipients: readonly T[],
  exclude: T | undefined,
  payload: object,
  openState: number,
  authorize: (recipient: T) => Promise<boolean>,
  revoke: (recipient: T, code: number, reason: string) => void,
): Promise<void> {
  const serialized = JSON.stringify(payload);
  for (const recipient of recipients) {
    if (recipient === exclude || recipient.readyState !== openState) continue;
    try {
      if ((recipient.bufferedAmount ?? 0) > 256 * 1024) {
        revoke(recipient, 1013, "Slow connection; reconnect");
        continue;
      }
      if (!(await authorize(recipient))) {
        revoke(recipient, 4003, "Chat access revoked");
        continue;
      }
      recipient.send(serialized);
    } catch {
      try {
        revoke(recipient, 1011, "Chat unavailable");
      } catch {
        // Do not allow a broken recipient/cleanup handler to reject a notification.
      }
    }
  }
}