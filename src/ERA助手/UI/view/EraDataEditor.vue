<template>
  <div class="stat-data-editor" :class="{ 'dark-mode': uiStore.darkMode }">
    <!-- 顶部工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <button class="toolbar-btn" :disabled="loading" @click="loadData">
          <svg class="icon" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M13.5 8C13.5 11.0376 11.0376 13.5 8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5C9.37676 2.5 10.6396 3.01285 11.596 3.85652L12.5 2.5H14V6H10.5V4.5H11.7906C11.0431 3.53528 9.8382 3 8.5 3C6.01472 3 4 5.01472 4 7.5C4 9.98528 6.01472 12 8.5 12C10.9853 12 13 9.98528 13 7.5H14.5C14.5 11.0376 11.0376 14.5 8 14.5C4.96243 14.5 2.5 12.0376 2.5 9C2.5 5.96243 4.96243 3.5 8 3.5C9.4619 3.5 10.7872 4.11611 11.7227 5.12644L12.5 6H14V2.5H12.5L11.596 3.85652Z"
            />
          </svg>
          刷新数据
        </button>
        <button class="toolbar-btn" :disabled="saving || !hasChanges" @click="saveData">
          <svg class="icon" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M13.3536 2.64645C13.5488 2.84171 13.5488 3.15829 13.3536 3.35355L6.35355 10.3536C6.15829 10.5488 5.84171 10.5488 5.64645 10.3536L3.64645 8.35355C3.45118 8.15829 3.45118 7.84171 3.64645 7.64645C3.84171 7.45118 4.15829 7.45118 4.35355 7.64645L6 9.29289L12.6464 2.64645C12.8417 2.45118 13.1583 2.45118 13.3536 2.64645Z"
            />
          </svg>
          保存更改
        </button>

        <!-- 使用 FileImportExport 组件替换原来的导入/导出按钮 -->
        <FileImportExport
          ref="fileImportExportRef"
          import-text="导入JSON"
          export-text="导出草稿"
          :require-confirm="true"
          @import-confirmed="handleFileLoaded"
          @export-data="exportDraft"
        />
      </div>
      <div class="toolbar-right">
        <div v-if="hasChanges" class="change-indicator">
          <span class="dot"></span>
          有未保存的更改
        </div>
        <div class="status-text" :class="{ 'status-loading': loading }">
          {{ statusMessage }}
        </div>
      </div>
    </div>

    <!-- 搜索框 -->
    <PathSearch v-model="searchQuery" />

    <!-- 数据展示区域 -->
    <div class="data-container">
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <div>正在加载数据...</div>
      </div>

      <div v-else-if="!currentData || Object.keys(currentData).length === 0" class="empty-container">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
          <path d="M7 7h10v2H7zm0 4h10v2H7zm0 4h7v2H7z" />
        </svg>
        <div class="empty-text">暂无数据</div>
        <button class="empty-btn" @click="loadData">点击加载数据</button>
      </div>

      <div v-else class="json-editor-wrapper">
        <!-- 工具按钮区 -->
        <div class="edit-tools">
          <div class="mode-buttons">
            <button class="mode-btn" :class="{ active: editMode === 'tree' }" @click="switchToTreeMode">
              <svg class="mode-icon" viewBox="0 0 16 16" fill="currentColor">
                <path
                  d="M14 2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2zm0 5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zm0 5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2z"
                />
              </svg>
              树形视图
            </button>
            <button class="tool-btn" :disabled="editMode !== 'tree'" @click="openAddFieldModal">
              <svg class="tool-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a1 1 0 0 1 1 1v6h6a1 1 0 0 1 0 2H9v6a1 1 0 0 1-2 0V9H1a1 1 0 0 1 0-2h6V1a1 1 0 0 1 1-1z" />
              </svg>
              添加字段
            </button>
            <button class="mode-btn" :class="{ active: editMode === 'raw' }" @click="editMode = 'raw'">
              <svg class="mode-icon" viewBox="0 0 16 16" fill="currentColor">
                <path
                  d="M13.5 2h-11C1.67 2 1 2.67 1 3.5v9c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5v-9c0-.83-.67-1.5-1.5-1.5zM4 4h8v1H4V4zm0 3h8v1H4V7zm0 3h8v1H4v-1z"
                />
              </svg>
              原始JSON
            </button>
            <button
              class="tool-btn"
              :class="{ danger: editMode === 'raw' }"
              :disabled="editMode !== 'raw'"
              @click="formatJson"
            >
              <svg class="tool-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M5 1h6v2H5V1zm0 12h6v2H5v-2zM1 5h2v6H1V5zm12 0h2v6h-2V5z" />
              </svg>
              格式化
            </button>
          </div>
        </div>

        <!-- 树形编辑视图 -->
        <div v-if="editMode === 'tree'" class="tree-editor">
          <!-- 使用重构后的 JsonTree 组件 -->
          <JsonTreeEdit v-model:data="currentData" :search-query="searchQuery" />
        </div>

        <!-- 原始JSON编辑视图 -->
        <div v-else class="raw-editor">
          <div class="editor-header">
            <span class="editor-info">编辑原始JSON数据</span>
            <!-- v-model 改为 rawJsonString -->
            <span class="editor-size">字符数：{{ rawJsonString.length }}</span>
          </div>
          <!-- v-model 改为 rawJsonString，并添加 @input 事件 -->
          <textarea
            v-model="rawJsonString"
            class="json-editor"
            placeholder="在此输入或编辑JSON数据..."
            @input="validateRawJson"
          ></textarea>
          <!-- jsonParseError 的来源也变了 -->
          <div v-if="jsonParseError" class="json-error">
            <svg class="error-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM7 3h2v7H7V3zm0 9h2v2H7v-2z" />
            </svg>
            JSON语法错误：{{ jsonParseError }}
          </div>
        </div>
      </div>
    </div>

    <EraConfirmModal
      v-model:visible="showConfirmModal"
      :title="confirmTitle"
      :content="confirmContent"
      :type="confirmType"
      @confirm="handleConfirmAction"
      @cancel="handleCancelAction"
    />

    <!-- 添加字段模态框 -->
    <div v-if="showAddFieldModal" class="modal-overlay">
      <div class="modal">
        <h3>添加新字段</h3>

        <div class="modal-body">
          <div class="form-group">
            <label>字段路径：</label>
            <input v-model="newField.path" type="text" placeholder="例如：user.info.name" class="form-input" />
            <div class="form-hint">支持多层路径，用点分隔。如果父路径不存在会自动创建对象。</div>
          </div>

          <div class="form-group">
            <label>值类型：</label>
            <select v-model="newField.type" class="form-select" @change="onTypeChange">
              <option value="string">字符串</option>
              <option value="number">数字</option>
              <option value="boolean">布尔值</option>
              <option value="null">空值 (null)</option>
              <option value="object">对象 (JSON)</option>
              <option value="array">数组</option>
            </select>
          </div>

          <!-- 字符串输入 -->
          <div v-if="newField.type === 'string'" class="form-group">
            <label>字符串值：</label>
            <input v-model="newField.value" type="text" placeholder="输入字符串值" class="form-input" />
          </div>

          <!-- 数字输入 -->
          <div v-else-if="newField.type === 'number'" class="form-group">
            <label>数字值：</label>
            <input
              v-model.number="newField.value"
              type="number"
              placeholder="输入数字值"
              class="form-input"
              step="any"
            />
          </div>

          <!-- 布尔值选择 -->
          <div v-else-if="newField.type === 'boolean'" class="form-group">
            <label>布尔值：</label>
            <div class="boolean-options">
              <label class="boolean-option">
                <input v-model="newField.value" type="radio" :value="true" />
                <span>true</span>
              </label>
              <label class="boolean-option">
                <input v-model="newField.value" type="radio" :value="false" />
                <span>false</span>
              </label>
            </div>
          </div>

          <!-- 空值显示 -->
          <div v-else-if="newField.type === 'null'" class="form-group">
            <div class="null-info">
              <svg class="null-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0z" />
              </svg>
              <span>该字段将被设置为 null</span>
            </div>
          </div>

          <!-- JSON对象/数组编辑器 -->
          <div v-else-if="newField.type === 'object' || newField.type === 'array'" class="form-group">
            <label>{{ newField.type === 'object' ? '对象值 (JSON)' : '数组值' }}：</label>
            <div class="json-editor-container">
              <div class="json-editor-header">
                <span>JSON编辑器</span>
                <button v-if="isValidJson" class="btn-small" title="格式化JSON" @click="formatJsonValue">
                  <svg class="format-icon" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5 1h6v2H5V1zm0 12h6v2H5v-2zM1 5h2v6H1V5zm12 0h2v6h-2V5z" />
                  </svg>
                </button>
              </div>
              <textarea
                v-model="newField.jsonValue"
                class="json-editor-input"
                :placeholder="getJsonPlaceholder()"
                rows="6"
                @input="validateJson"
              ></textarea>
              <div v-if="jsonError" class="json-error">
                <svg class="error-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM7 3h2v7H7V3zm0 9h2v2H7v-2z" />
                </svg>
                <span>JSON错误：{{ jsonError }}</span>
              </div>
              <div v-else-if="newField.jsonValue.trim()" class="json-success">
                <svg class="success-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path
                    d="M13.3536 2.64645C13.5488 2.84171 13.5488 3.15829 13.3536 3.35355L6.35355 10.3536C6.15829 10.5488 5.84171 10.5488 5.64645 10.3536L3.64645 8.35355C3.45118 8.15829 3.45118 7.84171 3.64645 7.64645C3.84171 7.45118 4.15829 7.45118 4.35355 7.64645L6 9.29289L12.6464 2.64645C12.8417 2.45118 13.1583 2.45118 13.3536 2.64645Z"
                  />
                </svg>
                <span>有效的JSON格式</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn primary" :disabled="!isValidInput" @click="confirmAddField">添加</button>
          <button class="btn" @click="cancelAddField">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'; // 引入 watch
