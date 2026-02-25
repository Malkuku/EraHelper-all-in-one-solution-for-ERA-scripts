import { ref } from 'vue';
import { useAsyncAnalyzeStore } from '../stores/AsyncAnalyzeStore';

// Store Helpers
export const getAsyncAnalyzeStore = () => (window as any).AsyncAnalyzeStore as ReturnType<typeof useAsyncAnalyzeStore>;
// Global State
export const blacklistLores = ref<string[]>([]);
export const isWhitelistMode = ref(false);
export const isAnalyzing = ref(false); // 改为 ref 以便响应式使用，或者保持 let 导出 get/set

// Locks & Counters
export let currentAnalysisRunId = 0;
export const incrementRunId = () => ++currentAnalysisRunId;
export const getCurrentRunId = () => currentAnalysisRunId;

export let filterLockChain = Promise.resolve();
export const updateFilterLockChain = (p: Promise<void>) => { filterLockChain = p; };

export let generationLock = Promise.resolve();
export const updateGenerationLock = (p: Promise<void>) => { generationLock = p; };

// State Setters
export const setIsAnalyzing = (val: boolean) => { isAnalyzing.value = val; };
