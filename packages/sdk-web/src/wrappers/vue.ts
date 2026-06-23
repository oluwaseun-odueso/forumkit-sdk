import { defineComponent, h, onMounted, watchEffect, ref, type PropType } from 'vue';
import type { ThemeTokens } from '@forumkit/types';
import '../components/forum-kit';

export const ForumKit = defineComponent({
  name: 'ForumKit',
  props: {
    forumId: { type: String, required: true },
    token:   { type: String, required: true },
    theme:   { type: Object as PropType<ThemeTokens>, default: undefined },
    apiUrl:  { type: String, default: undefined },
    class:   { type: String, default: undefined },
  },
  setup(props) {
    const elRef = ref<HTMLElement | null>(null);

    function applyProps(): void {
      const el = elRef.value;
      if (!el) return;
      el.setAttribute('forum-id', props.forumId);
      el.setAttribute('token', props.token);
      if (props.theme !== undefined) {
        el.setAttribute('theme', JSON.stringify(props.theme));
      } else {
        el.removeAttribute('theme');
      }
      if (props.apiUrl !== undefined) {
        el.setAttribute('api-url', props.apiUrl);
      } else {
        el.removeAttribute('api-url');
      }
    }

    onMounted(applyProps);
    watchEffect(applyProps);

    return (): ReturnType<typeof h> => h('forum-kit', { ref: elRef, class: props.class });
  },
});
