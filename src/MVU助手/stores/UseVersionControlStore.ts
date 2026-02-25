import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useEraEditStore } from './EraEditStore';
import { eraLogger } from '../utils/EraHelperLogger';
import _ from 'lodash';
import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import { ERAUtil } from '@/Utils/ERAUtil';

// 类型定义
interface UpdateBlock {
  version: number;
  type: 'del' | 'edit';
  content: any;
}

interface VersionDiff {
  added: Record<string, any>;
  deleted: Record<string, any>;
  updated: Record<string, any>;
  finalData: Record<string, any>;
  diff?: {
    added: Record<string, any>;
    deleted: Record<string, any>;
    updated: Record<string, any>;
  }
}

interface VersionSettings {
  enable: boolean;
  lore_name: string;
}

export const UseVersionControlStore = defineStore('EraVersionControl', () => {
  const eraEditStore = useEraEditStore();

  // 持久化配置
  const settings = ref<VersionSettings>({
    enable: false,
    lore_name: ''
  });

  const currentVersion = ref<number>(0);
  const targetVersion = ref<number>(0);
  const availableUpdates = ref<UpdateBlock[]>([]);
  const updateLogs = ref<string[]>([]);

  // 预览数据
  const previewDiff = ref<VersionDiff | null>(null);

  // --- 持久化逻辑 ---

  const loadSettings = async () => {
    try {
      const variables = getVariables({ type: 'script', script_id: getScriptId() });
      const rule = variables.era_data_rule?.version_control;

      if (rule) {
        settings.value = {
          enable: rule.enable ?? false,
          lore_name: rule.lore_name || ''
        };
      }
      eraLogger.log('版本控制配置已加载:', settings.value);
    } catch (e) {
      eraLogger.error('加载版本控制配置失败:', e);
    }
  };

  const saveSettings = async () => {
    try {
      const saveContent = JSON.parse(JSON.stringify(settings.value));
      await updateVariablesWith(
        vars => {
          const existing = vars.era_data_rule || {};
          return {
            ...vars,
            era_data_rule: {
              ...existing,
              version_control: saveContent
            }
          };
        },
        { type: 'script', script_id: getScriptId() }
      );
      eraLogger.log('版本控制配置已保存');
    } catch (e) {
      eraLogger.error('保存版本控制配置失败:', e);
    }
  };

  // --- 核心逻辑 ---

  const fetchCurrentVersion = async () => {
    const data = await eraEditStore.getStatData();
    const ver = _.get(data, 'system.当前版本');

    if (ver === undefined || ver === null) {
      currentVersion.value = 0;
    } else {
      currentVersion.value = Number(ver);
    }
    return currentVersion.value;
  };

  const parseUpdateRules = async (bookName: string, loreName: string) => {
    if (!bookName || !loreName) return;

    const content = await WorldInfoUtil.getWorldBookLoreContent(bookName, loreName);
    if (!content) {
      eraLogger.error('未找到版本更新条目');
      availableUpdates.value = [];
      targetVersion.value = currentVersion.value;
      return;
    }

    const regex = /<(del|edit)\|v="([^"]+)">([\s\S]*?)<\/\1>/g;
    const matches = [...content.matchAll(regex)];

    const updates: UpdateBlock[] = [];

    for (const match of matches) {
      try {
        const type = match[1] as 'del' | 'edit';
        const version = parseFloat(match[2]);
        const jsonStr = match[3];
        const jsonContent = JSON.parse(jsonStr);

        updates.push({
          version,
          type,
          content: jsonContent
        });
      } catch (e) {
        eraLogger.error(`解析版本 ${match[2]} 失败:`, e);
      }
    }

    availableUpdates.value = updates.sort((a, b) => a.version - b.version);

    if (availableUpdates.value.length > 0) {
      targetVersion.value = availableUpdates.value[availableUpdates.value.length - 1].version;
    } else {
      targetVersion.value = currentVersion.value;
    }
  };

  const checkAndNotify = async (bookName: string) => {
    if (!settings.value.enable || !settings.value.lore_name || !bookName) return;

    await fetchCurrentVersion();
    await parseUpdateRules(bookName, settings.value.lore_name);

    if (targetVersion.value > currentVersion.value) {
      const msg = `发现新版本 v${targetVersion.value} (当前: v${currentVersion.value})，请前往ERA助手版本更新页面查看。`;
      eraLogger.info(msg);
      toastr.success(msg, '版本更新');
    }
  };

  // --- Diff 计算逻辑 ---

  const applyDelete = (target: any, rule: any) => {
    if (!target || typeof target !== 'object') return;
    for (const key in rule) {
      if (key === '$all') {
        const subRule = rule['$all'];
        for (const targetKey in target) {
          applyDelete(target[targetKey], subRule);
        }
      } else if (rule[key] && Object.keys(rule[key]).length > 0) {
        if (target[key]) applyDelete(target[key], rule[key]);
      } else {
        delete target[key];
      }
    }
  };

  const applyEdit = (target: any, rule: any) => {
    _.mergeWith(target, rule, (objValue, srcValue) => {
      // 如果新的值(srcValue)是数组，直接返回新数组，实现覆盖而非合并
      if (_.isArray(srcValue)) {
        return srcValue;
      }
    });
  };

  /**
   * 深度比较两个对象，生成 added, deleted, updated
   * 修正了删除逻辑：删除时赋值为 null 而不是 oldVal，防止 DeleteByObject 错误递归
   */
  const compareObjects = (oldObj: any, newObj: any) => {
    const added: any = {};
    const deleted: any = {};
    const updated: any = {};

    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

    for (const key of allKeys) {
      const oldVal = oldObj ? oldObj[key] : undefined;
      const newVal = newObj ? newObj[key] : undefined;

      // 1. 存在于旧的，不存在于新的 -> 删除
      if (oldVal !== undefined && newVal === undefined) {
        // 【修正点】这里必须赋值为 null (或者不为对象的真值)，
        // 告诉 DeleteByObject 这是一个叶子节点，直接删除该 Key。
        // 如果赋值为 oldVal 且 oldVal 是对象，DeleteByObject 会递归进去删除子属性，导致父对象残留。
        deleted[key] = null;
      }
      // 2. 不存在于旧的，存在于新的 -> 新增
      else if (oldVal === undefined && newVal !== undefined) {
        added[key] = newVal;
      }
      // 3. 两者都存在 -> 比较
      else if (oldVal !== undefined && newVal !== undefined) {
        // 如果是纯对象，递归比较
        if (_.isPlainObject(oldVal) && _.isPlainObject(newVal)) {
          const subDiff = compareObjects(oldVal, newVal);

          if (!_.isEmpty(subDiff.added)) added[key] = subDiff.added;
          if (!_.isEmpty(subDiff.deleted)) deleted[key] = subDiff.deleted;
          if (!_.isEmpty(subDiff.updated)) updated[key] = subDiff.updated;
        }
        // 否则直接比较值
        else if (!_.isEqual(oldVal, newVal)) {
          updated[key] = newVal;
        }
      }
    }

    return { added, deleted, updated };
  };

  const calculateUpdate = async () => {
    updateLogs.value = [];
    const originalData = await eraEditStore.getStatData();
    const workingData = _.cloneDeep(originalData);

    const pendingUpdates = availableUpdates.value.filter(u => u.version > currentVersion.value);

    if (pendingUpdates.length === 0) {
      updateLogs.value.push("当前已是最新版本，无需更新。");
      previewDiff.value = null;
      return;
    }

    // 1. 应用所有更新到 workingData
    for (const update of pendingUpdates) {
      updateLogs.value.push(`应用版本 v${update.version} [${update.type}]...`);
      if (update.type === 'del') {
        applyDelete(workingData, update.content);
      } else {
        applyEdit(workingData, update.content);
      }
    }

    if (!workingData.system) workingData.system = {};
    workingData.system['当前版本'] = targetVersion.value;

    // 2. 对比 originalData 和 workingData 生成 Diff
    updateLogs.value.push("正在计算差异...");
    const diffResult = compareObjects(originalData, workingData);

    previewDiff.value = {
      added: diffResult.added,
      deleted: diffResult.deleted,
      updated: diffResult.updated,
      finalData: workingData,
      diff: diffResult
    };

    updateLogs.value.push(`计算完成。目标版本: ${targetVersion.value}`);
  };

  const executeFullUpdate = async () => {
    if (!previewDiff.value) return;

    const { added, deleted, updated } = previewDiff.value;
    eraLogger.log('开始执行差分更新...');

    try {
      // 1. 处理删除 (Delete)
      if (!_.isEmpty(deleted)) {
        eraLogger.log('执行删除操作:', deleted);
        await ERAUtil.DeleteByObject(deleted);
      }

      // 2. 处理新增 (Insert)
      if (!_.isEmpty(added)) {
        eraLogger.log('执行新增操作:', added);
        await ERAUtil.InsertByObject(added);
      }

      // 3. 处理修改 (Update)
      if (!_.isEmpty(updated)) {
        eraLogger.log('执行更新操作:', updated);
        await ERAUtil.UpdateByObject(updated);
      }

      // 4. 强制同步
      await ERAUtil.ForceSync('auto');

      currentVersion.value = targetVersion.value;
      previewDiff.value = null;
      eraLogger.log('差分更新完成');
      toastr.success(`已成功更新至版本 v${targetVersion.value}`);

    } catch (e) {
      eraLogger.error('更新过程中发生错误:', e);
      toastr.error('更新失败，请查看控制台日志');
    }
  };

  return {
    settings,
    currentVersion,
    targetVersion,
    updateLogs,
    previewDiff,
    loadSettings,
    saveSettings,
    fetchCurrentVersion,
    parseUpdateRules,
    calculateUpdate,
    executeFullUpdate,
    checkAndNotify
  };
});
