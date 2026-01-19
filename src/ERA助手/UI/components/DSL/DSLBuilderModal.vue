<template>
  <div v-if="visible" class="dsl-builder-modal" :class="{ 'dark-mode': uiStore.darkMode }" @click.self="handleClose">
    <div class="dsl-builder-content">
      <div class="dsl-header">
        <h3>{{ title }}</h3>
        <button class="btn small" @click="handleClose">×</button>
      </div>

      <div class="dsl-builder-body">
        <!-- 左侧：构建组件 -->
        <div class="dsl-components">
          <div class="component-section">
            <h4>路径选择</h4>
            <div class="path-selection-row">
              <button class="btn small" @click="addComponent(`$[${selectedPath}]`)">当前路径</button>
              <div v-if="uiStore.collectedPaths.length > 0" class="path-dropdown-container">
                <select v-model="selectedStoredPath" class="path-dropdown light-theme" @change="handleStoredPathSelect">
                  <option value="">选择已收集路径</option>
                  <option v-for="(path, index) in uiStore.collectedPaths" :key="index" :value="path">
                    {{ path }}
                  </option>
                </select>
              </div>
            </div>
            <div v-if="selectedPath" class="selected-path">已选择: {{ selectedPath }}</div>
          </div>

          <div v-if="type === 'if'" class="component-section">
            <h4>比较运算符</h4>
            <div class="operator-grid">
              <button class="btn small" @click="addComponent('?[==]')">等于 (==)</button>
              <button class="btn small" @click="addComponent('?[!=]')">不等于 (!=)</button>
              <button class="btn small" @click="addComponent('?[>]')">大于 (>)</button>
              <button class="btn small" @click="addComponent('?[<]')">小于 (&lt;)</button>
              <button class="btn small" @click="addComponent('?[>=]')">大于等于 (&ge;)</button>
              <button class="btn small" @click="addComponent('?[<=]')">小于等于 (&le;)</button>
            </div>
          </div>

          <div class="component-section">
            <h4>算术运算符</h4>
            <div class="operator-grid">
              <button class="btn small" @click="addComponent('#[+]')">加 (+)</button>
              <button class="btn small" @click="addComponent('#[-]')">减 (-)</button>
              <button class="btn small" @click="addComponent('#[*]')">乘 (*)</button>
              <button class="btn small" @click="addComponent('#[/]')">除 (/)</button>
              <button class="btn small" @click="addComponent('#[%]')">取余 (%)</button>
              <button class="btn small" @click="addComponent('#[**]')">幂 (**)</button>
              <button class="btn small" @click="addComponent('#[=]')">赋值 (=)</button>
            </div>

            <h4>函数运算符</h4>
            <!-- 修改：使用 three-columns 类 -->
            <div class="operator-grid three-columns">
              <button class="btn small" @click="addComponent('#[{ln}]')">自然对数 (ln)</button>
              <button class="btn small" @click="addComponent('#[{log2}]')">对数 (log2)</button>
              <button class="btn small" @click="addComponent('#[{sqrt}]')">平方根 (sqrt)</button>
              <button class="btn small" @click="addComponent('#[{abs}]')">绝对值 (abs)</button>
              <button class="btn small" @click="addComponent('#[{floor}]')">向下取整 (floor)</button>
              <button class="btn small" @click="addComponent('#[{ceil}]')">向上取整 (ceil)</button>
              <button class="btn small" @click="addComponent('#[{max}]')">最大值 (max)</button>
              <button class="btn small" @click="addComponent('#[{min}]')">最小值 (min)</button>
              <button class="btn small" @click="addComponent('#[{neg}]')">取反 (neg)</button>
              <button class="btn small" @click="addComponent('#[{avg}]')">平均值 (avg)</button>
              <button class="btn small" @click="addComponent('#[{sum}]')">求和 (sum)</button>
              <button class="btn small" @click="addComponent('#[{random}]')">随机数 (random)</button>
            </div>
          </div>

          <div class="component-section">
            <h4>逻辑运算符</h4>
            <div class="operator-grid">
              <button class="btn small" @click="addComponent('?[&&]')">与 (&&)</button>
              <button class="btn small" @click="addComponent('?[||]')">或 (||)</button>
              <button class="btn small" @click="addParentheses">添加括号 ()</button>
            </div>
          </div>

          <div class="component-section">
            <h4>值</h4>
            <div class="value-input">
              <input v-model="customValue" placeholder="输入值" class="light-theme" @keyup.enter="addCustomValue" />
              <select v-model="valueType" class="light-theme">
                <option value="num">数字</option>
                <option value="str">字符串</option>
                <option value="bool">布尔值</option>
              </select>
              <button class="btn small primary" @click="addCustomValue">添加值</button>
            </div>
          </div>

          <!-- 新增：临时变量 -->
          <div class="component-section">
            <h4>临时变量</h4>
            <div class="value-input">
              <input v-model="tempVarName" placeholder="变量名" class="light-theme" @keyup.enter="addTempValue" />
              <select v-model="tempVarScope" class="light-theme">
                <option value="s">局部 (s)</option>
                <option value="g">全局 (g)</option>
              </select>
              <button class="btn small primary" @click="addTempValue">添加变量</button>
            </div>
          </div>
        </div>

        <!-- 右侧：表达式预览和编辑 -->
        <div class="dsl-preview-area">
          <!-- 新增：可读预览 -->
          <div class="expression-preview readable">
            <div class="preview-header">
              <strong>可读预览:</strong>
              <span class="hint">（仅供参考，实际逻辑以原始表达式为准）</span>
            </div>
            <div class="expression-display readable-text">
              {{ readableExpression || '暂无内容' }}
            </div>
          </div>

          <div class="expression-preview">
            <div class="preview-header">
              <strong>原始表达式:</strong>
            </div>
            <div class="expression-raw">
              <pre>{{ rawExpression }}</pre>
            </div>
          </div>

          <div class="expression-editor">
            <h4>手动编辑</h4>
            <textarea
              ref="expressionTextarea"
              v-model="localExpression"
              rows="4"
              placeholder="可以在此处手动编辑表达式..."
              class="light-theme"
              @keyup="updateCursorPosition"
              @input="updateCursorPosition"
              @click="updateCursorPosition"
            ></textarea>
            <div class="editor-actions">
              <button class="btn small danger" @click="clearExpression">清空</button>
              <button class="btn small" @click="validateExpression">验证</button>
            </div>
          </div>

          <div class="dsl-actions">
            <button class="btn primary" @click="handleApply">应用表达式</button>
            <button class="btn" @click="handleClose">取消</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { useUiStore } from '../../../stores/UIStore';
