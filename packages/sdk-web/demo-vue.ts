import { createApp, defineComponent, ref, h } from 'vue';
import { ForumKit } from './src/wrappers/vue';

const App = defineComponent({
  setup() {
    const token = ref('');
    const loaded = ref(false);

    function load(): void {
      if (token.value.trim()) loaded.value = true;
    }

    return (): ReturnType<typeof h> => {
      if (loaded.value) {
        return h(ForumKit, {
          forumId: '0e53b554-16b0-47cf-983a-db68c02b362e',
          token: token.value,
          apiUrl: 'http://localhost:3000',
        });
      }

      return h('div', { id: 'setup' }, [
        h('h1', 'Vue 3 integration'),
        h('p', [
          'Run ',
          h('code', 'node gen-tokens.mjs'),
          ' from the repo root to get a fresh JWT, then paste it below and click Load Forum.',
        ]),
        h('textarea', {
          placeholder: 'Paste JWT here...',
          value: token.value,
          onInput: (e: Event) => { token.value = (e.target as HTMLTextAreaElement).value; },
        }),
        h('button', { onClick: load }, 'Load Forum'),
      ]);
    };
  },
});

createApp(App).mount('#app');
