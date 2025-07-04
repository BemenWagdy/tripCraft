# Repository Audit Report
*Generated on: *

## 📊 Dependency Analysis

### Unused Dependencies
Based on depcheck analysis, the following dependencies appear to be unused:

```json
[
  "@radix-ui/react-sheet"
]
```

### Missing Dependencies
Dependencies that are used but not declared:

```json
{
  "lodash.debounce": [
    "/home/project/components/DestinationField.tsx"
  ],
  "@react-pdf/renderer": [
    "/home/project/components/PdfDoc.tsx",
    "/home/project/components/Result.tsx"
  ],
  "next-themes": [
    "/home/project/components/ui/sonner.tsx"
  ]
}
```

### Dev Dependencies Analysis
```json
[
  "@types/eslint",
  "autoprefixer",
  "depcheck",
  "postcss"
]
```

## 🗂️ Large Files & Generated Artifacts

### Files > 1MB (excluding node_modules, .next, public)
```
```

### Generated/Build Artifacts Found
```
```

### Directory Sizes
```
Build directories not found
```

## 🔐 Security Scan

### Potential Secrets/Keys Found
⚠️ **REVIEW REQUIRED** - The following patterns were detected:

```
```

## 📝 Recommended .gitignore Additions

```gitignore
# Build outputs
.next/
dist/
coverage/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
*.pid
*.seed
*.pid.lock

# Temporary files
*.tmp
*.temp

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Environment variables
.env.local
.env.development.local
.env.test.local
.env.production.local

# Error logs
.error-log.txt
```

## 🎯 Cleanup Recommendations

### Safe to Remove
## ⚠️ Important Notes

1. **Manual Review Required**: All flagged secrets need manual verification
2. **Backup Recommended**: Create backup before any destructive operations
3. **Test After Cleanup**: Run full test suite after dependency removal
4. **Git History**: Consider cleaning git history if secrets are confirmed

---
**Next Steps**: Review this report and approve cleanup actions by replying "proceed"
