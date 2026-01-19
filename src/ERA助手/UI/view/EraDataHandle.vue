<template>
  <div class="era-rule-panel" :class="{ 'dark-mode': uiStore.darkMode }">
    <!-- 页签导航 -->
    <div class="sticky-tabs">
      <div class="tabs-container">
        <button v-for="t of tabs" :key="t.key" :class="{ active: activeTab === t.key }" @click="activeTab = t.key">
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- 路径收集框 -->
    <PathCollection
      v-if="activeTab === 'rule'"
      :is-expanded="isPathCollectionExpanded"
      @update:is-expanded="isPathCollectionExpanded = $event"
    />

    <div class="content-wrapper">
      <!-- 1.查看数据 -->
      <section v-show="activeTab === 'data'">
        <h2>当前 stat_data（只读）</h2>
        <!-- 添加搜索框 -->
        <PathSearch v-model="searchQuery" />
        <div class="json-tree-box">
          <!-- 修改为使用过滤后的数据 -->
          <json-tree :data="filteredStatData" @send-path="collectPath" />
        </div>
      </section>

      <!-- 2. 查看规则（默认折叠） -->
      <section v-show="activeTab === 'list'">
        <h2>规则列表</h2>
        <div class="rule-list-controls">
          <div class="import-export-buttons">
            <FileImportExport
              import-text="导入规则"
              export-text="导出规则"
              confirm-title="导入规则"
              confirm-content="导入新规则将覆盖当前所有规则，确定要继续吗？"
              @export-data="exportRules"
              @import-confirmed="handleImportConfirmed"
              @error="handleImportError"
            />
          </div>
          <div class="sort-controls">
            <button class="btn small" @click="sortRulesAndHandles">按优先级排序</button>
          </div>
        </div>

        <!-- 空状态提示 -->
        <div v-if="Object.keys(rules).length === 0" class="empty-state">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
            />
          </svg>
          <p>暂无规则，从规则编辑添加或从数据面板中选择路径</p>
        </div>

        <!-- 规则列表 -->
        <div v-for="(rule, key) in rules" :key="key" class="rule-card">
          <div class="rule-header" @click="toggleFold(key)">
            <div class="rule-name-container">
              <span class="rule-name">{{ key }}</span>
              <span class="rule-status">
                <span class="status-indicator" :class="{ enabled: rule.enable !== false }"></span>
                {{ rule.enable !== false ? '启用' : '禁用' }}
              </span>
            </div>
            <div class="rule-actions">
              <!-- 恢复测试按钮 -->
              <button class="btn small" @click.stop="testDslExpressions(key)">测试 DSL</button>
              <span class="fold-indicator">{{ folded[key] ? '›' : '⌄' }}</span>
            </div>
          </div>

          <div v-show="!folded[key]" class="rule-body">
            <div class="rule-content">
              <div class="rule-details">
                <div><strong>路径:</strong> {{ rule.path }}</div>
                <div v-if="rule.if"><strong>条件:</strong> {{ DSLHandler.exprToHumanView(rule.if) }}</div>
                <div><strong>顺序:</strong> {{ rule.order }}</div>
                <div v-if="rule.loop"><strong>循环:</strong> {{ rule.loop }}</div>
                <div v-if="rule.range"><strong>范围:</strong> [{{ rule.range[0] }}, {{ rule.range[1] }}]</div>
                <div v-if="rule.limit"><strong>限制:</strong> [{{ rule.limit[0] }}, {{ rule.limit[1] }}]</div>
              </div>

              <!-- handle 列表 -->
              <div v-if="rule.handle && Object.keys(rule.handle).length > 0" class="handle-list">
                <div v-for="(handleItem, handleKey) in rule.handle" :key="handleKey" class="handle-item">
                  <div class="handle-header">
                    <strong>{{ handleKey }}</strong> (顺序: {{ handleItem.order }}, 循环: {{ handleItem.loop }})
                  </div>
                  <div v-if="handleItem.if" class="handle-expression">
                    <strong>条件:</strong> {{ DSLHandler.exprToHumanView(handleItem.if) }}
                  </div>
                  <div class="handle-expression">
                    <strong>操作:</strong> {{ DSLHandler.exprToHumanView(handleItem.op) }}
                  </div>
                </div>
              </div>

              <div class="rule-operations">
                <button class="btn primary" @click="editRule(key)">编辑</button>
                <button class="btn" @click="copyRule(key)">复制</button>
                <button class="btn danger" @click="confirmDelete(key)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. 编辑规则 -->
      <section v-show="activeTab === 'rule'">
        <h2>{{ editingKey ? '更新规则' : '新增规则' }}</h2>
        <div class="field">
          <label>规则名称:</label>
          <input v-model="editingKey" placeholder="唯一标识，如: 好感度rule1" />
        </div>
        <div class="field">
          <label>启用:</label>
          <div class="toggle-switch">
            <input id="enableToggle" v-model="draft.enable" type="checkbox" :true-value="true" :false-value="false" />
            <label for="enableToggle" class="toggle-label"></label>
          </div>
        </div>
        <div class="field">
          <label>路径:</label>
          <input v-model="draft.path" placeholder="角色.*.特殊状态.好感度" />
        </div>
        <div class="field">
          <label>排序:</label>
          <input v-model.number="draft.order" type="number" min="0" />
        </div>
        <div class="field">
          <label>规则循环:</label>
          <input v-model.number="draft.loop" type="number" min="1" max="10000" placeholder="1" />
        </div>
        <div class="field">
          <label>范围限制:</label>
          <div class="range-limit-inputs">
            <div class="input-group">
              <input v-model.number="draftRangeMin" type="number" placeholder="最小值" />
            </div>
            <div class="input-group">
              <input v-model.number="draftRangeMax" type="number" placeholder="最大值" />
            </div>
          </div>
        </div>
        <div class="field">
          <label>变化值限制:</label>
          <div class="range-limit-inputs">
            <div class="input-group">
              <input v-model.number="draftLimitNeg" type="number" placeholder="负向最大" />
            </div>
            <div class="input-group">
              <input v-model.number="draftLimitPos" type="number" placeholder="正向最大" />
            </div>
          </div>
        </div>
        <div class="handle-area">
          <div class="handle-area-header">
            <span>handle 运算配置:</span>
            <button class="btn small primary" @click="addHandle">+ 添加 handle</button>
          </div>

          <!-- 规则级别的 IF 配置 -->
          <div
            class="rule-if-config"
            style="
              margin-bottom: 15px;
              padding: 10px;
              background: rgba(0, 0, 0, 0.03);
              border-radius: 4px;
              border: 1px dashed #ccc;
            "
          >
            <div class="dsl-builder">
              <div class="dsl-header">
                <label
                  >规则执行条件 (if):
                  <span style="font-size: 0.85em; color: #666; font-weight: normal"
                    >(控制所有Handle规则的执行)</span
                  ></label
                >
                <div class="dsl-actions">
                  <button class="btn small" @click="openDslBuilder('if', '__RULE_IF__')">构建</button>
                  <button v-if="draft.if" class="btn small danger" @click="draft.if = ''">清空</button>
                </div>
              </div>
              <div class="dsl-preview">
                <input
                  v-model="draft.if"
                  readonly
                  placeholder="点击'构建'按钮创建规则条件表达式，为空则默认执行"
                  @click="openDslBuilder('if', '__RULE_IF__')"
                />
              </div>
            </div>
          </div>

          <div v-for="(handleItem, handleKey) in draft.handle" :key="handleKey" class="handle-editor">
            <div class="handle-header" @click="handleFolded[handleKey] = !handleFolded[handleKey]">
              <input v-model="handleNames[handleKey]" placeholder="handle名称" class="handle-name-input" />
              <div class="handle-actions">
                <span class="fold-indicator">{{ handleFolded[handleKey] ? '›' : '⌄' }}</span>
                <button class="btn small danger" @click.stop="delHandle(handleKey)">删除</button>
              </div>
            </div>
            <div v-show="!handleFolded[handleKey]">
              <div class="field">
                <label>处理顺序:</label>
                <input v-model.number="handleItem.order" type="number" min="0" placeholder="0" />
              </div>
              <div class="field">
                <label>循环次数:</label>
                <input v-model.number="handleItem.loop" type="number" min="1" max="1000" placeholder="1" />
              </div>
              <div class="dsl-builder">
                <div class="dsl-header">
                  <label>条件表达式 (if):</label>
                  <div class="dsl-actions">
                    <button class="btn small" @click="openDslBuilder('if', handleKey)">构建</button>
                    <button v-if="handleItem.if" class="btn small danger" @click="clearDsl('if', handleKey)">
                      清空
                    </button>
                  </div>
                </div>
                <div class="dsl-preview">
                  <input
                    v-model="handleItem.if"
                    readonly
                    placeholder="点击'构建'按钮创建条件表达式"
                    @click="openDslBuilder('if', handleKey)"
                  />
                </div>
              </div>
              <div class="dsl-builder">
                <div class="dsl-header">
                  <label>操作表达式 (op):</label>
                  <div class="dsl-actions">
                    <button class="btn small" @click="openDslBuilder('op', handleKey)">构建</button>
                    <button v-if="handleItem.op" class="btn small danger" @click="clearDsl('op', handleKey)">
                      清空
                    </button>
                  </div>
                </div>
                <div class="dsl-preview">
                  <input
                    v-model="handleItem.op"
                    readonly
                    placeholder="点击'构建'按钮创建操作表达式"
                    @click="openDslBuilder('op', handleKey)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <hr />
        <div class="button-group">
          <button class="btn primary" @click="confirmSave">保存</button>
          <button class="btn" @click="cancelEdit">取消</button>
        </div>
      </section>

      <!-- 4. 测试模拟 -->
      <section v-show="activeTab === 'test'">
        <!-- 添加 ref 引用 -->
        <SimulationTest
          ref="simulationTestRef"
          :rules="rules"
          :stat-data="statData"
          @update-stat-data="updateStatData"
        />
      </section>
    </div>

    <!-- DSL 构建器模态框 -->
    <DslBuilderModal
      v-model:visible="showDslBuilder"
      v-model:expression="currentDslExpression"
      :type="dslBuilderType"
      :selected-path="draft.path || ''"
      @apply="applyDslExpression"
      @close="closeDslBuilder"
    />

    <!-- 自定义弹窗组件 -->
    <EraConfirmModal
      v-model:visible="showDeleteConfirm"
      title="确认删除"
      content="确定要删除该规则吗？此操作不可恢复"
      type="confirm"
      confirm-text="确认删除"
      cancel-text="取消"
      @confirm="executeDelete"
      @cancel="cancelDelete"
    />
    <EraConfirmModal
      v-model:visible="showDuplicateRuleConfirm"
      title="规则名称重复"
      content="已存在同名规则，是否覆盖？"
      type="confirm"
      confirm-text="覆盖"
      cancel-text="取消"
      @confirm="saveRuleWithOverwrite"
      @cancel="cancelRuleSave"
    />
    <EraConfirmModal
      v-model:visible="showDuplicateHandleConfirm"
      title="Handle名称重复"
      content="已存在同名Handle，是否覆盖？"
      type="confirm"
      confirm-text="覆盖"
      cancel-text="取消"
      @confirm="saveRuleWithOverwrite"
      @cancel="cancelRuleSave"
    />

    <!-- 消息提示 -->
    <div v-if="message" class="status-message" :class="message.type">
      {{ message.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick, computed } from 'vue';
import { useEraDataStore } from '../../stores/EraDataStore';
import { useUiStore } from '../../stores/UIStore';
import JsonTree from '../components/JsonNode/JsonTree.vue';
import { exportRulesToJson, importRulesFromJson } from '../../utils/ExportRulesUtil';
import EraConfirmModal from '../components/Dialog/EraConfirmModal.vue';
import DslBuilderModal from '../components/DSL/DSLBuilderModal.vue';
import FileImportExport from '../components/File/FileImportExport.vue';
import PathCollection from '../components/Search/PathCollection.vue';
import SimulationTest from '../components/DSL/SimulationTest.vue';
import { EraDataRule, EraDataRuleHandle } from '../../EraDataHandler/types/EraDataRule';
import { DSLHandler } from '../../EraDataHandler/DSLHandler/DSLHandler';
import PathSearch from '../components/Search/PathSearch.vue';

/* ---------- 数据 ---------- */
const statData = ref<any>({});
const rules = ref<Record<string, any>>({});
const folded = ref<Record<string, boolean>>({});
const handleFolded = ref<Record<string, boolean>>({});
const editingKey = ref<string>('');
const editKeyLocked = ref<boolean>(false);
const draft = ref<any>({
  enable: true,
  path: '',
  if: '', // 初始化 if
  order: 0,
  loop: 1,
  handle: {},
  range: [],
  limit: [],
});
const handleNames = ref<Record<string, string>>({});

// 路径收集相关
const uiStore = useUiStore();
const isPathCollectionExpanded = ref(false);

const draftRangeMin = ref<number | null | string>(null);
const draftRangeMax = ref<number | null | string>(null);
const draftLimitNeg = ref<number | null | string>(null);
const draftLimitPos = ref<number | null | string>(null);

const activeTab = ref<'data' | 'rule' | 'test' | 'list'>('data');
const showDeleteConfirm = ref(false);
const deletingKey = ref<string>('');
const showDuplicateRuleConfirm = ref(false);
const showDuplicateHandleConfirm = ref(false);
const message = ref<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

// DSL 构建器相关
const showDslBuilder = ref(false);
const dslBuilderType = ref<'if' | 'op'>('if');
const currentDslHandleKey = ref<string>('');
const currentDslExpression = ref<string>('');

// 引用子组件
const simulationTestRef = ref<InstanceType<typeof SimulationTest> | null>(null);

const tabs = [
  { key: 'data', label: '查看数据' },
  { key: 'list', label: '查看规则' },
  { key: 'rule', label: '编辑规则' },
  { key: 'test', label: '测试模拟' },
] as const;

const eraStore = useEraDataStore();

/* ---------- 生命周期 ---------- */
onMounted(async () => {
  const { stat_data } = getVariables({ type: 'chat' });
  statData.value = stat_data || {};
  await loadRules();
  Object.keys(rules.value).forEach(k => (folded.value[k] = true));
});

/* ---------- 工具函数 ---------- */
async function loadRules() {
  try {
    await eraStore.getEraDataRules();
    rules.value = eraStore.eraDataRule || {};
    showMessage('规则加载成功', 'success');
  } catch (error) {
    showMessage('规则加载失败: ' + error, 'error');
  }
}

function toggleFold(key: string) {
  folded.value[key] = !folded.value[key];
}

function editRule(key: string) {
  editingKey.value = key;
  editKeyLocked.value = true;
  deletingKey.value = key;
  draft.value = JSON.parse(JSON.stringify(rules.value[key]));

  // 确保 if 字段存在
  if (draft.value.if === undefined) {
    draft.value.if = '';
  }

  handleNames.value = {};
  if (draft.value.handle) {
    Object.keys(draft.value.handle).forEach(handleKey => {
      handleNames.value[handleKey] = handleKey;
      // 默认折叠所有 handle
      handleFolded.value[handleKey] = true;
    });
  }

  if (draft.value.enable === undefined) {
    draft.value.enable = true;
  }

  if (draft.value.range && Array.isArray(draft.value.range) && draft.value.range.length >= 2) {
    draftRangeMin.value = draft.value.range[0];
    draftRangeMax.value = draft.value.range[1];
  } else {
    draftRangeMin.value = null;
    draftRangeMax.value = null;
  }

  if (draft.value.limit && Array.isArray(draft.value.limit) && draft.value.limit.length >= 2) {
    draftLimitNeg.value = draft.value.limit[0];
    draftLimitPos.value = draft.value.limit[1];
  } else {
    draftLimitNeg.value = null;
    draftLimitPos.value = null;
  }

  activeTab.value = 'rule';
}

function confirmSave() {
  if (!editingKey.value) {
    showMessage('请输入规则名称', 'error');
    return;
  }

  // 检查规则名称是否重复（排除自身修改的情况）
  if (
    (!editKeyLocked.value || (editKeyLocked.value && editingKey.value !== deletingKey.value)) &&
    rules.value[editingKey.value]
  ) {
    showDuplicateRuleConfirm.value = true;
    return;
  }

  // 只有当存在 handle 时才检查 handle 名称是否有重复
  const handleKeys = Object.values(handleNames.value);
  if (handleKeys.length > 0) {
    const uniqueHandles = new Set(handleKeys);
    if (uniqueHandles.size !== handleKeys.length) {
      showDuplicateHandleConfirm.value = true;
      return;
    }
  }

  saveRule();
}

function saveRuleWithoutCancelEdit() {
  // 修复范围限制检查
  if (
    draftRangeMin.value !== null &&
    draftRangeMax.value !== null &&
    draftRangeMin.value !== undefined &&
    draftRangeMax.value !== undefined &&
    draftRangeMin.value !== '' &&
    draftRangeMax.value !== '' &&
    !isNaN(Number(draftRangeMin.value)) &&
    !isNaN(Number(draftRangeMax.value))
  ) {
    draft.value.range = [Number(draftRangeMin.value), Number(draftRangeMax.value)];
  } else {
    draft.value.range = [];
  }

  // 修复变化值限制检查
  if (
    draftLimitNeg.value !== null &&
    draftLimitPos.value !== null &&
    draftLimitNeg.value !== undefined &&
    draftLimitPos.value !== undefined &&
    draftLimitNeg.value !== '' &&
    draftLimitPos.value !== '' &&
    !isNaN(Number(draftLimitNeg.value)) &&
    !isNaN(Number(draftLimitPos.value))
  ) {
    draft.value.limit = [Number(draftLimitNeg.value), Number(draftLimitPos.value)];
  } else {
    draft.value.limit = [];
  }

  // 处理 handle 名称修改：删除旧的，添加新的
  const updatedHandle: Record<string, any> = {};
  Object.keys(draft.value.handle).forEach(oldKey => {
    const newKey = handleNames.value[oldKey] || oldKey;
    updatedHandle[newKey] = draft.value.handle[oldKey];

    // 如果名称发生变化，删除旧名称在folded中的记录
    if (oldKey !== newKey) {
      delete folded.value[oldKey];
      // 同时处理 handleFolded
      delete handleFolded.value[oldKey];
      // 将折叠状态转移到新键上
      handleFolded.value[newKey] = handleFolded.value[oldKey] ?? true;
    }
  });
  draft.value.handle = updatedHandle;

  // 对于规则名称修改：删除旧的，添加新的
  if (editKeyLocked.value && editingKey.value !== deletingKey.value) {
    delete rules.value[deletingKey.value];
    delete folded.value[deletingKey.value];
  }

  rules.value[editingKey.value] = JSON.parse(JSON.stringify(draft.value));
  folded.value[editingKey.value] = true;

  saveRules();
  showMessage(`规则 "${editingKey.value}" ${editKeyLocked.value ? '更新' : '添加'}成功`, 'success');
}

function saveRule() {
  saveRuleWithoutCancelEdit();
  cancelEdit();
}

function saveRuleWithOverwrite() {
  showDuplicateRuleConfirm.value = false;
  showDuplicateHandleConfirm.value = false;
  saveRule();
}

function cancelRuleSave() {
  showDuplicateRuleConfirm.value = false;
  showDuplicateHandleConfirm.value = false;
}

async function saveRules() {
  try {
    eraStore.eraDataRule = { ...rules.value };
    await eraStore.saveEraDataRules();
    showMessage('规则保存成功', 'success');
  } catch (error) {
    showMessage('保存失败: ' + error, 'error');
  }
}

function cancelEdit() {
  editingKey.value = '';
  editKeyLocked.value = false;
  draft.value = {
    enable: true,
    path: '',
    if: '', // 重置 if
    order: 0,
    loop: 1,
    handle: {},
    range: [],
    limit: [],
  };
  handleNames.value = {};
  handleFolded.value = {};
  draftRangeMin.value = null;
  draftRangeMax.value = null;
  draftLimitNeg.value = null;
  draftLimitPos.value = null;
  activeTab.value = 'list';
}

function addHandle() {
  let k = `handle_${Date.now()}`;
  while (handleNames.value[k]) {
    k = `handle_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  if (!draft.value.handle) {
    draft.value.handle = {};
  }
  draft.value.handle[k] = {
    order: 0,
    loop: 1,
    if: '',
    op: '',
  };
  handleNames.value[k] = k;
  // 新增的 handle 默认折叠
  handleFolded.value[k] = true;
}

function delHandle(k: string | number) {
  delete draft.value.handle[k];
  delete handleNames.value[k];
  delete handleFolded.value[k];
}

function collectPath(path: string) {
  if (!uiStore.collectedPaths.includes(path)) {
    uiStore.collectedPaths.push(path);
    toastr.success('路径已复制到收集箱', '');
  } else {
    toastr.warning('路径已在收集箱中', '');
  }
}

/* ---------- DSL 构建器 ---------- */
function openDslBuilder(type: 'if' | 'op', handleKey: string | number) {
  dslBuilderType.value = type;
  currentDslHandleKey.value = handleKey as string;

  // 处理规则级别的 IF
  if (handleKey === '__RULE_IF__') {
    currentDslExpression.value = draft.value.if || '';
  } else {
    // 处理 Handle 级别的 IF/OP
    const handleItem = draft.value.handle[handleKey];
    if (handleItem && handleItem[type]) {
      currentDslExpression.value = handleItem[type];
    } else {
      currentDslExpression.value = '';
    }
  }

  showDslBuilder.value = true;
}

function closeDslBuilder() {
  showDslBuilder.value = false;
  currentDslExpression.value = '';
  currentDslHandleKey.value = '';
}

function applyDslExpression(expression: string) {
  // 处理规则级别的 IF
  if (currentDslHandleKey.value === '__RULE_IF__') {
    draft.value.if = expression;
    showMessage('规则条件已应用', 'success');
    closeDslBuilder();

    // 自动保存规则但不切换界面
    if (editingKey.value) {
      saveRuleWithoutCancelEdit();
    }
    return;
  }

  if (!currentDslHandleKey.value) {
    showMessage('未找到对应的handle', 'error');
    return;
  }

  const handleItem = draft.value.handle[currentDslHandleKey.value];
  if (handleItem) {
    handleItem[dslBuilderType.value] = expression;
    showMessage('表达式已应用', 'success');

    // 自动保存规则但不切换界面
    if (editingKey.value) {
      saveRuleWithoutCancelEdit();
    }
  }

  closeDslBuilder();
}

function clearDsl(type: 'if' | 'op', handleKey: string | number) {
  const handleItem = draft.value.handle[handleKey];
  if (handleItem) {
    handleItem[type] = '';
  }
}

// 修复：实现 testDslExpressions，跳转到 SimulationTest 并调用其方法
function testDslExpressions(ruleKey: string) {
  const rule = rules.value[ruleKey];
  if (!rule) {
    showMessage('找不到指定的规则', 'warning');
    return;
  }

  // 1. 切换到测试 Tab
  activeTab.value = 'test';

  // 2. 构造单条规则对象
  const singleRuleData: EraDataRule = {
    [ruleKey]: rule,
  };

  // 3. 等待 DOM 更新后调用子组件方法
  nextTick(() => {
    if (simulationTestRef.value) {
      simulationTestRef.value.openDslTesterWithRules(singleRuleData);
    } else {
      showMessage('测试组件尚未加载', 'error');
    }
  });
}

/* ---------- 删除功能 ---------- */
function confirmDelete(key: string) {
  deletingKey.value = key;
  showDeleteConfirm.value = true;
}

function cancelDelete() {
  showDeleteConfirm.value = false;
  deletingKey.value = '';
}

async function executeDelete() {
  if (!deletingKey.value) return;

  try {
    delete rules.value[deletingKey.value];
    delete folded.value[deletingKey.value];
    await saveRules();
    showMessage(`规则 "${deletingKey.value}" 删除成功`, 'success');
  } catch (error) {
    showMessage('删除失败: ' + error, 'error');
  } finally {
    cancelDelete();
  }
}

function copyRule(key: string) {
  // 创建规则副本
  const originalRule = rules.value[key];
  const copiedRule = JSON.parse(JSON.stringify(originalRule));

  // 生成新的规则名称（添加copy后缀）
  let newKey = `${key}_copy`;
  let counter = 1;

  // 确保新名称不重复
  while (rules.value[newKey]) {
    newKey = `${key}_copy${counter}`;
    counter++;
  }

  // 添加新规则
  rules.value[newKey] = copiedRule;
  folded.value[newKey] = true;

  // 保存规则
  saveRules();

  showMessage(`规则 "${key}" 已复制为 "${newKey}"`, 'success');
}

/* ---------- 导入导出功能 ---------- */
function exportRules() {
  try {
    const exported = exportRulesToJson(rules.value);
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `era-rules-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('规则导出成功', 'success');
  } catch (error) {
    showMessage('导出失败: ' + error, 'error');
  }
}

function handleImportConfirmed(content: string, _file: File) {
  try {
    const importedRules = importRulesFromJson(content);

    if (!importedRules || typeof importedRules !== 'object') {
      showMessage('导入失败：文件格式不正确', 'error');
      return;
    }

    rules.value = importedRules;
    folded.value = {};
    Object.keys(rules.value).forEach(k => (folded.value[k] = true));
    saveRules();
    showMessage('规则导入成功', 'success');
  } catch (error) {
    showMessage('导入失败：' + error, 'error');
  }
}

function handleImportError(error: string) {
  showMessage(error, 'error');
}

/* ---------- 消息提示 ---------- */
function showMessage(text: string, type: 'success' | 'error' | 'warning') {
  message.value = { text, type };
  setTimeout(() => {
    message.value = null;
  }, 3000);
}

const updateStatData = (newStatData: any) => {
  statData.value = newStatData;
};

/**
 * 对规则和handle按order值进行排序
 * order值越小优先级越高
 */
function sortRulesAndHandles() {
  // 创建新的排序后的规则对象
  const sortedRules: Record<string, any> = {};

  // 获取所有规则键并按order排序
  const ruleKeys = Object.keys(rules.value);
  ruleKeys.sort((a, b) => {
    const orderA = rules.value[a].order ?? Number.MAX_SAFE_INTEGER;
    const orderB = rules.value[b].order ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });

  // 重新排列规则并对其handle进行排序
  ruleKeys.forEach(key => {
    const rule = { ...rules.value[key] };

    // 如果规则有handle，则对handle也进行排序
    if (rule.handle && Object.keys(rule.handle).length > 0) {
      const handleEntries = Object.entries(rule.handle as EraDataRuleHandle);

      // 按handle的order排序
      handleEntries.sort(([, handleA], [, handleB]) => {
        const orderA = handleA.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = handleB.order ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });

      // 重建handle对象
      rule.handle = {};
      handleEntries.forEach(([handleKey, handleValue]) => {
        rule.handle[handleKey] = handleValue;
      });
    }

    sortedRules[key] = rule;
  });

  // 更新rules引用以触发视图更新
  rules.value = sortedRules;

  saveRules();

  showMessage('规则和Handle已按Order排序', 'success');
}

// 添加搜索查询的响应式变量
const searchQuery = ref('');

// 添加过滤后的统计数据计算属性
const filteredStatData = computed(() => {
  if (!searchQuery.value) {
    return statData.value;
  }

  const query = searchQuery.value.toLowerCase();

  function filterObject(obj: any, path = ''): any {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'object' && !Array.isArray(obj)) {
      const filtered: Record<string, any> = {};
      let hasMatches = false;

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        // 检查键名是否匹配
        if (key.toLowerCase().includes(query)) {
          filtered[key] = value;
          hasMatches = true;
          continue;
        }

        // 递归处理对象和数组
        if (typeof value === 'object' && value !== null) {
          const filteredValue = filterObject(value, currentPath);
          if (filteredValue !== undefined) {
            filtered[key] = filteredValue;
            hasMatches = true;
          }
        }
        // 检查基本类型的值是否匹配
        else if (String(value).toLowerCase().includes(query)) {
          filtered[key] = value;
          hasMatches = true;
        }
      }

      return hasMatches ? filtered : undefined;
    } else if (Array.isArray(obj)) {
      const filtered: any[] = [];
      let hasMatches = false;

      for (let i = 0; i < obj.length; i++) {
        const currentPath = path ? `${path}[${i}]` : `[${i}]`;
        const item = obj[i];

        // 检查索引是否匹配（虽然通常不会）
        if (currentPath.toLowerCase().includes(query)) {
          filtered.push(item);
          hasMatches = true;
          continue;
        }

        // 递归处理数组元素
        if (typeof item === 'object' && item !== null) {
          const filteredItem = filterObject(item, currentPath);
          if (filteredItem !== undefined) {
            filtered.push(filteredItem);
            hasMatches = true;
          } else if (String(item).toLowerCase().includes(query)) {
            filtered.push(item);
            hasMatches = true;
          }
        }
        // 检查基本类型的值是否匹配
        else if (String(item).toLowerCase().includes(query)) {
          filtered.push(item);
          hasMatches = true;
        }
      }

      return hasMatches ? filtered : query === '' ? [] : undefined;
    }

    // 基本类型值直接检查
    return String(obj).toLowerCase().includes(query) ? obj : undefined;
  }

  const result = filterObject(statData.value);
  return result !== undefined ? result : {};
});
</script>

