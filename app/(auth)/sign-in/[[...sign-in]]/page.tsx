import { CustomSignInForm } from "@/components/auth/custom-sign-in-form";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)] px-4">
      <CustomSignInForm />
    </div>
  );
}
