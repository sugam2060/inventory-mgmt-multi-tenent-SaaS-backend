import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export interface WelcomeEmailContext {
  businessName: string;
  name: string;
  verificationUrl: string;
  year?: number;
}

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendTemplate<T extends object>(
    to: string,
    subject: string,
    template: string,
    context: T,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject,
      template,
      context,
    });
  }

  async sendWelcomeEmail(
    to: string,
    context: WelcomeEmailContext,
  ): Promise<void> {
    await this.sendTemplate(
      to,
      'Verify your email address',
      'welcome',
      {
        ...context,
        year: new Date().getFullYear(),
      },
    );
  }
}