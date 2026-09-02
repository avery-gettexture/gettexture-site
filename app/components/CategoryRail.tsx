// The Reference page's left rail — shows CATEGORIES only (SPEC §16, Part 2
// of the reference-dictionary rewrite). Deliberately NOT a reuse of
// Rail.tsx: that component's row shape is placement-specific (glyph,
// degree, sign, house — fields a category doesn't have) and is shared
// live by the natal and transits pages, so bolting an unrelated "just a
// label" mode onto it risks those two screens. This reuses the same CSS
// classes (.rail, .rail-header, .rail-rect, .rail-list, .rail-row, and the
// --fill variants) so it looks identical to the natal/transits rail, with
// a single-line row instead of Rail's two-line glyph/sign/house layout.

import { REFERENCE_TAXONOMY } from '@/lib/reference-taxonomy';
import { UNSTYLED_BUTTON } from '@/lib/a11y';

interface CategoryRailProps {
  activeSlug: string;
  onSelect: (slug: string) => void;
}

export default function CategoryRail({ activeSlug, onSelect }: CategoryRailProps) {
  return (
    <div className="rail">
      <div className="rail-header">
        <h2 className="rail-title">Reference</h2>
        <div className="rail-title-rule" />
      </div>
      <div className="rail-rect rail-rect--fill">
        <div className="rail-list rail-list--fill">
          {REFERENCE_TAXONOMY.map(category => (
            <button
              type="button"
              key={category.slug}
              className={`rail-row rail-row--fill${category.slug === activeSlug ? ' active' : ''}`}
              onClick={() => onSelect(category.slug)}
              aria-current={category.slug === activeSlug ? 'true' : undefined}
              style={{ ...UNSTYLED_BUTTON, cursor: 'pointer' }}
            >
              {category.slug === activeSlug && <span className="rail-row-bar" />}
              <div className="rail-row-line1">
                <span>{category.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="rail-bottom-spacer" />
    </div>
  );
}
