import type { CSSProperties } from 'react';

// Style reset for a <button> standing in for what used to be a clickable
// <div>/<span> (accessibility Phase 2, SPEC §16). Buttons carry their own
// default background/border/font/alignment from the browser; this strips
// all of that so a button dropped into existing layout looks identical to
// the div/span it replaced, while gaining real keyboard focus and Enter/
// Space activation for free (native button behavior, no onKeyDown needed).
export const UNSTYLED_BUTTON: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  textAlign: 'left',
  font: 'inherit',
  color: 'inherit',
};
