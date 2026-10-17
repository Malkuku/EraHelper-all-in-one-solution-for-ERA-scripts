import { defineStore } from 'pinia';
import { captureEditTarget, saveEditTarget, type MvuEditTarget } from '../utils/MvuEditTarget';

export const useEraEditStore = defineStore('KatEraEdit', () => {
  const getStatData = async () => (await captureEditTarget()).baseline;
  const loadTarget = captureEditTarget;
  const saveEraEdit = (object: Record<string, any>, target: MvuEditTarget) => saveEditTarget(target, object);
  return { getStatData, loadTarget, saveEraEdit };
});
