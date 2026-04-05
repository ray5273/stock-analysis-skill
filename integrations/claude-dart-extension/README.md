# Claude DART Extractor

Chrome extension for the `Claude.ai` DART workflow.

## What It Does

- Runs only on supported DART viewer pages: `https://dart.fss.or.kr/dsaf001/main.do*`
- Automatically attempts to extract the filing body when the viewer page opens
- Shows status in the popup: `Extracting`, `Export ready`, or `Extraction failed`
- Lets you `Save Export` as `dart-browser-export.json`
- Lets you `Retry` when the page was still loading or the viewer DOM changed

## Install

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `integrations/claude-dart-extension/`

## Use With Claude.ai

1. Open the DART viewer page
2. Wait for the extension badge or popup status to show `Export ready`
3. Click `Save Export`
4. Attach the saved JSON file in Claude.ai
5. Use the DART skill prompt with the attached file

## Scope Limits

- Supported first-pass URL pattern: `dsaf001/main.do`
- No fallback path is included in this extension
- If extraction fails, use `Retry` and improve the extractor rather than switching to another source path
