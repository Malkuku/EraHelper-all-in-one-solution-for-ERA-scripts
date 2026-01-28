import { eraLogger } from '@/ERA助手/utils/EraHelperLogger';

/**
 * 根据世界书名称获取世界书的条目列表
 */
const getWorldBookLoresByName = async (primary: string) => {
  const bookInfo = await getWorldbook(primary);
  return bookInfo.map(t => t.name);
};

/**
 * 获取当前角色的世界书的条目列表
 */
const getCurrentCharWorldBookLores =  async () => {
  const { primary } = getCharWorldbookNames('current');
  if(!primary) return [];
  const bookInfo = await getWorldbook(primary);
  return bookInfo.map(t => t.name);
};

/**
 * 获取所有的世界书的标注信息
 */
const getAllWorldBookLores = async () => {
  const names =  getWorldbookNames();
  const list = [];
  for (const t of names) {
    const bookInfo = await getWorldbook(t);
    list.push(bookInfo.map(t => t.name));
  }
  return list;
}

/**
 * 基于正则过滤世界书名称条目
 */
const filterWorldBookNamesRegex = (regex: RegExp, names: string[]) => {
  return names.filter(name => regex.test(name));
};

/**
 * 获取世界书条目的文本内容
 */
const getWorldBookLoreContent = async (bookName: string,loreName: string) => {
  const bookInfo = await getWorldbook(bookName);
  const lore = bookInfo.find(t => t.name === loreName);
  if (!lore) return '';
  return lore.content;
};

/**
 * 批量设置世界书条目
 */
const enabledEntry = async (primary: string,targets: Array<{ name: string; enabled: boolean }>) => {
  const bookInfo = await getWorldbook(primary);
  // 有任何一条缺失，立即失败
  const miss = targets.find(t => !bookInfo.some(e => e.name === t.name));
  if (miss) return false;

  await updateWorldbookWith(primary, wb =>
    wb.map(entry => {
      const hit = targets.find(t => t.name === entry.name);
      return hit ? { ...entry, enabled: hit.enabled } : entry;
    }),
  );
  return true; // 全部成功
};

/**
 * 批量排除世界书条目
 */
const removeLoresByRegex = async (lores: any, regex: RegExp, isReversed: boolean) => {
  console.info('removeLoresByRegex: ', '开始过滤', regex, isReversed);
  const remove = (lore: any) =>
    _.remove(lore, entry => {
      return isReversed ? !entry.comment.match(regex) : entry.comment.match(regex);
    });
  remove(lores.globalLore);
  remove(lores.characterLore);
  remove(lores.chatLore);
  remove(lores.personaLore);

  console.log('removeLoresByRegex过滤完成: ', lores);
};

/**
 * 通过数组批量排除世界书条目
 */
const removeLoresByArray = async (lores: any, names: string[], isReversed: boolean) => {
  console.info('removeLoresByArray: ', '开始过滤', names, isReversed);
  const remove = (lore: any) =>
    _.remove(lore, entry => {
      return isReversed ? !names.includes(entry.comment) : names.includes(entry.comment);
    });
  remove(lores.globalLore);
  remove(lores.characterLore);
  remove(lores.chatLore);
  remove(lores.personaLore);
  console.log('removeLoresByArray过滤完成: ', lores);
};


/**
 * 更新或创建世界书条目
 * @param bookName 世界书名称
 * @param loreName 条目名称
 * @param content 条目内容
 */
const updateOrCreateEntry = async (bookName: string, loreName: string, content: string) => {
  try {
    // 1. 检查世界书是否存在以及条目是否存在
    let entries: any[] = [];
    try {
      entries = await getWorldbook(bookName);
    } catch (e) {
      eraLogger.error(`[WorldInfoUtil] Worldbook not found: ${bookName}`);
      return false;
    }

    const existingEntry = entries.find((e: any) => e.name === loreName);

    if (existingEntry) {
      // 2. 更新现有条目
      await updateWorldbookWith(bookName, (currentEntries) => {
        return currentEntries.map((entry) => {
          if (entry.name === loreName) {
            return {
              ...entry,
              content: content,
              enabled: true, // 更新时自动启用
            };
          }
          return entry;
        });
      });
      eraLogger.info(`[WorldInfoUtil] Updated entry: [${loreName}] in book [${bookName}]`);
    } else {
      // 3. 创建新条目
      // 使用 API 创建，只提供必要字段，其他字段由系统填充默认值
      await createWorldbookEntries(bookName, [{
        name: loreName,
        content: content,
        enabled: true,
        // 设置默认策略：关键字触发，关键字为条目名称
        strategy: {
          type: 'selective',
          keys: [loreName],
          keys_secondary: { logic: 'not_any', keys: [] },
          scan_depth: 'same_as_global'
        } as any // Cast to any to avoid strict type issues if PartialDeep is tricky
      }]);
      eraLogger.info(`[WorldInfoUtil] Created new entry: [${loreName}] in book [${bookName}]`);
    }
    return true;
  } catch (e) {
    eraLogger.error(`[WorldInfoUtil] Failed to update/create entry in ${bookName}:`, e);
    return false;
  }
};

export const WorldInfoUtil = {
  getWorldBookLoresByName,
  getCurrentCharWorldBookLores,
  getAllWorldBookLores,
  filterWorldBookNamesRegex,
  getWorldBookLoreContent,
  enabledEntry,
  removeLoresByRegex,
  removeLoresByArray,
  updateOrCreateEntry,
};
