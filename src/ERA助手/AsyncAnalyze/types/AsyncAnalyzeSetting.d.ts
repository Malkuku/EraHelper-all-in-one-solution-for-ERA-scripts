export interface AsyncAnalyzeSetting{ //允许规则处理
  [key: string]: {
    comment: string; //注释文本内容
    staged_setting: StagedSetting; //分步设置
    world_book: { //这一层级的world_book代表正文的世界书配置，初始化时默认会加入角色世界书的全部条目
      [key: string]:{ //世界书名称
        lores: string[]; //收集的世界书条目
        lore_regex: string; //正则条目匹配,它会将匹配到的条目加入到lores中
      }
    }
  }
}

export interface StagedSetting{
  [key: string]:{ //任务配置的名称
    comment: string; //注释文本内容
    enable: boolean; //是否启用
    order: number; //处理顺序,按照从小到大的顺序处理,如果相同则并行。默认为0
    chat_history: number; //读取的最大上下文楼层数，默认为2
    trigger_index: number; //触发的间隔楼层数，默认为1
    trigger_history: number; //上一次触发的楼层数（由系统处理，无感化）
    reroll_count: number; //失败重试次数，默认为0
    prompt: string; //发送的提示词
    world_book: {
      [key: string]:{ //世界书名称,将由系统获取和指定
        lores: string[]; //收集的世界书条目
        lore_regex: string; //正则条目匹配,它会将匹配到的条目加入到lores中
      }
    }
    merge_setting: {
      [key: string]:{ //一个写入任务
        is_inject: boolean; //是否写入正文中
        world_book: string; //目标世界书名称
        target_lore: string; //目标条目名称
        content_regex: string[]; //内容正则匹配,将从AI输出中匹配到对应的内容
        replace_regex: string; //替换正则匹配,会将匹配到的内容替换为 content_regex的匹配的内容
      }
    };
    api_config: string; //使用的api配置名称，此处关联ApiConfigSetting
  }
}

export interface ApiConfigSetting{
  [key: string]:{ //配置名称
    comment: string; //注释文本内容
    model_source: 'sample' | 'external' | 'profile'; //模型来源
    simple_preset_name: string; //simple模式下选择的预设设置
    custom_model_settings: {
      baseURL: string;
      apiKey: string;
      modelName: string;
      temperature: number;
      //frequencyPenalty: number;
      //presencePenalty: number;
      maxTokens: number;
      presetName: string;
    }
    //预设模型设置
    profileSetting: string;
  }
}