import { DSLHandler } from '../../../EraDataHandler/DSLHandler/DSLHandler';
import { eraLogger } from '../../../utils/EraHelperLogger';
import toastr from 'toastr';

interface Props {
  visible: boolean;
  type: 'if' | 'op';
  expression: string;
  selectedPath?: string;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'update:expression', value: string): void;
  (e: 'close'): void;
  (e: 'apply', expression: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  selectedPath: '',
});

// 提前声明变量以避免初始化顺序问题
const localExpression = ref(props.expression);
const customValue = ref('');
const valueType = ref<'num' | 'str' | 'bool'>('num');
const selectedStoredPath = ref('');
const expressionTextarea = ref<HTMLTextAreaElement | null>(null);
const lastCursorPosition = ref<{ start: number; end: number } | null>(null);
const isInserting = ref(false);

// 新增：临时变量相关的 ref
const tempVarName = ref('');
const tempVarScope = ref<'g' | 's'>('s');

const emit = defineEmits<Emits>();
const uiStore = useUiStore();

// 同步prop到本地ref
watch(
  () => props.expression,
  newVal => {
    localExpression.value = newVal;
  },
);

// 同步本地ref到prop
watch(localExpression, newVal => {
  emit('update:expression', newVal);
});

const title = computed(() => {
  return props.type === 'if' ? '条件表达式构建器' : '操作表达式构建器';
});

