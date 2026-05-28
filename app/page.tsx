import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentOutlet } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Check if this Clerk user is a POS outlet account
  const outlet = await getCurrentOutlet();
  if (outlet) {
    redirect("/pos");
  }

  // Otherwise treat as admin/manager — this also auto-creates the user record on first login
  redirect("/dashboard");
}

