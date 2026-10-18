/** The installed loader owns version management in this script iframe. */
export interface LoaderBridge {
  open(): void;
  registerCore(core: { canReload(): boolean }): void;
}

export function getLoaderBridge(): LoaderBridge | undefined {
  return (window as Window & { MvuLoader?: LoaderBridge }).MvuLoader;
}