import { useEraEditStore } from '../../stores/EraEditStore';
import { cloneDeep, set } from 'lodash';
import EraConfirmModal from '../components/Dialog/EraConfirmModal.vue';
import FileImportExport from '../components/File/FileImportExport.vue';
import PathSearch from '../components/Search/PathSearch.vue';
import { eraLogger } from '../../utils/EraHelperLogger';
import JsonTreeEdit from '../components/JsonNode/JsonTreeEdit.vue';
import { useUiStore } from '@/ERA助手/stores/UIStore';

// Store
const eraEditStore = useEraEditStore();
const uiStore = useUiStore();

// --- 响应式数据 ---
const loading = ref(false);
const saving = ref(false);
const currentData = ref<any>(null);
const originalData = ref<any>(null);
const searchQuery = ref('');
const editMode = ref<'tree' | 'raw'>('tree');

// --- 核心改动：解耦 Raw 模式的状态 ---
const rawJsonString = ref(''); // 用于绑定 textarea
const jsonParseError = ref(''); // 用于显示 raw editor 的实时语法错误

// 组件引用
const fileImportExportRef = ref<InstanceType<typeof FileImportExport> | null>(null);

// --- 监听 editMode 变化，处理状态同步 ---
watch(editMode, (newMode, oldMode) => {
  // 从其他模式切换到 raw 模式
  if (newMode === 'raw') {
    try {
      rawJsonString.value = JSON.stringify(currentData.value, null, 2);
      jsonParseError.value = ''; // 清除旧的错误
    } catch (e) {
      rawJsonString.value = '无法序列化当前数据。';
      jsonParseError.value = e instanceof Error ? e.message : String(e);
    }
  }

  // 从 raw 模式切换回 tree 模式（这个逻辑移到按钮点击事件中，以便可以阻止切换）
});

