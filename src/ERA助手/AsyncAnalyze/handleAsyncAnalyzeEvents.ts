import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import { PromptUtil } from '@/Utils/PromptUtil';
import { MessageUtil } from '@/Utils/MessageUtil';
import { ERAEvents } from '@/Constants/ERAEvent';
import { useAsyncAnalyzeStore } from '../stores/AsyncAnalyzeStore';
import { eraLogger } from '../utils/EraHelperLogger';
import { EraDataHandler } from '../EraDataHandler/EraDataHandler';
import { useEraDataStore } from '../stores/EraDataStore';
import { useEraEditStore } from '../stores/EraEditStore';
import { JsonUtil } from '@/Utils/JsonUtil';

const getAsyncAnalyzeStore = () => (window as any).AsyncAnalyzeStore as ReturnType<typeof useAsyncAnalyzeStore>;
const getEraDataStore = () => (window as any).EraDataStore as ReturnType<typeof useEraDataStore>;
const getEraEditStore = () => (window as any).EraEditStore as ReturnType<typeof useEraEditStore>;

const isAsync = computed(() => !!getAsyncAnalyzeStore()?.isAsync);
const isUpdateEra = computed(() => !!getAsyncAnalyzeStore()?.isUpdateEra);
const loreList = computed(() => {
  if (!isAsync.value) {
    return getAsyncAnalyzeStore()?.analyzeRores;
  } else if (isAsync.value && !isUpdateEra.value) {
    return [...(getAsyncAnalyzeStore()?.updateRores || []), ...(getAsyncAnalyzeStore()?.analyzeRores || [])];
  } else {
    return getAsyncAnalyzeStore()?.ignoreRores;
  }
});
const regexStrList = computed(() => {
  return getAsyncAnalyzeStore()?.regexList;
});

const isReversed = ref(false);
const modelSource = computed(() => getAsyncAnalyzeStore()?.modelSource);
const customModelSettings = computed(() => getAsyncAnalyzeStore()?.customModelSettings);
const profileSetting = computed(() => getAsyncAnalyzeStore()?.profileSetting);
const simplePresetName = computed(() => getAsyncAnalyzeStore()?.simplePresetName);
const maxMessageFloor = computed(() => getAsyncAnalyzeStore()?.maxMessageFloor);

const waitTime = 100;

/**
 * 重发变量更新
 */
export const reSendEraUpdate = async () => {
  if (getLastMessageId() == 0) {
    //不处理0层
    toastr.warning('请不要重算0层变量', '你在干嘛😡');
    return;
  }
  toastr.info('开始变量重算，等待era事件完成');
  const isAsyncTemp = getAsyncAnalyzeStore().isAsync;
  try {
    //先将era回滚到上次更新
    toastr.info('正在将era回滚到上次更新');
    await eventEmit('era:forceSync', { mode: 'rollbackTo', message_id: getLastMessageId() - 1 });

    getAsyncAnalyzeStore().isUpdateEra = true;
    if (!isAsync.value) {
      toastr.info('临时开启分步分析模式');
      getAsyncAnalyzeStore().isAsync = true;
    }
    await handleKatEraUpdate();
  } catch (e) {
    toastr.error('分步分析处理失败');
    eraLogger.error('分步分析处理失败: ', e);
    await eventEmit('era:forceSync');
  } finally {
    getAsyncAnalyzeStore().isAsync = isAsyncTemp;
    getAsyncAnalyzeStore().isUpdateEra = false;
    await eventEmit('kat:handle_era_finished');
  }
};

/**
 * 处理接收到的massage_received事件
 */
export const handleMessageReceived = async (message_id: number) => {
  try {
    if (getLastMessageId() == 0 || message_id == 0) {
      //不处理0层
      return;
    }
    if (!isAsync.value) {
      return;
    }
    if (isUpdateEra.value) {
      toastr.warning('已有正在处理的分步分析');
      return;
    }
    if (MessageUtil.getMessageById(message_id).length < 200) {
      toastr.error('空回了喵~请重roll喵~');
      throw new Error('空回了喵~请重roll喵~');
    }
    toastr.info('开始分步分析，等待era事件完成');
    eraLogger.info('开始分步分析，等待era事件完成');

    getAsyncAnalyzeStore().isUpdateEra = true;

    handleKatEraUpdate(); //让正文先显示出来
  } finally {
    /* empty */
  }
};

