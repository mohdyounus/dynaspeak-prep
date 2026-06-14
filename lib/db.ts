let prismaClient: unknown | null = null;

// Lazy initialize Prisma client when needed
export function getPrismaClient() {
  if (!prismaClient && process.env.DATABASE_URL) {
    try {
      const { PrismaClient } = require('@prisma/client');
      prismaClient = new PrismaClient({
        log: ['warn', 'error']
      });
    } catch (err) {
      console.warn('Failed to initialize Prisma client:', err);
      return null;
    }
  }
  return prismaClient;
}

// Fallback adapter: convert file-store session to Prisma API if needed
export const prisma = {
  session: {
    findUnique: async (args: any) => {
      const client = getPrismaClient();
      return client ? (client as any).session.findUnique(args) : null;
    },
    findMany: async (args?: any) => {
      const client = getPrismaClient();
      return client ? (client as any).session.findMany(args || {}) : [];
    },
    create: async (args: any) => {
      const client = getPrismaClient();
      return client ? (client as any).session.create(args) : null;
    },
    update: async (args: any) => {
      const client = getPrismaClient();
      return client ? (client as any).session.update(args) : null;
    },
    upsert: async (args: any) => {
      const client = getPrismaClient();
      return client ? (client as any).session.upsert(args) : null;
    }
  }
};



