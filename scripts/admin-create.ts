/**
 * Creates a staff account, or sets the password on one that already exists.
 *
 * The only way a password enters this system. It is never written to the repo,
 * the seed, or an environment variable, and it is never echoed back — a demo
 * on a public URL with a default password is how demos get taken over.
 *
 *   npm run admin:create
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { hashPassword } from "../lib/auth/password";

config({ quiet: true });

const MIN_PASSWORD_LENGTH = 12;

/** Reads without echoing, so a shoulder or a scrollback never sees it. */
async function readSecret(prompt: string) {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });

  // readline echoes by default; silence the output stream while it reads.
  const output = rl as unknown as { output?: { write(chunk: string): void } };
  const original = output.output?.write.bind(output.output);
  let silence = false;
  if (output.output && original) {
    output.output.write = (chunk: string) => {
      if (!silence) original(chunk);
    };
  }

  stdout.write(prompt);
  silence = true;
  const answer = await rl.question("");
  silence = false;
  stdout.write("\n");

  if (output.output && original) output.output.write = original;
  rl.close();
  return answer;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  // Say out loud which database this is about to touch — the same string
  // points at production more often than anyone expects.
  console.log(`Database: ${new URL(url).hostname}\n`);

  const rl = createInterface({ input: stdin, output: stdout });
  const username = (await rl.question("Username: ")).trim().toLowerCase();
  const name = (await rl.question("Display name: ")).trim();
  rl.close();

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error("Username must be 3-32 characters: a-z, 0-9, . _ -");
  }
  if (!name) throw new Error("Display name is required");

  const password = await readSecret("Password: ");
  const again = await readSecret("Repeat password: ");

  if (password !== again) throw new Error("Passwords did not match");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const pool = new Pool({ connectionString: url });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const passwordHash = await hashPassword(password);
    const existing = await db.user.findUnique({ where: { username } });

    if (existing) {
      if (!existing.roles.includes("ADMIN")) {
        throw new Error(`${username} exists but is not a staff account`);
      }
      await db.user.update({
        where: { id: existing.id },
        data: { passwordHash, name },
      });
      console.log(`\nPassword updated for ${username}.`);
    } else {
      await db.user.create({
        data: {
          username,
          passwordHash,
          name,
          // Staff hold ADMIN and nothing else, and never a marketplace role.
          roles: ["ADMIN"],
          activeRole: "ADMIN",
          verification: "VERIFIED",
          verifiedAt: new Date(),
        },
      });
      console.log(`\nStaff account ${username} created.`);
    }

    console.log("Sign in at /admin/login");
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
