import fs from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

// Load .env — runs before PrismaPg is instantiated
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
}

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
const prisma = new PrismaClient({ adapter });

type Role = 'ADMIN' | 'MODERATOR' | 'BUYER';
type Status = 'ACTIVE' | 'PENDING_VERIFICATION' | 'BANNED' | 'SUSPENDED';

type SeedUser = {
  email: string;
  password: string;
  role: Role;
  status: Status;
  firstName: string;
  lastName: string;
  phone: string | null;
};

const users: SeedUser[] = [
  {
    email: 'admin@marketplace.dev',
    password: 'Admin1234!',
    role: 'ADMIN',
    status: 'ACTIVE',
    firstName: 'Ivan',
    lastName: 'Admin',
    phone: '+79001110001',
  },
  {
    email: 'moderator@marketplace.dev',
    password: 'Moder1234!',
    role: 'MODERATOR',
    status: 'ACTIVE',
    firstName: 'Maria',
    lastName: 'Moderator',
    phone: '+79001110002',
  },
  {
    email: 'seller1@marketplace.dev',
    password: 'Seller1234!',
    // BUYER role — seller status is determined by SellerProfile presence
    role: 'BUYER',
    status: 'ACTIVE',
    firstName: 'Alexey',
    lastName: 'Seller',
    phone: '+79001110003',
  },
  {
    email: 'buyer1@marketplace.dev',
    password: 'Buyer1234!',
    role: 'BUYER',
    status: 'ACTIVE',
    firstName: 'Ekaterina',
    lastName: 'Buyer',
    phone: '+79001110004',
  },
  {
    email: 'buyer2@marketplace.dev',
    password: 'Buyer1234!',
    role: 'BUYER',
    status: 'ACTIVE',
    firstName: 'Dmitry',
    lastName: 'Ivanov',
    phone: null,
  },
  {
    email: 'buyer3@marketplace.dev',
    password: 'Buyer1234!',
    role: 'BUYER',
    status: 'PENDING_VERIFICATION',
    firstName: 'Olga',
    lastName: 'Petrova',
    phone: null,
  },
  {
    email: 'banned@marketplace.dev',
    password: 'Banned1234!',
    role: 'BUYER',
    status: 'BANNED',
    firstName: 'Fraud',
    lastName: 'User',
    phone: null,
  },
];

async function main() {
  console.log('Seeding users...');

  for (const { firstName, lastName, phone, password, ...userData } of users) {
    const secret = await hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        phone,
        profile: { create: { firstName, lastName } },
      },
    });

    await prisma.authProvider.upsert({
      where: { type_identifier: { type: 'EMAIL', identifier: userData.email } },
      update: {},
      create: { userId: user.id, type: 'EMAIL', identifier: userData.email, secret },
    });

    // Seed a SellerProfile for the designated seller test account
    if (userData.email === 'seller1@marketplace.dev') {
      await prisma.sellerProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, shopName: 'Alexey Store' },
      });
    }

    const sellerMark = userData.email === 'seller1@marketplace.dev' ? ' [seller]' : '';
    console.log(`  ✓ ${userData.role.padEnd(10)} ${userData.email}  pw: ${password}${sellerMark}`);
  }

  console.log(`\nSeeded ${users.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
