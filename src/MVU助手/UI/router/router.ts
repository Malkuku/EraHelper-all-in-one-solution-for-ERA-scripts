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