// 新的切换到树形视图的方法
function switchToTreeMode() {
  if (jsonParseError.value) {
    alert('JSON格式无效，无法切换到树形视图。请先修正错误。');
    return;
  }
  try {
    // 在切换前，用 raw 编辑器的内容更新 currentData
    currentData.value = JSON.parse(rawJsonString.value || '{}');
    editMode.value = 'tree';
  } catch (e: any) {
    // 理论上不会进入这里，因为有 jsonParseError 保护，但作为保险
    jsonParseError.value = e.message;
    alert('JSON格式无效，无法切换到树形视图。请先修正错误。');
  }
}

// 在 raw 模式下输入时实时验证，但不更新 currentData
function validateRawJson() {
  try {
    JSON.parse(rawJsonString.value);
    jsonParseError.value = '';
  } catch (e: any) {
    jsonParseError.value = e.message;
  }
}

const statusMessage = ref('就绪');

// --- 确认弹窗相关 (无变化) ---
const showConfirmModal = ref(false);
const confirmTitle = ref('');
const confirmContent = ref('');
const confirmType = ref<'confirm' | 'alert'>('confirm');
const pendingAction = ref<() => void>(() => {});

function openConfirmModal(
  title: string,
  content: string,
  type: 'confirm' | 'alert' = 'confirm',
  onConfirm?: () => void,
) {
  confirmTitle.value = title;
  confirmContent.value = content;
  confirmType.value = type;
  showConfirmModal.value = true;
  pendingAction.value = onConfirm || (() => {});
}

