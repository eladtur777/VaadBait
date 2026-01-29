import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();
const db = admin.firestore();

// Email configuration - you'll need to set these in Firebase Functions config
// Run: firebase functions:config:set email.user="your-email@gmail.com" email.pass="your-app-password" email.service="gmail"
// Or use environment variables in Firebase Console

interface EmailConfig {
  service: string;
  user: string;
  pass: string;
}

// Get email config from environment
function getEmailConfig(): EmailConfig {
  const config = functions.config();
  return {
    service: config.email?.service || process.env.EMAIL_SERVICE || 'gmail',
    user: config.email?.user || process.env.EMAIL_USER || '',
    pass: config.email?.pass || process.env.EMAIL_PASS || ''
  };
}

// Create transporter
function createTransporter() {
  const config = getEmailConfig();
  return nodemailer.createTransport({
    service: config.service,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

// Interfaces matching Firestore collections
interface Resident {
  id: string;
  name: string;
  apartmentNumber: string;
  phone?: string;
  email?: string;
  monthlyFee: number;
  isActive: boolean;
}

interface FeePayment {
  id: string;
  residentId: string;
  amount: number;
  month: number;
  year: number;
  isPaid: boolean;
  dueDate?: admin.firestore.Timestamp;
}

interface PendingPayment {
  id: string;
  residentId: string;
  description: string;
  amount: number;
  dueDate?: admin.firestore.Timestamp;
  isPaid: boolean;
}

interface MeterReading {
  id: string;
  stationId: string;
  totalCost: number;
  month: number;
  year: number;
  isPaid: boolean;
}

interface ChargingStation {
  id: string;
  residentName: string;
  apartmentNumber: string;
  isActive: boolean;
}

interface ResidentDebt {
  resident: Resident;
  committeeFees: { month: string; amount: number }[];
  pendingPayments: { description: string; amount: number }[];
  chargingBills: { month: string; amount: number }[];
  totalDebt: number;
}

// Hebrew month names
const hebrewMonths = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

// Scheduled function - runs every Sunday at 9:00 AM Israel time
export const sendWeeklyDebtReminders = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub
  .schedule('0 9 * * 0')
  .timeZone('Asia/Jerusalem')
  .onRun(async (context) => {
    console.log('Starting weekly debt reminder job...');

    try {
      const debts = await collectAllDebts();

      if (debts.length === 0) {
        console.log('No debts found. No emails to send.');
        return null;
      }

      const transporter = createTransporter();
      let emailsSent = 0;
      let emailsFailed = 0;

      for (const debt of debts) {
        if (!debt.resident.email) {
          console.log(`Skipping ${debt.resident.name} - no email address`);
          continue;
        }

        if (debt.totalDebt <= 0) {
          continue;
        }

        try {
          const emailHtml = generateDebtEmailHtml(debt);

          await transporter.sendMail({
            from: `"ועד הבית" <${getEmailConfig().user}>`,
            to: debt.resident.email,
            subject: `תזכורת תשלום - ועד הבית - סה"כ חוב: ₪${debt.totalDebt.toLocaleString()}`,
            html: emailHtml
          });

          console.log(`Email sent to ${debt.resident.name} (${debt.resident.email})`);
          emailsSent++;
        } catch (emailError) {
          console.error(`Failed to send email to ${debt.resident.email}:`, emailError);
          emailsFailed++;
        }
      }

      console.log(`Weekly debt reminders completed. Sent: ${emailsSent}, Failed: ${emailsFailed}`);
      return { sent: emailsSent, failed: emailsFailed };
    } catch (error) {
      console.error('Error in sendWeeklyDebtReminders:', error);
      throw error;
    }
  });

// HTTP trigger for manual testing
export const sendDebtRemindersManual = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .https.onRequest(async (req, res) => {
    // Only allow POST requests with authorization
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    // Simple authorization check - you should use a proper auth token
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${functions.config().api?.secret}`) {
      res.status(401).send('Unauthorized');
      return;
    }

    try {
      const debts = await collectAllDebts();

      if (debts.length === 0) {
        res.json({ message: 'No debts found', sent: 0 });
        return;
      }

      const transporter = createTransporter();
      let emailsSent = 0;

      for (const debt of debts) {
        if (!debt.resident.email || debt.totalDebt <= 0) continue;

        try {
          const emailHtml = generateDebtEmailHtml(debt);

          await transporter.sendMail({
            from: `"ועד הבית" <${getEmailConfig().user}>`,
            to: debt.resident.email,
            subject: `תזכורת תשלום - ועד הבית - סה"כ חוב: ₪${debt.totalDebt.toLocaleString()}`,
            html: emailHtml
          });
          emailsSent++;
        } catch (emailError) {
          console.error(`Failed to send to ${debt.resident.email}:`, emailError);
        }
      }

      res.json({ message: 'Debt reminders sent', sent: emailsSent, totalDebts: debts.length });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to send reminders' });
    }
  });

