const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

type EmailAddress = { email: string; name?: string };

export async function sendVerificationOtp(to: string, otp: string, name: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const from = parseEmailFrom(process.env.EMAIL_FROM || 'noreply@zygo.local');

  if (!apiKey) {
    console.warn('[email] Brevo not configured. Verification OTP for %s (%s): %s', name, to, otp);
    return;
  }

  const subject = 'Verify your Zygo account';
  const text = `Hi ${name},\n\nYour verification code is: ${otp}\n\nIt expires in 15 minutes.\n`;
  const html = `<p>Hi ${escapeHtml(name)},</p><p>Your verification code is:</p><p style="font-size:22px;font-weight:bold;letter-spacing:4px">${escapeHtml(
    otp
  )}</p><p>It expires in 15 minutes.</p>`;

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: from,
      to: [{ email: to, name }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo send failed (${res.status}): ${body || res.statusText}`);
  }
}

/** Parses `Name <email@domain>` or plain `email@domain`. */
function parseEmailFrom(value: string): EmailAddress {
  const trimmed = value.trim().replace(/^["']|["']$/g, '');
  const match = trimmed.match(/^(?:"?([^"<>]+)"?\s+)?<?([^>\s]+@[^>\s]+)>?$/);
  if (!match) {
    return { email: trimmed };
  }
  const [, displayName, email] = match;
  if (displayName?.trim()) {
    return { name: displayName.trim(), email: email.trim() };
  }
  return { email: email.trim() };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
