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
}

Write-Host "Validation passed."
}
finally {
    if (Test-Path $tempRoot) {
        Remove-Item -Recurse -Force $tempRoot
    }
}
