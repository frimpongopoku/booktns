import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

// One client for the whole process. Unlike the Next.js version this needs no
// globalThis caching hack: Nest instantiates providers once per application,
// and the app is a long-lived server rather than a pool of serverless
// instances. That also means the connection pool is genuinely shared, which
// was the main thing the serverless deployment could not guarantee.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
