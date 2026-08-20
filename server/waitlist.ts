import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = process.env.VERCEL
  ? "/tmp/context-x"
  : path.join(path.dirname(fileURLToPath(import.meta.url)), ".data");
const waitlistFile = path.join(dataDir, "waitlist.json");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface WaitlistFile {
  emails: string[];
}

async function load(): Promise<WaitlistFile> {
  try {
    const raw = await readFile(waitlistFile, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray((parsed as WaitlistFile).emails)
    ) {
      return parsed as WaitlistFile;
    }
    return { emails: [] };
  } catch {
    return { emails: [] };
  }
}

async function save(data: WaitlistFile): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  await writeFile(waitlistFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function addWaitlistEmail(
  raw: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = raw.trim().toLowerCase();
  if (email.length < 5 || email.length > 200 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const data = await load();
  if (!data.emails.includes(email)) {
    data.emails.push(email);
    await save(data);
  }
  return { ok: true };
}
