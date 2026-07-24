import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CustomSignInForm } from "@/components/auth/custom-sign-in-form";

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/");
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)] px-4">
      <CustomSignInForm />
    </div>
  );
}
