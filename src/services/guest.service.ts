import { ContactModel } from '../models/guest.model';
import MailerService from './mailer/mailer.service';

interface ContactFormData extends Record<string, unknown> {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export class ContactService {
  static async submitContactForm(data: ContactFormData): Promise<void> {
    await ContactModel.create(data);

    const mailer = new MailerService();
    await mailer.sendTransactional(
      process.env.ADMIN_EMAIL || 'admin@example.com',
      `Contact: ${data.subject}`,
      'contact',
      data,
      data.message,
    );
  }
}
