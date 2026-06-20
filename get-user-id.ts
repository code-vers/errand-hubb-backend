import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'rakib36@gmail.com' } });
  console.log('USER ID:', user?.id);
}
main();
