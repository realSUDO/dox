import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  
  // Clean up
  await prisma.guardrailEvent.deleteMany();
  await prisma.citation.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.ingestionJob.deleteMany();
  await prisma.chunk.deleteMany();
  await prisma.source.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash: "dummy_hash_seed", // In real app, this should be bcrypt
      displayName: "Admin User",
      role: "admin",
    },
  });

  console.log(`Created admin user with id: ${admin.id}`);
  
  // Create a project
  const project = await prisma.project.create({
    data: {
      ownerId: admin.id,
      name: "Default Project",
      description: "Default project for testing.",
      members: {
        create: {
          userId: admin.id,
          role: "owner",
        },
      },
    },
  });
  
  console.log(`Created project with id: ${project.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
