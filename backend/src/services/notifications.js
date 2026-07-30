/**
 * Notification helpers.
 *
 * Anything that should "ping the outside world" goes through this module so we
 * can swap in Twilio / SendGrid / Resend / Push later without touching the
 * controllers.
 *
 * Two surfaces today:
 *   - sendAdminNotification: Formspree (live)
 *   - sendVendorEmail:       stub — transactional provider not picked yet
 */

/**
 * Send a notification to the admin via Formspree. Failures are logged but
 * never thrown — we don't want a flaky email provider to break a signup.
 *
 * @param {{ subject: string, body: string, vendor?: object }} payload
 */
async function sendAdminNotification(payload) {
    const { subject, body, vendor } = payload;
    const formspreeId = process.env.FORMSPREE_ID;
    if (!formspreeId) {
        // eslint-disable-next-line no-console
        console.log('[notifications] FORMSPREE_ID not set, skipping admin notify:', subject);
        return;
    }

    try {
        await fetch(`https://formspree.io/f/${formspreeId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                _subject: subject, // Formspree's "subject" form field
                subject,
                body,
                vendor: vendor || null,
                timestamp: new Date().toISOString(),
            }),
        });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[notifications] Formspree send failed:', error);
    }
}

/**
 * Send a transactional email to a vendor. Stub for now — the team hasn't
 * picked a provider (SendGrid vs Resend vs Postmark). Once we pick one,
 * this is the only function to swap.
 *
 * @param {string} _email - vendor email
 * @param {string} _subject - subject line
 * @param {string} _body - body text (plain or HTML depending on provider)
 * @returns {Promise<void>}
 */
async function sendVendorEmail(_email, _subject, _body) {
    // TODO: integrate SendGrid / Resend once transactional email is approved.
    return;
}

module.exports = { sendAdminNotification, sendVendorEmail };