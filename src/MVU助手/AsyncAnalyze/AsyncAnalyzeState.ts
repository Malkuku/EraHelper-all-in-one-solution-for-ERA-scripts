import { ref } from 'vue';
import { useAsyncAnalyzeStore } from '../stores/AsyncAnalyzeStore';
import { useEraDataStore } from '../stores/EraDataStore';
import { useEraEditStore } from '../stores/EraEditStore';

// Store Helpers
export const getAsyncAnalyzeStore = () => (window as any).AsyncAnalyzeStore as ReturnType<typeof useAsyncAnalyzeStore>;
export const getEraDataStore = () => (window as any).EraDataStore as ReturnType<typeof useEraDataStore>;
export const getEraEditStore = () => (window as any).EraEditStore as ReturnType<typeof useEraEditStore>;

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
