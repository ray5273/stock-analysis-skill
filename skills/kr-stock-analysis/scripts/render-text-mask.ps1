param(
    [Parameter(Mandatory = $true)]
    [string]$FontPath,

    [Parameter(Mandatory = $true)]
    [int]$FontSize,

    [Parameter(Mandatory = $true)]
    [string]$Text
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

if ([string]::IsNullOrWhiteSpace($Text)) {
    '{"width":0,"height":0,"alpha":""}'
    exit 0
}

$collection = New-Object System.Drawing.Text.PrivateFontCollection
$collection.AddFontFile($FontPath)
$family = $collection.Families[0]
$font = New-Object System.Drawing.Font($family, $FontSize, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$format = [System.Drawing.StringFormat]::GenericTypographic
$probeBitmap = New-Object System.Drawing.Bitmap 1, 1, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$probeGraphics = [System.Drawing.Graphics]::FromImage($probeBitmap)
$probeGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$size = $probeGraphics.MeasureString($Text, $font, 4096, $format)
$width = [Math]::Max(1, [int][Math]::Ceiling($size.Width))
$height = [Math]::Max(1, [int][Math]::Ceiling($size.Height))
$probeGraphics.Dispose()
$probeBitmap.Dispose()

$bitmap = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.DrawString($Text, $font, [System.Drawing.Brushes]::White, 0, 0, $format)

$alphaBytes = New-Object byte[] ($width * $height)
for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
        $index = ($y * $width) + $x
        $alphaBytes[$index] = $bitmap.GetPixel($x, $y).A
    }
}

$graphics.Dispose()
$bitmap.Dispose()
$font.Dispose()
$collection.Dispose()

$payload = [ordered]@{
    width = $width
    height = $height
    alpha = [Convert]::ToBase64String($alphaBytes)
}

$payload | ConvertTo-Json -Compress
