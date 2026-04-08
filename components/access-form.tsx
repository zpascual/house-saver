"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { WorkspaceMember } from "@/lib/types";

const invitedAtFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function AccessForm({
  members,
  ownerEmail,
}: {
  members: WorkspaceMember[];
  ownerEmail: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [memberList, setMemberList] = useState<WorkspaceMember[]>(members);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMemberList(members);
  }, [members]);

  const sortedMembers = useMemo(
    () =>
      [...memberList].sort((left, right) => {
        if (left.role === "owner" && right.role !== "owner") {
          return -1;
        }

        if (left.role !== "owner" && right.role === "owner") {
          return 1;
        }

        return left.email.localeCompare(right.email);
      }),
    [memberList],
  );

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setStatus(null);
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as {
        error?: string;
        members?: WorkspaceMember[];
      };

      if (!response.ok || !payload.members) {
        setStatus(payload.error ?? "Could not add access.");
        return;
      }

      setMemberList(payload.members);
      setEmail("");
      setStatus(`Access added for ${email.trim().toLowerCase()}.`);
    });
  }

  function handleRemove(member: WorkspaceMember) {
    startTransition(async () => {
      setStatus(null);
      const response = await fetch("/api/access", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id }),
      });

      const payload = (await response.json()) as {
        error?: string;
        members?: WorkspaceMember[];
      };

      if (!response.ok || !payload.members) {
        setStatus(payload.error ?? "Could not remove access.");
        return;
      }

      setMemberList(payload.members);
      setStatus(`Access removed for ${member.email}.`);
    });
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleAdd} className="hs-panel rounded-[2rem] p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="hs-label grid gap-2 text-sm font-medium">
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="hs-input rounded-2xl px-4 py-3 outline-none"
              required
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="hs-button-primary rounded-2xl px-5 py-3 text-sm font-medium transition"
          >
            {isPending ? "Saving..." : "Add access"}
          </button>
        </div>
        <p className="hs-muted mt-3 text-sm">
          The owner email for this workspace is <span className="font-medium text-[#17324f]">{ownerEmail}</span>.
        </p>
        {status ? <p className="mt-3 text-sm text-[#4d6277]">{status}</p> : null}
      </form>

      <section className="hs-panel rounded-[2rem] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-[#17324f]">
              People with access
            </h2>
            <p className="hs-muted mt-1 text-sm">
              Anyone listed here can sign in from the public website.
            </p>
          </div>
          <div className="rounded-full bg-[rgba(124,144,160,0.12)] px-3 py-1 text-xs font-medium text-[#4d6277]">
            {sortedMembers.length} total
          </div>
        </div>

        <div className="grid gap-3">
          {sortedMembers.map((member) => {
            const isOwner = member.role === "owner";

            return (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-[1.5rem] border border-[rgba(124,144,160,0.2)] bg-[rgba(255,255,252,0.9)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-[#17324f]">{member.email}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6f8498]">
                    <span
                      className={
                        isOwner
                          ? "hs-chip-blue rounded-full px-3 py-1 font-medium"
                          : "rounded-full bg-[rgba(124,144,160,0.14)] px-3 py-1 font-medium"
                      }
                    >
                      {member.role}
                    </span>
                    <span>Added {invitedAtFormatter.format(new Date(member.invitedAt))}</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isPending || isOwner}
                  onClick={() => handleRemove(member)}
                  className="rounded-full border border-[rgba(3,64,120,0.18)] px-4 py-2 text-sm font-medium text-[#034078] transition hover:bg-[rgba(3,64,120,0.06)] disabled:cursor-not-allowed disabled:border-[rgba(124,144,160,0.2)] disabled:text-[#8b9aa8] disabled:hover:bg-transparent"
                >
                  {isOwner ? "Owner protected" : "Remove access"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
