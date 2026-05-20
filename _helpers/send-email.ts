// Uses Resend HTTP API (HTTPS port 443) - works on Render (no SMTP port blocks)
export default async function sendEmail({ to, subject, html, from }: any) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        throw new Error('RESEND_API_KEY environment variable is not set');
    }

    // Use verified sender or Resend's free test sender
    const emailFrom = from || process.env.EMAIL_FROM || 'onboarding@resend.dev';

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            from: emailFrom,
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