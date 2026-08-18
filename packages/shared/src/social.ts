// Social/professional link platform config, shared by web + mobile. Lifted from
// sdk-web's edit-profile-modal.tsx (PLATFORM_CONFIG + toSuffix/toUrl). Only the
// data (prefix/placeholder) and url<->suffix helpers live here; each platform
// maps the platform name to its own icon component (web/RN differ).

export type SocialPlatform =
  | 'Website' | 'Portfolio' | 'GitHub' | 'LinkedIn' | 'Twitter/X' | 'Behance' | 'Dribbble' | 'Other';

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  'Website', 'Portfolio', 'GitHub', 'LinkedIn', 'Twitter/X', 'Behance', 'Dribbble', 'Other',
];

type PlatformMeta = { prefix: string; placeholder: string };

const PLATFORM_META: Record<SocialPlatform, PlatformMeta> = {
  'Website':   { prefix: '',                         placeholder: 'https://yoursite.com' },
  'Portfolio': { prefix: '',                         placeholder: 'https://portfolio.io' },
  'GitHub':    { prefix: 'https://github.com/',      placeholder: 'username' },
  'LinkedIn':  { prefix: 'https://linkedin.com/in/', placeholder: 'your-name' },
  'Twitter/X': { prefix: 'https://x.com/',           placeholder: 'username' },
  'Behance':   { prefix: 'https://behance.net/',     placeholder: 'username' },
  'Dribbble':  { prefix: 'https://dribbble.com/',    placeholder: 'username' },
  'Other':     { prefix: '',                         placeholder: 'https://' },
};

export function socialPrefix(platform: SocialPlatform): string {
  return PLATFORM_META[platform].prefix;
}

export function socialPlaceholder(platform: SocialPlatform): string {
  return PLATFORM_META[platform].placeholder;
}

// Full URL -> the editable suffix shown in the input (strips the known prefix).
export function socialToSuffix(platform: SocialPlatform, url: string): string {
  const { prefix } = PLATFORM_META[platform];
  return prefix && url.startsWith(prefix) ? url.slice(prefix.length) : url;
}

// Editable suffix -> the full URL persisted (adds the prefix, or https:// for
// prefix-less platforms).
export function socialToUrl(platform: SocialPlatform, suffix: string): string {
  const { prefix } = PLATFORM_META[platform];
  const trimmed = suffix.trim().replace(/^\/+|\/+$/g, '');
  if (!prefix) {
    return trimmed && !/^https?:\/\//i.test(trimmed) ? `https://${trimmed}` : trimmed;
  }
  return `${prefix}${trimmed}`;
}