/**
 * 处理ERA变量更新
 */
export const handleEraRulesOnMessageReceived = async (message_id: number) => {
  if (isAsync.value) {
    eraLogger.info('处于分步分析模式,跳过接收消息时的处理');
    return;
  }
  const chat_message = getChatMessages(message_id)[0];
  const msg = chat_message.message;
  const result = await handleEraRules(msg);
  await setChatMessages([{ message_id, message: result }]);
  await eventEmit(ERAEvents.FORCE_SYNC);
  await eventEmit('kat:handle_era_finished');
};

/**
 * 处理ERA变量更新
 * @param result
 */
async function handleEraRules(result: string) {
  // 1. 使用“最近匹配”正则
  // 逻辑：匹配 <VariableEdit> 开头，中间内容不允许出现 <VariableEdit>，直到 </VariableEdit> 结束
  // 效果：如果出现 <VariableEdit> ... <VariableEdit> {json} </VariableEdit>，它只会匹配后半部分，保证 JSON 纯净
  const regexInnermost = /<VariableEdit>((?:(?!<VariableEdit>)[\s\S])*?)<\/VariableEdit>/g;

  const matches = Array.from(result.matchAll(regexInnermost));

  if (matches.length === 0) {
    return result;
  }

  let mergedEditData: Record<string, any> = {};
  let hasValidData = false;

  // 2. 遍历并深度合并
  for (const match of matches) {
    const content = match[1];
    if (!content || !content.trim()) continue;

    try {
      const editData = JSON.parse(content);
      // 深度合并数据
      mergedEditData = JsonUtil.mergeDeep(mergedEditData, editData);
      hasValidData = true;
    } catch (e) {
      // 这里的警告通常是因为内容不是 JSON，或者被截断了
      console.warn('忽略无效的 VariableEdit 内容:', content);
    }
  }

  // 如果没有提取到任何有效数据，直接返回原文本（或者你可以选择在这里清理掉所有标签）
  if (!hasValidData) {
    return result;
  }

  try {
    const snapshotData = await getEraEditStore().getStatData();
    if (snapshotData == null) {
      toastr.error('快照数据为空,跳过处理');
      return result;
    }

    const rules = getEraDataStore().eraDataRule;

    // 应用规则
    const { data: updatedData } = await EraDataHandler.applyRule(mergedEditData, snapshotData, rules);

    const updatedContent = JSON.stringify(updatedData);
    const newTag = `<VariableEdit>\n${updatedContent}\n</VariableEdit>`;

    // 3. 替换逻辑：保留第一个位置，删除后续位置
    let isFirstMatch = true;
    result = result.replace(regexInnermost, () => {
      if (isFirstMatch) {
        isFirstMatch = false;
        return newTag; // 第一个匹配位置放置合并后的完整数据
      } else {
        return ''; // 后续匹配位置直接删除
      }
    });

    // 可选：如果你想清理掉那些因为“向回找”而被遗弃的、不成对的 <VariableEdit> 头部标签，可以再加一行：
    // result = result.replace(/<VariableEdit>/g, '');
    // 但建议谨慎使用，以免误删文本中提到的标签名。
  } catch (e) {
    eraLogger.error('变量更新失败：', e);
    toastr.error('变量更新失败');
  }

  return result;
}

/**
 * 合并消息内容
 */
async function handleMessageMerge(result: string) {
  if (result.length < 200) {
    toastr.error('接收的分析结果为空，哈！');
    throw new Error('接收的分析结果为空，哈！');
  }
  //先去除掉正文的旧记录
  const filterList = [] as RegExp[];
  regexStrList.value.forEach((regexStr: string) => {
    const regex = new RegExp(regexStr, 'gi');
    if (result.match(regex)) {
      filterList.push(regex);
    }
  });
  await MessageUtil.removeContentByRegex(getLastMessageId(), filterList);

  result = await handleEraRules(result);

  //提取并且合并消息到正文
  // 只保留标签及其内部内容
  let content = '';
  filterList.map(regex => {
    content += result.match(regex)?.join('') ?? '';
  });
  await MessageUtil.mergeContentToMessage(getLastMessageId(), content);
}

