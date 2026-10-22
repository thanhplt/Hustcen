import { Injectable, Logger } from '@nestjs/common';
import { Mailer, SendMailOptions } from './mailer.interface';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DevMailerService implements Mailer {
  private readonly logger = new Logger('DevMailer');

  constructor(private readonly prisma: PrismaService) {}

  async sendMail(options: SendMailOptions): Promise<{ success: boolean; id: string }> {
    this.logger.log(`\n================== [DEV MAILBOX] ==================`);
    this.logger.log(`TO:       ${options.to}`);
    this.logger.log(`CATEGORY: ${options.category}`);
    this.logger.log(`SUBJECT:  ${options.subject}`);
    this.logger.log(`CONTENT:  ${options.bodyText}`);
    this.logger.log(`====================================================\n`);

    const record = await this.prisma.devMail.create({
      data: {
        recipient: options.to,
        subject: options.subject,
        bodyText: options.bodyText,
        bodyHtml: options.bodyHtml,
        category: options.category,
      },
    });

    return {
      success: true,
      id: record.id,
    };
  }
}
