import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create a company first
  const company = await prisma.company.upsert({
    where: { id: "default-company" },
    update: {},
    create: {
      id: "default-company",
      name: "Ma Societe",
      email: "contact@masociete.com",
      phone: "0123456789",
      address: "123 Rue Example",
      city: "Paris",
      codePostal: "75001",
    },
  });

  console.log("Company created:", company.name);

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@facturexl.com" },
    update: {},
    create: {
      name: "Administrateur",
      email: "admin@facturexl.com",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
      companyId: company.id,
    },
  });

  console.log("Admin user created:", admin.email);

  // Create a sample client
  const clientPassword = await bcrypt.hash("client123", 10);

  const client = await prisma.user.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      name: "Client Test",
      email: "client@example.com",
      password: clientPassword,
      role: "CLIENT",
      isActive: true,
      companyId: company.id,
      code: "CLI001",
      address: "456 Avenue Client",
      city: "Lyon",
      zipCode: "69001",
    },
  });

  console.log("Client created:", client.email);

  // Create a sample group with articles
  const group = await prisma.group.upsert({
    where: { id: "default-group" },
    update: {},
    create: {
      id: "default-group",
      name: "Services",
      color: "#3b82f6",
      companyId: company.id,
      articles: {
        create: [
          {
            title: "Consultation",
            price: 100,
            unite: "heure",
            tax: "20",
          },
          {
            title: "Developpement",
            price: 80,
            unite: "heure",
            tax: "20",
          },
        ],
      },
    },
  });

  console.log("Group created:", group.name);

  // Create default taxes
  await prisma.tax.upsert({
    where: { id: "tva-20" },
    update: {},
    create: {
      id: "tva-20",
      name: "TVA 20%",
      percent: 20,
    },
  });

  await prisma.tax.upsert({
    where: { id: "tva-10" },
    update: {},
    create: {
      id: "tva-10",
      name: "TVA 10%",
      percent: 10,
    },
  });

  await prisma.tax.upsert({
    where: { id: "tva-5.5" },
    update: {},
    create: {
      id: "tva-5.5",
      name: "TVA 5.5%",
      percent: 5.5,
    },
  });

  console.log("Taxes created");

  console.log("\n✅ Seed completed!");
  console.log("\n📧 Login credentials:");
  console.log("   Email: admin@facturexl.com");
  console.log("   Password: admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
