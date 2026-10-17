const locks = new Map<string, Promise<void>>();
export async function withTargetLocks<T>(keys: string[], action: () => Promise<T>): Promise<T> {
  const releases: (() => void)[] = [];
  const acquired: { key: string; gate: Promise<void> }[] = [];
  for (const key of [...new Set(keys)].sort()) {
    const previous = locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>(resolve => { release = resolve; });
    const gate = previous.then(() => next);
    locks.set(key, gate);
    await previous;
    releases.push(release); acquired.push({ key, gate });
  }
  try { return await action(); } finally {
    releases.reverse().forEach(release => release());
    for (const { key, gate } of acquired) if (locks.get(key) === gate) locks.delete(key);
  }
}
