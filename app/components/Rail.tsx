export interface RailControl {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export interface RailRow {
  id: string;
  glyph: string;
  name: string;
  degree: string;
  retrograde?: boolean;
  signGlyph: string;
  sign: string;
  house?: string;
  active?: boolean;
}

interface RailProps {
  title: string;
  controls: RailControl[];
  rows: RailRow[];
  /** Row-click nav (Phase 3A): scroll-snaps the reading pane to that row's
   * section. Optional so existing shell-only callers (e.g. Reference's
   * demo rows) keep working with no click behavior wired. */
  onRowClick?: (id: string) => void;
  /** Opt-in "fill" mode (founder feedback, Aug 5 2026): the cream box and
   * its rows stretch to fill exactly the space available, guaranteeing
   * every row is visible with zero scroll and the box's bottom flush
   * with the reading card's. Default (omitted/false) keeps the original
   * content-driven sizing, where a shorter list produces a shorter box —
   * used by Reference/Transits, not opted into here. */
  fillHeight?: boolean;
}

// THE LIST RAIL (docs/TEXTURE_LAYOUT_PROPORTIONS.md). Structure only —
// row click behavior (scroll-snapping the reading pane) is wired in Phase 3.
//
// Title + view-control links sit OUTSIDE the cream box, directly on the
// screen's background (docs/mocks/natal-page.png, transits-page.png). The
// cream rectangle below holds only the row list, and its height is
// content-driven (see .rail-rect / .rail-row in globals.css) — it is not
// fixed to a constant, so it naturally comes out taller for more rows.
export default function Rail({ title, controls, rows, onRowClick, fillHeight }: RailProps) {
  return (
    <div className="rail">
      <div className="rail-header">
        <h2 className="rail-title">{title}</h2>
        <div className="rail-title-rule" />
        {controls.length > 0 && (
          <div className="rail-controls-slot">
            <div className="rail-controls">
              {controls.map(c => (
                c.onClick ? (
                  <button
                    type="button"
                    key={c.label}
                    className={`rail-control${c.active ? ' active' : ''}`}
                    onClick={c.onClick}
                    aria-pressed={c.active}
                    style={{ cursor: 'pointer' }}
                  >
                    {c.label}
                  </button>
                ) : (
                  <span key={c.label} className={`rail-control${c.active ? ' active' : ''}`}>
                    {c.label}
                  </span>
                )
              ))}
            </div>
          </div>
        )}
      </div>
      <div className={`rail-rect${fillHeight ? ' rail-rect--fill' : ''}`}>
        <div className={`rail-list${fillHeight ? ' rail-list--fill' : ''}`}>
          {rows.map(row => {
            const rowContent = (
              <>
                {row.active && <span className="rail-row-bar" />}
                <div className="rail-row-line1">
                  <span aria-hidden="true">{row.glyph}</span>
                  <span>{row.name}</span>
                  <span>{row.degree}</span>
                  {row.retrograde && <span className="rail-row-retro">R</span>}
                </div>
                <div className="rail-row-line2">
                  <span aria-hidden="true">{row.signGlyph}</span>
                  <span>{row.sign}</span>
                  {row.house && <span>{row.house}</span>}
                </div>
              </>
            );
            return onRowClick ? (
              <button
                type="button"
                key={row.id}
                className={`rail-row${row.active ? ' active' : ''}${fillHeight ? ' rail-row--fill' : ''}`}
                onClick={() => onRowClick(row.id)}
                style={{ cursor: 'pointer' }}
              >
                {rowContent}
              </button>
            ) : (
              <div
                key={row.id}
                className={`rail-row${row.active ? ' active' : ''}${fillHeight ? ' rail-row--fill' : ''}`}
              >
                {rowContent}
              </div>
            );
          })}
        </div>
      </div>
      <div className="rail-bottom-spacer" />
    </div>
  );
}
