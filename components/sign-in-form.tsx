"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  async function handleRequestCode(event: React.FormEvent<HTMLFormElement>) {
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

      setCodeSent(true);
      setStatus(
        payload.message ??
          "Check your email for the newest sign-in message, then enter the numeric code below.",
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });

      const payload = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not verify sign-in code.");
      }

      router.push(payload.redirectTo ?? "/homes");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Could not verify sign-in code.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="hs-panel grid gap-4 rounded-[2rem] p-6">
      <div className="space-y-2">
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-[#17324f]">
          Sign in with an invited email
        </h2>
        <p className="hs-muted text-sm leading-6">
          Enter your invited email, then use the newest sign-in email. Typed codes are more
          reliable than email links because some inbox providers pre-open links.
        </p>
      </div>
      <form onSubmit={handleRequestCode} className="grid gap-4">
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
          {pending ? "Sending email..." : codeSent ? "Resend sign-in email" : "Send sign-in email"}
        </button>
      </form>
      {codeSent ? (
        <form onSubmit={handleVerifyCode} className="grid gap-4 rounded-3xl border border-black/10 bg-white/60 p-4">
          <label className="hs-label grid gap-2 text-sm font-medium">
            Email sign-in code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,10}"
              maxLength={10}
              required
              value={token}
              onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 10))}
              className="hs-input rounded-2xl px-4 py-3 outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={pending || token.length < 6}
            className="hs-button-primary rounded-2xl px-5 py-3 text-sm font-medium transition"
          >
            {pending ? "Verifying code..." : "Verify code"}
          </button>
        </form>
      ) : null}
      {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
