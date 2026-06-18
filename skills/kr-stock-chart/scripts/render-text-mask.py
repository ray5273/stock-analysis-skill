#!/usr/bin/env python3

import argparse
import base64
import json

from PIL import Image, ImageDraw, ImageFont


def build_mask(text: str, font_path: str, font_size: int) -> dict:
    if not text:
        return {"width": 0, "height": 0, "alpha": ""}

    font = ImageFont.truetype(font_path, font_size)
    probe = Image.new("L", (1, 1), 0)
    probe_draw = ImageDraw.Draw(probe)
    bbox = probe_draw.textbbox((0, 0), text, font=font)
    if not bbox:
        return {"width": 0, "height": 0, "alpha": ""}

    width = max(1, bbox[2] - bbox[0])
    height = max(1, bbox[3] - bbox[1])
    image = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(image)
    draw.text((-bbox[0], -bbox[1]), text, font=font, fill=255)
    return {
        "width": width,
        "height": height,
        "alpha": base64.b64encode(image.tobytes()).decode("ascii"),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--font-path", required=True)
    parser.add_argument("--font-size", type=int, required=True)
    parser.add_argument("--text", required=True)
    args = parser.parse_args()

    print(json.dumps(build_mask(args.text, args.font_path, args.font_size), ensure_ascii=False))


if __name__ == "__main__":
    main()
