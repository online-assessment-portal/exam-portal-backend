import nodemailer, { Transporter } from 'nodemailer';
import * as handlebars from 'handlebars';
import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../../utils';

type MailProvider = 'aws' | 'gmail';

enum MailErrorCode {
  SERVER_ERROR = 2,
  INVALID_RECIPIENT = 3,
  AUTH_FAILED = 4,
}

interface MailOptions {
  from?: string;
  replyTo?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  list?: {
    unsubscribe: {
      url: string;
      comment: string;
    };
  };
}

interface MailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: MailErrorCode;
}

class MailerService {
  private provider: MailProvider;
  private transporter: Transporter;
  private templates: Record<string, HandlebarsTemplateDelegate> = {};
  private queue: MailOptions[] = [];
  private isProcessingQueue = false;

  constructor(provider: MailProvider = 'aws') {
    this.provider = provider;
    this.transporter = this.createTransporter();
  }

  private createTransporter(): Transporter {
    switch (this.provider) {
      case 'aws':
        return nodemailer.createTransport({
          host: process.env.AWS_SES_HOST,
          port: 465,
          secure: true, // true for 465, false for other ports
          auth: {
            user: process.env.AWS_SES_UID,
            pass: process.env.AWS_SES_PSWD,
          },
        });
      case 'gmail':
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
          },
        });
      // Add more providers as needed
      default:
        throw new Error(`Unsupported mail provider: ${this.provider}`);
    }
  }

  private async loadTemplate(templateName: string, templatePath: string): Promise<void> {
    try {
      const templateContent = await fs.readFile(templatePath, 'utf8');
      this.templates[templateName] = handlebars.compile(templateContent);
    } catch (error) {
      logger.error('Template loading failed', { templateName, error });
      throw error;
    }
  }

  private async sendMail(mailOptions: MailOptions): Promise<MailResult> {
    try {
      const info = await this.transporter.sendMail({
        from: mailOptions.from || '"Shred Test" <support@shredtest.scriptbliss.com>',
        replyTo: mailOptions.replyTo || 'contact@shredtest.scriptbliss.com',
        ...mailOptions,
      });
      if (info.accepted.length) {
        return { success: true, messageId: info.messageId };
      } else {
        return { success: false, error: 'Mail not accepted' };
      }
    } catch (error: unknown) {
      logger.error('Mail send failed', { error });
      const message = error instanceof Error ? error.message : String(error);

      if (this.provider === 'aws' && error instanceof Error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const code = (error as any).code;
        const errorCode =
          code === 'EENVELOPE'
            ? MailErrorCode.INVALID_RECIPIENT
            : code === 'EAUTH'
              ? MailErrorCode.AUTH_FAILED
              : MailErrorCode.SERVER_ERROR;
        return { success: false, error: message, errorCode };
      }

      return { success: false, error: message };
    }
  }

  async sendTransactional(
    to: string,
    subject: string,
    templateName: string,
    data: Record<string, unknown>,
    textFallback = '',
  ): Promise<MailResult> {
    logger.info('Sending transactional email', { to, subject, templateName });
    if (!this.templates[templateName]) {
      await this.loadTemplate(
        templateName,
        path.join(__dirname, './htmlMailSource', `${templateName}.html`),
      );
    }

    const template = this.templates[templateName];
    if (!template) {
      logger.error('Template not found after loading', { templateName });
      throw new Error(`Template ${templateName} not found`);
    }
    const html = template(data);
    const text = textFallback || html.replace(/<[^>]*>?/gm, '');

    return this.sendMail({
      to,
      subject,
      html,
      text,
    });
  }

  async sendOTP(to: string, otp: string): Promise<MailResult> {
    return this.sendTransactional(to, 'OTP Verification', 'otp', { otp });
  }

  async sendSuspiciousActivity(to: string, activityType: number): Promise<MailResult> {
    let data;
    try {
      data = await fs.readFile(
        path.join(__dirname, './htmlMailSource/suspiciousActivity.txt'),
        'utf8',
      );
    } catch (error: unknown) {
      logger.error('Suspicious activity template read failed', { error });
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }

    let activityMessage = '';
    switch (activityType) {
      case -1:
        activityMessage =
          'Sign In to our website <a href="https://shredtest.scriptbliss.com/" target="_blank">shredtest.scriptbliss.com</a>';
        break;
      case -2:
        activityMessage =
          'OTP Verification during SignUp on our website <a href="https://shredtest.scriptbliss.com/" target="_blank">shredtest.scriptbliss.com</a>';
        break;
      case -3:
        activityMessage = 'OTP Verification during Password Reset';
        break;
      case -4:
        activityMessage = 'Password Reset';
        break;
      case -5:
        activityMessage =
          'SignUp on our website <a href="https://shredtest.scriptbliss.com/" target="_blank">shredtest.scriptbliss.com</a>';
        break;
      default:
        activityMessage = 'Improper Actions';
    }

    data += activityMessage + '.</td> </tr> </tbody> </table> </center>';

    return this.sendMail({
      to,
      subject: 'Suspicious Activity',
      html: data,
      text: 'Suspicious Activity Detected - WhatsApp for details 8529493017',
    });
  }

  async sendSignUpConfirmation(
    to: string,
    password: string,
    isGSignIn = false,
  ): Promise<MailResult> {
    const templateName = isGSignIn ? 'gsignup' : 'invSignUp';
    const subject = isGSignIn ? 'Google SignUp Success' : 'Verified Registration';
    const text = isGSignIn
      ? 'Google SignUp - shredtest.scriptbliss.com'
      : 'Account Registered - shredtest.scriptbliss.com';

    return this.sendTransactional(to, subject, templateName, { password }, text);
  }

  async addToQueue(mailOptions: MailOptions): Promise<void> {
    this.queue.push(mailOptions);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.queue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      const mailOptions = this.queue.shift();
      if (!mailOptions) break;
      await this.sendMail(mailOptions);
      // Add delay to respect rate limits
      await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    }

    this.isProcessingQueue = false;
  }

  async sendBulk(
    emails: string[],
    subject: string,
    templateName: string,
    data: Record<string, unknown>,
    fromName: string,
    fromEmail: string,
  ): Promise<void> {
    if (!this.templates[templateName]) {
      await this.loadTemplate(
        templateName,
        path.join(__dirname, '../../emailService', `${templateName}.txt`),
      );
    }

    const template = this.templates[templateName];
    if (!template) {
      logger.error('Bulk email template not found after loading', { templateName });
      throw new Error(`Template ${templateName} not found`);
    }
    const html = template(data);
    const text = 'Your browser or app does not support this mail. Open it in updated browser / App';

    emails.forEach((email) => {
      this.addToQueue({
        from: `"${fromName}" <${fromEmail}@shredtest.scriptbliss.com>`,
        to: email,
        subject,
        html,
        text,
        list: {
          unsubscribe: {
            url: `https://shredtest.scriptbliss.com/email/unsub/${email}/${data.mailUID}`,
            comment: 'unsubscribing',
          },
        },
      });
    });
  }

  switchProvider(newProvider: MailProvider): void {
    this.provider = newProvider;
    this.transporter = this.createTransporter();
  }
}

export default MailerService;