const rawExpression = computed(() => {
  // 根据类型添加对应的标签
  if (localExpression.value.trim()) {
    const tag = props.type === 'if' ? '<<if>' : '<<op>';
    const expression = localExpression.value.trim();

    // 如果表达式已经包含标签，则不重复添加
    if (expression.startsWith('<<if>') || expression.startsWith('<<op>')) {
      return expression;
    }

    return `${tag} ${expression} >`;
  }
  return localExpression.value;
});

/**
 * 将DSL表达式转换为人类可读的格式
 * 去除 $[] ?[] #[] &[] 等标识符
 */
const readableExpression = computed(() => {
  return DSLHandler.exprToHumanView(rawExpression.value);
});

function handleClose() {
  emit('update:visible', false);
  emit('close');
  customValue.value = '';
  selectedStoredPath.value = ''; // 重置选择的路径
}

function handleApply() {
  if (!localExpression.value.trim()) {
    return;
  }
  // 应用完整的表达式（包含标签）
  emit('apply', rawExpression.value);
  handleClose();
}

function addComponent(component: string) {
  isInserting.value = true;

  // 核心数据处理
  const val = localExpression.value;

  let startPos = val.length;
  let endPos = val.length;

  if (lastCursorPosition.value) {
    startPos = lastCursorPosition.value.start;
    endPos = lastCursorPosition.value.end;
  }

  const beforeCursor = val.substring(0, startPos);
  const afterCursor = val.substring(endPos);
  const separatorBefore = beforeCursor && !beforeCursor.endsWith(' ') ? ' ' : '';
  const separatorAfter = afterCursor && !afterCursor.startsWith(' ') ? ' ' : '';

  // 3. 修改数据
  localExpression.value = beforeCursor + separatorBefore + component + separatorAfter + afterCursor;

  //eraLogger.log(localExpression.value);

  // 4. 计算新的逻辑位置
  const newCursorPos = startPos + separatorBefore.length + component.length + separatorAfter.length;

  // 5. 手动更新正确的位置
  lastCursorPosition.value = { start: newCursorPos, end: newCursorPos };

  // 6. 视觉修正与解锁
  nextTick(() => {
    const textarea = expressionTextarea.value;
    if (textarea) {
      try {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        //eraLogger.log(localExpression.value);
      } catch (e) {
        eraLogger.warn('Cursor restore failed', e);
      }
    }

    // 使用 setTimeout 确保在所有 DOM 事件（包括可能的 input/change 事件）触发之后再解锁
    setTimeout(() => {
      isInserting.value = false;
    }, 0);
  });
}

function handleStoredPathSelect() {
  if (selectedStoredPath.value) {
    // 将选中的路径添加到表达式中
    addComponent(`$[${selectedStoredPath.value}]`);
    // 重置选择
    selectedStoredPath.value = '';
  }
}

function addParentheses() {
  addComponent('()');
}

function addCustomValue() {
  if (!customValue.value.trim()) {
    return;
  }

  let valueString = '';
  switch (valueType.value) {
    case 'num':
      valueString = `&[{num}${customValue.value}]`;
      break;
    case 'str':
      valueString = `&[{str}${customValue.value}]`;
      break;
    case 'bool':
      valueString = `&[{bool}${customValue.value}]`;
      break;
  }

  addComponent(valueString);
  customValue.value = '';
}

// 新增：添加临时变量的方法
function addTempValue() {
  const name = tempVarName.value.trim();
  if (!name) {
    return;
  }
  // 简单的变量名验证
  if (!/^\w+$/.test(name)) {
    toastr.error('变量名只能包含字母、数字和下划线');
    return;
  }

  const varString = `@[{${tempVarScope.value}}${name}]`;
  addComponent(varString);
  tempVarName.value = ''; // 清空输入框
}

function clearExpression() {
  localExpression.value = '';
  emit('update:expression', '');
}

