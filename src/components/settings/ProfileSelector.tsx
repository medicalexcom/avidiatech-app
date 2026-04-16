/**
 * ProfileSelector.tsx
 * 
 * UI component for tenant administrators to select their default content generation profile.
 * Displays available profiles with descriptions and allows switching between them.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function ProfileSelector({ tenantId, currentProfileKey, onProfileChange }: ProfileSelectorProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>(currentProfileKey || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load available profiles
  useEffect(() => {
    async function loadProfiles() {
      try {
        setLoading(true);
        const response = await fetch("/api/v1/profiles", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Failed to load profiles: ${response.statusText}`);
        }

        const data = await response.json();
        setProfiles(data.profiles || []);
        
        // Set initial selection if not already set
        if (!selectedProfile && data.profiles?.length > 0) {
          setSelectedProfile(currentProfileKey || data.profiles[0].key);
        }
      } catch (err: any) {
        console.error("Failed to load profiles:", err);
        setError(err.message || "Failed to load profiles");
      } finally {
        setLoading(false);
      }
    }

    loadProfiles();
  }, [currentProfileKey, selectedProfile]);

  // Save profile selection
  const handleSave = async () => {
    if (!selectedProfile) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/v1/tenant/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          profileKey: selectedProfile,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update profile: ${response.statusText}`);
      }

      setSuccess(true);
      onProfileChange?.(selectedProfile);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err: any) {
      console.error("Failed to save profile:", err);
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const getProfileDetails = (profile: Profile) => {
    const details = [];
    
    if (profile.domains?.length) {
      details.push(`Domain: ${profile.domains.join(", ")}`);
    }
    if (profile.channels?.length) {
      details.push(`Channel: ${profile.channels.join(", ")}`);
    }
    if (profile.h1Length) {
      details.push(`H1 Length: ${profile.h1Length.min}-${profile.h1Length.max} chars`);
    }
    
    return details.join(" • ");
  };

  const hasChanges = selectedProfile !== currentProfileKey;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Generation Profile</CardTitle>
          <CardDescription>Loading available profiles...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Generation Profile</CardTitle>
        <CardDescription>
          Choose the content generation profile for your organization. This affects tone, format, and compliance rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
                <RadioGroupItem value={profile.key} id={profile.key} className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor={profile.key} className="text-base font-medium cursor-pointer">
                    {profile.key}
                    {profile.key === currentProfileKey && (
                      <Badge variant="outline" className="ml-2">Current</Badge>
                    )}
                  </Label>
                  
                  {profile.description && (
                    <p className="text-sm text-muted-foreground">{profile.description}</p>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    {getProfileDetails(profile)}
                  </div>
                  
                  {profile.metaTitleSuffix && (
                    <div className="text-xs">
                      <span className="font-medium">Meta Title Suffix:</span>{" "}
                      <code className="bg-muted px-1 py-0.5 rounded">{profile.metaTitleSuffix}</code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </RadioGroup>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center text-sm text-muted-foreground">
            <Info className="h-4 w-4 mr-2" />
            Changes take effect immediately for new content generation
          </div>
          
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            className="min-w-[100px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProfileSelector;
