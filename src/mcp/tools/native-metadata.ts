export function getNativeToolAnnotations(name: string) {
  if (["read", "glob", "grep", "find", "ast_grep", "web_search"].includes(name)) {
    return { readOnlyHint: true, openWorldHint: name === "web_search" };
  }
  if (["lsp", "todo", "new_context"].includes(name)) {
    return { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
  }
  if (["write", "edit", "ast_edit", "context_notes", "learn", "manage_skill", "task", "debug", "bash", "eval"].includes(name)) {
    return { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: name === "bash" || name === "eval" };
  }
  return { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true };
}
