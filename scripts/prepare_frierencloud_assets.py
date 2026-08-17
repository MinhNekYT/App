from pathlib import Path

from PIL import Image


SOURCE = Path("/home/ubuntu/upload/images.webp")
TARGETS = (
    Path("/home/ubuntu/linuxdroid/assets/images/icon.png"),
    Path("/home/ubuntu/linuxdroid/assets/images/splash-icon.png"),
    Path("/home/ubuntu/linuxdroid/assets/images/favicon.png"),
    Path("/home/ubuntu/linuxdroid/assets/images/android-icon-foreground.png"),
)


def create_square_asset(source: Path) -> Image.Image:
    original = Image.open(source).convert("RGBA")
    canvas = Image.new("RGBA", (1024, 1024), "#FFFFFF")
    scale = min(1024 / original.width, 920 / original.height)
    resized = original.resize(
        (round(original.width * scale), round(original.height * scale)),
        Image.Resampling.LANCZOS,
    )
    canvas.alpha_composite(resized, ((1024 - resized.width) // 2, (1024 - resized.height) // 2))
    return canvas


def main() -> None:
    image = create_square_asset(SOURCE)
    for target in TARGETS:
        image.save(target, "PNG")


if __name__ == "__main__":
    main()
