ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS default_profile_key TEXT
NOT NULL DEFAULT 'medicalex.bigcommerce.longform';

COMMENT ON COLUMN public.tenants.default_profile_key IS
'Prompt profile key for content generation. Examples: medicalex.bigcommerce.longform, general.bigcommerce.longform, general.amazon.listing, general.facebook.catalog';

CREATE INDEX IF NOT EXISTS idx_tenants_default_profile_key
ON public.tenants(default_profile_key);
