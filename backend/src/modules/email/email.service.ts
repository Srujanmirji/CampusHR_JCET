import { Resend } from 'resend';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface EmailService {
  send(message: EmailMessage): Promise<{ id: string }>;
  sendPasswordReset(
    to: string,
    otp: string,
    expiresInMinutes?: number,
  ): Promise<{ id: string }>;
  sendNotification(
    to: string,
    title: string,
    body: string,
    link?: string,
  ): Promise<{ id: string }>;
  isConfigured(): boolean;
}

export function createEmailService(
  apiKey?: string,
  defaultFrom?: string,
): EmailService {
  const client = apiKey ? new Resend(apiKey) : null;
  const fromAddress = defaultFrom || 'CampusHR JCET <onboarding@resend.dev>';

  return {
    isConfigured() {
      return Boolean(client);
    },

    async send(message: EmailMessage) {
      if (!client) {
        throw new Error(
          'Email service not configured. RESEND_API_KEY is missing.',
        );
      }

      const { data, error } = await client.emails.send({
        from: message.from || fromAddress,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      });

      if (error || !data) {
        throw new Error(
          `Resend email delivery failed: ${error?.message || 'Unknown error'}`,
        );
      }

      return { id: data.id };
    },

    async sendPasswordReset(to: string, otp: string, expiresInMinutes = 10) {
      const subject = `Your CampusHR Verification Code: ${otp}`;
      const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your CampusHR password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f5f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding: 28px 36px 20px 36px; border-bottom: 1px solid #f3f4f6;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 14px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.5px;">JCET</span>
                    <span style="color: #d1d5db; margin: 0 8px; font-weight: 300;">|</span>
                    <span style="font-size: 14px; font-weight: 600; color: #475569;">CampusHR</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; font-size: 11px; font-weight: 600; color: #2563eb; background-color: #eff6ff; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">Security</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 36px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">Reset your password</h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
                We received a request to reset your password for your <strong>CampusHR</strong> account. Enter the verification code below to continue:
              </p>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 22px 16px;">
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px;">Verification Code</div>
                    <div style="font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #0f172a;">${otp}</div>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #6b7280;">
                This code will expire in <strong>${expiresInMinutes} minutes</strong>.
              </p>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9ca3af;">
                If you didn't make this request, you can safely ignore this email. Your password will not change.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 20px 36px; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #6b7280;">
                Jain College of Engineering &amp; Technology
              </p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                CampusHR Portal • Academic &amp; Staff Governance
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const text = `CampusHR — JCET Password Reset

You requested a password reset for your CampusHR account. Use the verification code below:

Verification Code: ${otp}

This code expires in ${expiresInMinutes} minutes. If you did not request this code, your account remains secure.

Jain College of Engineering & Technology — CampusHR`;

      return this.send({ to, subject, html, text });
    },

    async sendNotification(
      to: string,
      title: string,
      body: string,
      link?: string,
    ) {
      const subject = `CampusHR Alert: ${title}`;
      const actionHtml = link
        ? `<div style="margin: 24px 0;"><a href="${link}" style="background-color: #1d4ed8; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">Open in CampusHR</a></div>`
        : '';
      const actionText = link ? `\n\nLink: ${link}` : '';

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 40px 20px; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .header { margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #eff6ff; color: #1d4ed8; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; }
    .title { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0; }
    .content { font-size: 15px; color: #334155; line-height: 1.6; margin: 16px 0; }
    .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">CampusHR — Notification</div>
      <h1 class="title">${title}</h1>
    </div>
    <div class="content">
      ${body}
    </div>
    ${actionHtml}
    <div class="footer">
      Jain College of Engineering &amp; Technology — CampusHR System
    </div>
  </div>
</body>
</html>`;

      const text = `CampusHR Alert: ${title}\n\n${body}${actionText}\n\nJain College of Engineering & Technology — CampusHR`;

      return this.send({ to, subject, html, text });
    },
  };
}
