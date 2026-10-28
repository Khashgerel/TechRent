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

type Asker = {
  ask(prompt: string): Promise<string>;
  askSecret(prompt: string): Promise<string>;
  close(): void;
};

/**
 * Interactive prompts, masking the password as it is typed.
 *
 * `_writeToOutput` is readline's own echo hook; swapping it for the duration
 * of one question is the standard way to stop keystrokes reaching the screen.
 */
function ttyAsker(): Asker {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });

  return {
    ask: async (prompt) => (await rl.question(prompt)).trim(),
    askSecret: async (prompt) => {
      const muted = rl as unknown as {
        _writeToOutput?: (chunk: string) => void;
      };
      const original = muted._writeToOutput;
      const pending = rl.question(prompt);
      muted._writeToOutput = (chunk: string) => {
        if (chunk.includes(prompt)) original?.call(rl, chunk);
      };
      const value = await pending;
      muted._writeToOutput = original;
      stdout.write("\n");
      return value.trim();
    },
    close: () => rl.close(),
  };
}

/**
 * Answers piped in rather than typed.
 *
 * `readline` resolves its first question and then stalls on a non-TTY stream,
 * so the input is read in full up front and handed out in order. Nothing is
 * masked here because nothing is being displayed to anyone.
 */
async function pipedAsker(): Promise<Asker> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) chunks.push(Buffer.from(chunk));
  const lines = Buffer.concat(chunks).toString("utf8").split(/\r?\n/);

  const next = (prompt: string) => {
    stdout.write(prompt);
    const value = (lines.shift() ?? "").trim();
    stdout.write("\n");
    return Promise.resolve(value);
  };

  return { ask: next, askSecret: next, close: () => {} };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  // Say out loud which database this is about to touch — the same string
  // points at production more often than anyone expects.
  console.log(`Database: ${new URL(url).hostname}\n`);

  const asker = stdin.isTTY ? ttyAsker() : await pipedAsker();

  try {
    const username = (await asker.ask("Username: ")).toLowerCase();
    const name = await asker.ask("Display name: ");

    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      throw new Error("Username must be 3-32 characters: a-z, 0-9, . _ -");
    }
    if (!name) throw new Error("Display name is required");

    const password = await asker.askSecret("Password: ");
    const again = await asker.askSecret("Repeat password: ");

    if (password !== again) throw new Error("Passwords did not match");
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
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

      console.log("Sign in at /[locale]/staff-login");
    } finally {
      await db.$disconnect();
      await pool.end();
    }
  } finally {
    asker.close();
  }
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
