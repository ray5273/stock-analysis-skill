$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$skillsRoot = Join-Path $repoRoot "skills"
$requiredFiles = @(
    "SKILL.md",
    "agents\openai.yaml"
)

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

    $skillMd = Get-Content -Raw (Join-Path $skillDir.FullName "SKILL.md")
    if ($skillMd -notmatch "(?s)^---\r?\nname:\s.+?\r?\ndescription:\s.+?\r?\n---") {
        Write-Error "Invalid or missing frontmatter in $($skillDir.FullName)\SKILL.md"
    }

    Get-ChildItem -Path $skillDir.FullName -Recurse -Filter "*.js" | ForEach-Object {
        node --check $_.FullName | Out-Null
    }
}

Write-Host "Validation passed."
