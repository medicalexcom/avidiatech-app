// Add this import at the top:
import { safeGetAuth } from "@/lib/clerkSafe";

// Then replace the line that does:
// const auth = getAuth((req as any));
// with:
const auth = safeGetAuth((req as any));

// Rest of file unchanged.
