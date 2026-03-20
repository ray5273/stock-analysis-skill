$repoRoot = Split-Path -Parent $PSScriptRoot
$skillsRoot = Join-Path $repoRoot "skills"

Get-ChildItem -Path $skillsRoot -Directory | ForEach-Object {
    & (Join-Path $PSScriptRoot "install-skill.ps1") $_.Name
}
