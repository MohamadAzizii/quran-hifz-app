import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Triggered by Vercel Cron (see vercel.json). Sends a daily revision
// reminder email to each user whose configured reminder hour matches the
// current hour in their assumed timezone.
//
// Required env vars (set in Vercel project settings):
//   SUPABASE_URL                - your Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY   - service role key (server-only!)
//   RESEND_API_KEY              - from resend.com
//   REMINDER_FROM_EMAIL         - verified sender, e.g. "Hifz <hifz@yourdomain>"
//   CRON_SECRET                 - any random string; Vercel sends it as a
//                                 Bearer token so only the cron can call this
//   REMINDER_TIMEZONE           - optional IANA tz, defaults to Europe/London
//   APP_URL                     - optional link in the email

const APP_URL = process.env.APP_URL ?? 'https://quran-hifz-app.vercel.app'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY
  const from = process.env.REMINDER_FROM_EMAIL
  if (!url || !serviceKey || !resendKey || !from) {
    return res.status(500).json({ error: 'missing required environment variables' })
  }

  const tz = process.env.REMINDER_TIMEZONE ?? 'Europe/London'
  const hourNow = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      hour12: false,
    }).format(new Date())
  )

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  })

  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('user_id, daily_reminder_time, notifications_enabled')
    .eq('notifications_enabled', true)
  if (error) return res.status(500).json({ error: error.message })

  const due = (settings ?? []).filter((s) => {
    const t = (s.daily_reminder_time as string | null) ?? ''
    const h = Number(t.split(':')[0])
    return Number.isFinite(h) && h === hourNow
  })

  let sent = 0
  const errors: string[] = []

  for (const s of due) {
    const { data: u } = await supabase.auth.admin.getUserById(
      s.user_id as string
    )
    const email = u?.user?.email
    if (!email) continue

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: '🕌 Time for your daily Quran revision',
        html: `
          <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0b0e14; color: #e8eaed; border-radius: 16px;">
            <h1 style="font-size: 20px; margin: 0 0 8px;">Assalamu alaykum 🌙</h1>
            <p style="color: #94a3b8; line-height: 1.6; margin: 0 0 20px;">
              It's time for your daily Qur'an revision. Keeping a consistent
              habit is the key to strong hifz — even a few pages today makes a
              difference.
            </p>
            <a href="${APP_URL}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; text-decoration: none; font-weight: 700; padding: 12px 24px; border-radius: 12px;">
              Open Hifz Companion →
            </a>
            <p style="color: #475569; font-size: 12px; margin: 24px 0 0;">
              You're receiving this because daily reminders are enabled in your
              settings. Turn them off any time in the app.
            </p>
          </div>
        `,
      }),
    })

    if (r.ok) sent++
    else errors.push(`${email}: ${r.status} ${await r.text()}`)
  }

  return res.status(200).json({ ok: true, tz, hourNow, due: due.length, sent, errors })
}
