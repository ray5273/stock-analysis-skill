$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$skillsRoot = Join-Path $repoRoot "skills"
$requiredFiles = @(
    "SKILL.md"
)
$requiredReferenceFiles = @(
    "references\workflow.md",
    "references\output-format.md"
)
$sectorSkillNames = @(
    "kr-sector-plan",
    "kr-sector-data-pack",
    "kr-sector-analysis",
    "kr-sector-compare",
    "kr-sector-audit",
    "kr-sector-update"
)
$tempBase = Join-Path $repoRoot ".tmp"
New-Item -ItemType Directory -Force -Path $tempBase | Out-Null
$tempRoot = Join-Path $tempBase ("stock-skill-validate-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempRoot | Out-Null

try {
Push-Location $repoRoot

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

    if ($sectorSkillNames -contains $skillDir.Name) {
        foreach ($relativePath in $requiredReferenceFiles) {
            $fullPath = Join-Path $skillDir.FullName $relativePath
            if (-not (Test-Path $fullPath)) {
                Write-Error "Missing required sector reference file: $fullPath"
            }
        }
    }

    $skillMd = Get-Content -Raw (Join-Path $skillDir.FullName "SKILL.md")
    if ($skillMd -notmatch "(?s)^---\r?\nname:\s.+?\r?\ndescription:\s.+?\r?\n---") {
        Write-Error "Invalid or missing frontmatter in $($skillDir.FullName)\SKILL.md"
    }

    Get-ChildItem -Path $skillDir.FullName -Recurse -Filter "*.js" | ForEach-Object {
        $relativeJsPath = Resolve-Path -Relative $_.FullName
        node --check $relativeJsPath | Out-Null
    }

    if ($skillDir.Name -eq "kr-stock-analysis") {
        $chartSample = ".\examples\kr-stock-analysis\chart-sample.json"
        $chartScript = ".\skills\kr-stock-analysis\scripts\chart-basics.js"
        $fetchScript = ".\skills\kr-stock-analysis\scripts\fetch-kr-chart.js"
        $chartOut = ".\.tmp\$(Split-Path -Leaf $tempRoot)\kr-chart.png"

        node $chartScript --input $chartSample --png-out $chartOut --image-path "chart.png" | Out-Null
        if (-not (Test-Path $chartOut) -or (Get-Item $chartOut).Length -le 0) {
            Write-Error "Expected chart PNG was not created: $chartOut"
        }

        node $fetchScript --help | Out-Null
    }

    if ($skillDir.Name -eq "kr-analysis-update") {
        $baselineScript = ".\skills\kr-analysis-update\scripts\extract-report-baseline.js"
        $normalizeScript = ".\skills\kr-analysis-update\scripts\normalize-update-log.js"
        $reportSample = ".\analysis-example\kr\LG CNS.md"
        $updateJson = Join-Path $tempRoot "kr-analysis-update.json"
        $updateJsonReplace = Join-Path $tempRoot "kr-analysis-update-replace.json"
        $updatedReport = Join-Path $tempRoot "kr-analysis-update.md"
        $baselineOut = Join-Path $tempRoot "kr-analysis-update-baseline.json"

        node $baselineScript --input $reportSample --output $baselineOut | Out-Null
        if (-not ((Get-Content -Raw $baselineOut) -match '"memoDate": "2026-03-20"')) {
            Write-Error "Baseline parser did not capture the memo date."
        }

        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)

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
'@ | ForEach-Object { [System.IO.File]::WriteAllText($updateJson, $_, $utf8NoBom) }

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
'@ | ForEach-Object { [System.IO.File]::WriteAllText($updateJsonReplace, $_, $utf8NoBom) }

        node $normalizeScript --input $updateJson | Out-Null
        Copy-Item $reportSample $updatedReport
        node $normalizeScript --input $updateJson --report $updatedReport | Out-Null
        node $normalizeScript --input $updateJsonReplace --report $updatedReport | Out-Null

        $updatedText = Get-Content -Raw -Encoding utf8 $updatedReport
        $headingCount = ([regex]::Matches($updatedText, '^### 2026-03-27 Update$', 'Multiline')).Count
        if ($headingCount -ne 1) {
            Write-Error "Expected exactly one dated update block after replacement."
        }
        if ($updatedText -notmatch 'Replacement update for the same date\.') {
            Write-Error "Expected replacement content to exist in updated report."
        }
        if ($updatedText -match 'Validation placeholder source') {
            Write-Error "Expected previous same-date content to be replaced, not duplicated."
        }
    }
}

$sectorExampleRoot = Join-Path $repoRoot "analysis-example\kr-sector"
if (-not (Test-Path $sectorExampleRoot)) {
    Write-Error "Missing sector analysis example directory: $sectorExampleRoot"
}

$sectorExampleCount = (Get-ChildItem -Path $sectorExampleRoot -Filter "*.md" | Measure-Object).Count
if ($sectorExampleCount -lt 2) {
    Write-Error "Expected at least two sector example markdown files under $sectorExampleRoot"
}

Write-Host "Validation passed."
}
finally {
    Pop-Location
    if (Test-Path $tempRoot) {
        Remove-Item -Recurse -Force $tempRoot
    }
}
