import { useEffect, useRef } from 'react';
import type { ForumKitConfig } from '@forumkit/types';
import '../components/forum-kit.js';

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
export function ForumKit({ forumId, token, theme, apiUrl, className }: ForumKitProps): JSX.Element {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.setAttribute('forum-id', forumId);
    el.setAttribute('token', token);
    if (theme) el.setAttribute('theme', JSON.stringify(theme));
    if (apiUrl) el.setAttribute('api-url', apiUrl);
  }, [forumId, token, theme, apiUrl]);

  return (
    // @ts-expect-error — custom element not in JSX intrinsic elements
    <forum-kit ref={ref} class={className} />
  );
}
