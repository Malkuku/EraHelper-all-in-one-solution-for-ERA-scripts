<template>
  <div class="simulation-test" :class="{ 'dark-mode': uiStore.darkMode }">
    <div class="section-header">
      <h2>测试模拟</h2>
    </div>
    <div class="test-controls">
      <!--      <button class="btn" @click="openSimulationTestModal">打开模拟测试</button>-->
      <button class="btn" @click="openDslTester">打开 Rule 测试器 (所有规则)</button>
    </div>
    <!--TODO 目前功能上与DSL类似而且有bug,暂时弃用-->
    <!--    &lt;!&ndash; 模拟测试模态框 &ndash;&gt;-->
    <!--    <SimulationTestModal-->
    <!--      :visible="showSimulationModal"-->
    <!--      :imported-data="statData"-->
    <!--      :result-data="testResultData"-->
    <!--      :execution-log="executionLog"-->
    <!--      @update:visible="showSimulationModal = $event"-->
    <!--      @close="closeSimulationModal"-->
    <!--      @run-test="handleRunTest"-->
    <!--    />-->

    <!-- DSL 测试器模态框 -->
    <DslTesterModal
      :visible="showDslTester"
      :era-data-rule="currentTesterRules"
      :stat-data="statData"
      :result-text="testResultText"
      @update:visible="showDslTester = $event"
      @close="closeDslTester"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import DslTesterModal from './DSLTesterModal.vue';
import SimulationTestModal from './SimulationTestModal.vue';
import { EraDataHandler } from '../../../EraDataHandler/EraDataHandler';
import { EraDataRule } from '../../../EraDataHandler/types/EraDataRule';
import { useUiStore } from '@/ERA助手/stores/UIStore';

const uiStore = useUiStore();

const props = defineProps({
  rules: {
    type: Object,
    required: true,
  },
  statData: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update-stat-data']);

// 测试结果
const testResultData = ref<any>();
const executionLog = ref<string>('');

// 模拟测试模态框相关
const showSimulationModal = ref(false);

// DSL 测试器相关
const showDslTester = ref(false);
const testResultText = ref<string>('');

// 当前传递给 DSLTester 的规则数据
// 默认为 props.rules，但可以通过 openDslTesterWithRules 方法覆盖
const currentTesterRules = ref<EraDataRule>({});

// 监听 props.rules 变化，如果当前没有打开测试器，同步更新
watch(
  () => props.rules,
  newRules => {
    if (!showDslTester.value) {
      currentTesterRules.value = newRules as EraDataRule;
    }
  },
  { deep: true, immediate: true },
);

// 处理运行测试事件
const handleRunTest = async (testData: any) => {
  try {
    const snap = JSON.parse(JSON.stringify(testData));
    const clone = JSON.parse(JSON.stringify(testData));
    const result = await EraDataHandler.applyRule(clone, snap, props.rules as EraDataRule);
    testResultData.value = result.data;
    executionLog.value = result.log;

    if (typeof toastr !== 'undefined') {
      toastr.success('测试运行成功', '');
    }
  } catch (error) {
    if (typeof toastr !== 'undefined') {
      toastr.error('测试运行失败: ' + error, '');
    }
  }
};

const openSimulationTestModal = () => {
  testResultData.value = null;
  executionLog.value = '';
  showSimulationModal.value = true;
};

// 默认打开方法：使用所有规则
const openDslTester = () => {
  currentTesterRules.value = props.rules as EraDataRule;
  showDslTester.value = true;
  testResultText.value = '';
};

// 【新增】暴露给父组件的方法：使用特定规则打开
const openDslTesterWithRules = (specificRules: EraDataRule) => {
  currentTesterRules.value = specificRules;
  showDslTester.value = true;
  testResultText.value = '';
};

const closeDslTester = () => {
  showDslTester.value = false;
};

const closeSimulationModal = () => {
  showSimulationModal.value = false;
};

// 暴露方法给父组件
defineExpose({
  openDslTesterWithRules,
});
</script>

<style scoped lang="scss">
.simulation-test {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 12px 0;
}

.test-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.test-controls .btn {
  padding: 8px 16px;
  font-size: 14px;
}

/* 按钮样式 */
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

.btn.small {
  padding: 3px 8px;
  font-size: 11px;
}

/* 黑夜模式 */
.dark-mode {
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
  }
}
</style>
