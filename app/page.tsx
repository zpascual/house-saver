import { redirect } from "next/navigation";
import { getSafeNextPath } from "@/lib/app-url";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : null;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : null;
  const type = typeof params.type === "string" ? params.type : null;

  if (code || tokenHash) {
    const callbackParams = new URLSearchParams();
    callbackParams.set("next", getSafeNextPath(typeof params.next === "string" ? params.next : null));

    if (code) {
      callbackParams.set("code", code);
    }

    if (tokenHash) {
      callbackParams.set("token_hash", tokenHash);
    }

    if (type) {
      callbackParams.set("type", type);
    }

    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  redirect("/homes");
}
