import nodemailer from 'nodemailer';

// Email configuration
const getEmailConfig = () => {
  // Use environment variables for email credentials
  // For free tier, you can use Gmail, Outlook, or other free SMTP services
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPassword = process.env.SMTP_PASSWORD || ''; // For Gmail, use App Password
  const smtpFrom = process.env.SMTP_FROM || smtpUser || 'noreply@monopage.com';

  return {
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    from: smtpFrom,
  };
};

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    const config = getEmailConfig();
    
    // If no credentials provided, return null (emails won't send but won't crash)
    if (!config.auth.user || !config.auth.pass) {
      console.warn('⚠️ Email service not configured. Set SMTP_USER and SMTP_PASSWORD environment variables.');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }
  
  return transporter;
};

// Email templates
export const emailTemplates = {
  bookingConfirmation: (data: {
    clientName: string;
    date: string;
    time: string;
    serviceType?: string;
    cancellationLink: string;
    businessName?: string;
  }) => {
    const formattedDate = new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return {
      subject: `Booking Confirmed - ${data.businessName || 'Your Appointment'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .booking-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { margin: 10px 0; }
            .detail-label { font-weight: 600; color: #6b7280; }
            .detail-value { color: #111827; }
            .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #d97706; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .cancellation-note { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">Booking Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.clientName},</p>
              <p>Your appointment has been confirmed. We're looking forward to seeing you!</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value"> ${formattedDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value"> ${data.time}</span>
                </div>
                ${data.serviceType ? `
                <div class="detail-row">
                  <span class="detail-label">Service:</span>
                  <span class="detail-value"> ${data.serviceType}</span>
                </div>
                ` : ''}
              </div>

              <div class="cancellation-note">
                <p style="margin: 0; color: #92400e;">
                  <strong>Need to cancel or reschedule?</strong><br>
                  You can cancel this booking anytime using the link below.
                </p>
              </div>

              <div style="text-align: center;">
                <a href="${data.cancellationLink}" class="button">Cancel Booking</a>
              </div>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                If you have any questions or need to make changes, please contact us directly.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} ${data.businessName || 'Mono Page'}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Booking Confirmed!

Hi ${data.clientName},

Your appointment has been confirmed. We're looking forward to seeing you!

Date: ${formattedDate}
Time: ${data.time}
${data.serviceType ? `Service: ${data.serviceType}\n` : ''}

Need to cancel or reschedule?
You can cancel this booking anytime using this link:
${data.cancellationLink}

If you have any questions or need to make changes, please contact us directly.

---
This is an automated email. Please do not reply.
© ${new Date().getFullYear()} ${data.businessName || 'Mono Page'}. All rights reserved.
      `,
    };
  },

  bookingCancelled: (data: {
    clientName: string;
    date: string;
    time: string;
    businessName?: string;
  }) => {
    const formattedDate = new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return {
      subject: `Booking Cancelled - ${data.businessName || 'Your Appointment'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6b7280; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .booking-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">Booking Cancelled</h1>
            </div>
            <div class="content">
              <p>Hi ${data.clientName},</p>
              <p>Your booking has been successfully cancelled.</p>
              
              <div class="booking-details">
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${data.time}</p>
              </div>

              <p>If you'd like to book a new appointment, please visit our website.</p>
              <p>We hope to see you soon!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${data.businessName || 'Mono Page'}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Booking Cancelled

Hi ${data.clientName},

Your booking has been successfully cancelled.

Date: ${formattedDate}
Time: ${data.time}

If you'd like to book a new appointment, please visit our website.
We hope to see you soon!

---
© ${new Date().getFullYear()} ${data.businessName || 'Mono Page'}. All rights reserved.
      `,
    };
  },
};

