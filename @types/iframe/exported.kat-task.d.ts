import type { KatTaskAPI as TaskAPI } from '../../src/MVU助手/AsyncAnalyze/TaskSchema';

declare global {
  /** Await waitGlobalInitialized('KatTaskAPI') before accessing the task API. */
  const KatTaskAPI: TaskAPI;
  interface Window { KatTaskAPI: TaskAPI }
}
export {};
