# 📧 Email Service Setup Guide

This guide will help you set up the email service for booking confirmations and cancellations.

## 🎯 Overview

The email service uses **Nodemailer** with SMTP, which allows you to use **free email services** like Gmail, Outlook, or Yahoo Mail. This keeps costs at **$0** for low to moderate email volumes.

---

## ⚙️ Setup Options

### **Option 1: Gmail (Recommended for Testing)**

Gmail offers a free SMTP service perfect for development and small-scale production.

#### **Steps:**

1. **Enable 2-Factor Authentication** on your Gmail account
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "MonoPage Booking System"
   - Click "Generate"
   - **Copy the 16-character password** (you'll need this)

3. **Set Environment Variables**

Add these to your `.env.local` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM=your-email@gmail.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For Production (Vercel):**
- Add these same variables in Vercel Dashboard → Settings → Environment Variables

---

### **Option 2: Outlook/Hotmail (Free)**

Outlook also offers free SMTP service.

#### **Steps:**

1. **Enable 2-Factor Authentication** on your Outlook account

2. **Generate App Password**
   - Go to: https://account.microsoft.com/security
   - Click "Advanced security options"
   - Under "App passwords", click "Create a new app password"
   - Copy the generated password

3. **Set Environment Variables**

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@outlook.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### **Option 3: Yahoo Mail (Free)**

Yahoo Mail also supports SMTP.

#### **Steps:**

1. **Enable 2-Factor Authentication**

2. **Generate App Password**
   - Go to: https://login.yahoo.com/account/security
   - Generate app password

3. **Set Environment Variables**

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@yahoo.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### **Option 4: Custom SMTP Server**

If you have your own email server or use a service like:
- **SendGrid** (Free tier: 100 emails/day)
- **Mailgun** (Free tier: 5,000 emails/month)
- **AWS SES** (Very cheap: $0.10 per 1,000 emails)

Just set the appropriate SMTP settings:

```env
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🧪 Testing the Email Service

1. **Create a test booking** on your website
2. **Check the console logs** for:
   - `✅ Email sent to [email]` (success)
   - `⚠️ Email service not configured` (needs setup)
   - `Error sending email:` (check credentials)

3. **Check the client's email inbox** (and spam folder)

---

## 📝 Environment Variables Summary

Add these to `.env.local` (development) and Vercel (production):

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com

# App URL (for cancellation links)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Development
# NEXT_PUBLIC_APP_URL=https://your-app.vercel.app  # Production
```

---

## 🔒 Security Notes

1. **Never commit `.env.local`** to Git (already in `.gitignore`)
2. **Use App Passwords**, not your regular email password
3. **Rotate passwords** periodically
4. **Limit email sending** to prevent abuse (consider rate limiting)

---

## 🚀 Production Considerations

### **Gmail Limits:**
- **500 emails/day** (free account)
- **2,000 emails/day** (Google Workspace)

### **If You Need More:**
- Upgrade to **Google Workspace** ($6/month)
- Use **SendGrid** (Free: 100/day, Paid: starts at $15/month)
- Use **AWS SES** (Pay-as-you-go: $0.10 per 1,000 emails)

---

## ✅ Verification Checklist

- [ ] Email service configured in `.env.local`
- [ ] Test booking created
- [ ] Confirmation email received
- [ ] Cancellation link works
- [ ] Cancellation email received
- [ ] Environment variables set in Vercel (for production)

---

## 🆘 Troubleshooting

### **"Email service not configured"**
- Check that `SMTP_USER` and `SMTP_PASSWORD` are set
- Restart your dev server after adding env variables

### **"Authentication failed"**
- Verify you're using an **App Password**, not your regular password
- Check that 2FA is enabled on your email account

### **"Connection timeout"**
- Check your firewall/network settings
- Verify SMTP_HOST and SMTP_PORT are correct
- Try port 465 with `secure: true` instead of 587

### **Emails going to spam**
- Add SPF/DKIM records to your domain (if using custom domain)
- Use a professional "From" address
- Include unsubscribe links (for future features)

---

## 📚 Next Steps

Once email is working:
1. ✅ Booking confirmations are sent automatically
2. ✅ Cancellation links work
3. ✅ Cancellation confirmations are sent
4. 🔄 Can be extended for other features (password resets, notifications, etc.)

