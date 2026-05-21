import nodemailer from 'nodemailer';
import dns from 'dns';
import config from '../config.json';

// Force IPv4 for Render environments where IPv6 SMTP is unreachable
dns.setDefaultResultOrder('ipv4first');

export default async function sendEmail({ to, subject, html, from }: any) {
    const emailFrom = from || process.env.EMAIL_FROM || config.emailFrom;

    // Check if we should use SMTP or Resend
    const resendApiKey = process.env.RESEND_API_KEY;

    // If RESEND_API_KEY is configured and no SMTP_HOST is explicitly provided in env, use Resend
    if (resendApiKey && !process.env.SMTP_HOST) {
        console.log('[EMAIL] Sending email via Resend HTTP API...');
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
                from: emailFrom || 'onboarding@resend.dev',
                to: [to],
                subject,
                html
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Resend API error (${response.status}): ${errorBody}`);
        }

        const result = await response.json() as any;
        console.log('[EMAIL] Sent successfully via Resend. ID:', result.id);
        return result;
    }

    // Default to SMTP (Nodemailer with Mailtrap)
    const smtpHost = process.env.SMTP_HOST || config.smtpOptions.host;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : config.smtpOptions.port;
    const smtpUser = process.env.SMTP_USER || config.smtpOptions.auth.user;
    const smtpPass = process.env.SMTP_PASS || config.smtpOptions.auth.pass;

    console.log(`[EMAIL] Sending via SMTP → Host: ${smtpHost}, Port: ${smtpPort}, User: ${smtpUser}`);

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        auth: {
            user: smtpUser,
            pass: smtpPass
        },
        // Prevent hanging forever — fail fast if SMTP is unreachable
        connectionTimeout: 10000,   // 10 seconds to connect
        greetingTimeout: 10000,     // 10 seconds for server greeting
        socketTimeout: 15000        // 15 seconds for socket inactivity
    } as any);

    try {
        const info = await transporter.sendMail({ from: emailFrom, to, subject, html });
        console.log('[EMAIL] Sent successfully via SMTP. Message ID:', info.messageId);
        return info;
    } catch (error) {
        console.error('[EMAIL] SMTP error occurred:', error);
        throw error;
    }
}