// 验证DSL表达式
function validateExpression() {
  if (!localExpression.value.trim()) {
    toastr.error('表达式为空');
    return;
  }

  try {
    // 使用语法验证而不是实际执行
    const result = DSLHandler.validate(localExpression.value);

    if (result.success) {
      toastr.success(`${props.type === 'if' ? '条件' : '操作'}表达式语法验证通过`);
    } else {
      toastr.error(`${props.type === 'if' ? '条件' : '操作'}表达式语法验证失败: ${result.error}`);
      //eraLogger.error(`${props.type === 'if' ? '条件' : '操作'}表达式语法验证失败`, localExpression.value, result);
    }
  } catch (error: any) {
    toastr.error(`表达式验证出错: ${error.message}`);
    //eraLogger.error('DSL表达式验证错误:', error);
  }
}

const updateCursorPosition = () => {
  // 【关键】如果正在执行插入组件的操作，直接忽略这次光标更新
  // 这能防止 Vue 更新 DOM 导致光标跳到末尾时，错误地覆盖了我们的记录
  if (isInserting.value) {
    return;
  }

  const textarea = expressionTextarea.value;
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    lastCursorPosition.value = {
      start: start,
      end: end,
    };
  }
};

// 监听visible变化，清空自定义值和光标位置
watch(
  () => props.visible,
  newVal => {
    if (!newVal) {
      customValue.value = '';
      selectedStoredPath.value = '';
      lastCursorPosition.value = null;
      tempVarName.value = ''; // 新增：关闭时清空临时变量名
    }
  },
);
</script>

<style scoped lang="scss">
.dsl-builder-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dsl-builder-content {
  background: white;
  width: 90%;
  max-width: 1000px;
  height: 85vh; /* 稍微增加高度以容纳新区域 */
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dsl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.dsl-builder-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.dsl-components {
  flex: 0 0 40%;
  padding: 16px;
  overflow-y: auto;
  border-right: 1px solid #e2e8f0;
  background: #f9fafb;
}

.component-section {
  margin-bottom: 20px;
}

.component-section h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #111827;
  font-weight: 600;
}

.path-selection-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.path-dropdown-container {
  flex: 1;
}

.path-dropdown {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
  color: #111827;
  background: white !important;
  -webkit-text-fill-color: #111827 !important;
}

.operator-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-bottom: 8px;
}

/* 新增：三列布局 */
.operator-grid.three-columns {
  grid-template-columns: repeat(3, 1fr);
}

.value-input {
  display: flex;
  gap: 6px;
  align-items: center;
}

.value-input input,
.value-input select {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
  color: #111827;
  background: white !important;
  -webkit-text-fill-color: #111827 !important;
}

.selected-path {
  margin-top: 8px;
  padding: 6px;
  background: #e8f4fd;
  border: 1px solid #b3d4fc;
  border-radius: 4px;
  font-size: 11px;
  color: #0369a1;
  font-weight: 500;
}

.dsl-preview-area {
  flex: 0 0 60%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.expression-preview,
.expression-editor {
  font-size: 15px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
}

/* 新增：可读预览样式 */
.expression-preview.readable {
  background: #f0fdf4; /* 浅绿色背景 */
  border-color: #bbf7d0;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #374151;
}

.preview-header .hint {
  font-size: 11px;
  color: #6b7280;
  font-weight: normal;
}

.expression-display {
  padding: 10px;
  background: #f8fafc;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.readable-text {
  background: transparent;
  color: #15803d; /* 深绿色文字 */
  font-weight: 600;
  font-size: 14px;
  line-height: 1.5;
}

.expression-raw {
  font-size: 11px;
  color: #111827;
}

.expression-raw pre {
  margin: 0;
  padding: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  color: #4b5563;
  font-weight: 500;
}

.expression-editor textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  resize: vertical;
  background: white !important;
  color: #111827 !important;
  -webkit-text-fill-color: #111827 !important;
}

.editor-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.dsl-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  justify-content: flex-end;
}

.btn {
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: #f3f4f6;
  color: #111827;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  font-weight: 500;
}

.btn:hover {
  background: #e5e7eb;
  color: #000000;
}

.btn.small {
  padding: 3px 8px;
  font-size: 11px;
}

