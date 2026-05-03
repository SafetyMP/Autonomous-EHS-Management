import { NextResponse } from "next/server";

/**
 * Placeholder upload endpoint. Production should use signed URLs (S3, GCS, Vercel Blob) and then
 * call `ehsEvidence.register` with the resulting `storageUri` and file metadata (see tRPC).
 */
export async function POST() {
  return NextResponse.json(
    {
      stub: true,
      message:
        "Direct upload not implemented. Use object storage signed URLs, then register metadata via tRPC ehsEvidence.register.",
    },
    { status: 501 },
  );
}
