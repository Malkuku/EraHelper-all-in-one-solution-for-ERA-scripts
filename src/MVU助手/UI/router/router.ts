import { createMemoryHistory, createRouter } from 'vue-router';
import Layout from '../view/Layout.vue';

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      redirect: '/AsyncAnalyze',
      children: [
        {
          path: '/AsyncAnalyze',
          name: 'AsyncAnalyze',
          component: () => import('../view/AsyncAnalyze.vue'),
          redirect: '/AsyncAnalyze/Selection', // 默认跳转到选择页
          children: [
            {
              path: 'Selection',
              name: 'RuleSelection',
              component: () => import('../components/AsyncAnalyze/Selection.vue'),
            },
            {
              path: 'ApiConfig',
              name: 'ApiConfig',
              component: () => import('../components/AsyncAnalyze/ApiConfigEditor.vue'),
            },
            {
              path: 'Editor',
              name: 'RuleEditor',
              component: () => import('../components/AsyncAnalyze/StagedRuleEditor.vue'),
            },
            {
              path: 'TaskPool',
              name: 'TaskPool',
              component: () => import('../components/AsyncAnalyze/TaskPoolManager.vue'),
            },
            {
              path: 'Settings',
              name: 'Settings',
              component: () => import('../components/AsyncAnalyze/Settings.vue'),
            }
          ]
        },
        {
          path: '/EraDataEdit',
          name: 'EraDataEdit',
          component: () => import('../view/EraDataEditor.vue'),
        },
        {
          path: '/Version',
          name: 'Version',
          component: () => import('../view/VersionInformation.vue'),
        },
        {
          path: '/VersionUpdater',
          name: 'VersionUpdater',
          component: () => import('../view/VersionUpdater.vue'),
        }
      ],
    },
  ],
});