.btn.primary {
  background: #4f46e5;
  color: #ffffff;
  font-weight: 500;
}

.btn.primary:hover {
  background: #4338ca;
  color: #ffffff;
}

.btn.danger {
  background: #dc2626;
  color: #ffffff;
  font-weight: 500;
}

.btn.danger:hover {
  background: #b91c1c;
  color: #ffffff;
}

@media (max-width: 768px) {
  .dsl-builder-body {
    flex-direction: column;
  }

  .dsl-components,
  .dsl-preview-area {
    flex: none;
    width: 100%;
    height: auto;
    max-height: 50%;
    overflow-y: auto;
  }

  .dsl-components {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .operator-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .path-selection-row {
    flex-direction: column;
    align-items: stretch;
  }
}

/* 强制浅色主题 */
.light-theme {
  background: white !important;
  color: #111827 !important;
  -webkit-text-fill-color: #111827 !important;
}

/* 黑夜模式 */
.dark-mode {
  .dsl-builder-modal {
    background: rgba(0, 0, 0, 0.75);
  }

  .dsl-builder-content {
    background: #1f2937;
    color: #e2e8f0;
  }

  .dsl-header {
    background: #374151;
    border-bottom: 1px solid #4b5563;
    color: #e2e8f0;
  }

  .dsl-components {
    border-right: 1px solid #4b5563;
    background: #374151;
  }

  .component-section h4 {
    color: #e2e8f0;
  }

  /* 修复下拉框文字颜色 */
  .path-dropdown {
    background: #1f2937 !important;
    color: #e2e8f0 !important;
    -webkit-text-fill-color: #e2e8f0 !important;
    border-color: #4b5563;
  }

  /* 修复普通输入框文字颜色 */
  .value-input input,
  .value-input select {
    background: #1f2937 !important;
    color: #e2e8f0 !important;
    -webkit-text-fill-color: #e2e8f0 !important;
    border-color: #4b5563;

    &::placeholder {
      color: #9ca3af;
      -webkit-text-fill-color: #9ca3af !important;
    }
  }

  .selected-path {
    background: #1e3a8a;
    border-color: #3b82f6;
    color: #bfdbfe;
  }

  .dsl-preview-area {
    color: #e2e8f0;
  }

  .expression-preview,
  .expression-editor {
    background: #1f2937;
    border-color: #4b5563;
    color: #e2e8f0;
  }

  .expression-preview.readable {
    background: #164e63;
    border-color: #0891b2;
  }

  .preview-header {
    color: #cbd5e1;

    .hint {
      color: #9ca3af;
    }
  }

  .expression-display {
    background: #374151;
    color: #e2e8f0;
  }

  .readable-text {
    color: #6ee7b7;
  }

  .expression-raw {
    color: #e2e8f0;
  }

  .expression-raw pre {
    background: #374151;
    color: #cbd5e1;
  }

  /* 优化 DSL 文本编辑框：更深的背景，更亮的文字，强制覆盖填充色 */
  .expression-editor textarea {
    background: #0f172a !important; /* 使用更深的背景色 (Slate-900) 突出显示 */
    color: #f1f5f9 !important; /* 使用亮白色文字 (Slate-100) */
    -webkit-text-fill-color: #f1f5f9 !important; /* 关键修复：覆盖 light-theme 的填充色 */
    border-color: #4b5563;
    font-weight: 500; /* 稍微加粗字体增加清晰度 */

    &:focus {
      border-color: #818cf8;
      box-shadow: 0 0 0 1px rgba(129, 140, 248, 0.3);
    }
  }

  .btn {
    background: #4b5563;
    color: #e2e8f0;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);

    &:hover {
      background: #6b7280;
      color: #f8fafc;
    }

    &.primary {
      background: #4f46e5;
      color: #f8fafc;

      &:hover {
        background: #6366f1;
        color: #f8fafc;
      }
    }

    &.danger {
      background: #dc2626;
      color: #f8fafc;

      &:hover {
        background: #ef4444;
        color: #f8fafc;
      }
    }
  }
}
</style>