// Send email function
export const sendEmail = async (options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> => {
  try {
    const emailTransporter = getTransporter();
    if (!emailTransporter) {
      console.warn('Email service not configured. Email not sent.');
      return false;
    }

    const config = getEmailConfig();
    
    await emailTransporter.sendMail({
      from: config.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });

    console.log(`✅ Email sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Send booking confirmation email
export const sendBookingConfirmation = async (data: {
  to: string;
  clientName: string;
  date: string;
  time: string;
  serviceType?: string;
  cancellationToken: string;
  businessName?: string;
}): Promise<boolean> => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const cancellationLink = `${baseUrl}/cancel-booking?token=${data.cancellationToken}`;

  const template = emailTemplates.bookingConfirmation({
    ...data,
    cancellationLink,
  });

  return await sendEmail({
    to: data.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

// Send booking cancellation confirmation
export const sendBookingCancellation = async (data: {
  to: string;
  clientName: string;
  date: string;
  time: string;
  businessName?: string;
}): Promise<boolean> => {
  const template = emailTemplates.bookingCancelled(data);

  return await sendEmail({
    to: data.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

// Send photo delivery email
export const sendPhotoDelivery = async (data: {
  to: string;
  clientName: string;
  sessionId?: string;
  zipBuffer?: Buffer;
  zipFileName?: string;
  downloadUrl?: string;
  deliveryMethod: 'attachment' | 'download-link';
  expiresAt?: Date;
}): Promise<boolean> => {
  try {
    const emailTransporter = getTransporter();
    if (!emailTransporter) {
      console.warn('Email service not configured. Email not sent.');
      return false;
    }

    const config = getEmailConfig();
    
    // Get business name from user profile if sessionId is provided
    let businessName = 'Your Photographer';
    if (data.sessionId) {
      try {
        // This would require fetching from database - for now use default
        // Can be enhanced later to fetch actual business name
      } catch (e) {
        // Ignore errors
      }
    }

    const expiresDate = data.expiresAt 
      ? data.expiresAt.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : null;

    const subject = `Your Photos Are Ready - ${businessName}`;
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .button:hover { background: #d97706; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .info-box { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Your Photos Are Ready!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.clientName},</p>
            <p>Great news! Your edited photos are ready for download.</p>
            
            ${data.deliveryMethod === 'attachment' 
              ? `
                <div class="info-box">
                  <p style="margin: 0;"><strong>📎 Your photos are attached to this email.</strong></p>
                  <p style="margin: 10px 0 0 0;">Simply download the ZIP file and extract it to view your photos.</p>
                </div>
              `
              : `
                <div class="info-box">
                  <p style="margin: 0;"><strong>🔗 Download Your Photos</strong></p>
                  <p style="margin: 10px 0 0 0;">Click the button below to download your photos. The download link will expire ${expiresDate ? `on ${expiresDate}` : 'in 30 days'}.</p>
                </div>
                <div style="text-align: center;">
                  <a href="${data.downloadUrl}" class="button">Download Photos</a>
                </div>
                ${expiresDate ? `<p style="color: #6b7280; font-size: 14px; text-align: center;">Link expires: ${expiresDate}</p>` : ''}
              `
            }

            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              If you have any questions or need assistance, please don't hesitate to contact us.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Your Photos Are Ready!

Hi ${data.clientName},

Great news! Your edited photos are ready for download.

${data.deliveryMethod === 'attachment' 
  ? 'Your photos are attached to this email. Simply download the ZIP file and extract it to view your photos.'
  : `Download your photos using this link: ${data.downloadUrl}\n\nLink expires: ${expiresDate || 'in 30 days'}`
}

If you have any questions or need assistance, please don't hesitate to contact us.

---
This is an automated email. Please do not reply.
© ${new Date().getFullYear()} ${businessName}. All rights reserved.
    `;

    const mailOptions: any = {
      from: config.from,
      to: data.to,
      subject,
      html,
      text,
    };

    // Add attachment if using attachment method
    if (data.deliveryMethod === 'attachment' && data.zipBuffer && data.zipFileName) {
      console.log(`📎 Adding attachment: ${data.zipFileName}, size: ${data.zipBuffer.length} bytes`);
      mailOptions.attachments = [
        {
          filename: data.zipFileName,
          content: data.zipBuffer,
          contentType: 'application/zip',
        },
      ];
      console.log(`✅ Attachment added to email`);
    } else if (data.deliveryMethod === 'attachment') {
      console.warn(`⚠️ Attachment method selected but missing zipBuffer or zipFileName`, {
        hasBuffer: !!data.zipBuffer,
        hasFileName: !!data.zipFileName,
        bufferType: data.zipBuffer?.constructor?.name,
        bufferLength: data.zipBuffer?.length,
      });
    }

    console.log(`📧 Sending email to ${data.to} with ${mailOptions.attachments?.length || 0} attachment(s)`);
    await emailTransporter.sendMail(mailOptions);

    console.log(`✅ Photo delivery email sent to ${data.to}`);
    return true;
  } catch (error) {
    console.error('Error sending photo delivery email:', error);
    return false;
  }
};

