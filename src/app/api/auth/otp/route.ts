import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const SUPERVISORS: Record<string, string> = {
  "ssantra@noon.com": "Instock Associate",
  "rusamuel@noon.com": "Assistant Manager, SHOT",
  "gbhamra@noon.com": "Senior Area Supervisor",
  "sursingh@noon.com": "Area Supervisor",
  "nadeekhan@noon.com": "Area Supervisor",
};

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "VerificationToken" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "email" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "expires_at" TIMESTAMP NOT NULL,
      "created_at" TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function isEmailAuthorized(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail === 'kangarg@noon.com' || SUPERVISORS[cleanEmail]) {
    return true;
  }

  // Check AdminUser
  try {
    const adminMatch: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "AdminUser" WHERE LOWER(email) = $1 LIMIT 1`,
      cleanEmail
    );
    if (adminMatch && adminMatch.length > 0) return true;
  } catch (e) {
    // AdminUser table might not exist yet
  }

  // Check Store emails
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "email" TEXT;`);
    const stores: any[] = await prisma.$queryRawUnsafe(
      `SELECT email FROM "Store" WHERE "isActive" = true AND email IS NOT NULL`
    );
    for (const s of stores) {
      if (!s.email) continue;
      const emails = s.email.toLowerCase().split(/[,;\s]+/).map((e: string) => e.trim()).filter(Boolean);
      if (emails.includes(cleanEmail)) return true;
    }
  } catch (e) {
    console.error("Store check error:", e);
  }

  return false;
}

export async function POST(req: Request) {
  try {
    await ensureTable();
    const body = await req.json();
    const { action, email, code } = body;

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.endsWith('@noon.com')) {
      return NextResponse.json({ error: 'Valid @noon.com email address required' }, { status: 400 });
    }

    if (action === 'send') {
      const authorized = await isEmailAuthorized(cleanEmail);
      if (!authorized) {
        return NextResponse.json({
          error: `Email "${cleanEmail}" is not assigned to any cafe store or authorized account. Please contact your manager.`
        }, { status: 403 });
      }

      // Generate 6-digit OTP code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete existing codes for this email
      await prisma.$executeRawUnsafe(
        `DELETE FROM "VerificationToken" WHERE LOWER(email) = $1`,
        cleanEmail
      );

      // Save new code
      await prisma.$executeRawUnsafe(
        `INSERT INTO "VerificationToken" ("email", "code", "expires_at") VALUES ($1, $2, $3)`,
        cleanEmail,
        otp,
        expiresAt
      );

      // Attempt to send email via Resend API if API key is provided
      let emailSent = false;
      const resendApiKey = process.env.RESEND_API_KEY;

      if (resendApiKey) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'noon Cafe Ops <onboarding@resend.dev>',
              to: [cleanEmail],
              subject: `noon Cafe Portal Login Code: ${otp}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 16px;">
                  <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 20px; font-weight: 900; color: #111;">☕ noon Cafe Operations</div>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">Barista & Admin Replenishment Portal</div>
                  </div>
                  <p style="font-size: 14px; color: #333;">Hello,</p>
                  <p style="font-size: 14px; color: #333; line-height: 1.5;">
                    Your single-use verification code to log into the <strong>noon Cafe Portal</strong> is:
                  </p>
                  <div style="text-align: center; margin: 24px 0;">
                    <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #1864AB; background: #F1F3F5; padding: 12px 24px; border-radius: 12px; display: inline-block;">
                      ${otp}
                    </span>
                  </div>
                  <p style="font-size: 12px; color: #777; text-align: center;">
                    This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
                  </p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                  <p style="font-size: 11px; color: #999; text-align: center;">
                    noon UAE Cafes • Official Stock Replenishment & Compliance
                  </p>
                </div>
              `
            })
          });

          if (res.ok) {
            emailSent = true;
          } else {
            const err = await res.text();
            console.error("Resend API error:", err);
          }
        } catch (mailErr) {
          console.error("Mail send error:", mailErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: emailSent
          ? `Verification code sent to ${cleanEmail}`
          : `Verification code generated. (Check your inbox${!resendApiKey ? ' or enter code' : ''})`,
        devPreview: !resendApiKey ? otp : undefined
      });
    }

    if (action === 'verify') {
      const inputCode = (code || '').trim();
      if (!inputCode) {
        return NextResponse.json({ error: 'Please enter the 6-digit verification code' }, { status: 400 });
      }

      const tokens: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "VerificationToken" 
         WHERE LOWER(email) = $1 AND code = $2 AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        cleanEmail,
        inputCode
      );

      if (!tokens || tokens.length === 0) {
        return NextResponse.json({ error: 'Invalid or expired verification code. Please try again.' }, { status: 400 });
      }

      await prisma.$executeRawUnsafe(
        `DELETE FROM "VerificationToken" WHERE LOWER(email) = $1`,
        cleanEmail
      );

      const isRootAdmin = cleanEmail === 'kangarg@noon.com';
      const isSupervisor = !!SUPERVISORS[cleanEmail];
      
      let isAdmin = isRootAdmin;
      if (!isAdmin) {
        try {
          const adminRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "AdminUser" WHERE LOWER(email) = $1 LIMIT 1`,
            cleanEmail
          );
          if (adminRows && adminRows.length > 0) isAdmin = true;
        } catch (e) {}
      }

      // Admins & Supervisors: 30 days (1 month)
      // Store baristas: 7 days (1 week)
      const isLongSession = isAdmin || isSupervisor;
      const durationDays = isLongSession ? 30 : 7;
      const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;

      return NextResponse.json({
        success: true,
        email: cleanEmail,
        expiresAt,
        durationDays,
        role: isAdmin ? 'ADMIN' : (isSupervisor ? 'SUPERVISOR' : 'STORE')
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error("OTP route error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
