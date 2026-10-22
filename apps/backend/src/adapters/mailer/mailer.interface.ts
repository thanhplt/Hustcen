export interface SendMailOptions {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  category: 'OTP' | 'BOOKING_CONFIRM' | 'REMINDER' | 'REFUND' | 'CANCEL' | 'PASSWORD_RESET' | 'GENERAL';
}

export interface Mailer {
  sendMail(options: SendMailOptions): Promise<{ success: boolean; id: string }>;
}
