// Static stand-in for the future <texture-morph-bg> WebGL component
// (docs/TEXTURE_LAYOUT_PROPORTIONS.md, BACKGROUND GRAPHIC section; the
// shader file itself currently sits at docs/texture-morph-bg.js, not yet
// wired in). Swap later: replace this component's contents (or its one
// usage in HomeLayout) with the real shader element — the call site's
// shape (full-bleed, behind the panels, below the nav) doesn't change.
export default function MorphBackgroundPlaceholder() {
  return (
    <div
      className="morph-bg-placeholder"
      style={{ backgroundImage: 'url(/saturn-background.png)' }}
    />
  );
}