function handleConfirmAction() {
  pendingAction.value();
  pendingAction.value = () => {};
}

function handleCancelAction() {
  pendingAction.value = () => {};
}

// --- 文件处理 (简化) ---
function handleFileLoaded(content: string) {
  try {
    currentData.value = JSON.parse(content);
    statusMessage.value = `成功导入数据`;
  } catch (error) {
    eraLogger.error('导入数据失败:', error);
    statusMessage.value = '导入失败，请检查文件格式';
    alert(`导入失败：${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// --- 计算属性 (简化) ---
const hasChanges = computed(() => {
  // 在 raw 模式下，只要字符串与原始数据不同，就认为有更改
  if (editMode.value === 'raw') {
    // 如果有语法错误，也算作有更改，允许用户保存（如果他们修复了）
    if (jsonParseError.value) return true;
    try {
      // 比较格式化后的字符串
      return rawJsonString.value !== JSON.stringify(originalData.value, null, 2);
    } catch {
      return true; // 序列化失败也算有更改
    }
  }
  // 在 tree 模式下，比较对象
  try {
    return JSON.stringify(currentData.value) !== JSON.stringify(originalData.value);
  } catch {
    return false;
  }
});

// --- 数据操作 (简化) ---
function exportDraft() {
  if (!currentData.value) return;
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, -5);
    const filename = `era-stat-data-${timestamp}.json`;
    const dataStr = JSON.stringify(currentData.value, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    statusMessage.value = '草稿导出成功';
  } catch (error) {
    eraLogger.error('导出草稿失败:', error);
    statusMessage.value = '导出草稿失败';
  }
}

async function loadData() {
  try {
    loading.value = true;
    statusMessage.value = '正在加载数据...';
    const data = await eraEditStore.getStatData();
    currentData.value = data;
    originalData.value = cloneDeep(data);
    statusMessage.value = `数据已加载`;
  } catch (error) {
    eraLogger.error('加载数据失败:', error);
    statusMessage.value = '加载失败';
    currentData.value = null;
  } finally {
    loading.value = false;
  }
}

async function saveData() {
  if (!hasChanges.value) {
    openConfirmModal('提示', '没有需要保存的更改', 'alert');
    return;
  }

  // 如果在 raw 模式下且有语法错误，直接阻止保存
  if (editMode.value === 'raw' && jsonParseError.value) {
    statusMessage.value = 'JSON格式错误，无法保存';
    alert('JSON格式错误，请修正后再保存！');
    return;
  }

  openConfirmModal('保存确认', '是否保存所有更改？', 'confirm', async () => {
    try {
      saving.value = true;
      statusMessage.value = '正在保存...';

      // 如果当前是 raw 模式，需要从 rawJsonString 解析数据来保存
      const dataToSave = editMode.value === 'raw' ? JSON.parse(rawJsonString.value) : currentData.value;

      await eraEditStore.saveEraEdit(dataToSave);

      // 保存成功后，更新 originalData 和 currentData
      originalData.value = cloneDeep(dataToSave);
      currentData.value = dataToSave; // 确保 currentData 与保存后的一致

      statusMessage.value = '保存成功';
      setTimeout(() => {
        statusMessage.value = '就绪';
      }, 3000);
    } catch (error) {
      eraLogger.error('保存失败:', error);
      statusMessage.value = '保存失败';
    } finally {
      saving.value = false;
    }
  });
}

function formatJson() {
  if (editMode.value !== 'raw' || jsonParseError.value) return;
  try {
    const parsed = JSON.parse(rawJsonString.value);
    rawJsonString.value = JSON.stringify(parsed, null, 2);
  } catch (error) {
    eraLogger.error('格式化JSON失败:', error);
    // 理论上不会进入这里
  }
}

// --- 添加字段模态框 (逻辑无大变化) ---
const showAddFieldModal = ref(false);
const jsonError = ref('');
const isValidJson = ref(false);

interface NewField {
  path: string;
  type: 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';
  value: string | number | boolean | null;
  jsonValue: string;
}

const newField = ref<NewField>({ path: '', type: 'string', value: '', jsonValue: '' });

const isValidInput = computed(() => {
  const { path, type } = newField.value;
  if (!path.trim()) return false;
  switch (type) {
    case 'string':
      return typeof newField.value.value === 'string';
    case 'number':
      return typeof newField.value.value === 'number' || String(newField.value.value).trim() !== '';
    case 'boolean':
      return typeof newField.value.value === 'boolean';
    case 'null':
      return true;
    case 'object':
    case 'array':
      return isValidJson.value && newField.value.jsonValue.trim() !== '';
    default:
      return false;
  }
});

function onTypeChange() {
  const type = newField.value.type;
  switch (type) {
    case 'string':
      newField.value.value = '';
      break;
    case 'number':
      newField.value.value = 0;
      break;
    case 'boolean':
      newField.value.value = true;
      break;
    case 'null':
      newField.value.value = null;
      break;
    case 'object':
      newField.value.jsonValue = '{}';
      validateJson();
      break;
    case 'array':
      newField.value.jsonValue = '[]';
      validateJson();
      break;
  }
}

function getJsonPlaceholder() {
  return newField.value.type === 'object' ? '{\n  "key": "value"\n}' : '[\n  "item1", 123\n]';
}

function validateJson() {
  const jsonStr = newField.value.jsonValue.trim();
  if (!jsonStr) {
    jsonError.value = '';
    isValidJson.value = false;
    return;
  }
  try {
    const parsed = JSON.parse(jsonStr);
    if (
      newField.value.type === 'object' &&
      !(typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null)
    ) {
      jsonError.value = '必须是有效的JSON对象';
      isValidJson.value = false;
    } else if (newField.value.type === 'array' && !Array.isArray(parsed)) {
      jsonError.value = '必须是有效的JSON数组';
      isValidJson.value = false;
    } else {
      jsonError.value = '';
      isValidJson.value = true;
    }
  } catch (error) {
    jsonError.value = error instanceof Error ? error.message : '无效的JSON格式';
    isValidJson.value = false;
  }
}

function formatJsonValue() {
  if (!isValidJson.value) return;
  try {
    const parsed = JSON.parse(newField.value.jsonValue);
    newField.value.jsonValue = JSON.stringify(parsed, null, 2);
  } catch (error) {
    jsonError.value = error instanceof Error ? error.message : '无效的JSON格式';
  }
}

function openAddFieldModal() {
  newField.value = { path: '', type: 'string', value: '', jsonValue: '' };
  jsonError.value = '';
  isValidJson.value = false;
  showAddFieldModal.value = true;
}

function cancelAddField() {
  showAddFieldModal.value = false;
}

function confirmAddField() {
  if (!isValidInput.value) {
    alert('请输入有效的字段路径和值');
    return;
  }
  try {
    let finalValue: any;
    switch (newField.value.type) {
      case 'string':
        finalValue = newField.value.value;
        break;
      case 'number':
        finalValue = Number(newField.value.value);
        if (isNaN(finalValue)) {
          alert('请输入有效的数字');
          return;
        }
        break;
      case 'boolean':
        finalValue = newField.value.value;
        break;
      case 'null':
        finalValue = null;
        break;
      case 'object':
      case 'array':
        finalValue = JSON.parse(newField.value.jsonValue);
        break;
    }
    // 直接修改 currentData，JsonTreeEdit 会自动响应
    set(currentData.value, newField.value.path, finalValue);
    statusMessage.value = '已添加新字段';
    showAddFieldModal.value = false;
  } catch (error) {
    eraLogger.error('添加字段失败:', error);
    alert(`添加字段失败：${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// --- 生命周期 ---
onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
.stat-data-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  /* 添加过渡效果，使切换更平滑 */
  transition:
    background-color 0.3s,
    color 0.3s;
}

/* 输入框和选择框 */
input,
select,
textarea,
option {
  background: #f8fafc;
  color: #1e293b;
  border-color: #e2e8f0;
}

/* 选择框选项 */
select option {
  background: #f8fafc;
  color: #1e293b;
}

/* 输入框聚焦状态 */
input:focus,
select:focus,
textarea:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* 只读和禁用状态 */
input:disabled,
select:disabled,
textarea:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}

/* 占位符颜色 */
input::placeholder,
textarea::placeholder {
  color: #94a3b8;
  opacity: 1;
}

// 工具栏
.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.toolbar-left {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: white;
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

  &:hover:not(:disabled) {
    background: #f1f5f9;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon {
    width: 12px;
    height: 12px;
  }
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.change-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  font-size: 12px;
  color: #92400e;

  .dot {
    width: 6px;
    height: 6px;
    background: #f59e0b;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  font-size: 12px;
  color: #64748b;

  &.status-loading {
    color: #6366f1;
  }
}

// 数据容器
.data-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.loading-container,
.empty-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #64748b;
}

.loading-container .spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-container .empty-icon {
  width: 64px;
  height: 64px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
}

.empty-btn {
  padding: 8px 16px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #4f46e5;
    transform: translateY(-1px);
  }
}

.json-editor-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.json-tree {
  padding: 16px;
  min-width: 100%;
}

// 编辑模式选择器
.edit-mode-selector {
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.mode-buttons {
  display: flex;
  gap: 8px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  font-size: 11px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  &.active {
    background: #6366f1;
    border-color: #6366f1;
    color: white;
  }

  .mode-icon {
    width: 14px;
    height: 14px;
  }
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  font-size: 11px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.danger {
    color: #dc2626;
    border-color: #fecaca;

    &:hover {
      background: #fef2f2;
      border-color: #fca5a5;
    }
  }

  .tool-icon {
    width: 12px;
    height: 12px;
  }
}

.edit-tools {
  display: flex;
  margin-top: 5px;
  margin-bottom: 5px;
  gap: 6px;
}

// 树形编辑器
.tree-editor {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  width: 100%;
  padding-top: 10px;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
}

.json-tree {
  padding: 16px;
  width: 100%;
  min-width: fit-content;
}

// 原始JSON编辑器
.raw-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f8fafc;
  color: #1e293b;
  min-height: 350px;
}

.editor-header {
  padding: 12px 16px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #1e293b;
}

.editor-info {
  font-size: 14px;
  color: #64748b;
}

.editor-size {
  font-size: 13px;
  color: #94a3b8;
  font-family: monospace;
}

.json-editor {
  flex: 1;
  padding: 16px;
  outline: none;
  resize: none;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 14px;
  line-height: 1.5;
  background: #ffffff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  margin: 16px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: auto;
  white-space: pre;
  min-width: min-content;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;

    &:hover {
      background: #94a3b8;
    }
  }

  &::placeholder {
    color: #94a3b8;
  }
}

