"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";

type TenantSettingsPageProps = {
  tenantId: string;
};

type CurrentProfileResponse = {
  tenantId: string;
  tenantName?: string;
  profileKey?: string;
};

type AvailableProfile = {
  key: string;
  description?: string;
};

export default function TenantSettingsPage({
  tenantId,
}: TenantSettingsPageProps) {
  const { user } = useUser();

  const [availableProfiles, setAvailableProfiles] = useState<AvailableProfile[]>([
    {
      key: "medicalex.bigcommerce.longform",
      description: "MedicalEx medical equipment format",
    },
  ]);
  const [currentProfileKey, setCurrentProfileKey] = useState(
    "medicalex.bigcommerce.longform"
  );
  const [selectedProfileKey, setSelectedProfileKey] = useState(
    "medicalex.bigcommerce.longform"
  );
  const [tenantName, setTenantName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedProfile = useMemo(
    () =>
      availableProfiles.find((profile) => profile.key === selectedProfileKey) ??
      availableProfiles[0],
    [availableProfiles, selectedProfileKey]
  );

  // Owner bypass list, comma-separated in env.
  // Example: NEXT_PUBLIC_PROFILE_ADMIN_EMAILS=owner@company.com,admin@company.com
  const ownerEmails = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_PROFILE_ADMIN_EMAILS || "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    []
  );

  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
  const hasOwnerBypass = ownerEmails.includes(userEmail);

  const canEditProfile =
    hasOwnerBypass || currentProfileKey !== "medicalex.bigcommerce.longform";

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentProfileAndOptions() {
      try {
        setIsLoading(true);
        setError("");
        setMessage("");

        const [profileRes, listRes] = await Promise.all([
          fetch(`/api/v1/tenant/profile?tenantId=${encodeURIComponent(tenantId)}`, {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/v1/profiles", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        if (!profileRes.ok) {
          const data = await profileRes.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to load tenant profile");
        }

        const data = (await profileRes.json()) as CurrentProfileResponse;
        const profileList = await listRes.json().catch(() => ({ profiles: [] }));

        if (cancelled) return;

        const nextProfile = data.profileKey || "medicalex.bigcommerce.longform";

        const options: AvailableProfile[] =
          Array.isArray(profileList?.profiles) && profileList.profiles.length
            ? profileList.profiles
            : availableProfiles;

        setCurrentProfileKey(nextProfile);
        setSelectedProfileKey(nextProfile);
        setTenantName(data.tenantName || "");
        setAvailableProfiles(options);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Failed to load tenant profile");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCurrentProfileAndOptions();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  async function handleSave() {
    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/v1/tenant/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          tenantId,
          profileKey: selectedProfileKey,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save tenant profile");
      }

      setCurrentProfileKey(selectedProfileKey);
      setMessage("Tenant profile saved successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to save tenant profile");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl border bg-background p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Tenant Settings
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage the default content-generation profile for this tenant.
          </p>
          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
            <div>
              <span className="font-medium">Tenant ID:</span> {tenantId}
            </div>
            {tenantName ? (
              <div className="mt-1">
                <span className="font-medium">Tenant Name:</span> {tenantName}
              </div>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">
            Loading tenant profile...
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <label
                htmlFor="default-profile"
                className="block text-sm font-medium"
              >
                Default profile
              </label>

              <select
                id="default-profile"
                value={selectedProfileKey}
                onChange={(event) => setSelectedProfileKey(event.target.value)}
                disabled={!canEditProfile}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {availableProfiles.map((profile) => (
                  <option key={profile.key} value={profile.key}>
                    {profile.key}
                  </option>
                ))}
              </select>

              <p className="text-sm text-muted-foreground">
                {selectedProfile?.description || "No description available."}
              </p>

              {!canEditProfile ? (
                <p className="text-sm text-muted-foreground">
                  MedicalEx tenant defaults are locked to preserve current production behavior.
                </p>
              ) : hasOwnerBypass ? (
                <p className="text-sm text-muted-foreground">
                  Owner override active for testing via NEXT_PUBLIC_PROFILE_ADMIN_EMAILS.
                </p>
              ) : null}

              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div>
                  <span className="font-medium">Current profile:</span>{" "}
                  {currentProfileKey}
                </div>
              </div>
            </div>

            {message ? (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || selectedProfileKey === currentProfileKey || !canEditProfile}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save profile"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedProfileKey(currentProfileKey);
                  setMessage("");
                  setError("");
                }}
                disabled={isSaving}
                className="rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
