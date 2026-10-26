$appDir = "d:\svs\app"
$tempDir = "$appDir\temp_zip_dir"

# Clean up any existing temp dir
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}

# Create temp dir
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "Copying project files to temporary directory..."
Get-ChildItem -Path $appDir -Force | Where-Object {
    $_.Name -ne "node_modules" -and
    $_.Name -ne "project-full.zip" -and
    $_.Name -ne "dist-deploy.zip" -and
    $_.Name -ne "temp_zip_dir" -and
    $_.Name -ne "temp_inspect_zip" -and
    $_.Name -ne "temp_inspect_zip2"
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $tempDir -Recurse -Force
}

# Verify .env and app.js copy
if (-not (Test-Path "$tempDir\.env")) {
    Write-Warning ".env file not found in temp dir!"
}
if (-not (Test-Path "$tempDir\app.js")) {
    Write-Warning "app.js file not found in temp dir!"
}

# Remove existing project-full.zip
$zipPath = "$appDir\project-full.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Write-Host "Zipping files..."
$topLevelItems = Get-ChildItem -Path $tempDir -Force | ForEach-Object { $_.FullName }
Compress-Archive -Path $topLevelItems -DestinationPath $zipPath -Force

Write-Host "Cleaning up..."
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "ZIP created successfully at $zipPath"
