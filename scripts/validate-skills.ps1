$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$skillsRoot = Join-Path $repoRoot "skills"
$requiredFiles = @(
    "SKILL.md"
)
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("stock-skill-validate-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempRoot | Out-Null

try {

$skillDirs = Get-ChildItem -Path $skillsRoot -Directory

if ($skillDirs.Count -eq 0) {
    Write-Error "No skills found under $skillsRoot"
}

foreach ($skillDir in $skillDirs) {
    Write-Host "Validating $($skillDir.Name)..."

    foreach ($relativePath in $requiredFiles) {
        $fullPath = Join-Path $skillDir.FullName $relativePath
        if (-not (Test-Path $fullPath)) {
            Write-Error "Missing required file: $fullPath"
        }
    }

    $openaiYaml = Join-Path $skillDir.FullName "agents\openai.yaml"
    if (-not (Test-Path $openaiYaml)) {
        Write-Warning "agents/openai.yaml not found in $($skillDir.Name) (required for Codex, not needed for Claude Code)"
    }

    $skillMd = Get-Content -Raw (Join-Path $skillDir.FullName "SKILL.md")
    if ($skillMd -notmatch "(?s)^---\r?\nname:\s.+?\r?\ndescription:\s.+?\r?\n---") {
        Write-Error "Invalid or missing frontmatter in $($skillDir.FullName)\SKILL.md"
    }

    Get-ChildItem -Path $skillDir.FullName -Recurse -Filter "*.js" | ForEach-Object {
        node --check $_.FullName | Out-Null
    }

    if ($skillDir.Name -eq "kr-stock-analysis") {
        $chartSample = Join-Path $repoRoot "examples\kr-stock-analysis\chart-sample.json"
        $chartScript = Join-Path $skillDir.FullName "scripts\chart-basics.js"
        $fetchScript = Join-Path $skillDir.FullName "scripts\fetch-kr-chart.js"
        $chartOut = Join-Path $tempRoot "kr-chart.png"

        node $chartScript --input $chartSample --png-out $chartOut --image-path "chart.png" | Out-Null
        if (-not (Test-Path $chartOut) -or (Get-Item $chartOut).Length -le 0) {
            Write-Error "Expected chart PNG was not created: $chartOut"
        }

        node $fetchScript --help | Out-Null
    }

    if ($skillDir.Name -eq "kr-analysis-update") {
        $baselineScript = Join-Path $skillDir.FullName "scripts\extract-report-baseline.js"
        $normalizeScript = Join-Path $skillDir.FullName "scripts\normalize-update-log.js"
        $reportSample = Join-Path $repoRoot "analysis-example\kr\엘앤에프.md"
        $updateJson = Join-Path $tempRoot "kr-analysis-update.json"
        $updateJsonReplace = Join-Path $tempRoot "kr-analysis-update-replace.json"
        $updatedReport = Join-Path $tempRoot "kr-analysis-update.md"
        $baselineOut = Join-Path $tempRoot "kr-analysis-update-baseline.json"

        node $baselineScript --input $reportSample --output $baselineOut | Out-Null
        if (-not ((Get-Content -Raw $baselineOut) -match '"memoDate": "2026-03-20"')) {
            Write-Error "Baseline parser did not capture the memo date."
        }

        @'
{
  "date": "2026-03-27",
  "whatHappened": [
    "No material company-specific update found after the memo date."
  ],
  "whyItMatters": [
    "The original memo remains the operative baseline."
  ],
  "whatChangedInThesis": [
    "No material thesis change."
  ],
  "whatDidNotChange": [
    "The base view and risk framing remain intact."
  ],
  "signalsToWatchNext": [
    "Watch the next earnings release or capital-allocation event."
  ],
  "sources": [
    {
      "label": "Validation placeholder source",
      "url": "https://example.com/placeholder",
      "date": "2026-03-27"
    }
  ]
}
'@ | Set-Content -Path $updateJson

        @'
{
  "date": "2026-03-27",
  "whatHappened": [
    "Replacement update for the same date."
  ],
  "whyItMatters": [
    "This validates same-date replacement behavior."
  ],
  "whatChangedInThesis": [
    "No material thesis change."
  ],
  "whatDidNotChange": [
    "The base view and risk framing remain intact."
  ],
  "signalsToWatchNext": [
    "Watch the next earnings release or capital-allocation event."
  ],
  "sources": [
    {
      "label": "Validation replacement source",
      "url": "https://example.com/replacement",
      "date": "2026-03-27"
    }
  ]
}
'@ | Set-Content -Path $updateJsonReplace

        node $normalizeScript --input $updateJson | Out-Null
        Copy-Item $reportSample $updatedReport
        node $normalizeScript --input $updateJson --report $updatedReport | Out-Null
        node $normalizeScript --input $updateJsonReplace --report $updatedReport | Out-Null

        $updatedText = Get-Content -Raw $updatedReport
        $normalizedUpdatedText = $updatedText -replace "`r`n?", "`n"
        $headingCount = ([regex]::Matches($normalizedUpdatedText, '^### 2026-03-27 Update$', 'Multiline')).Count
        $recentUpdateCount = ([regex]::Matches($normalizedUpdatedText, '^최근 업데이트일: 2026-03-27$', 'Multiline')).Count
        if ($headingCount -ne 1) {
            Write-Error "Expected exactly one dated update block after replacement."
        }
        if ($recentUpdateCount -ne 1) {
            Write-Error "Expected 최근 업데이트일 to be inserted or refreshed."
        }
        if ($normalizedUpdatedText -notmatch 'Replacement update for the same date\.') {
            Write-Error "Expected replacement content to exist in updated report."
        }
        if ($normalizedUpdatedText -match 'Validation placeholder source') {
            Write-Error "Expected previous same-date content to be replaced, not duplicated."
        }
    }
}

Write-Host "Validation passed."
}
finally {
    if (Test-Path $tempRoot) {
        Remove-Item -Recurse -Force $tempRoot
    }
}
