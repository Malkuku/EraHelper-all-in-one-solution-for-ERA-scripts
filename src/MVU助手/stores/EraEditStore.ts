import { defineStore } from 'pinia';
import { eraLogger } from '../utils/MvuHelperLogger';
import { MvuUtil } from '@/Utils/MvuUtil';

export const useEraEditStore = defineStore('KatEraEdit', () => {
  /**
   * 尝试从变量中获取stat_data
   */
  const getStatData = async () => {
    const { stat_data } = getVariables({ type: 'message', message_id: -1 });
    eraLogger.log('获取stat_data内容: ', stat_data);
    return stat_data || {};
  };

  /**
   * 保存ERA设置
   * 直接覆盖 stat_data
   */
  const saveEraEdit = async (object: Record<string, any>) => {
    if (!object || typeof object !== 'object') return;
    try {
      await MvuUtil.updateMvuDataByObj(object);
      eraLogger.log('saveEraEdit: 数据覆盖成功');
    } catch (error) {
      eraLogger.error('saveEraEdit: 数据覆盖失败', error);
      throw error;
    }
  };

  return {
    getStatData,
    saveEraEdit,
  };
});
