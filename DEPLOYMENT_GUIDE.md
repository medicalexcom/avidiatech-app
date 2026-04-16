# Phase 1 Deployment Guide

## Directory Structure Creation

First, create the new directory structure in your avidiatech-app repo:

```bash
mkdir -p tools/render-engine/prompts/core
mkdir -p tools/render-engine/prompts/channels  
mkdir -p tools/render-engine/prompts/domains
mkdir -p tools/render-engine/prompts/tenants
mkdir -p tools/render-engine/prompts/profiles
```

## File Placement

### Core Prompt Modules
```
tools/render-engine/prompts/core/grounding.md
tools/render-engine/prompts/core/compliance.md
tools/render-engine/prompts/core/formatting.md
tools/render-engine/prompts/core/variants.md
```

### Channel-Specific Rules
```
tools/render-engine/prompts/channels/bigcommerce-longform.md
```

### Domain-Specific Rules
```
tools/render-engine/prompts/domains/medical-store.md
tools/render-engine/prompts/domains/general-ecommerce.md
```

### Tenant-Specific Rules
```
tools/render-engine/prompts/tenants/medicalex.md
```

### Profile Configurations
```
tools/render-engine/prompts/profiles/medicalex.bigcommerce.longform.json
tools/render-engine/prompts/profiles/general.bigcommerce.longform.json
```

### Code Files

#### New Profile System
```
src/lib/gpt/loadPromptProfile.ts              <- NEW, replaces loadInstructions.ts
```

#### Updated Compliance Linter
```
src/lib/audit/seoComplianceLinter.ts           <- REPLACE existing file
```

#### Updated API Routes and Services
```
src/app/api/v1/describe/route.ts               <- REPLACE existing file
src/lib/seo/callSeoModel.ts                    <- REPLACE existing file  
src/lib/seo/repairSeoModel.ts                  <- REPLACE existing file
src/lib/seo/runSeoForIngestion.ts              <- REPLACE existing file
src/lib/audit/runAuditForIngestion.ts          <- REPLACE existing file
```

## Important Notes

### Backward Compatibility
- The existing `tools/render-engine/prompts/custom_gpt_instructions.md` file is **NOT MODIFIED**
- MedicalEx continues using this file via `useCanonicalFile: true` in the profile config
- All existing functionality continues working exactly as before

### Legacy Function Exports
The new `loadPromptProfile.ts` exports legacy-compatible functions:
- `loadCustomGptInstructions()` - for backward compatibility
- `loadCustomGptInstructionsWithInfo()` - for backward compatibility

### Zero Regression Risk
- MedicalEx profile uses the existing canonical file directly (`useCanonicalFile: true`)
- No composition, no variable injection, no risk of prompt changes
- General ecommerce profiles use modular composition

### Key Benefits After Deployment
1. **MedicalEx unchanged** - Zero regression risk, continues using existing prompt
2. **General market unlocked** - New tenants can use `general.bigcommerce.longform` profile  
3. **Profile flexibility** - Easy to add Amazon, Facebook, other channels later
4. **Tenant customization** - Each tenant can have different default profiles
5. **Store name variables** - `{{STORE_NAME}}` gets replaced at runtime

## Testing After Deployment

1. **Verify MedicalEx unchanged**:
   - Generate content for existing MedicalEx products
   - Confirm output exactly matches previous version
   - Check meta titles end with `| MedicalEx`

2. **Test general profile**:
   - Create test tenant with `general.bigcommerce.longform` profile
   - Generate content and verify meta titles use `{{STORE_NAME}}`
   - Confirm no medical language in output

3. **Verify profile loading**:
   - Check console logs show correct profile usage
   - Confirm cache is working properly
   - Test fallback to MedicalEx profile

This deployment unlocks the general ecommerce market with zero risk to existing MedicalEx functionality.
