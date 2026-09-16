export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

export const TIMEOUTS = {
  firebaseAuth: 10000,
  firebaseUserLookup: 5000,
  externalApi: 15000,
  healthCheck: 5000,
  csvImport: 30000,
  dbQuery: 10000,
} as const;