/**
 * 准备开始分析
 */
export const handleKatEraUpdate = async () => {
  if (!isUpdateEra.value) {
    toastr.warning('[isUpdateEra]标识异常');
    eraLogger.error('[isUpdateEra]标识异常');
    return;
  }

  //await (window as any).EjsTemplate.refreshWorldInfo();
  await new Promise(resolve => setTimeout(resolve, waitTime));

  const originalPresetName = getLoadedPresetName();
  /**
   * 构建提示词并请求AI分析
   */
  try {
    toastr.info('正在构建提示词并请求AI分析');
    eraLogger.info('正在构建提示词并请求AI分析');
    const user_input = `本次不生成故事，处理ERA变量`;
    const is_should_stream = false;
    const promptInjects = [
      {
        id: '1145141919',
        position: 'in_chat',
        depth: 0,
        should_scan: false,
        role: 'user',
        content: user_input,
      },
    ];
    eraLogger.log('模型来源: ', modelSource.value);
    //1.sample 或者 external的预设模型与in_use不一致时，先切换预设
    if (
      modelSource.value == 'sample' &&
      simplePresetName.value !== 'in_use' &&
      originalPresetName !== simplePresetName.value
    ) {
      const isLoadPresetSuccess = loadPreset(simplePresetName.value);
      if (!isLoadPresetSuccess) {
        toastr.error(`预设切换失败: ${simplePresetName.value} 请检查预设是否存在`);
      } else {
        toastr.info(`已切换预设至: ${simplePresetName.value}`);
      }
    }
    if (
      modelSource.value == 'external' &&
      customModelSettings.value.presetName !== 'in_use' &&
      originalPresetName !== customModelSettings.value.presetName
    ) {
      const isLoadPresetSuccess = loadPreset(customModelSettings.value.presetName);
      if (!isLoadPresetSuccess) {
        toastr.error(`预设切换失败: ${customModelSettings.value.presetName} 请检查预设是否存在`);
      } else {
        toastr.info(`已切换预设至: ${customModelSettings.value.presetName}`);
      }
    }

    const result =
      modelSource.value == 'sample'
        ? await PromptUtil.sendPrompt(user_input, promptInjects, maxMessageFloor.value, is_should_stream, null, null)
        : modelSource.value == 'profile'
          ? await PromptUtil.sendPrompt(
              user_input,
              promptInjects,
              maxMessageFloor.value,
              is_should_stream,
              null,
              profileSetting.value,
            )
          : await PromptUtil.sendPrompt(
              user_input,
              promptInjects,
              maxMessageFloor.value,
              is_should_stream,
              customModelSettings.value,
              null,
            );

    eraLogger.log('接收到的分析结果原文: ', result);

    await handleMessageMerge(result);

    toastr.success('分步分析处理完成');
  } catch (e) {
    toastr.error('分步分析处理失败');
    eraLogger.error('分步分析处理失败: ', e);
  } finally {
    if (
      (modelSource.value == 'sample' &&
        simplePresetName.value !== 'in_use' &&
        originalPresetName !== simplePresetName.value) ||
      (modelSource.value == 'external' &&
        customModelSettings.value.presetName !== 'in_use' &&
        originalPresetName !== customModelSettings.value.presetName)
    ) {
      loadPreset(originalPresetName);
      toastr.info(`切回预设: ${originalPresetName}`);
    }
    getAsyncAnalyzeStore().isUpdateEra = false;

    //await eventEmit(ERAEvents.FORCE_SYNC);

    await setChatMessages([{ message_id: getLastMessageId() }]);
    //发送事件-声明该部分消息已处理完毕
    await eventEmit(ERAEvents.FORCE_SYNC);
    await eventEmit('kat:handle_era_finished');
  }
};

/**
 * 处理世界书内容的排除
 */
export const handleLoresFilter = async (lores: any) => {
  eraLogger.log('WORLDINFO_ENTRIES_LOADED: ', lores);
  await WorldInfoUtil.removeLoresByArray(lores, loreList.value, isReversed.value);
};
