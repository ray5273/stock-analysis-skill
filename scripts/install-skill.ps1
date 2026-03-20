param(
    [Parameter(Mandatory = $true)]
    [string]$SkillName
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $repoRoot "skills\$SkillName"
$targetRoot = Join-Path $HOME ".codex\skills"
$targetPath = Join-Path $targetRoot $SkillName

if (-not (Test-Path $sourcePath)) {
    Write-Error "Skill not found: $SkillName"
    exit 1
}

New-Item -ItemType Directory -Force $targetRoot | Out-Null
Copy-Item -Path $sourcePath -Destination $targetRoot -Recurse -Force

Write-Host "Installed $SkillName to $targetPath"
