import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Fetch keys server-side
async function loadKeys(tenantId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/api-keys?tenant_id=${tenantId}`,
    { cache: "no-store" }
  );

  if (!res.ok) return [];
  const json = await res.json();
  return json.keys || [];
}

// Server action: create key
async function createKeyAction(formData: FormData) {
  "use server";

  const tenantId = formData.get("tenantId") as string;
  const name = formData.get("name") as string;

  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/api-keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant_id: tenantId, name }),
  });

  revalidatePath("/dashboard/api-keys");
}

// Server action: revoke key
async function revokeKeyAction(formData: FormData) {
  "use server";

  const id = formData.get("id") as string;

  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/api-keys`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  revalidatePath("/dashboard/api-keys");
}

export default async function ApiKeysPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  // You will get tenantId from your Clerk or membership system later
  const tenantId = ""; // placeholder, replace with real tenant context
  const keys = tenantId ? await loadKeys(tenantId) : [];

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">API Keys</h1>

      {/* CREATE FORM */}
      <form action={createKeyAction} className="mb-6 flex gap-2">
        <input
          type="text"
          name="tenantId"
          placeholder="Tenant ID"
          className="border rounded px-2 py-1 text-sm"
          required
        />
        <input
          type="text"
          name="name"
          placeholder="Key name"
          className="border rounded px-2 py-1 text-sm"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
        >
          Create key
        </button>
      </form>

      {/* TABLE */}
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Name</th>
            <th className="py-2">Prefix</th>
            <th className="py-2">Created</th>
            <th className="py-2">Revoked</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key: any) => (
            <tr key={key.id} className="border-b hover:bg-gray-50">
              <td className="py-2">{key.name}</td>
              <td className="py-2">{key.prefix}</td>
              <td className="py-2">{key.created_at?.slice(0, 10)}</td>
              <td className="py-2">{key.revoked_at ? key.revoked_at.slice(0, 10) : "-"}</td>
              <td className="py-2">
                {!key.revoked_at && (
                  <form action={revokeKeyAction}>
                    <input type="hidden" name="id" value={key.id} />
                    <button type="submit" className="text-red-600 hover:underline">
                      Revoke
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
