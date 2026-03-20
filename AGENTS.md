# AGENTS

## Repository Rules

- When you add or update a stock analysis example, keep it under `analysis-example/<market>/<company>.md`.
- When you add a new example file, update `README.md` with a direct markdown link to it.
- When a commit changes a skill's required output shape, refresh any affected example documents so they still match the current skill behavior.
- When an example document embeds a chart image, refresh the linked PNG asset together with the markdown file so the visual stays in sync with the text.
- Treat example analysis documents as time-sensitive. Before committing changes to an example document, refresh prices, valuation metrics, disclosures, and source dates with current sources.
- If the example must mix metrics from sources with different refresh cadences, keep the document honest by stating the exact date for each metric block or row.
- Do not invent revenue mix, customer concentration, governance facts, or valuation metrics that are not disclosed in the current source set. State what is not separately disclosed.
- Prefer primary sources first for Korean stocks: DART, KRX disclosures, company IR pages, governance pages, and official financial statements.
