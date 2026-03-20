$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$skillsRoot = Join-Path $repoRoot "skills"

Get-ChildItem -Path $skillsRoot -Directory | Sort-Object Name | ForEach-Object {
    & (Join-Path $PSScriptRoot "install-skill.ps1") $_.Name
}
