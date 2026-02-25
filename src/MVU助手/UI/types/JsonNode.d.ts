/* ---------- 树节点类型 ---------- */
export interface JsonNodeType {
  key: string;
  value: any;
  depth: number;
  path: string;
  isLeaf: boolean;
  expanded: boolean;
  children?: JsonNodeType[];
}
