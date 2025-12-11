$filePath = "D:\AI\manga-maker-ai\src\app\api\character\outfits\route.ts"
$content = Get-Content $filePath -Encoding UTF8 -Raw

$content = $content -replace '\{character\.name\}', '${character.name}'
$content = $content -replace '\{character\.description', '${character.description'
$content = $content -replace '\{outfit_type\}', '${outfit_type}'
$content = $content -replace '\{outfit_name\}', '${outfit_name}'
$content = $content -replace '\{description\}', '${description}'

$content | Set-Content $filePath -Encoding UTF8 -NoNewline

Write-Host "Fixed"