// Collect all debts from Firestore
async function collectAllDebts(): Promise<ResidentDebt[]> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Get all active residents
  const residentsSnapshot = await db.collection('residents')
    .where('isActive', '==', true)
    .get();

  const residents: Resident[] = residentsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Resident));

  // Get all unpaid fee payments (current month and past)
  const feePaymentsSnapshot = await db.collection('feePayments')
    .where('isPaid', '==', false)
    .get();

  const feePayments: FeePayment[] = feePaymentsSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as FeePayment))
    .filter(fp => {
      // Only include current month and past (not future)
      if (fp.year < currentYear) return true;
      if (fp.year === currentYear && fp.month <= currentMonth) return true;
      return false;
    });

  // Get all unpaid pending payments
  const pendingPaymentsSnapshot = await db.collection('pendingPayments')
    .where('isPaid', '==', false)
    .get();

  const pendingPayments: PendingPayment[] = pendingPaymentsSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as PendingPayment))
    .filter(pp => {
      // Only include if due date is current or past
      if (!pp.dueDate) return true;
      const dueDate = pp.dueDate.toDate();
      return dueDate <= now;
    });

  // Get all charging stations
  const stationsSnapshot = await db.collection('chargingStations').get();
  const stations: ChargingStation[] = stationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as ChargingStation));

  // Get all unpaid meter readings (current month and past)
  const meterReadingsSnapshot = await db.collection('meterReadings')
    .where('isPaid', '==', false)
    .get();

  const meterReadings: MeterReading[] = meterReadingsSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as MeterReading))
    .filter(mr => {
      if (mr.year < currentYear) return true;
      if (mr.year === currentYear && mr.month <= currentMonth) return true;
      return false;
    });

  // Build debt summary for each resident
  const residentDebts: ResidentDebt[] = [];

  for (const resident of residents) {
    const debt: ResidentDebt = {
      resident,
      committeeFees: [],
      pendingPayments: [],
      chargingBills: [],
      totalDebt: 0
    };

    // Committee fees for this resident
    const residentFees = feePayments.filter(fp => fp.residentId === resident.id);
    for (const fee of residentFees) {
      debt.committeeFees.push({
        month: `${hebrewMonths[fee.month - 1]} ${fee.year}`,
        amount: fee.amount
      });
      debt.totalDebt += fee.amount;
    }

    // Pending payments for this resident
    const residentPending = pendingPayments.filter(pp => pp.residentId === resident.id);
    for (const pending of residentPending) {
      debt.pendingPayments.push({
        description: pending.description,
        amount: pending.amount
      });
      debt.totalDebt += pending.amount;
    }

    // Charging station bills - match by apartment number
    const residentStations = stations.filter(s =>
      s.apartmentNumber === resident.apartmentNumber
    );

    for (const station of residentStations) {
      const stationReadings = meterReadings.filter(mr => mr.stationId === station.id);
      for (const reading of stationReadings) {
        debt.chargingBills.push({
          month: `${hebrewMonths[reading.month - 1]} ${reading.year}`,
          amount: reading.totalCost
        });
        debt.totalDebt += reading.totalCost;
      }
    }

    // Only include residents with debt
    if (debt.totalDebt > 0) {
      residentDebts.push(debt);
    }
  }

  return residentDebts;
}

