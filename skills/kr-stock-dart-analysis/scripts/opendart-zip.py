#!/usr/bin/env python3
"""OpenDART helper: ZIP extraction and iXBRL/HTML to plain-text conversion.

Companion to fetch-opendart.js. Two subcommands:
  - extract <zip-path> <out-dir>
      Extract a ZIP archive (corpCode.xml or document.xml ZIPs from OpenDART).
      Lists extracted files on stdout, one per line.
  - to-text <html-or-xml-path>
      Convert iXBRL/HTML or DART OpenDART document.xml content to readable
      plain text. Prints to stdout. Preserves headings, paragraphs, and
      table rows in pipe-delimited form. Tag attributes are dropped.
"""

import io
import os
import re
import sys
import zipfile
from html.parser import HTMLParser


# --- ZIP extract ----------------------------------------------------------


def extract_zip(zip_path: str, out_dir: str) -> None:
    """Extract a ZIP file to out_dir, preserving Korean filenames.

    OpenDART ZIPs occasionally encode filenames as cp437 garbled bytes
    that decode cleanly as cp949 (Windows Korean). zipfile preserves the
    raw bytes in `orig_filename`; we re-decode when needed.
    """
    os.makedirs(out_dir, exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            raw_name = info.filename
            try:
                fixed = raw_name.encode("cp437").decode("cp949")
            except (UnicodeDecodeError, UnicodeEncodeError):
                fixed = raw_name

            target = os.path.join(out_dir, fixed)
            if info.is_dir():
                os.makedirs(target, exist_ok=True)
                continue

            os.makedirs(os.path.dirname(target) or out_dir, exist_ok=True)
            with zf.open(info) as src, open(target, "wb") as dst:
                dst.write(src.read())
            print(target)


# --- HTML / iXBRL to plain text ------------------------------------------


HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
BLOCK_TAGS = {"p", "div", "li", "section", "article", "header", "footer"}
DROP_TAGS = {"script", "style", "head", "meta", "link", "noscript", "title"}


class TextExtractor(HTMLParser):
    """Minimal iXBRL-aware HTML→text extractor.

    Strategy:
      - Drop script/style/head completely.
      - Strip XBRL-specific namespaces (ix:*, xbrli:*) but keep their text content.
      - For <table>, render rows as pipe-delimited lines.
      - For headings and block tags, ensure newlines before/after.
      - Collapse runs of whitespace within a line.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._buf: list[str] = []
        self._drop_depth = 0
        self._in_table = False
        self._in_row = False
        self._in_cell = False
        self._row_cells: list[str] = []
        self._cell_buf: list[str] = []

    def _emit(self, text: str) -> None:
        self._buf.append(text)

    def _local_name(self, tag: str) -> str:
        return tag.split(":")[-1].lower() if ":" in tag else tag.lower()

    # --- handlers ---

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        local = self._local_name(tag)
        if local in DROP_TAGS:
            self._drop_depth += 1
            return

        if self._drop_depth:
            return

        if local == "table":
            self._in_table = True
            self._emit("\n")
            return

        if local == "tr" and self._in_table:
            self._in_row = True
            self._row_cells = []
            return

        if local in {"td", "th"} and self._in_row:
            self._in_cell = True
            self._cell_buf = []
            return

        if local in HEADING_TAGS:
            self._emit("\n\n")
            return

        if local == "br":
            self._emit("\n")
            return

        if local in BLOCK_TAGS:
            self._emit("\n")
            return

    def handle_endtag(self, tag: str) -> None:
        local = self._local_name(tag)
        if local in DROP_TAGS:
            if self._drop_depth > 0:
                self._drop_depth -= 1
            return

        if self._drop_depth:
            return

        if local == "table":
            self._in_table = False
            self._emit("\n")
            return

        if local == "tr" and self._in_row:
            self._in_row = False
            line = " | ".join(c.strip() for c in self._row_cells if c.strip())
            if line:
                self._emit("| " + line + " |\n")
            self._row_cells = []
            return

        if local in {"td", "th"} and self._in_cell:
            self._in_cell = False
            text = "".join(self._cell_buf).strip()
            self._row_cells.append(text)
            self._cell_buf = []
            return

        if local in HEADING_TAGS:
            self._emit("\n")
            return

        if local in BLOCK_TAGS:
            self._emit("\n")
            return

    def handle_data(self, data: str) -> None:
        if self._drop_depth:
            return
        if self._in_cell:
            self._cell_buf.append(data)
            return
        self._emit(data)

    def get_text(self) -> str:
        raw = "".join(self._buf)
        # Collapse runs of spaces/tabs within lines
        lines = raw.replace("\r", "").split("\n")
        cleaned = [re.sub(r"[\t ]+", " ", ln).strip() for ln in lines]
        # Collapse 3+ blank lines to 2
        out: list[str] = []
        blank = 0
        for ln in cleaned:
            if ln:
                out.append(ln)
                blank = 0
            else:
                blank += 1
                if blank <= 1:
                    out.append("")
        return "\n".join(out).strip() + "\n"


DART_XSD_MARKER = re.compile(r'dart\d+\.xsd', re.IGNORECASE)


def preprocess_dart_xml(text: str) -> str:
    """Map DART's custom dart4.xsd vocabulary onto standard HTML so the
    generic HTMLParser-based TextExtractor can handle it.

    Heading priority: <TITLE ATOC="Y">. Plain <TITLE> without ATOC also
    becomes h3 (sub-titles inside narrative). Cover-page wrapper tags are
    dropped along with the entire <SUMMARY>/<EXTRACTION> metadata blocks.
    """
    # Drop metadata + cover wrapper blocks (we keep their inner narrative
    # only when it lives inside <BODY>).
    text = re.sub(r"<SUMMARY>[\s\S]*?</SUMMARY>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<EXTRACTION[^>]*>[\s\S]*?</EXTRACTION>", "", text, flags=re.IGNORECASE)
    # COVER blocks contain the front-page seal; not useful for narrative.
    text = re.sub(r"<COVER>[\s\S]*?</COVER>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<COVER-TITLE[^>]*>[\s\S]*?</COVER-TITLE>", "", text, flags=re.IGNORECASE)

    # Convert headings.
    def _title(match: re.Match) -> str:
        attrs = match.group(1) or ""
        body = match.group(2)
        # Skip placeholder titles
        if not body.strip():
            return ""
        # H2 for top-level (Roman numeral e.g. "I. ..." or 【...】 brackets)
        # H3 otherwise
        first = body.strip().split()[0] if body.strip().split() else ""
        is_top = bool(re.match(r"^[IVX]+\.", first)) or body.strip().startswith("【")
        tag = "h2" if is_top else "h3"
        return f"\n<{tag}>{body}</{tag}>\n"

    text = re.sub(r"<TITLE([^>]*)>([\s\S]*?)</TITLE>", _title, text)

    # Map DART tags to HTML equivalents.
    text = re.sub(r"<P([^>]*)>", "<p>", text)
    text = re.sub(r"</P>", "</p>", text)
    # Tables — TBODY/THEAD/TR/TD/TH passthrough lower-case
    for tag in ("TABLE", "TBODY", "THEAD", "TFOOT", "TR", "TD", "TH"):
        text = re.sub(rf"<{tag}([^>]*)>", f"<{tag.lower()}>", text)
        text = re.sub(rf"</{tag}>", f"</{tag.lower()}>", text)
    # <TU> = data-bearing TD (with @AUNIT/@AUNITVALUE attributes), treat as <td>
    text = re.sub(r"<TU([^>]*)>", "<td>", text)
    text = re.sub(r"</TU>", "</td>", text)
    # COL/COLGROUP — drop entirely (HTMLParser would warn)
    text = re.sub(r"</?COL(?:GROUP)?[^>]*>", "", text, flags=re.IGNORECASE)
    # Other DART-specific block tags worth keeping with line breaks
    for tag in ("BODY", "DOCUMENT", "DOCUMENT-NAME", "FORMULA-VERSION", "COMPANY-NAME",
                "TABLE-GROUP", "LIBRARY", "SECTION-1", "SECTION-2", "SECTION-3"):
        # convert open tag to a generic block hint
        text = re.sub(rf"<{tag}([^>]*)>", "<div>", text, flags=re.IGNORECASE)
        text = re.sub(rf"</{tag}>", "</div>", text, flags=re.IGNORECASE)
    return text


def to_text(path: str) -> None:
    with open(path, "rb") as f:
        raw = f.read()

    # OpenDART document.xml is usually utf-8 or ms949. Try utf-8 first.
    text: str
    for enc in ("utf-8", "utf-8-sig", "ms949", "cp949", "euc-kr"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = raw.decode("utf-8", errors="replace")

    # Strip XML processing instructions and DOCTYPE
    text = re.sub(r"<\?xml[^?]*\?>", "", text)
    text = re.sub(r"<!DOCTYPE[^>]+>", "", text, flags=re.IGNORECASE)

    # If the document is DART's dart4.xsd format, pre-map its tags to HTML.
    if DART_XSD_MARKER.search(text) or "<DOCUMENT-NAME" in text or "<TITLE ATOC=" in text:
        text = preprocess_dart_xml(text)

    parser = TextExtractor()
    parser.feed(text)
    parser.close()
    sys.stdout.write(parser.get_text())


# --- CLI ------------------------------------------------------------------


USAGE = (
    "Usage:\n"
    "  python3 opendart-zip.py extract <zip-path> <out-dir>\n"
    "  python3 opendart-zip.py to-text <html-or-xml-path>\n"
)


def main() -> int:
    args = sys.argv[1:]
    if not args:
        sys.stderr.write(USAGE)
        return 1

    cmd = args[0]
    if cmd == "extract":
        if len(args) != 3:
            sys.stderr.write(USAGE)
            return 1
        extract_zip(args[1], args[2])
        return 0

    if cmd == "to-text":
        if len(args) != 2:
            sys.stderr.write(USAGE)
            return 1
        to_text(args[1])
        return 0

    sys.stderr.write(USAGE)
    return 1


if __name__ == "__main__":
    sys.exit(main())
