import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, type UserRole } from "@/db/schema";
import { eq } from "drizzle-orm";

const SESSION_COOKIE = "bug_tracker_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 hari

function getSecret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET belum diset atau terlalu pendek (minimal 32 karakter). Isi di .env.local."
    );
  }
  return new TextEncoder().encode(value);
}

export interface SessionPayload {
  userId: number;
  email: string;
  name: string;
  role: UserRole;
}

export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(
  token: string,
  options: { secure?: boolean } = {}
): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Hanya tandai Secure kalau request memang lewat HTTPS. Di Vercel selalu
    // https. Kalau dipaksa true saat akses lewat http (mis. `npm start` lokal),
    // browser tidak akan mengirim balik cookie-nya.
    secure: options.secure ?? process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
}

/**
 * Deteksi apakah request datang lewat HTTPS.
 * Vercel/Linux di belakang reverse proxy meneruskan x-forwarded-proto.
 */
export function isHttpsRequest(headers: {
  get(name: string): string | null;
}): boolean {
  const forwardedProto = headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim() === "https";
  }
  const url = headers.get("x-forwarded-url") ?? headers.get("host");
  return typeof url === "string" ? url.startsWith("https://") : false;
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  return user ?? null;
}

// Proteksi halaman & API: lempar error kalau belum login
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden: role tidak cukup untuk aksi ini");
    this.name = "ForbiddenError";
  }
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new ForbiddenError();
  }
  return user;
}

export { SESSION_COOKIE };
