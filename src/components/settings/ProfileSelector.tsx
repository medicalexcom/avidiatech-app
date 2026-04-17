"use client";

/**
 * ProfileSelector.tsx
 *
 * UI component for tenant administrators to select their default content generation profile.
 * Displays available profiles with descriptions and allows switching between them.
 */

import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, Info } from "lucide-react";

interface Profile {
  key: string;
  description?: string;
  channels?: string[];
  domains?: string[];
  tenants?: string[];
  metaTitleSuffix?: string;
  h1Length?: { min: number; max: number };
}

interface ProfileSelectorProps {
  tenantId: string;
  currentProfileKey?: string;
  onProfileChange?: (profileKey: string) => void;
}

export function ProfileSelector({
  tenantId,
  currentProfileKey,
  onProfileChange,
}: ProfileSelectorProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>(
    currentProfileKey || ""
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadProfiles() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/v1/profiles", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to load profiles: ${response.statusText}`);
        }

        const data = await response.json();
        const nextProfiles = Array.isArray(data?.profiles) ? data.profiles : [];

        setProfiles(nextProfiles);

        if (!selectedProfile && nextProfiles.length > 0) {
          setSelectedProfile(currentProfileKey || nextProfiles[0].key);
        }
      } catch (err: any) {
        console.error("Failed to load profiles:", err);
        setError(err?.message || "Failed to load profiles");
      } finally {
        setLoading(false);
      }
    }

    void loadProfiles();
  }, [currentProfileKey]);

  const handleSave = async () => {
    if (!selectedProfile) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch("/api/v1/tenant/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          profileKey: selectedProfile,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.error || `Failed to update profile: ${response.statusText}`
        );
      }

      setSuccess(true);
      onProfileChange?.(selectedProfile);
      window.setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      setError(err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const getProfileDetails = (profile: Profile) => {
    const details: string[] = [];

    if (profile.domains?.length) {
      details.push(`Domain: ${profile.domains.join(", ")}`);
    }
    if (profile.channels?.length) {
      details.push(`Channel: ${profile.channels.join(", ")}`);
    }
    if (profile.h1Length) {
      details.push(
        `H1 Length: ${profile.h1Length.min}-${profile.h1Length.max} chars`
      );
    }

    return details.join(" • ");
  };

  const hasChanges = selectedProfile !== (currentProfileKey || "");

  if (loading) {
    return (
      <Card>
        <CardHeader className="block space-y-1">
          <CardTitle>Content Generation Profile</CardTitle>
          <CardDescription>Loading available profiles...</CardDescription>
        </CardHeader>

        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="block space-y-1">
        <CardTitle>Content Generation Profile</CardTitle>
        <CardDescription>
          Choose the content generation profile for your organization. This
          affects tone, format, and compliance rules.
        </CardDescription>
      </CardHeader>

      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Profile updated successfully!
            </AlertDescription>
          </Alert>
        )}

        <RadioGroup value={selectedProfile} onValueChange={setSelectedProfile}>
          <div className="space-y-4">
            {profiles.map((profile) => (
              <div key={profile.key} className="flex items-start space-x-3">
                <RadioGroupItem
                  value={profile.key}
                  id={profile.key}
                  className="mt-1"
                />

                <div className="flex-1 space-y-2">
                  <Label
                    htmlFor={profile.key}
                    className="cursor-pointer text-base font-medium"
                  >
                    {profile.key}
                    {profile.key === currentProfileKey && (
                      <Badge variant="outline" className="ml-2">
                        Current
                      </Badge>
                    )}
                  </Label>

                  {profile.description && (
                    <p className="text-sm text-muted-foreground">
                      {profile.description}
                    </p>
                  )}

                  {getProfileDetails(profile) && (
                    <div className="text-xs text-muted-foreground">
                      {getProfileDetails(profile)}
                    </div>
                  )}

                  {profile.metaTitleSuffix && (
                    <div className="text-xs">
                      <span className="font-medium">Meta Title Suffix:</span>{" "}
                      <code className="rounded bg-muted px-1 py-0.5">
                        {profile.metaTitleSuffix}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </RadioGroup>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Info className="mr-2 h-4 w-4" />
            Changes take effect immediately for new content generation
          </div>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="min-w-[100px]"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default ProfileSelector;
