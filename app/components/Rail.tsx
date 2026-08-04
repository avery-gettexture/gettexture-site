export interface RailControl {
  label: string;
  active?: boolean;
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
}

// THE LIST RAIL (docs/TEXTURE_LAYOUT_PROPORTIONS.md). Structure only —
// row click behavior (scroll-snapping the reading pane) is wired in Phase 3.
//
// Title + view-control links sit OUTSIDE the cream box, directly on the
// screen's background (docs/mocks/natal-page.png, transits-page.png). The
// cream rectangle below holds only the row list, and its height is
// content-driven (see .rail-rect / .rail-row in globals.css) — it is not
// fixed to a constant, so it naturally comes out taller for more rows.
export default function Rail({ title, controls, rows }: RailProps) {
  return (
    <div className="rail">
      <div className="rail-header">
        <h2 className="rail-title">{title}</h2>
        <div className="rail-controls">
          {controls.map(c => (
            <span key={c.label} className={`rail-control${c.active ? ' active' : ''}`}>
              {c.label}
            </span>
          ))}
        </div>
      </div>
      <div className="rail-rect">
        <div className="rail-list">
          {rows.map(row => (
            <div key={row.id} className={`rail-row${row.active ? ' active' : ''}`}>
              {row.active && <span className="rail-row-bar" />}
              <div className="rail-row-line1">
                <span>{row.glyph}</span>
                <span>{row.name}</span>
                <span>{row.degree}</span>
                {row.retrograde && <span className="rail-row-retro">R</span>}
              </div>
              <div className="rail-row-line2">
                <span>{row.signGlyph}</span>
                <span>{row.sign}</span>
                {row.house && <span>{row.house}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
