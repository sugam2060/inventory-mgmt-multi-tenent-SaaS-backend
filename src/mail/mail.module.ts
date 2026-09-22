import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import path from 'path';
import { MailService } from './mail.service';

@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.getOrThrow<string>('SMTP_HOST'),
          port: Number(configService.getOrThrow<string>('SMTP_PORT')),
          secure: true,
          auth: {
            user: configService.getOrThrow<string>('SMTP_USER'),
            pass: configService.getOrThrow<string>('SMTP_PASSWORD'),
          },
        },
        defaults: {
          from: `"No Reply" <${configService.getOrThrow<string>('SMTP_USER')}>`,
        },
        template: {
          dir: path.join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}