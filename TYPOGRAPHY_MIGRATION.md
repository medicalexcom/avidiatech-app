# Typography Migration - Remaining Work

## Completed ✅

1. ✅ Replaced `src/components/typography.tsx` with new centralized system
2. ✅ Migrated `src/app/dashboard/page.tsx`
3. ✅ Migrated `src/app/dashboard/api/page.tsx`
4. ✅ Passed TypeScript compilation
5. ✅ Passed code review
6. ✅ Passed security scan (0 vulnerabilities)

## Remaining Files (45 files)

The following files still need migration following the same pattern:

### High Priority (Main Features)
- [ ] `seo/page.tsx` - SEO generation page
- [ ] `extract/page.tsx` - Extraction page
- [ ] `describe/page.tsx` - Description generation
- [ ] `cluster/page.tsx` - Clustering page
- [ ] `translate/page.tsx` - Translation page

### Medium Priority
- [ ] `match/page.tsx`
- [ ] `variants/page.tsx`
- [ ] `specs/page.tsx`
- [ ] `audit/page.tsx`
- [ ] `import/page.tsx`
- [ ] `browser/page.tsx`
- [ ] `visualize/page.tsx`
- [ ] `monitor/page.tsx`

### Lower Priority
- [ ] `analytics/page.tsx`
- [ ] `assistant/page.tsx`
- [ ] `agency/page.tsx`
- [ ] `api-keys/page.tsx`
- [ ] `api_keys/page.tsx`
- [ ] `bulk/page.tsx`
- [ ] `description-formats/page.tsx`
- [ ] `docs/page.tsx`
- [ ] `feeds/page.tsx`
- [ ] `images/page.tsx`
- [ ] `notifications/page.tsx`
- [ ] `organization/page.tsx`
- [ ] `price/page.tsx`
- [ ] `pricing/page.tsx`
- [ ] `roles/page.tsx`
- [ ] `studio/page.tsx`
- [ ] `subscription/page.tsx`
- [ ] `validate/page.tsx`
- [ ] `versioning/page.tsx`

### Supporting Files
- [ ] `layout.tsx`
- [ ] `describe/history/page.tsx`
- [ ] `translate/[productId]/page.tsx`
- [ ] Component files in `match/_components/`
- [ ] Component files in `monitor/_components/`

## Migration Script

Use this Python script template for each file:

```python
#!/usr/bin/env python3
import re

file_path = 'src/app/dashboard/[FILE_PATH]'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import after "use client"
if 'from "@/components/typography"' not in content:
    import_stmt = '''
import {
  PageTitle,
  PageDescription,
  CardTitle,
  SectionLabel,
} from "@/components/typography";
'''
    # Insert after "use client";
    content = re.sub(
        r'("use client";)\s*\n',
        r'\1\n' + import_stmt,
        content,
        count=1
    )

# Replace h1
content = re.sub(
    r'<h1 className="text-xl[^>]*>',
    '<PageTitle>',
    content
)
# Fix first </h1> to </PageTitle>
content = content.replace('</h1>', '</PageTitle>', 1)

# Replace description p
content = re.sub(
    r'<p className="(?:max-w-(?:xl|2xl)\s+)?text-sm text-slate-600[^>]*>',
    '<PageDescription>',
    content,
    count=1
)
# Fix first </p> after PageDescription
if '<PageDescription>' in content:
    idx = content.find('<PageDescription>')
    next_close = content.find('</p>', idx)
    if next_close != -1:
        content = content[:next_close] + '</PageDescription>' + content[next_close+4:]

# Clean up utilities
content = content.replace('uppercase tracking-[0.18em]', '')
content = content.replace('uppercase tracking-[0.2em]', '')
content = content.replace('tracking-[0.18em]', '')
content = content.replace('tracking-[0.2em]', '')
content = content.replace('tracking-wide', '')
content = content.replace('uppercase ', '')

# Clean up extra spaces
content = re.sub(r'  +', ' ', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Migrated {file_path}")
```

## Testing After Each File

```bash
# Check TypeScript
npx tsc --noEmit 2>&1 | grep "dashboard.*\.tsx" | grep -v "__tests__"

# Commit if no errors
git add src/app/dashboard/[FILE].tsx
git commit -m "feat(typography): migrate dashboard/[FILE] to typography helpers"
```

## Tips

1. **Migrate in small batches** (3-5 files at a time)
2. **Test TypeScript after each file**
3. **Don't use global sed replacements** - they break JSX structure
4. **Watch for nested elements** - don't replace </h1> if it's inside another h1
5. **Keep custom classes** - only remove typography-related classes
6. **Preserve attributes** - Keep data-*, id, role, etc.

## Pattern Reference

### Before
```tsx
<h1 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-50">
  Title
</h1>
<p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
  Description
</p>
```

### After
```tsx
<PageTitle>
  Title
</PageTitle>
<PageDescription className="max-w-2xl">
  Description
</PageDescription>
```

## Success Criteria

- ✅ No TypeScript errors
- ✅ All imports present and used
- ✅ tracking-* utilities removed
- ✅ uppercase classes removed (except specific branded elements)
- ✅ Layout/spacing classes preserved
- ✅ Custom classes preserved
