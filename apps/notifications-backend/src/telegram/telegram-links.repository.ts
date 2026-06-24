import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TelegramLinksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, chatId: string): Promise<void> {
    await this.prisma.telegramLink.upsert({
      where: { userId },
      create: { userId, chatId },
      update: { chatId },
    });
  }

  async exists(userId: string): Promise<boolean> {
    const row = await this.prisma.telegramLink.findUnique({
      where: { userId },
      select: { userId: true },
    });
    return row !== null;
  }

  /** Returns true if a link was removed. */
  async remove(userId: string): Promise<boolean> {
    const r = await this.prisma.telegramLink.deleteMany({ where: { userId } });
    return r.count > 0;
  }
}
