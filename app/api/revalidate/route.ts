import { revalidateTag } from "next/cache";

/**
 * Called by the ingest job after it publishes an edition. Expires the
 * edition cache immediately so the next visitor reads the new paper.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get("x-revalidate-secret") !== secret) {
    return Response.json({ ok: false }, { status: 401 });
  }
  revalidateTag("edition", { expire: 0 });
  return Response.json({ ok: true });
}
