# ForumKit Theming Reference

ForumKit uses CSS custom properties (design tokens) that cross the shadow DOM boundary.
Pass them via the `theme` prop or attribute; the component maps each token to an internal
CSS variable used throughout its shadow DOM.

---

## The 12 tokens

| Token (prop key) | CSS variable | Default value | Role |
|---|---|---|---|
| `primaryColor` | `--fk-color-primary` | `#6200ee` | Primary buttons, links, focus rings (10% accent) |
| `primaryColorHover` | `--fk-color-primary-hover` | `#4b00b5` | Hover/active state of primary colour |
| `backgroundColor` | `--fk-color-bg` | `#ffffff` | Page-level background (60% neutral) |
| `surfaceColor` | `--fk-color-surface` | `#f8fafc` | Cards, inputs, panels (30% structure) |
| `borderColor` | `--fk-color-border` | `#e2e8f0` | Dividers, input borders |
| `textPrimary` | `--fk-color-text-primary` | `#1a1a2e` | Body text, headings |
| `textSecondary` | `--fk-color-text-secondary` | `#64748b` | Timestamps, meta text, placeholders |
| `fontFamily` | `--fk-font-family` | `system-ui, -apple-system, 'Segoe UI', sans-serif` | All text inside the component |
| `fontSize` | `--fk-font-size-base` | `15px` | Base font size; other sizes scale from this |
| `borderRadius` | `--fk-border-radius` | `8px` | Cards, buttons, inputs |
| `spacing` | `--fk-spacing-base` | `20px` | Container padding and gap scale |
| `shadowLevel` | N/A | `'sm'` | Convenience value: `'none'` `'sm'` `'md'` `'lg'` — maps to a box-shadow |

---

## Colour rule

ForumKit follows the **60-30-10 rule**:
- **60%** `backgroundColor` — main canvas, thread list background
- **30%** `surfaceColor` / `borderColor` — cards, inputs, structure
- **10%** `primaryColor` — CTA buttons, active states, selected chips only

Avoid setting `primaryColor` to a neutral grey; it will make the UI unusable for users who rely on colour contrast to identify interactive elements.

---

## Usage

### Plain HTML (attribute)

```html
<forum-kit
  forum-id="my-forum"
  token="<host-jwt>"
  theme='{"primaryColor":"#0d6efd","backgroundColor":"#f8f9fa","textPrimary":"#212529"}'
></forum-kit>
```

### React (prop)

```tsx
import { ForumKit } from '@forumkit/sdk-web/react';

<ForumKit
  forumId="my-forum"
  token={userToken}
  theme={{
    primaryColor: '#0d6efd',
    backgroundColor: '#f8f9fa',
    textPrimary: '#212529',
    borderRadius: '4px',
  }}
/>
```

### Vue (prop)

```vue
<template>
  <ForumKit
    forum-id="my-forum"
    :token="userToken"
    :theme="forumTheme"
  />
</template>

<script setup lang="ts">
import { ForumKit } from '@forumkit/sdk-web/vue';

const forumTheme = {
  primaryColor: '#0d6efd',
  backgroundColor: '#f8f9fa',
  textPrimary: '#212529',
  borderRadius: '4px',
};
</script>
```

### Applying tokens via CSS (advanced)

If you prefer to set tokens in a stylesheet rather than via the prop, inject them on
the host element or any ancestor:

```css
forum-kit {
  --fk-color-primary: #0d6efd;
  --fk-color-bg: #f8f9fa;
  --fk-color-text-primary: #212529;
  --fk-border-radius: 4px;
}
```

This works because CSS custom properties inherit through the shadow DOM boundary.

---

## Dark mode example

```ts
const darkTheme = {
  primaryColor: '#bb86fc',
  primaryColorHover: '#9a5fe8',
  backgroundColor: '#121212',
  surfaceColor: '#1e1e1e',
  borderColor: '#2c2c2c',
  textPrimary: '#e1e1e1',
  textSecondary: '#9e9e9e',
  shadowLevel: 'none' as const,
};
```

---

## Contrast requirements

ForumKit targets WCAG 2.1 AA as a minimum. When choosing custom colours, ensure:

- `textPrimary` on `backgroundColor`: contrast ratio >= 4.5:1
- `textSecondary` on `backgroundColor`: contrast ratio >= 3:1
- `primaryColor` on `backgroundColor` (button text is white): contrast ratio of white on `primaryColor` >= 3:1

Tools: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/),
[Coolors Contrast Checker](https://coolors.co/contrast-checker).
