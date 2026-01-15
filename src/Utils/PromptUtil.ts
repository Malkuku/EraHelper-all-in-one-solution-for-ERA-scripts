const sendPrompt = async (
  user_input: string,
  promptInjects: any[],
  max_chat_history: number,
  is_should_stream: boolean,
  customModelSettings: any,
  profileSetting: any,
) => {
  //因为部分预设会用到 {{lastUserMessage}}，因此进行修正。
  SillyTavern.registerMacro('lastUserMessage', () => {
    return user_input;
  });

  //如果profileSetting不为空，先切换预设
  let tempProfileSetting;
  try {
    if (profileSetting) {
      console.log('切换预设', profileSetting);
      tempProfileSetting = ((await (window as any).SillyTavern.executeSlashCommands('/profile')) as any).pipe;
      await (window as any).SillyTavern.executeSlashCommands(`/profile ${profileSetting}`);
    }

    // 发送请求以获取结果
    const result = await generate({
      user_input: user_input,
      injects: promptInjects,
      max_chat_history: max_chat_history,
      should_stream: is_should_stream,
      ...(customModelSettings && {
        custom_api: {
          apiurl: customModelSettings.baseURL,
          key: customModelSettings.apiKey,
          model: customModelSettings.modelName,
          temperature: Number(customModelSettings.temperature),
          //frequency_penalty: Number(customModelSettings.frequencyPenalty),
          //presence_penalty: Number(customModelSettings.presencePenalty),
          max_tokens: Number(customModelSettings.maxTokens),
        },
      }),
    });
    return result;
  } finally {
    //恢复预设
    if (profileSetting) {
      await (window as any).SillyTavern.executeSlashCommands(`/profile ${tempProfileSetting}`);
    }
    //关闭替换
    SillyTavern.unregisterMacro('lastUserMessage');
  }
};

export const PromptUtil = {
  sendPrompt,
};
