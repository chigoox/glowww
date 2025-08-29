// Email rendering utility (Phase 1)
// Renders a React Email component to HTML + text fallback.
// Dependencies: @react-email/render, html-to-text

import { render as renderReact } from '@react-email/render';
import { htmlToText } from 'html-to-text';

/**
 * Render a React email component.
 * @param {React.ComponentType<any>} Component - React Email component
 * @param {object} props - props passed to component
 * @param {object} options
 * @param {string} [options.textOverride] - provide custom plain text
 * @param {boolean} [options.pretty] - pretty print html
 * @returns {Promise<{ html: string, text: string }>} rendered output
 */
export async function renderEmail(Component, props = {}, options = {}) {
  if (typeof Component !== 'function') {
    throw new Error('renderEmail: Component must be a function/component');
  }
  const { textOverride, pretty = false } = options;

  // Render HTML
  let html;
  try {
    html = renderReact(<Component {...props} />, { pretty });
  } catch (err) {
    throw new Error('renderEmail: HTML render failed: ' + err.message);
  }

  // Derive text version
  let text = textOverride;
  if (!text) {
    try {
      text = htmlToText(html, {
        wordwrap: 100,
        selectors: [
          { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
          { selector: 'img', format: 'skip' }
        ]
      });
    } catch (e) {
      // Fallback simple strip
      text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  return { html, text };
}

/** Convenience helper that returns subject + bodies */
export async function buildEmailPayload({ component, props, subject }) {
  if (!subject) throw new Error('buildEmailPayload: subject required');
  const { html, text } = await renderEmail(component, props);
  return { subject, html, text };
}
