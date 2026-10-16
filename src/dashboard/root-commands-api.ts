import { getRootCommandConfig, saveRootCommandConfig } from "../control-plane/root-commands";

export async function handleRootCommandsApi(request: Request, url: URL): Promise<Response | null> {
  if (url.pathname === "/api/root-commands" && request.method === "GET") {
    return Response.json(getRootCommandConfig(), {
      headers: { "cache-control": "no-store" },
    });
  }
  if (url.pathname === "/api/root-commands" && request.method === "PUT") {
    try {
      const body = (await request.json()) as {
        rules: Array<{ command: string; args: string[]; enabled: boolean }>;
        password?: string;
        clearPassword?: boolean;
      };
      return Response.json(saveRootCommandConfig(body), {
        headers: { "cache-control": "no-store" },
      });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unable to save root command configuration",
        },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }
  }
  return null;
}
