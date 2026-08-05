import NavBar, { NavKey } from './NavBar';

interface ReadingLayoutProps {
  slug: string;
  active: NavKey;
  /** Full-page backdrop image path — sits behind BOTH the rail and the
   * reading zone (e.g. /sky-background.png). Omit for the settings "no
   * backdrop" variant. */
  background?: string;
  /** Reading-rectangle backdrop — a separate image visible only behind the
   * cream card inside the reading zone (e.g. /transits-background.png for
   * Reference), never extending under the rail. Per-screen mocks show the
   * full-page image and the rectangle's own backdrop as two different
   * images — this is the second one. Omit if the zone sits directly on
   * `background` with no separate backdrop. */
  zoneBackground?: string;
  /** 'normal' = the ratified 6.5%/8% inset cream rectangle over the
   * backdrop (natal/transits/reference). 'full' = the settings variant,
   * where the doc says the rectangle "flexes to fill more of the zone"
   * but does not ratify exact numbers — see the CSS comment on
   * .reading-zone-card--full. */
  inset?: 'normal' | 'full';
  rail: React.ReactNode;
  /** Reading-zone card interior — header/body/footer are screen content,
   * built in Phase 3. */
  children: React.ReactNode;
}

// DESKTOP READING PAGE template (docs/TEXTURE_LAYOUT_PROPORTIONS.md): rail
// + reading zone, with the reading zone's cream rectangle built as shared
// chrome (per founder ruling) — its interior stays an open slot.
export default function ReadingLayout({
  slug,
  active,
  background,
  zoneBackground,
  inset = 'normal',
  rail,
  children,
}: ReadingLayoutProps) {
  return (
    <div className="app-shell">
      <NavBar slug={slug} active={active} />
      <div className="app-stage">
        {background && (
          <div
            className="reading-stage-bg"
            style={{ backgroundImage: `url(${background})` }}
          />
        )}
        <div className="reading-rail-slot">{rail}</div>
        <div className="reading-zone">
          {zoneBackground && (
            <div
              className="reading-zone-bg"
              style={{ backgroundImage: `url(${zoneBackground})` }}
            />
          )}
          <div
            className={`reading-zone-card${inset === 'full' ? ' reading-zone-card--full' : ''}`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
