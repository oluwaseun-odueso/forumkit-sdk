import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkSupersub from 'remark-supersub';
import type { Components } from 'react-markdown';
import { remarkSpoiler } from './remark-spoiler';
import './rendered-body.css';

function SpoilerSpan({ children }: { children?: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      className={`fk-spoiler${revealed ? ' fk-spoiler--revealed' : ''}`}
      onClick={() => setRevealed(true)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setRevealed(true); }}
    >
      {children}
    </span>
  );
}

const components: Components = {
  img({ src, alt }) {
    if (alt === 'video' && typeof src === 'string') {
      // eslint-disable-next-line jsx-a11y/media-has-caption
      return <video src={src} controls className="fk-rendered-media" />;
    }
    return <img src={typeof src === 'string' ? src : undefined} alt={alt} className="fk-rendered-media" />;
  },
  span({ className, children }) {
    if (className === 'fk-spoiler') return <SpoilerSpan>{children}</SpoilerSpan>;
    return <span className={className}>{children}</span>;
  },
};

type RenderedBodyProps = {
  body: string;
  className?: string;
};

/**
 * Renders a stored Markdown body via react-markdown — never dangerouslySetInnerHTML
 * or rehype-raw, so any literal HTML a user typed renders as inert text, not
 * executed markup.
 */
export default function RenderedBody({ body, className }: RenderedBodyProps) {
  return (
    <div className={`fk-rendered-body${className ? ` ${className}` : ''}`}>
      <Markdown remarkPlugins={[remarkGfm, remarkSupersub, remarkSpoiler]} components={components}>
        {body}
      </Markdown>
    </div>
  );
}
