"""Generate moreweb Desktop PNG and multi-resolution Windows ICO icons.

Draws the moreweb mark — the gradient "m" glyph on its dark tile — at 512px
and emits the PNG plus a multi-resolution ICO. The geometry mirrors
apps/web/public/favicon.svg (32-unit viewBox scaled 16x).
"""

from pathlib import Path
from PIL import Image, ImageDraw

# Brand palette (moreweb.space tokens).
TILE = (3, 0, 5, 255)
GRADIENT_START = (0, 229, 255, 255)      # cyan
GRADIENT_MID = (191, 0, 255, 255)         # purple
GRADIENT_END = (255, 0, 127, 255)         # magenta
DOT = (0, 229, 255, 255)

SCALE = 16  # 32-unit favicon viewBox -> 512px canvas
STROKE = round(2.1 * SCALE)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(4))


def gradient_at(t):
    """Stroke color along the glyph, cyan -> purple -> magenta (0.55 midpoint)."""
    if t <= 0.55:
        return lerp(GRADIENT_START, GRADIENT_MID, t / 0.55)
    return lerp(GRADIENT_MID, GRADIENT_END, (t - 0.55) / 0.45)


def cubic(p0, p1, p2, p3, steps):
    return [
        (
            round((1 - u) ** 3 * p0[0] + 3 * (1 - u) ** 2 * u * p1[0] + 3 * (1 - u) * u * u * p2[0] + u ** 3 * p3[0]),
            round((1 - u) ** 3 * p0[1] + 3 * (1 - u) ** 2 * u * p1[1] + 3 * (1 - u) * u * u * p2[1] + u ** 3 * p3[1]),
        )
        for u in (i / steps for i in range(steps + 1))
    ]


def glyph_points():
    """Sample the favicon m path into one polyline, in 512px coordinates."""
    x = lambda v: round(v * SCALE)
    pts = []
    # Left riser, drawn full-height like the source path.
    pts += [(x(7), x(23)), (x(7), x(12))]
    # First arch: (7,15.5) C(7,12.6)(8.6,11)(10.8,11) S(14.6,12.6)(14.6,15.5).
    pts += cubic((x(7), x(15.5)), (x(7), x(12.6)), (x(8.6), x(11)), (x(10.8), x(11)), 16)[1:]
    pts += cubic((x(10.8), x(11)), (x(13.0), x(11)), (x(14.6), x(12.6)), (x(14.6), x(15.5)), 16)[1:]
    pts += [(x(14.6), x(23))]
    # Second arch: (14.6,15.5) c(0,-2.9)(1.6,-4.5)(3.8,-4.5) S(22.2,12.6)(22.2,15.5).
    pts += cubic((x(14.6), x(15.5)), (x(14.6), x(12.6)), (x(16.2), x(11)), (x(18.4), x(11)), 16)[1:]
    pts += cubic((x(18.4), x(11)), (x(20.6), x(11)), (x(22.2), x(12.6)), (x(22.2), x(15.5)), 16)[1:]
    pts += [(x(22.2), x(23))]
    return pts


def draw_stroke(draw, pts):
    """Draw the polyline with per-segment gradient color and round joins."""
    # Cumulative arc length parameterizes the gradient.
    lengths = [0.0]
    for i in range(1, len(pts)):
        dx = pts[i][0] - pts[i - 1][0]
        dy = pts[i][1] - pts[i - 1][1]
        lengths.append(lengths[-1] + (dx * dx + dy * dy) ** 0.5)
    total = lengths[-1]
    for i in range(1, len(pts)):
        color = gradient_at(lengths[i] / total)
        draw.line([pts[i - 1], pts[i]], fill=color, width=STROKE)
        # Round joint/cap at every sample point.
        r = STROKE / 2
        x, y = pts[i]
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)
    x, y = pts[0]
    r = STROKE / 2
    draw.ellipse([x - r, y - r, x + r, y + r], fill=gradient_at(0))


def generate_icons():
    root = Path(__file__).resolve().parent.parent
    build_dir = root / "apps" / "desktop" / "build"
    build_dir.mkdir(parents=True, exist_ok=True)

    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Full-bleed dark tile; favicon rx=7 at 32 -> 112 at 512.
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=7 * SCALE, fill=TILE)

    draw_stroke(draw, glyph_points())

    # Cyan trailing dot: (25.5,21.5) r1.6 at 32 -> 512px.
    cx, cy, r = round(25.5 * SCALE), round(21.5 * SCALE), round(1.6 * SCALE)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=DOT)

    png_path = build_dir / "icon.png"
    ico_path = build_dir / "icon.ico"

    img.save(png_path, format="PNG")
    img.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print(f"Generated {png_path} and {ico_path}")

if __name__ == "__main__":
    generate_icons()
