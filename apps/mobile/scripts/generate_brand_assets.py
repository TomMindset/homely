from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets"

BRAND = {
    "primary": "#256F63",
    "primary_dark": "#15483F",
    "cream": "#F7F2E8",
    "paper": "#FFFDF8",
    "line": "#D8CCBC",
    "accent": "#F4A62A",
    "ink": "#21302C",
    "muted": "#766E64",
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def draw_mark(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], scale: float = 1.0) -> None:
    x1, y1, x2, y2 = box
    w = x2 - x1
    h = y2 - y1
    stroke = max(10, int(w * 0.055 * scale))

    roof = [
        (x1 + int(w * 0.16), y1 + int(h * 0.43)),
        (x1 + int(w * 0.50), y1 + int(h * 0.17)),
        (x1 + int(w * 0.84), y1 + int(h * 0.43)),
    ]
    draw.line(roof, fill=BRAND["paper"], width=stroke, joint="curve")

    body = [
        x1 + int(w * 0.25),
        y1 + int(h * 0.40),
        x1 + int(w * 0.75),
        y1 + int(h * 0.78),
    ]
    draw.rounded_rectangle(body, radius=int(w * 0.10), outline=BRAND["paper"], width=stroke)

    check = [
        (x1 + int(w * 0.36), y1 + int(h * 0.60)),
        (x1 + int(w * 0.47), y1 + int(h * 0.70)),
        (x1 + int(w * 0.66), y1 + int(h * 0.51)),
    ]
    draw.line(check, fill=BRAND["accent"], width=stroke, joint="curve")


def save_icon(path: Path, size: int = 1024) -> None:
    img = Image.new("RGB", (size, size), BRAND["primary"])
    draw = ImageDraw.Draw(img)
    margin = int(size * 0.13)
    draw.rounded_rectangle(
        (margin, margin, size - margin, size - margin),
        radius=int(size * 0.17),
        fill=BRAND["primary_dark"],
    )
    draw_mark(draw, (int(size * 0.20), int(size * 0.20), int(size * 0.80), int(size * 0.80)))
    img.save(path)


def save_adaptive_icon(path: Path, size: int = 1024) -> None:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_mark(draw, (int(size * 0.19), int(size * 0.19), int(size * 0.81), int(size * 0.81)))
    img.save(path)


def centered_text(draw: ImageDraw.ImageDraw, y: int, text: str, text_font: ImageFont.ImageFont, fill: str, width: int) -> int:
    bbox = draw.textbbox((0, 0), text, font=text_font)
    text_width = bbox[2] - bbox[0]
    draw.text(((width - text_width) / 2, y), text, font=text_font, fill=fill)
    return y + bbox[3] - bbox[1]


def save_splash(path: Path, width: int = 1242, height: int = 2436) -> None:
    img = Image.new("RGB", (width, height), BRAND["cream"])
    draw = ImageDraw.Draw(img)
    mark_size = 300
    top = int(height * 0.34)
    left = (width - mark_size) // 2

    draw.rounded_rectangle(
        (left, top, left + mark_size, top + mark_size),
        radius=64,
        fill=BRAND["primary"],
    )
    draw_mark(draw, (left + 45, top + 45, left + mark_size - 45, top + mark_size - 45), scale=0.85)

    y = top + mark_size + 68
    y = centered_text(draw, y, "Homely", font(86, bold=True), BRAND["ink"], width)
    centered_text(draw, y + 22, "Haushalts Manager", font(34), BRAND["muted"], width)
    img.save(path)


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    save_icon(ASSET_DIR / "icon.png")
    save_adaptive_icon(ASSET_DIR / "adaptive-icon.png")
    save_splash(ASSET_DIR / "splash.png")


if __name__ == "__main__":
    main()
