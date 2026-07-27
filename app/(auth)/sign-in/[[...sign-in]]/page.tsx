import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-base)] px-4 py-8">
      {/* Company Logo & Branding Header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex items-center justify-center p-2.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xs">
          <img
            src="/favicon.svg"
            alt="Cheesecake Masters Logo"
            width={48}
            height={48}
            className="w-12 h-12 object-contain shrink-0"
          />
        </div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Cheesecake Masters</h1>
      </div>

      <SignIn
        appearance={{
          elements: {
            footer: "!hidden [display:none!important]",
            footerAction: "!hidden [display:none!important]",
            footerActionLink: "!hidden [display:none!important]",
            footerActionText: "!hidden [display:none!important]",
            footerPages: "!hidden [display:none!important]",
            footerPagesLink: "!hidden [display:none!important]",
          },
        }}
      />
    </div>
  );
}
