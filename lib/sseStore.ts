type SSEController = ReadableStreamDefaultController<Uint8Array>;
const store = new Map<string, SSEController>();

export function registerSSE(userId: string, controller: SSEController): void {
  const existing = store.get(userId);
  if (existing) {
    try { existing.close(); } catch {}
  }
  store.set(userId, controller);
}

export function unregisterSSE(userId: string): void {
  store.delete(userId);
}

export function pushSSE(userId: string, event: string, data: unknown): boolean {
  const controller = store.get(userId);
  if (!controller) return false;
  try {
    const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(new TextEncoder().encode(frame));
    return true;
  } catch {
    store.delete(userId);
    return false;
  }
}
