import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileSignature } from "lucide-react";
import { auth, signIn } from "@/auth";

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const { callbackUrl, error } = await searchParams;

  if (session?.user) {
    redirect(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/documents");
  }

  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/documents";

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo });
  }

  return (
    <div className="min-h-[100dvh] bg-bg p-4 sm:p-8">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="card mt-60">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-accent text-white">
              <FileSignature className="h-3.5 w-3.5" />
            </div>
            <h1 className="text-lg font-semibold">Sign in to SignZ</h1>
          </div>
          <p className="mb-6 text-sm text-muted">
            Signing in is optional — it syncs your sent requests across devices.
            The editor and public signing flow work without an account.
          </p>

          {error && (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              Sign-in failed. Please try again.
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <form action={signInWithGoogle}>
              <button type="submit" className="btn-ghost w-full justify-center">
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.1s2.69-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.86 3.3 14.66 2.3 12 2.3 6.99 2.3 2.95 6.35 2.95 11.4S6.99 20.5 12 20.5c6.93 0 8.9-4.86 8.55-8.75L12 10.2z"
      />
    </svg>
  );
}
