/** Read-only worldbook helpers used by the version updater. Task generation reads native entries in GenerationHost. */
const getCurrentCharWorldBookLores = async () => {
  const { primary } = getCharWorldbookNames('current');
  return primary ? (await getWorldbook(primary)).map(entry => entry.name) : [];
};

const getWorldBookLoreContent = async (bookName: string, loreName: string) => {
  const entry = (await getWorldbook(bookName)).find(item => item.name === loreName);
  return entry?.content ?? '';
};

export const WorldInfoUtil = { getCurrentCharWorldBookLores, getWorldBookLoreContent };