.json-error {
  padding: 12px 16px;
  background: #fef2f2;
  border-top: 1px solid #fecaca;
  color: #dc2626;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;

  .error-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
}

// 添加字段模态框样式
.modal-overlay {
  position: absolute;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 450px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal h3 {
  margin: 0;
  padding: 24px 24px 16px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 1px solid #e2e8f0;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b;
  background: #f8fafc;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
}

.form-select option {
  background: #f8fafc;
  color: #1e293b;
}

// 布尔值选项
.boolean-options {
  display: flex;
  gap: 16px;
}

.boolean-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #1e293b;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  input {
    margin: 0;
  }

  span {
    font-size: 14px;
    color: #1e293b;
  }
}

// 空值显示
.null-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;

  .null-icon {
    width: 16px;
    height: 16px;
    color: #64748b;
  }

  span {
    font-size: 14px;
    color: #64748b;
  }
}

// JSON编辑器容器
.json-editor-container {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
}

.json-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;

  span {
    font-size: 12px;
    font-weight: 500;
    color: #1e293b;
  }
}

.btn-small {
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .format-icon {
    width: 12px;
    height: 12px;
    color: #64748b;
  }
}

.json-editor-input {
  width: 100%;
  padding: 12px;
  border: none;
  outline: none;
  resize: vertical;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: white;
  color: #1e293b;
  min-height: 120px;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: #94a3b8;
  }
}

