"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        setError(data.error ?? "Email atau password salah.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[360px]">
        <h1 className="mb-6 text-xl leading-7 font-semibold text-ink">
          Bug Tracker
        </h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-panel border border-line bg-surface p-4"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-xs leading-4 font-medium text-ink-2"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs leading-4 font-medium text-ink-2"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
              className="w-full"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-control bg-sev-kritis-bg px-2 py-1.5 text-sm text-sev-kritis-fg">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </div>
    </div>
  );
}