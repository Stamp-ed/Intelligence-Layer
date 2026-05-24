export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  attempts = 5,
  baseMs = 1500,
  shouldRetry: (err: unknown) => boolean = () => true,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const hasRetriesLeft = i < attempts - 1;
      if (!hasRetriesLeft || !shouldRetry(err)) {
        break;
      }
      await sleep(baseMs * 2 ** i);
    }
  }
  throw lastError;
}