.json-error,
.json-success {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 12px;
  border-top: 1px solid #fecaca;
}

.json-error {
  background: #fef2f2;
  color: #dc2626;

  .error-icon {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
}

.json-success {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #bbf7d0;

  .success-icon {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
}

.modal-actions {
  padding: 16px 24px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
  color: #475569;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn.primary {
  background: #6366f1;
  border-color: #6366f1;
  color: white;

  &:hover:not(:disabled) {
    background: #4f46e5;
    border-color: #4f46e5;
  }
}

/*
   已删除 @media (prefers-color-scheme: dark) 块
   这个块之前强制在系统深色模式下使用浅色主题，导致 .dark-mode 类失效
*/

/* 使用 :deep 选择器穿透子组件样式 */
:deep(.json-node-editor) {
  input,
  select,
  textarea,
  option {
    background: inherit;
    color: inherit;
    border-color: inherit;
  }
}

// 响应式
@media (max-width: 640px) {
  .editor-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .toolbar-right {
    justify-content: space-between;
  }

  .edit-mode-selector {
    flex-direction: column;
    align-items: stretch;
  }

  .mode-buttons,
  .edit-tools {
    flex-wrap: wrap;
  }

  .editor-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .modal {
    width: 95%;
    margin: 10px;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}

/* 黑夜模式 */
.dark-mode {
  .stat-data-editor {
    background: #1f2937;
    color: #e2e8f0;
  }

  input,
  select,
  textarea,
  option,
  .form-input,
  .form-select,
  .form-textarea,
  .boolean-option {
    background: #374151 !important;
    color: #e2e8f0 !important;
    border-color: #4b5563 !important;
  }

  select option,
  .form-select option {
    background: #374151 !important;
    color: #e2e8f0 !important;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: #818cf8 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
  }

  input:disabled,
  select:disabled,
  textarea:disabled {
    background: #4b5563 !important;
    color: #9ca3af !important;
  }

  input::placeholder,
  textarea::placeholder {
    color: #9ca3af !important;
  }

  .editor-toolbar {
    background: linear-gradient(135deg, #1f2937 0%, #374151 100%) !important;
    border-bottom: 1px solid #4b5563;
  }

  .toolbar-btn {
    background: #374151;
    color: #cbd5e1;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);

    &:hover:not(:disabled) {
      background: #4b5563;
    }
  }

  .change-indicator {
    background: #713f12;
    border-color: #f59e0b;
    color: #fef3c7;

    .dot {
      background: #f59e0b;
    }
  }

  .status-text {
    color: #9ca3af;

    &.status-loading {
      color: #818cf8;
    }
  }

  .loading-container .spinner {
    border: 3px solid #4b5563;
    border-top-color: #818cf8;
  }

  .empty-container {
    color: #9ca3af;
  }

  .empty-btn {
    background: #4f46e5;
    color: #f8fafc;

    &:hover {
      background: #6366f1;
    }
  }

  .mode-btn {
    border: 1px solid #4b5563;
    background: #374151;
    color: #cbd5e1;

    &:hover {
      background: #4b5563;
      border-color: #6b7280;
    }

    &.active {
      background: #4f46e5;
      border-color: #4f46e5;
      color: #f8fafc;
    }
  }

  .tool-btn {
    border: 1px solid #4b5563;
    background: #374151;
    color: #cbd5e1;

    &:hover:not(:disabled) {
      background: #4b5563;
      border-color: #6b7280;
    }

    &.danger {
      color: #fca5a5;
      border-color: #7f1d1d;

      &:hover {
        background: #450a0a;
        border-color: #991b1b;
      }
    }
  }

  .tree-editor {
    &::-webkit-scrollbar-track {
      background: #374151;
    }
    &::-webkit-scrollbar-thumb {
      background: #4b5563;
      border-radius: 4px;
    }
    &::-webkit-scrollbar-thumb:hover {
      background: #6b7280;
    }
  }

  .raw-editor {
    background: #1f2937 !important;
    color: #e2e8f0 !important;
  }

  .editor-header {
    background: #374151 !important;
    border-bottom: 1px solid #4b5563;
    color: #e2e8f0 !important;
  }

  .editor-info {
    color: #9ca3af !important;
  }

  .editor-size {
    color: #6b7280 !important;
  }

  .json-editor {
    background: #1f2937 !important;
    color: #e2e8f0 !important;
    border-color: #4b5563 !important;
  }

  .json-error {
    background: rgba(153, 27, 27, 0.2);
    color: #fca5a5;
    border-top-color: #7f1d1d;
  }

  .json-success {
    background: rgba(6, 95, 70, 0.2);
    color: #6ee7b7;
    border-top-color: #065f46;
  }

  .modal-overlay {
    background: rgba(0, 0, 0, 0.75);
  }

  .modal {
    background: #1f2937;
    border: 1px solid #4b5563;
    color: #e2e8f0;
  }

  .modal h3 {
    color: #e2e8f0;
    border-bottom-color: #4b5563;
  }

  .form-group label {
    color: #cbd5e1;
  }

  .modal .form-input,
  .modal .form-select {
    background: #374151;
    color: #e2e8f0;
    border-color: #4b5563;
  }

  .null-info {
    background: #374151;
    border-color: #4b5563;
    span {
      color: #9ca3af;
    }
  }

  .json-editor-container {
    background: #1f2937 !important;
    border-color: #4b5563;
  }

  .json-editor-header {
    background: #374151 !important;
    border-bottom-color: #4b5563;
    span {
      color: #e2e8f0 !important;
    }
  }

  .btn-small {
    background: #374151;
    border-color: #4b5563;
    &:hover {
      background: #4b5563;
    }
    .format-icon {
      color: #cbd5e1;
    }
  }

  .json-editor-input {
    background: #1f2937 !important;
    color: #e2e8f0 !important;
  }

  .modal .btn {
    background: #4b5563;
    color: #e2e8f0;
    border-color: #6b7280;

    &:hover {
      background: #374151;
    }

    &.primary {
      background: #4f46e5;
      color: #f8fafc;

      &:hover {
        background: #6366f1;
      }
    }
  }

  .modal-actions {
    border-top-color: #4b5563;
  }
}
</style>
