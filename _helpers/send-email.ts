import nodemailer from 'nodemailer';
import dns from 'dns';
import config from '../config.json';

// Force IPv4 for Render environments where IPv6 SMTP is unreachable
dns.setDefaultResultOrder('ipv4first');

export default async function sendEmail({ to, subject, html, from }: any) {
    const emailFrom = from || process.env.EMAIL_FROM || config.emailFrom;

    // Check if we should use SMTP or Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const smtpHost = process.env.SMTP_HOST || config.smtpOptions?.host;

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

    // Default to SMTP (Nodemailer)
    console.log('[EMAIL] Sending email via SMTP...');
    const smtpOptions = {
        host: process.env.SMTP_HOST || config.smtpOptions.host,
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : config.smtpOptions.port,
        auth: {
            user: process.env.SMTP_USER || config.smtpOptions.auth.user,
            pass: process.env.SMTP_PASS || config.smtpOptions.auth.pass
        }
    };

    console.log(`[EMAIL] SMTP Config: Host: ${smtpOptions.host}, Port: ${smtpOptions.port}, User: ${smtpOptions.auth.user}`);

    const transporter = nodemailer.createTransport(smtpOptions);
    const info = await transporter.sendMail({ from: emailFrom, to, subject, html });
    console.log('[EMAIL] Sent successfully via SMTP. Message ID:', info.messageId);
    return info;
}