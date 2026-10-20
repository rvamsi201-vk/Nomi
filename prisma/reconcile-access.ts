import { prisma } from "../lib/db";
import { reconcileOrgChannelAccess } from "../lib/access";

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  for (const org of orgs) {
    await reconcileOrgChannelAccess(org.id);
    console.log(`Reconciled channel access for ${org.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
