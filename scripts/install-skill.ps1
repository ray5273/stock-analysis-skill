param(
    [Parameter(Mandatory = $true)]
    [string]$SkillName
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $repoRoot "skills\$SkillName"
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$targetRoot = Join-Path $codexHome "skills"
$targetPath = Join-Path $targetRoot $SkillName

if (-not (Test-Path $sourcePath)) {
    Write-Error "Skill not found: $SkillName"
    exit 1
}

New-Item -ItemType Directory -Force $targetPath | Out-Null
Get-ChildItem -Path $sourcePath -Force | Copy-Item -Destination $targetPath -Recurse -Force

Write-Host "Installed $SkillName to $targetPath"