<style scoped lang="scss">
.era-rule-panel {
  margin: 8px 0 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  background: #f5f6fa;
  font-size: 12px;
  color: #111827;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

/* 2. 固定的页签容器 */
.sticky-tabs {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f5f6fa;
  border-bottom: 1px solid #e5e7eb;
}

.tabs-container {
  display: flex;
  gap: 8px;
  padding: 12px 16px 8px;
  background: #f5f6fa;
}

.tabs-container button {
  padding: 8px 16px;
  border: none;
  background: none;
  font-size: 13px;
  color: #111827;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  border-radius: 6px;
  font-weight: 600;
}

.tabs-container button::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -9px;
  height: 2px;
  background: #6366f1;
  transform: scaleX(0);
  transition: transform 0.2s;
}

.tabs-container button.active {
  color: #4f46e5;
  font-weight: 700;
}

.tabs-container button.active::after {
  transform: scaleX(1);
}

/* 悬停效果 */
.tabs-container button:hover {
  background: rgba(99, 102, 241, 0.08);
}

/* 3. 内容包装器 */
.content-wrapper {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px 16px;
}

/* 4. 内容区统一卡片 */
section {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
}

h2 {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

/* 5. JSON 展示区 */
.json-tree-box {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

/* 6. 规则卡片 */
.rule-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: #f9fafb;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
}

.rule-body {
  padding: 10px;
  border-top: 1px solid #e5e7eb;
}

/* 7. 表单字段 */
.field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.field label {
  width: 70px;
  font-size: 12px;
  color: #111827;
  flex-shrink: 0;
  font-weight: 500;
}

.field input,
.field select {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 12px;
  color: #111827;
  background: #ffffff;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.field input:focus,
.field select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow:
    0 0 0 3px rgba(99, 102, 241, 0.15),
    inset 0 1px 2px rgba(0, 0, 0, 0.03);
}

/* 8. handle 区 */
.handle-area {
  margin-top: 10px;
  padding: 10px;
  background: #f9fafb;
  border-radius: 6px;
}

/* 9. 按钮 */
.btn {
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s,
    transform 0.15s;
  background: #f3f4f6;
  color: #111827;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  font-weight: 500;
}

.btn:hover {
  background: #e5e7eb;
  color: #000000;
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

/* 10. 底部按钮组 */
.button-group {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
}

/* 11. 分隔线 */
hr {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 10px 0;
}

/* 12. 状态提示 */
.status-message {
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 11px;
  margin-bottom: 8px;
}

.status-message.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.status-message.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.status-message.warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

/* 14. 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #6b7280;
  font-size: 11px;
  text-align: center;
}

.empty-state svg {
  width: 24px;
  height: 24px;
  margin-bottom: 8px;
  opacity: 0.5;
}

/* 15. 滚动条美化 */
.content-wrapper::-webkit-scrollbar {
  width: 8px;
}

.content-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.content-wrapper::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.content-wrapper::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.json-tree-box::-webkit-scrollbar {
  width: 6px;
}

.json-tree-box::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.json-tree-box::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.json-tree-box::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 17. 规则操作按钮 */
.rule-operations {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.rule-operations .btn {
  flex: 1;
  min-width: 60px;
}

/* 启用状态指示器 */
.rule-status {
  margin-left: 8px;
  font-size: 11px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.status-indicator.enabled {
  background: #10b981;
}

.rule-name-container {
  display: flex;
  align-items: center;
}

/* 启用开关 */
.toggle-switch {
  position: relative;
  width: 44px;
  height: 22px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #e5e7eb;
  transition: 0.3s;
  border-radius: 22px;
}

.toggle-label:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-label {
  background-color: #10b981;
}

input:checked + .toggle-label:before {
  transform: translateX(40px);
}

.btn.small {
  padding: 3px 8px;
  font-size: 11px;
}

.rule-list-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.import-export-buttons {
  display: flex;
  gap: 8px;
}

.sort-controls {
  display: flex;
  gap: 8px;
}

/* 更新范围限制的样式 */
.range-limit-inputs {
  display: flex;
  gap: 8px;
  flex: 1;
}

.input-group {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 4px;
  min-width: 0;
}

.input-label {
  font-size: 11px;
  color: #111827;
  min-width: 28px;
  white-space: nowrap;
  font-weight: 500;
}

.range-limit-inputs input {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 11px;
  min-width: 0;
}

/* handle 区域样式更新 */
.handle-area {
  margin-top: 16px;
}

.handle-area-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.handle-editor {
  margin-bottom: 16px;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.handle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  user-select: none;
}

.handle-name-input {
  font-weight: bold;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 4px 8px;
  width: auto;
  min-width: 120px;
  color: #111827; /* 更深的颜色使文字更清晰 */
  cursor: text;
}

.handle-name-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.handle-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fold-indicator {
  font-size: 16px;
  font-weight: bold;
  color: #6b7280;
  transition: transform 0.2s;
  cursor: pointer;
}

.dsl-builder {
  margin: 8px 0;
}

.dsl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.dsl-header label {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
}

.dsl-preview input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 11px;
  background: #f8fafc;
  cursor: pointer;
  color: #111827;
  font-weight: 500;
}

.dsl-preview input:hover {
  background: #f1f5f9;
}

/* 规则列表中的 handle 显示 */
.handle-list {
  margin: 12px 0;
}

.handle-list .handle-item {
  margin-bottom: 8px;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}

.handle-expression {
  margin: 4px 0;
  font-size: 11px;
  color: #111827;
  overflow-x: auto;
  word-break: break-all;
}

.handle-expression strong {
  color: #000000;
  font-weight: 600;
}

/* 规则详情显示 */
.rule-details {
  margin-bottom: 12px;
  font-size: 12px;
  color: #111827;
}

.rule-details div {
  margin: 4px 0;
  color: #111827;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .sticky-tabs {
    padding: 0;
  }

  .tabs-container {
    padding: 10px 12px 6px;
    gap: 4px;
  }

  .tabs-container button {
    padding: 6px 10px;
    font-size: 12px;
  }

  .content-wrapper {
    padding: 0 12px 12px;
  }

  .range-limit-inputs {
    flex-direction: column;
    gap: 2px;
  }

  .input-group {
    min-width: calc(50% - 4px);
  }
}

/* 黑夜模式 */
.dark-mode {
  .era-rule-panel {
    background: #1f2937;
    color: #e5e7eb;
  }

  .sticky-tabs {
    background: #1f2937;
    border-bottom-color: #374151;
  }

  .tabs-container {
    background: #1f2937;
  }

  .tabs-container button {
    color: #9ca3af;

    &.active {
      color: #818cf8;
      border-bottom-color: #818cf8;
    }

    &:hover:not(.active) {
      color: #e5e7eb;
      background: rgba(255, 255, 255, 0.05);
    }
  }

  .json-tree-box {
    background: #111827;
    border-color: #374151;
  }

  .empty-state {
    color: #9ca3af;
  }

  .rule-card {
    background: #1f2937;
    border-color: #374151;

    .rule-header {
      background: #374151;
      color: #e5e7eb;

      &:hover {
        background: #4b5563;
      }
    }

    .rule-body {
      border-top-color: #374151;
    }

    .rule-name {
      color: #e5e7eb;
    }

    .rule-status {
      color: #9ca3af;
      .status-indicator {
        &.enabled {
          background: #10b981;
        }

        &:not(.enabled) {
          background: #ef4444;
        }
      }
    }

    .rule-content {
      .rule-details {
        color: #cbd5e1;
        div {
          color: #cbd5e1;
        }
        strong {
          color: #e5e7eb;
        }
      }

      .handle-list {
        .handle-item {
          background: #111827;
          border-color: #374151;

          .handle-header {
            color: #e5e7eb;
            strong {
              color: #fff;
            }
          }
        }
      }

      .handle-expression {
        color: #cbd5e1;
        strong {
          color: #e5e7eb;
        }
      }
    }
  }

  .btn {
    background: #374151;
    color: #e5e7eb;
    border-color: #4b5563;

    &:hover {
      background: #4b5563;
      color: #fff;
    }

    &.primary {
      background: #4f46e5;
      color: #f8fafc;

      &:hover {
        background: #6366f1;
      }
    }

    &.danger {
      background: #991b1b;
      color: #fecaca;

      &:hover {
        background: #dc2626;
        color: #fff;
      }
    }
  }

  h2 {
    color: #e5e7eb;
  }

  .field label {
    color: #cbd5e1;
  }

  .input-label {
    color: #cbd5e1;
  }

  input,
  select {
    background: #111827;
    color: #e5e7eb;
    border-color: #374151;

    &:focus {
      border-color: #818cf8;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
    }

    &::placeholder {
      color: #6b7280;
    }
  }

  /* Handle 编辑区域 */
  .handle-area {
    background: #1f2937;
    border: 1px solid #374151;

    .handle-area-header {
      color: #e5e7eb;
    }
  }

  .rule-if-config {
    background: rgba(255, 255, 255, 0.05) !important;
    border-color: #4b5563 !important;

    .dsl-header label span {
      color: #9ca3af !important;
    }
  }

  .handle-editor {
    background: #111827;
    border-color: #374151;

    .handle-header {
      border-bottom-color: #374151;

      .handle-name-input {
        background: #1f2937;
        color: #e5e7eb;
        border-color: #374151;

        &:focus {
          border-color: #818cf8;
        }
      }
    }
  }

  .dsl-builder {
    .dsl-header {
      label {
        color: #cbd5e1;
      }
    }

    .dsl-preview input {
      background: #1f2937;
      color: #e5e7eb;
      border-color: #374151;

      &:hover {
        background: #374151;
        border-color: #6b7280;
      }
    }
  }

  .toggle-switch {
    .toggle-label {
      background: #4b5563;

      &::before {
        background: #d1d5db;
      }
    }

    input:checked + .toggle-label {
      background: #4f46e5;

      &::before {
        background: #fff;
      }
    }
  }

  .fold-indicator {
    color: #9ca3af;
  }

  .status-message {
    &.success {
      background: rgba(6, 95, 70, 0.3);
      color: #a7f3d0;
      border-color: #065f46;
    }

    &.error {
      background: rgba(153, 27, 27, 0.3);
      color: #fecaca;
      border-color: #991b1b;
    }

    &.warning {
      background: rgba(146, 64, 14, 0.3);
      color: #fde68a;
      border-color: #92400e;
    }
  }
}
</style>
