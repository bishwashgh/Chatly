import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OtpMailer {
  private readonly logger = new Logger(OtpMailer.name);

  async send(destination: string, code: string, purpose: 'signup' | 'reset') {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;

    if (apiKey && from) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [destination],
          subject: purpose === 'signup' ? 'Verify your Chatly account' : 'Reset your Chatly password',
          html: `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif"><h2>Your Chatly verification code</h2><p>Enter this code to ${purpose === 'signup' ? 'verify your account' : 'reset your password'}:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes.</p></div>`,
        }),
      });
      if (!response.ok) throw new Error(`OTP provider returned ${response.status}`);
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      this.logger.warn(`[Chatly ${purpose} OTP] ${destination}: ${code}`);
      return;
    }

    throw new Error('OTP delivery is not configured');
  }
}
