export interface TaskResult {
  taskName: string;
  extractedContent: string;
  mergeSettings: any;
  variableEdits: Record<string, any>;
}
