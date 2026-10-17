<template>
  <RouterView />
  <!-- 引入自定义弹窗组件 (建议放在 App.vue 全局，如果只在此处用则放这里) -->
  <CustomModal />
  <TaskNotifications />

</template>
<script setup lang="ts">
import CustomModal from '@/MVU助手/UI/components/Dialog/CustomModal.vue';
import TaskNotifications from './components/AsyncAnalyze/TaskNotifications.vue';
</script>
