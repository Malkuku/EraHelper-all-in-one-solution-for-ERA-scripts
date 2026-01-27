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
              component: () => import('../components/AsyncAnalyze/Selection.vue'), // 模块1：规则选择
            },
            {
              path: 'ApiConfig',
              name: 'ApiConfig',
              component: () => import('../components/AsyncAnalyze/ApiConfigEditor.vue'), // 模块2：API配置 (待实现)
            },
            {
              path: 'Editor',
              name: 'RuleEditor',
              component: () => import('../components/AsyncAnalyze/StagedRuleEditor.vue'), // 模块3：规则编辑 (待实现)
            }
          ]
        },
        {
          path: '/EraDataHandle',
          name: 'EraDataHandle',
          component: () => import('../view/EraDataHandle.vue'),
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
      ],
    },
  ],
});
