# Generates a ZeroTweaks .ico from a system glyph.
# Draws the letter "Z" on a blue rounded tile so the app has a real icon of
# its own (the default Electron icon path inside the NSIS artifact is broken).
Add-Type -AssemblyName System.Drawing

function New-Tile([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)
  $pad = [int]($size * 0.06)
  $rect = New-Object System.Drawing.Rectangle($pad, $pad, ($size - 2*$pad), ($size - 2*$pad))
  $r = [int]($size * 0.22)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
  $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
  $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $c1 = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)
  $c2 = [System.Drawing.Color]::FromArgb(255, 59, 130, 246)
  $br = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45)
  $g.FillPath($br, $path)
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120,255,255,255), ([Math]::Max(1, $size/32)))
  $g.DrawPath($pen, $path)
  $font = New-Object System.Drawing.Font('Segoe UI', ($size * 0.52), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Center'
  $sf.LineAlignment = 'Center'
  $g.DrawString('Z', $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF(0, 0, $size, $size)), $sf)
  $g.Dispose()
  return $bmp
}

$out = 'C:\Users\PcVIP\resources\icons\icon.ico'
$dir = Split-Path $out
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

$imgs = @(16,24,32,48,64,128,256) | ForEach-Object { New-Tile $_ }
$fs = [System.IO.File]::Create($out)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]($imgs.Count))
$offset = 6 + (16 * $imgs.Count)
$entries = @()
foreach ($img in $imgs) {
  $ms = New-Object System.IO.MemoryStream
  $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $bytes = $ms.ToArray()
  $entries += ,@($img.Width, $bytes)
  $ms.Dispose(); $img.Dispose()
}
foreach ($e in $entries) {
  $w = if ($e[0] -ge 256) { 0 } else { $e[0] }
  $len = $e[1].Length
  $bw.Write([byte]$w); $bw.Write([byte]$w)
  $bw.Write([byte]0); $bw.Write([byte]0)
  $bw.Write([uint16]1); $bw.Write([uint16]32)
  $bw.Write([uint32]$len); $bw.Write([uint32]$offset)
  $offset += $len
}
foreach ($e in $entries) { $bw.Write($e[1]) }
$bw.Close(); $fs.Close()
Write-Output ("ICON_OK " + (Get-Item $out).Length)

# Also export a 256px PNG. Chromium's nativeImage (the BrowserWindow `icon`
# option) reads PNG/JPEG only — it cannot decode an .ico — so the in-app window
# icon comes from this file while the installer/exe keeps the .ico.
$pngPath = Join-Path $dir 'icon.png'
$tile = New-Tile 256
$tile.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$tile.Dispose()
Write-Output ("PNG_OK " + (Get-Item $pngPath).Length)
