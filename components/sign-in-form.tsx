"use client";

import { useState } from "react";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not send sign-in link.");
      }

      setStatus(payload.message ?? "Check your email for the sign-in link.");
      setEmail("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="hs-panel grid gap-4 rounded-[2rem] p-6">
      <div className="space-y-2">
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-[#17324f]">
          Sign in with an invited email
        </h2>
        <p className="hs-muted text-sm leading-6">
          When Supabase is configured, only emails listed in the shared workspace can access saved
          homes and editing routes.
        </p>
      </div>
      <label className="hs-label grid gap-2 text-sm font-medium">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="hs-input rounded-2xl px-4 py-3 outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="hs-button-primary rounded-2xl px-5 py-3 text-sm font-medium transition"
      >
        {pending ? "Sending link..." : "Email me a sign-in link"}
      </button>
      {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </form>
  );
}
