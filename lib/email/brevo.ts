interface SendEmailParams {
  to: { email: string; name: string }[]
  subject: string
  htmlContent: string
  textContent?: string
}

export async function sendEmail({ to, subject, htmlContent, textContent }: SendEmailParams) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL || 'noreply@backman.jp',
        name: process.env.BREVO_SENDER_NAME || 'BACKMAN',
      },
      to,
      subject,
      htmlContent,
      textContent,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Brevo email error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

export function buildInviteEmail(name: string, inviteUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">BACKMANへご招待</h2>
  <p>${name} さん、こんにちは。</p>
  <p>BACKMANの業務管理システムにご招待されました。<br>
  下記のボタンからアカウントを作成してください。</p>
  <a href="${inviteUrl}"
    style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;
           border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0;">
    アカウントを作成する
  </a>
  <p style="color:#666;font-size:13px;">このリンクは7日間有効です。</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="color:#999;font-size:12px;">BACKMAN 業務管理システム</p>
</body>
</html>`
}

export function buildReminderEmail(
  name: string,
  reportName: string,
  count: number
): string {
  const urgency = count === 1 ? '' : '【再リマインド】'
  const message = count === 1
    ? `${reportName}の提出をお願いします。`
    : `${reportName}がまだ未提出です。至急提出してください。`

  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #dc2626;">${urgency}報告リマインド</h2>
  <p>${name} さん、</p>
  <p><strong>${message}</strong></p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/member"
    style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;
           border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0;">
    今すぐ報告する
  </a>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="color:#999;font-size:12px;">BACKMAN 業務管理システム</p>
</body>
</html>`
}

export function buildEscalationEmail(
  leaderName: string,
  memberName: string,
  reportName: string
): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #b45309;">【要確認】未報告メンバーがいます</h2>
  <p>${leaderName} さん、</p>
  <p><strong>${memberName}</strong> さんが <strong>${reportName}</strong> を未提出のまま期限を超過しました。</p>
  <p>ご確認をお願いします。</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin"
    style="display:inline-block;background:#b45309;color:#fff;padding:12px 24px;
           border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0;">
    ダッシュボードを確認
  </a>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="color:#999;font-size:12px;">BACKMAN 業務管理システム</p>
</body>
</html>`
}
