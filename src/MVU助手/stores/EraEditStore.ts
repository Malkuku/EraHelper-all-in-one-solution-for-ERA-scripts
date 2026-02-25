import { defineStore } from 'pinia';
import { ERAUtil } from '../../Utils/ERAUtil';
import { ERAEvents } from '../../Constants/ERAEvent';
import { eraLogger } from '../utils/MvuHelperLogger';

export const useEraEditStore = defineStore('KatEraEdit', () => {
  /**
   * 尝试从变量中获取stat_data
   */
  const getStatData = async () => {
    const { stat_data } = getVariables({ type: 'chat' });
    eraLogger.log('获取stat_data内容: ', stat_data);
    return stat_data || {};
  };

  /**
   * 辅助函数：根据路径深度设置值
   * @param root 目标根对象 (toDelete/toUpdate/toInsert)
   * @param path 当前路径数组
   * @param key 当前键
   * @param value 要设置的值
   */
  const setDeepValue = (root: Record<string, any>, path: string[], key: string, value: any) => {
    let target = root;
    for (const p of path) {
      if (!target[p]) target[p] = {};
      target = target[p];
    }
    target[key] = value;
  };

  /**
   * 保存ERA设置
   * 1. 先取出当前快照 snap
   * 2. 与入参 object 做三路对比：删除 / 更新 / 插入
   * 3. 按"先删再更新再插入"顺序写回
   */
  const saveEraEdit = async (object: Record<string, any>) => {
    if (!object || typeof object !== 'object') return;

    /* 1. 取快照 */
    const snap = await getStatData();

    /* 2. 三路对比 */
    const toDelete: Record<string, any> = {};
    const toUpdate: Record<string, any> = {};
    const toInsert: Record<string, any> = {};

    const walk = (snapNode: any, objNode: any, path: string[] = []) => {
      /* 收集所有 key */
      const snapKeys = new Set(
        snapNode && typeof snapNode === 'object' && !Array.isArray(snapNode) ? Object.keys(snapNode) : [],
      );
      const objKeys = new Set(
        objNode && typeof objNode === 'object' && !Array.isArray(objNode) ? Object.keys(objNode) : [],
      );

      /* 处理删除逻辑：snap 有，object 没有 */
      snapKeys.forEach(k => {
        if (!objKeys.has(k)) {
          const val = snapNode[k];
          // 检查这个被删除的节点是否有子节点
          const hasChildren = val && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0;

          // 如果有子节点，通常后端协议可能需要 {} 来表示删除容器，否则用 null 删除值
          setDeepValue(toDelete, path, k, hasChildren ? {} : null);
        }
      });

      /* 插入：object 有，snap 没有 */
      objKeys.forEach(k => {
        if (!snapKeys.has(k)) {
          // 直接将新对象/新值写入 insert 树
          setDeepValue(toInsert, path, k, objNode[k]);
        }
      });

      /* 更新：两边都有 */
      objKeys.forEach(k => {
        if (snapKeys.has(k)) {
          const sVal = snapNode[k];
          const oVal = objNode[k];

          const bothObject =
            sVal &&
            oVal &&
            typeof sVal === 'object' &&
            typeof oVal === 'object' &&
            !Array.isArray(sVal) &&
            !Array.isArray(oVal);

          if (bothObject) {
            /* 递归对比子树 */
            walk(sVal, oVal, [...path, k]);
          } else {
            /* 值不同则更新 */
            // 注意：这里对于数组或简单类型，只要引用或值不同就视为更新
            // 如果需要更深层的数组对比，需要额外逻辑，目前逻辑是整个替换数组
            // eslint-disable-next-line no-lonely-if
            if (JSON.stringify(sVal) !== JSON.stringify(oVal)) {
              setDeepValue(toUpdate, path, k, oVal);
            }
          }
        }
      });
    };

    walk(snap, object, []);

    /* 3. 按顺序写回 */
    // 只有当对象不为空时才调用 API，避免发送空请求
    if (Object.keys(toDelete).length > 0) await ERAUtil.DeleteByObject(toDelete);
    if (Object.keys(toUpdate).length > 0) await ERAUtil.UpdateByObject(toUpdate);
    if (Object.keys(toInsert).length > 0) await ERAUtil.InsertByObject(toInsert);

    /* 4. 强制同步 */
    await ERAUtil.ForceSync(ERAEvents.SYNC_MODE.AUTO);
  };

  return {
    getStatData,
    saveEraEdit,
  };
});
