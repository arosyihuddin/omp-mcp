import { timingSafeEqual } from "node:crypto";

const token = process.env.OMP_API_TOKEN?.trim() ?? "";

/** Protect every HTTP endpoint with the same OMP-MCP Bearer token. */
export function authorizeHttpRequest(request: Request): Response | null {
  const headers = {
    "cache-control": "no-store",
    "www-authenticate": "Bearer",
  };

  if (!token) {
    return Response.json(
      { error: "HTTP API is disabled: OMP_API_TOKEN is not configured." },
      { status: 503, headers },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const supplied = match?.[1]?.trim() ?? "";
  if (!supplied) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  const expectedBytes = Buffer.from(token);
  const suppliedBytes = Buffer.from(supplied);
  if (
    expectedBytes.length !== suppliedBytes.length ||
    !timingSafeEqual(expectedBytes, suppliedBytes)
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  return null;
}
