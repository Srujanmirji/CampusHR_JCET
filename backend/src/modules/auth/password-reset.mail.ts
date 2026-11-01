import { createHmac } from 'node:crypto';
import type { ResetMail } from './password-reset.crypto.js';

export async function sendResetMail(
  url: string,
  secret: string,
  mail: ResetMail,
) {
  try {
    const target = new URL(url);
    if (
      target.protocol !== 'https:' ||
      target.hostname !== 'script.google.com' ||
      !/^\/macros\/s\/[\w-]+\/exec$/.test(target.pathname) ||
      target.search ||
      target.hash ||
      target.username ||
      target.password
    )
      throw new Error();
    const payload = JSON.stringify(mail);
    const signature = createHmac('sha256', secret)
      .update('campushr-mail-v1\n' + payload)
      .digest('hex');
    // Google ContentService uses a response redirect; never forward the payload
    // to a non-Google host, a sign-in page, or another POST destination.
    let response = await fetch(url, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, signature }),
      signal: AbortSignal.timeout(15000),
    });
    if ([301, 302, 303].includes(response.status)) {
      const redirect = new URL(response.headers.get('location') || '');
      if (
        redirect.protocol !== 'https:' ||
        redirect.hostname !== 'script.googleusercontent.com' ||
        redirect.username ||
        redirect.password
      )
        throw new Error();
      response = await fetch(redirect, {
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
    }
    const result = (await response.json()) as {
      ok?: boolean;
      requestId?: string;
    };
    if (
      !response.ok ||
      result.ok !== true ||
      result.requestId !== mail.requestId
    )
      throw new Error();
  } catch {
    throw new Error('Password-reset email delivery could not be confirmed.');
  }
}
