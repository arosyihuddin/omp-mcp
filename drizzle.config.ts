import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/control-plane/db/schema.ts",
  out: "./src/control-plane/db/migrations",
});
