/**
 * CampusHR OTP mail relay. Deploy as the owner, with access set to Anyone.
 * Authentication is the HMAC signature, never a secret in the URL.
 * Script Properties: CAMPUSHR_MAIL_SECRET (32+ characters), optional
 * CAMPUSHR_DAILY_LIMIT (default 80), CAMPUSHR_ALLOWED_DOMAIN (one exact domain).
 * This sends email only. OTP generation/verification and password updates belong
 * in the CampusHR backend, not in this public web app or a spreadsheet.
 */
function doGet() {
  return jsonOutput_({ ok: true, service: 'CampusHR OTP mail relay' });
}

function doPost(event) {
  try {
    if (!event || !event.postData || event.postData.length > 8192) {
      return jsonOutput_({ ok: false, error: 'INVALID_REQUEST' });
    }
    var envelope = JSON.parse(event.postData.contents);
    var properties = PropertiesService.getScriptProperties();
    var secret = properties.getProperty('CAMPUSHR_MAIL_SECRET');
    if (!secret || secret.length < 32) {
      return jsonOutput_({ ok: false, error: 'NOT_CONFIGURED' });
    }
    if (
      typeof envelope.payload !== 'string' ||
      envelope.payload.length > 4096 ||
      typeof envelope.signature !== 'string' ||
      !/^[a-f0-9]{64}$/.test(envelope.signature)
    ) {
      return jsonOutput_({ ok: false, error: 'INVALID_REQUEST' });
    }
    var bytes = Utilities.computeHmacSha256Signature(
      'campushr-mail-v1\n' + envelope.payload,
      secret,
      Utilities.Charset.UTF_8,
    );
    var signature = bytes
      .map(function (byte) {
        return ('0' + (byte & 255).toString(16)).slice(-2);
      })
      .join('');
    if (!sameSignature_(signature, envelope.signature)) {
      return jsonOutput_({ ok: false, error: 'UNAUTHORIZED' });
    }
    var message = JSON.parse(envelope.payload);
    var now = Date.now();
    if (
      message.action !== 'password-reset' ||
      typeof message.requestId !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        message.requestId,
      ) ||
      !validEmail_(message.to) ||
      typeof message.otp !== 'string' ||
      !/^\d{6}$/.test(message.otp) ||
      !Number.isSafeInteger(message.issuedAt) ||
      Math.abs(now - message.issuedAt) > 120000 ||
      !Number.isSafeInteger(message.expiresAt) ||
      message.expiresAt <= now ||
      message.expiresAt > message.issuedAt + 600000
    ) {
      return jsonOutput_({ ok: false, error: 'INVALID_REQUEST' });
    }
    var domain = properties.getProperty('CAMPUSHR_ALLOWED_DOMAIN');
    if (
      domain &&
      message.to.split('@')[1].toLowerCase() !== domain.trim().toLowerCase()
    ) {
      return jsonOutput_({ ok: false, error: 'RECIPIENT_NOT_ALLOWED' });
    }
    var limit = Number(properties.getProperty('CAMPUSHR_DAILY_LIMIT') || '80');
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
      return jsonOutput_({ ok: false, error: 'NOT_CONFIGURED' });
    }
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(1000)) return jsonOutput_({ ok: false, error: 'BUSY' });
    try {
      var key = 'mail:' + message.requestId;
      var prior = properties.getProperty(key);
      if (prior) {
        var previous = JSON.parse(prior);
        if (previous.digest !== signature)
          return jsonOutput_({ ok: false, error: 'REQUEST_ID_REUSED' });
        return jsonOutput_(
          previous.status === 'sent'
            ? { ok: true, requestId: message.requestId }
            : { ok: false, error: 'DELIVERY_UNCONFIRMED' },
        );
      }
      // Keep replay markers beyond the accepted request lifetime. Store no OTP,
      // email address or message content in Script Properties or execution logs.
      var saved = properties.getProperties();
      Object.keys(saved).forEach(function (name) {
        if (name.indexOf('mail:') === 0) {
          var record = JSON.parse(saved[name]);
          if (record.at < now - 900000) properties.deleteProperty(name);
        }
      });
      var day = new Date(now).toISOString().slice(0, 10);
      var budget = JSON.parse(properties.getProperty('mail-budget') || '{}');
      var count = budget.day === day ? budget.count : 0;
      if (!Number.isSafeInteger(count) || count < 0)
        throw new Error('Invalid budget');
      if (count >= limit || MailApp.getRemainingDailyQuota() < 1) {
        return jsonOutput_({ ok: false, error: 'MAIL_LIMIT_REACHED' });
      }
      properties.setProperty(
        key,
        JSON.stringify({ at: now, status: 'pending', digest: signature }),
      );
      properties.setProperty(
        'mail-budget',
        JSON.stringify({ day: day, count: count + 1 }),
      );
      try {
        MailApp.sendEmail({
          to: message.to,
          subject: 'Your CampusHR password reset code',
          name: 'CampusHR · JCET',
          body:
            'Hello,\n\nYour CampusHR password reset code is:\n\n' +
            message.otp +
            '\n\nIt expires at ' +
            Utilities.formatDate(
              new Date(message.expiresAt),
              'Asia/Kolkata',
              'dd MMM yyyy, hh:mm a',
            ) +
            ' IST.\n\nEnter this code only in CampusHR. Do not share it.\n' +
            'If you did not request a password reset, you can ignore this email.\n\nCampusHR\nJain College of Engineering & Technology, Hubballi',
        });
        properties.setProperty(
          key,
          JSON.stringify({ at: now, status: 'sent', digest: signature }),
        );
        return jsonOutput_({ ok: true, requestId: message.requestId });
      } catch (_error) {
        // A send may have succeeded before its acknowledgement failed. Do not
        // replay it automatically; let the user request a new backend challenge.
        return jsonOutput_({ ok: false, error: 'DELIVERY_UNCONFIRMED' });
      }
    } finally {
      lock.releaseLock();
    }
  } catch (_error) {
    return jsonOutput_({ ok: false, error: 'INVALID_REQUEST' });
  }
}

/** Run once in the editor to authorize email sending. Does not send an email. */
function authorizeMailService() {
  return MailApp.getRemainingDailyQuota();
}

function validEmail_(value) {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value)
  );
}

function sameSignature_(expected, supplied) {
  var mismatch = expected.length ^ supplied.length;
  for (var i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ (supplied.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
