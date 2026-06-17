import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { AppConfig } from '../../config/app.config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(config: ConfigService<AppConfig>) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.getOrThrow<string>('SMTP_FROM');
    this.frontendUrl = config.getOrThrow<string>('FRONTEND_URL');

    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: config.getOrThrow<number>('SMTP_PORT'),
          auth: {
            user: config.get<string>('SMTP_USER'),
            pass: config.get<string>('SMTP_PASS'),
          },
        })
      : null;
  }

  async sendVerificationEmail(to: string, code: string): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?email=${encodeURIComponent(to)}&code=${code}`;
    await this.send(
      to,
      'Verify your email',
      `Your verification code: ${code}\n\nOr open this link: ${url}\n\nExpires in 15 minutes.`,
    );
  }

  async sendInviteEmail(to: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/accept-invite?token=${token}`;
    await this.send(
      to,
      'You have been invited',
      `You have been invited to join the platform.\n\nSet up your account: ${url}\n\nLink expires in 48 hours.`,
    );
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[DEV EMAIL] To: ${to} | ${subject}\n${text}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err);
      throw err;
    }
  }
}
