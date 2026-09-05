"""Generate DSH Desktop PNG and multi-resolution Windows ICO icons."""

from pathlib import Path
from PIL import Image, ImageDraw

def generate_icons():
    root = Path(__file__).resolve().parent.parent
    build_dir = root / "apps" / "desktop" / "build"
    build_dir.mkdir(parents=True, exist_ok=True)

    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Squircle background with rounded corners
    margin = 24
    radius = 96
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=(15, 23, 42, 255),
        outline=(77, 107, 254, 200),
        width=6,
    )

    # Inner decorative gradient circle
    circle_center = (256, 256)
    circle_radius = 160
    draw.ellipse(
        [
            circle_center[0] - circle_radius,
            circle_center[1] - circle_radius,
            circle_center[0] + circle_radius,
            circle_center[1] + circle_radius,
        ],
        fill=(24, 34, 58, 255),
        outline=(77, 107, 254, 100),
        width=4,
    )

    # Draw DSH emblem
    points = [
        (170, 360),
        (170, 160),
        (290, 160),
        (360, 220),
        (360, 290),
        (290, 360),
        (240, 360),
        (240, 220),
        (220, 220),
        (220, 360),
    ]
    draw.polygon(points, fill=(77, 107, 254, 255))

    # Eye / accent dot
    draw.ellipse([280, 210, 310, 240], fill=(255, 255, 255, 255))

    # Fin accent
    fin = [(240, 260), (320, 320), (270, 340)]
    draw.polygon(fin, fill=(99, 128, 255, 255))

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
