import { PrismaClient } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log("Local Users:", users.map(u => ({ email: u.email, role: u.role, clerkId: u.clerkUserId })));

  const client = await clerkClient();
  const clerkUsers = await client.users.getUserList();
  console.log("Clerk Users:", clerkUsers.data.map(u => ({ email: u.emailAddresses[0]?.emailAddress, id: u.id })));
}

check().catch(console.error).finally(() => prisma.$disconnect());
