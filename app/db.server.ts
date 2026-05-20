import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

// Reuse the global instance to avoid exhausting DB connections under HMR (dev)
// or across multiple module evaluations. In production, Node module cache ensures
// a single instance, but the global guard is kept for safety.
if (!global.prismaGlobal) {
  global.prismaGlobal = new PrismaClient();
}

const prisma = global.prismaGlobal;

export default prisma;
