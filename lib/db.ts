type PrismaLikeClient = {
  session: {
    findUnique: (...args: unknown[]) => Promise<unknown>;
    findMany: (...args: unknown[]) => Promise<unknown>;
    upsert: (...args: unknown[]) => Promise<unknown>;
  };
};

const noop = async () => null;

export const prisma: PrismaLikeClient = {
  session: {
    findUnique: noop,
    findMany: noop,
    upsert: noop
  }
};
