import './rich-text-toolbar.css';

const BUTTONS = ['B', 'I', 'S', 'x²', 'T', '🔗', '🖼', '▶', '•', '1.', '"', '⚠', '▦'];

/** Static rich-text toolbar matching the mockup — formatting is not wired to a real editor. */
export default function RichTextToolbar() {
  return (
    <div className="fk-rte-toolbar">
      {BUTTONS.map((label, i) => (
        <button key={i} type="button" className="fk-rte-btn" aria-label={label}>{label}</button>
      ))}
      <div className="fk-rte-spacer" />
      <button type="button" className="fk-rte-btn" aria-label="More">⋯</button>
    </div>
  );
}
