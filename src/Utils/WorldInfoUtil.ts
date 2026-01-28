
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

export const WorldInfoUtil = {
  getWorldBookLoresByName,
  getCurrentCharWorldBookLores,
  getAllWorldBookLores,
  filterWorldBookNamesRegex,
  getWorldBookLoreContent,
  enabledEntry,
  removeLoresByRegex,
  removeLoresByArray,
};
