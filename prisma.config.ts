import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    // `prisma dev` exposes a second Postgres for migration drift detection.
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