// Generate HTML email content
function generateDebtEmailHtml(debt: ResidentDebt): string {
  const { resident, committeeFees, pendingPayments, chargingBills, totalDebt } = debt;

  let sectionsHtml = '';

  // Committee fees section
  if (committeeFees.length > 0) {
    const feesTotal = committeeFees.reduce((sum, f) => sum + f.amount, 0);
    sectionsHtml += `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #2196F3; margin-bottom: 10px; border-bottom: 2px solid #2196F3; padding-bottom: 5px;">
          💰 דמי ועד - סה"כ: ₪${feesTotal.toLocaleString()}
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">חודש</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">סכום</th>
          </tr>
          ${committeeFees.map(f => `
            <tr>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${f.month}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">₪${f.amount.toLocaleString()}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;
  }

  // Pending payments section
  if (pendingPayments.length > 0) {
    const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    sectionsHtml += `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #FF9800; margin-bottom: 10px; border-bottom: 2px solid #FF9800; padding-bottom: 5px;">
          📋 תשלומים צפויים - סה"כ: ₪${pendingTotal.toLocaleString()}
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">תיאור</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">סכום</th>
          </tr>
          ${pendingPayments.map(p => `
            <tr>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${p.description}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">₪${p.amount.toLocaleString()}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;
  }

  // Charging bills section
  if (chargingBills.length > 0) {
    const chargingTotal = chargingBills.reduce((sum, c) => sum + c.amount, 0);
    sectionsHtml += `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #4CAF50; margin-bottom: 10px; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">
          ⚡ חשבונות טעינה - סה"כ: ₪${chargingTotal.toLocaleString()}
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">חודש</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">סכום</th>
          </tr>
          ${chargingBills.map(c => `
            <tr>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${c.month}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">₪${c.amount.toLocaleString()}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; direction: rtl; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">

        <!-- Header -->
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">🏠 ועד הבית</h1>
          <p style="margin: 10px 0 0 0;">תזכורת תשלום</p>
        </div>

        <!-- Greeting -->
        <div style="padding: 20px;">
          <h2 style="color: #333;">שלום ${resident.name},</h2>
          <p style="color: #666; line-height: 1.6;">
            להלן סיכום החובות הפתוחים שלך לועד הבית.
            <br>נודה לך על הסדרת התשלום בהקדם האפשרי.
          </p>
        </div>

        <!-- Debt Details -->
        <div style="padding: 0 20px;">
          ${sectionsHtml}
        </div>

        <!-- Total -->
        <div style="background-color: #f44336; color: white; padding: 15px 20px; margin: 20px; border-radius: 8px; text-align: center;">
          <h2 style="margin: 0;">סה"כ לתשלום: ₪${totalDebt.toLocaleString()}</h2>
        </div>

        <!-- Footer -->
        <div style="padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee;">
          <p>דירה ${resident.apartmentNumber}</p>
          <p>מייל זה נשלח אוטומטית ממערכת ועד הבית</p>
          <p>לשאלות ניתן לפנות לועד הבית</p>
        </div>

      </div>
    </body>
    </html>
  `;
}

// Function to get debt summary (can be called from frontend)
export const getDebtSummary = functions.https.onCall(async (data, context) => {
  // Optional: Check authentication
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  // }

  try {
    const debts = await collectAllDebts();
    return {
      totalResidentsWithDebt: debts.length,
      debts: debts.map(d => ({
        residentName: d.resident.name,
        apartmentNumber: d.resident.apartmentNumber,
        totalDebt: d.totalDebt,
        hasEmail: !!d.resident.email,
        committeeFeeCount: d.committeeFees.length,
        pendingPaymentCount: d.pendingPayments.length,
        chargingBillCount: d.chargingBills.length
      }))
    };
  } catch (error) {
    console.error('Error getting debt summary:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get debt summary');
  }
});
