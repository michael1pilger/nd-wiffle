# ND Wiffle League Website v4

Fixes:
- Standardized every team logo to a 256x256 PNG asset.
- Added hard CSS and inline image dimensions so logos cannot render full-width.
- Rebuilt Patrick Thompson and Patrick Fitzgerald directly from the original cumulative CSV source aliases (`rPat Thompson`, `rPat Fitz`).
- Recomputed every career-stat grid condition from the corrected career tables.
- Regenerated the 300-board grid pool after the data correction.
- Added canonical career CSV copies under /assets for easier auditing.

Deploy by replacing the existing repo files, committing, and pushing to main.
