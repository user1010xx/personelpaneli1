const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const email = "admin@sirket.com";
const password = "123123123";
(async () => {
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { email }, data: { passwordHash: hash, active: true, role: "ADMIN" } });
  console.log("password reset OK for", email);
  await prisma.$disconnect();
})();
