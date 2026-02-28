import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import { eraLogger } from '../utils/MvuHelperLogger';
import {
  getAsyncAnalyzeStore,
  blacklistLores,
  isWhitelistMode,
  filterLockChain,
  updateFilterLockChain
} from './AsyncAnalyzeState';

/**
 * 预计算黑名单
 */
export const updateGlobalBlacklist = async () => {
  console.info('updateGlobalBlacklist: ', '开始计算黑名单');
  const store = getAsyncAnalyzeStore();
  if (!store || !store.activeRuleName) {
    blacklistLores.value = [];
    isWhitelistMode.value = false;
    return;
  }

  const rule = store.asyncAnalyzeSetting[store.activeRuleName];
  if (!rule || !rule.world_book) {
    blacklistLores.value = [];
    isWhitelistMode.value = false;
    return;
  }

  try {
    const calculatedBlacklist: string[] = [];

    for (const [bookName, wbConfig] of Object.entries(rule.world_book)) {
      const config = wbConfig as any;
      let allEntriesInBook: string[] = [];
      try {
        allEntriesInBook = await WorldInfoUtil.getWorldBookLoresByName(bookName);
      } catch (e) {
        eraLogger.warn(`无法获取世界书 [${bookName}] 的条目，可能不存在。`);
        continue;
      }

      if (!allEntriesInBook || allEntriesInBook.length === 0) continue;

      const whitelistForBook = new Set<string>();
      if (config.lores && Array.isArray(config.lores)) {
        config.lores.forEach((lore: string) => whitelistForBook.add(lore));
      }

      if (config.lore_regex) {
        const regexList = Array.isArray(config.lore_regex) ? config.lore_regex : [config.lore_regex];
        for (const regexStr of regexList) {
          try {
            const regex = new RegExp(regexStr);
            const matchedEntries = allEntriesInBook.filter(name => regex.test(name));
            matchedEntries.forEach(lore => whitelistForBook.add(lore));
          } catch (e) {
            eraLogger.error(`Regex error in world book config [${bookName}]: ${regexStr}`, e);
          }
        }
      }

      const blacklistForBook = allEntriesInBook.filter(entry => !whitelistForBook.has(entry));
      calculatedBlacklist.push(...blacklistForBook);
    }

    blacklistLores.value = [...new Set(calculatedBlacklist)];
    isWhitelistMode.value = false;
    eraLogger.info('updateGlobalBlacklist: ', '黑名单计算完成', blacklistLores.value);

  } catch (e) {
    eraLogger.error('Failed to update global blacklist:', e);
    toastr.error('更新全局黑名单失败，请检查世界书配置');
    blacklistLores.value = [];
    isWhitelistMode.value = false;
  }
};

/**
 * 处理世界书过滤 (SillyTavern 钩子)
 */
export const handleLoresFilter = async (lores: any) => {
  const nextPromise = filterLockChain.then(async () => {
    console.info('handleLoresFilter: ', '接收到过滤请求，开始执行');

    if (blacklistLores.value.length === 0 && !isWhitelistMode.value) {
      return;
    }

    try {
      await WorldInfoUtil.removeLoresByArray(lores, blacklistLores.value, isWhitelistMode.value);
    } catch (e) {
      eraLogger.error('Error during handleLoresFilter:', e);
    }
  }).catch(e => {
    eraLogger.error('Critical error in filter lock chain:', e);
  });

  updateFilterLockChain(nextPromise);
  await nextPromise;
};
