import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentOutlet } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const outlet = await getCurrentOutlet();
  if (outlet) {
    redirect("/pos");
  }

  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  redirect("/sign-in");
}
