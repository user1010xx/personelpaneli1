import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const result = await prisma.sheetConfig.updateMany({
  where: { sheetName: "Sheet1" },
  data: { sheetName: "Sayfa1" },
});
console.log(`Güncellenen config: ${result.count}`);
await prisma.$disconnect();
