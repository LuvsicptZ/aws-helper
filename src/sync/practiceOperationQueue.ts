const ownerTails = new Map<string, Promise<void>>();

export async function runPracticeOperation<T>(
  ownerId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = ownerTails.get(ownerId) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(operation);
  const tail = result.then(
    () => undefined,
    () => undefined,
  );
  ownerTails.set(ownerId, tail);

  try {
    return await result;
  } finally {
    if (ownerTails.get(ownerId) === tail) {
      ownerTails.delete(ownerId);
    }
  }
}
