# Workflow Reference

## Goal

This skill exists to reduce ambiguity before research starts.

The output should answer:

- what sector is actually being analyzed
- what is in scope and out of scope
- what shape the final deliverable should take
- what questions the downstream skill must answer

## Planning Sequence

1. Normalize the sector label.
   Decide whether the request maps to an industry, sub-industry, value-chain node, policy theme, or listed-company basket.
2. Set the geographic boundary.
   Default to Korea. Call out when global context is needed only as a benchmark.
3. Set the time horizon.
   Distinguish between near-term policy or capex timing, 12-24 month market setup, and longer structural outlook.
4. Set the decomposition axes.
   Typical axes are customer type, workload type, value-chain role, geography within Korea, and listed versus private players.
5. Choose the output mode.
   Use:
   - `quick brief` for compressed decision support
   - `full report` for Mordor-style sectioned research
   - `comparison` for sector-versus-sector or theme-versus-theme work
   - `audit` for source and logic review
   - `update` for incremental maintenance of an existing memo
6. Define the must-answer questions.
   Limit them to what materially changes the final report.

## Typical Ambiguities

- “AI infrastructure” may mean GPU cloud, data centers, power equipment, or the full stack.
- “보안” may mean products, managed security services, or compliance spending.
- “스마트팩토리” may mean software, automation hardware, SI, or robotics.
- “데이터센터” may mean real estate, colocation, network-neutral interconnection, managed hosting, or enterprise-owned facilities.

Resolve these explicitly in the brief instead of leaving them to inference.

## Failure Modes To Avoid

- accepting a sector label that is too broad to research cleanly
- writing market conclusions before scoping the request
- mixing Korea-only and global assumptions without saying so
- forgetting to state exclusions, which forces the downstream writer to guess
