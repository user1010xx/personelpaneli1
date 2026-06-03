const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@sirket.com";
  const testPassword = process.env.ADMIN_PASSWORD || "123123123";
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) {
    console.log("NO_USER");
    return;
  }
  console.log("user", { email: u.email, role: u.role, active: u.active });
  const ok = await bcrypt.compare(testPassword, u.passwordHash);
  console.log("password_match", ok);
  const all = await prisma.user.findMany({
    select: { email: true, active: true, role: true },
  });
  console.log("all_users", JSON.stringify(all));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
