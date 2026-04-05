#!/usr/bin/env python3

import argparse
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError as error:
    raise SystemExit(
        "Missing dependency: pypdf. Install it with `python -m pip install pypdf`."
    ) from error


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract plain text from a PDF for downstream DART section parsing."
    )
    parser.add_argument("--input", required=True, help="Path to the input PDF file")
    parser.add_argument("--output", required=True, help="Path to the output text file")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()

    reader = PdfReader(str(input_path))
    pages = [(page.extract_text() or "") for page in reader.pages]
    output_path.write_text("\n\n".join(pages), encoding="utf-8")


if __name__ == "__main__":
    main()
