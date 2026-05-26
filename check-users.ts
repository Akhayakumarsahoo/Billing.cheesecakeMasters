import { prisma } from "./lib/db.ts";

async function main() {
  const users = await prisma.user.findMany();
  console.log(users);
}

main().finally(() => process.exit(0));
