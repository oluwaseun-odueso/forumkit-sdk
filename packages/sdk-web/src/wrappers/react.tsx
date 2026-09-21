import React, { useEffect, useRef } from 'react';
import type { ForumKitConfig } from '@forumkit/types';
import type { ForumKitElement } from '../components/forum-kit';
import type { ForumKitMascot } from '../views/hooks/use-theme';
import '../components/forum-kit';

type ForumKitProps = Omit<ForumKitConfig, 'mascot'> & {
  mascot?: ForumKitMascot;
  className?: string;
};

/**
 * React wrapper for the <forum-kit> Web Component.
 *
 * Usage:
 *   import { ForumKit } from '@forumkit/sdk-web/react';
 *
 *   <ForumKit
 *     forumId="my-forum"
 *     token={userToken}
 *     theme={{ primaryColor: '#6200EE' }}
 *   />
 */
export function ForumKit({
  forumId,
  token,
  theme,
  apiUrl,
  platform,
  brandName,
  brandNameFontFamily,
  brandNameFontSize,
  mascot,
  onLogout,
  getToken,
  className,
}: ForumKitProps): React.JSX.Element {
  const ref = useRef<ForumKitElement>(null);

  // onLogout/getToken/mascot can't be JSX/HTML attributes (functions and a
  // component reference, respectively) — still assigned imperatively as JS
  // properties. forum-id/token/theme/api-url/platform/brand-name/
  // brand-name-font-family are passed as JSX props below instead of set
  // here: a ref-based useEffect only runs after mount, which is strictly
  // after connectedCallback already ran and read (missing) attributes —
  // passing them as JSX props lets React set them as part of creating the
  // DOM node, before it's connected, so connectedCallback sees real values.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.onLogout = onLogout;
    el.getToken = getToken;
    el.mascot = mascot;
  }, [onLogout, getToken, mascot]);

  return (
    // @ts-expect-error — custom element not in JSX intrinsic elements
    <forum-kit
      ref={ref}
      class={className}
      forum-id={forumId}
      token={token}
      theme={theme ? JSON.stringify(theme) : undefined}
      api-url={apiUrl || undefined}
      platform={platform || undefined}
      brand-name={brandName || undefined}
      brand-name-font-family={brandNameFontFamily || undefined}
      brand-name-font-size={brandNameFontSize || undefined}
    />
  );
}
