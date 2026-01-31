$templatesRoot = "c:\Users\Daant\Documents\Windsurf projects\DISC\DISC Quiz\apps\quiz\public\report-templates"

$profiles = @("C", "CD", "CI", "CS", "D", "DC", "DI", "DS", "I", "IC", "ID", "IS", "S", "SC", "SD", "SI")

foreach ($profile in $profiles) {
    $file = Join-Path $templatesRoot "$profile\publication-web-resources\html\publication.html"

    if (Test-Path $file) {
        Write-Host "Processing $profile..."

        $content = Get-Content $file -Raw

        # Verwijder cover-dynamic.js script tag
        $content = $content -replace '<script src="../../../cover-dynamic.js"></script>', ''

        # Verander naam centrering: left:2999.72px naar left:0px;width:595.28px;text-align:center
        $content = $content -replace 'left:2999\.72px;', 'left:0px;width:595.28px;text-align:center;'

        Set-Content $file -Value $content -NoNewline

        Write-Host "  Done"
    } else {
        Write-Host "Skipping $profile (file not found)"
    }
}

Write-Host "All templates updated!"
