from pathlib import Path

from PIL import Image


SOURCE = Path("/home/ubuntu/upload/images.webp")
TARGETS = [
    Path("/home/ubuntu/App/assets/icon.png"),
    Path("/home/ubuntu/App/assets/splash-icon.png"),
    Path("/home/ubuntu/App/assets/favicon.png"),
    Path("/home/ubuntu/App/assets/android-icon-foreground.png"),
]


def square_logo(source: Path) -> Image.Image:
    original = Image.open(source).convert("RGBA")
    canvas = Image.new("RGBA", (1024, 1024), "#FFFFFF")
    scale = min(1024 / original.width, 920 / original.height)
    resized = original.resize(
        (round(original.width * scale), round(original.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (1024 - resized.width) // 2
    top = (1024 - resized.height) // 2
    canvas.alpha_composite(resized, (left, top))
    return canvas


def main() -> None:
    image = square_logo(SOURCE)
    for target in TARGETS:
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, "PNG")


if __name__ == "__main__":
    main()
