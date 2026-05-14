import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
      <SignIn 
        fallbackRedirectUrl="/" 
        appearance={{
          elements: {
            footerAction: { display: "none" },
          }
        }}
      />
    </div>
  );
}
