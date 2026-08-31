import React, { useEffect, useRef } from 'react';
import type { ForumKitConfig } from '@forumkit/types';
import type { ForumKitElement } from '../components/forum-kit';
import '../components/forum-kit';

type ForumKitProps = ForumKitConfig & {
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
export function ForumKit({ forumId, token, theme, apiUrl, platform, onLogout, className }: ForumKitProps): React.JSX.Element {
  const ref = useRef<ForumKitElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.setAttribute('forum-id', forumId);
    el.setAttribute('token', token);
    if (theme) el.setAttribute('theme', JSON.stringify(theme));
    if (apiUrl) el.setAttribute('api-url', apiUrl);
    if (platform) el.setAttribute('platform', platform);
    el.onLogout = onLogout;
  }, [forumId, token, theme, apiUrl, platform, onLogout]);

  return (
    // @ts-expect-error — custom element not in JSX intrinsic elements
    <forum-kit ref={ref} class={className} />
  );
}
