# PDF Generation Scripts

## Generate All Profiles

The `generate-all-profiles.ts` script creates PDFs for all 16 possible DISC profile outcomes to verify consistent rendering across all templates.

### Profile Types Generated

**Single Dominance (4 profiles):**
- D, I, S, C

**Dual Dominance (12 profiles):**
- DI, DC, DS, ID, IC, IS, CD, CI, CS, SD, SI, SC

### Usage

Run from the project root:

```bash
npm run generate:all-profiles
```

### Output

PDFs are saved to: `output/all-profiles/`

Each filename follows the pattern: `{PROFILE_CODE}-profile.pdf`

Example: `DI-profile.pdf`, `C-profile.pdf`

### What the Script Does

1. **Creates output directory** if it doesn't exist
2. **Generates test data** with realistic percentages for each profile type:
   - Single profiles: Primary axis at 60%, others at ~13%
   - Dual profiles: Both axes at 55%, others at 15%
3. **Renders PDFs** using the actual template system with charts
4. **Saves files** with descriptive names
5. **Provides summary** showing success/failure for each profile

### Verifying Output

After generation, review all PDFs to ensure:
- ✅ Charts render correctly with proper proportions
- ✅ Percentages display accurately
- ✅ Layouts are consistent across all profile types
- ✅ No visual artifacts or rendering issues
- ✅ All 9 pages are present in each PDF
