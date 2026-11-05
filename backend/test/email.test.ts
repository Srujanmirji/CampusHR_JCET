import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmailService,
  type EmailMessage,
} from '../src/modules/email/email.service.js';
import { sendResendResetMail } from '../src/modules/auth/password-reset.mail.js';

test('email service reports unconfigured when API key is missing and throws on send', async () => {
  const service = createEmailService();
  assert.equal(service.isConfigured(), false);
  await assert.rejects(
    service.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    }),
    /RESEND_API_KEY is missing/,
  );
});

test('email service builds password reset email with JCET branding and 6-digit OTP', async () => {
  let capturedMessage: EmailMessage | undefined;
  const service = createEmailService('re_test_key_12345');
  assert.equal(service.isConfigured(), true);

  // Mock send implementation on service
  service.send = async (msg) => {
    capturedMessage = msg;
    return { id: 'msg_123' };
  };

  const res = await service.sendPasswordReset('faculty@jcet.edu', '849201', 10);
  assert.equal(res.id, 'msg_123');
  if (!capturedMessage)
    throw new Error('Expected capturedMessage to be defined');
  assert.equal(capturedMessage.to, 'faculty@jcet.edu');
  assert.ok(capturedMessage.subject.includes('849201'));
  assert.ok(capturedMessage.html.includes('849201'));
  assert.ok(capturedMessage.html.includes('10 minutes'));
  assert.ok(
    capturedMessage.html.includes(
      'Jain College of Engineering &amp; Technology',
    ),
  );
  assert.ok(capturedMessage.text.includes('849201'));
});

test('email service builds notification email with link action', async () => {
  let capturedMessage: EmailMessage | undefined;
  const service = createEmailService('re_test_key_12345');

  service.send = async (msg) => {
    capturedMessage = msg;
    return { id: 'msg_456' };
  };

  const res = await service.sendNotification(
    'hod@jcet.edu',
    'Leave Request Pending',
    'Faculty A has applied for Casual Leave.',
    'https://campushr.jcet.edu/leave/123',
  );
  assert.equal(res.id, 'msg_456');
  if (!capturedMessage)
    throw new Error('Expected capturedMessage to be defined');
  assert.equal(capturedMessage.to, 'hod@jcet.edu');
  assert.ok(capturedMessage.subject.includes('Leave Request Pending'));
  assert.ok(capturedMessage.html.includes('Faculty A has applied'));
  assert.ok(
    capturedMessage.html.includes('https://campushr.jcet.edu/leave/123'),
  );
  assert.ok(
    capturedMessage.text.includes('https://campushr.jcet.edu/leave/123'),
  );
});

test('sendResendResetMail bridges ResetMail to email service', async () => {
  // Verifies error wrapping when invalid API key is passed
  await assert.rejects(
    sendResendResetMail('re_mock_key', undefined, {
      action: 'password-reset',
      requestId: 'test-req',
      to: 'user@example.com',
      otp: '123456',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 600000,
    }),
    /Resend/,
  );
});
