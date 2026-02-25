export interface EraMetaRule {
  EditRefuse:{
    [key: string]: {
      path: string; //要处理的路径，支持.*匹配 角色.*.特殊状态.好感度; *表示对根节点进行处理
      enable: boolean; //是否启用
      isRecursive: boolean; //是否递归检查
    };
  },
  DeleteRefuse:{
    [key: string]: {
      path: string;
      enable: boolean;
      isRecursive: boolean;
    }
  },
  InsertRefuse:{
    [key: string]: {
      path: string;
      enable: boolean;
      isRecursive: boolean;
    }
  },
}
