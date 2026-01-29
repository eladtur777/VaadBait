import { setGlobalOptions } from "firebase-functions";
import { onSchedule } from "firebase-functions/scheduler";
import { onCall, HttpsError } from "firebase-functions/https";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import { defineSecret } from "firebase-functions/params";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Set global options
setGlobalOptions({ maxInstances: 10, region: "us-central1" });

// Define secrets for email configuration
const emailUser = defineSecret("EMAIL_USER");
const emailPass = defineSecret("EMAIL_PASS");

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

// Get users who should receive email notifications
async function getEmailRecipients(): Promise<string[]> {
  console.log("getEmailRecipients: fetching users with sendMail=true");
  const usersSnapshot = await db.collection("users")
    .where("sendMail", "==", true)
    .get();

  console.log(`getEmailRecipients: found ${usersSnapshot.docs.length} users with sendMail=true`);

  // Log all users for debugging
  usersSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    console.log(`User: email=${data.email}, sendMail=${data.sendMail}`);
  });

  const emails = usersSnapshot.docs
    .map((doc) => doc.data().email as string)
    .filter((email) => email && email.length > 0);

  console.log(`getEmailRecipients: returning ${emails.length} emails: ${emails.join(", ")}`);
  return emails;
}

// Hebrew month names
const hebrewMonths = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

// Create email transporter
function createTransporter(user: string, pass: string) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user,
      pass: pass,
    },
  });
}

// Collect all debts from Firestore
async function collectAllDebts(): Promise<ResidentDebt[]> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  console.log(`collectAllDebts: currentMonth=${currentMonth}, currentYear=${currentYear}`);

  // Get global settings for default monthly fee
  const settingsSnapshot = await db.collection("settings").limit(1).get();
  const globalMonthlyFee = settingsSnapshot.empty ? 0 : (settingsSnapshot.docs[0].data().monthlyFee || 0);
  console.log(`collectAllDebts: globalMonthlyFee=${globalMonthlyFee}`);

  // Get all active residents
  const residentsSnapshot = await db.collection("residents")
    .where("isActive", "==", true)
    .get();

  console.log(`collectAllDebts: found ${residentsSnapshot.docs.length} active residents`);

  const residents: Resident[] = residentsSnapshot.docs.map((doc) => {
    const data = doc.data();
    const monthlyFee = data.monthlyFee || globalMonthlyFee;
    console.log(`Resident ${data.name}: monthlyFee=${data.monthlyFee}, using=${monthlyFee}`);
    return {
      id: doc.id,
      ...data,
      // Use resident's monthlyFee if set, otherwise use global setting
      monthlyFee: monthlyFee,
    } as Resident;
  });

  // Get ALL fee payments to check who paid current month
  const allFeePaymentsSnapshot = await db.collection("feePayments").get();
  const allFeePayments = allFeePaymentsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as FeePayment));

  console.log(`collectAllDebts: found ${allFeePayments.length} total fee payments`);
  // Log all fee payments for debugging
  allFeePayments.forEach((fp) => {
    console.log(`FeePayment: residentId=${fp.residentId}, month=${fp.month}, year=${fp.year}, isPaid=${fp.isPaid}`);
  });

  // Get unpaid fee payments (explicitly marked as unpaid)
  const unpaidFeePayments: FeePayment[] = allFeePayments
    .filter((fp) => fp.isPaid === false)
    .filter((fp) => {
      if (fp.year < currentYear) return true;
      if (fp.year === currentYear && fp.month <= currentMonth) return true;
      return false;
    });

  // Get all unpaid pending payments
  const pendingPaymentsSnapshot = await db.collection("pendingPayments")
    .where("isPaid", "==", false)
    .get();

  const pendingPayments: PendingPayment[] = pendingPaymentsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as PendingPayment))
    .filter((pp) => {
      if (!pp.dueDate) return true;
      const dueDate = pp.dueDate.toDate();
      return dueDate <= now;
    });

  // Get all charging stations
  const stationsSnapshot = await db.collection("chargingStations").get();
  const stations: ChargingStation[] = stationsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as ChargingStation));

  // Get all unpaid meter readings (current month and past)
  const meterReadingsSnapshot = await db.collection("meterReadings")
    .where("isPaid", "==", false)
    .get();

  const meterReadings: MeterReading[] = meterReadingsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as MeterReading))
    .filter((mr) => {
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
      totalDebt: 0,
    };

    // Check all months from beginning of current year until current month
    // for unpaid committee fees (same logic as FeeCollectionScreen)
    console.log(`Checking resident ${resident.name} (id=${resident.id}), monthlyFee=${resident.monthlyFee}`);
    if (resident.monthlyFee > 0) {
      for (let month = 1; month <= currentMonth; month++) {
        // Check if this month is paid (has a payment record with isPaid: true)
        const isPaidForMonth = allFeePayments.some((fp) =>
          fp.residentId === resident.id &&
          fp.year === currentYear &&
          fp.month === month &&
          fp.isPaid === true
        );

        console.log(`  Month ${month}/${currentYear}: isPaid=${isPaidForMonth}`);

        if (!isPaidForMonth) {
          debt.committeeFees.push({
            month: `${hebrewMonths[month - 1]} ${currentYear}`,
            amount: resident.monthlyFee,
          });
          debt.totalDebt += resident.monthlyFee;
          console.log(`  -> Added unpaid fee for ${hebrewMonths[month - 1]} ${currentYear}`);
        }
      }
    } else {
      console.log(`  Skipping - monthlyFee is 0`);
    }

    // Also check previous year if there are unpaid fees marked explicitly
    const residentUnpaidFeesPastYears = unpaidFeePayments.filter((fp) =>
      fp.residentId === resident.id &&
      fp.year < currentYear // Only past years (current year handled above)
    );
    for (const fee of residentUnpaidFeesPastYears) {
      debt.committeeFees.push({
        month: `${hebrewMonths[fee.month - 1]} ${fee.year}`,
        amount: fee.amount,
      });
      debt.totalDebt += fee.amount;
    }

    // Pending payments for this resident
    const residentPending = pendingPayments.filter((pp) => pp.residentId === resident.id);
    for (const pending of residentPending) {
      debt.pendingPayments.push({
        description: pending.description,
        amount: pending.amount,
      });
      debt.totalDebt += pending.amount;
    }

    // Charging station bills - match by apartment number
    const residentStations = stations.filter((s) =>
      s.apartmentNumber === resident.apartmentNumber
    );

    for (const station of residentStations) {
      const stationReadings = meterReadings.filter((mr) => mr.stationId === station.id);
      for (const reading of stationReadings) {
        debt.chargingBills.push({
          month: `${hebrewMonths[reading.month - 1]} ${reading.year}`,
          amount: reading.totalCost,
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

// Generate HTML email content - summary for all residents (for admins/users)
function generateAllDebtsEmailHtml(debts: ResidentDebt[]): string {
  const totalAllDebts = debts.reduce((sum, d) => sum + d.totalDebt, 0);
  const now = new Date();
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  let residentsHtml = "";

  for (const debt of debts) {
    const { resident, committeeFees, pendingPayments, chargingBills, totalDebt } = debt;

    let detailsHtml = "";

    // Committee fees
    if (committeeFees.length > 0) {
      const feesTotal = committeeFees.reduce((sum, f) => sum + f.amount, 0);
      detailsHtml += `<div style="margin: 5px 0; color: #2196F3;">דמי ועד: ₪${feesTotal.toLocaleString()} (${committeeFees.length} חודשים)</div>`;
    }

    // Pending payments
    if (pendingPayments.length > 0) {
      const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
      detailsHtml += `<div style="margin: 5px 0; color: #FF9800;">תשלומים צפויים: ₪${pendingTotal.toLocaleString()} (${pendingPayments.length} פריטים)</div>`;
    }

    // Charging bills
    if (chargingBills.length > 0) {
      const chargingTotal = chargingBills.reduce((sum, c) => sum + c.amount, 0);
      detailsHtml += `<div style="margin: 5px 0; color: #4CAF50;">חשבונות טעינה: ₪${chargingTotal.toLocaleString()} (${chargingBills.length} חודשים)</div>`;
    }

    residentsHtml += `
      <tr style="border-bottom: 2px solid #eee;">
        <td style="padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: bold;">${resident.name}</td>
        <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${resident.apartmentNumber}</td>
        <td style="padding: 12px; text-align: right; border: 1px solid #ddd; font-size: 12px;">${detailsHtml}</td>
        <td style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: bold; color: #f44336; font-size: 16px;">₪${totalDebt.toLocaleString()}</td>
      </tr>
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
      <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; padding: 20px;">

        <!-- Header -->
        <div style="background-color: #9C27B0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">ועד הבית - סיכום חובות</h1>
          <p style="margin: 10px 0 0 0;">תאריך: ${dateStr}</p>
        </div>

        <!-- Summary -->
        <div style="padding: 20px; background-color: #f5f5f5; margin: 20px 0; border-radius: 8px;">
          <h2 style="color: #333; margin: 0 0 10px 0;">סיכום כללי</h2>
          <p style="font-size: 18px; margin: 5px 0;"><strong>מספר דיירים עם חוב:</strong> ${debts.length}</p>
          <p style="font-size: 24px; margin: 5px 0; color: #f44336;"><strong>סה"כ חובות:</strong> ₪${totalAllDebts.toLocaleString()}</p>
        </div>

        <!-- Debts Table -->
        <div style="padding: 0 10px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background-color: #9C27B0; color: white;">
                <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">שם</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">דירה</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">פירוט</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">סה"כ חוב</th>
              </tr>
            </thead>
            <tbody>
              ${residentsHtml}
            </tbody>
          </table>
        </div>

        <!-- Total -->
        <div style="background-color: #f44336; color: white; padding: 15px 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
          <h2 style="margin: 0;">סה"כ חובות: ₪${totalAllDebts.toLocaleString()}</h2>
        </div>

        <!-- Footer -->
        <div style="padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee;">
          <p>מייל זה נשלח אוטומטית ממערכת ועד הבית</p>
          <p>דוח זה נשלח למנהלי המערכת בלבד</p>
        </div>

      </div>
    </body>
    </html>
  `;
}

// Scheduled function - runs on the 20th of every month at 9:00 AM Israel time
export const sendMonthlyDebtReminders = onSchedule({
  schedule: "0 9 20 * *",
  timeZone: "Asia/Jerusalem",
  timeoutSeconds: 540,
  memory: "512MiB",
  secrets: [emailUser, emailPass],
}, async () => {
  console.log("Starting monthly debt reminder job (20th of month)...");

  try {
    // Get all debts
    const debts = await collectAllDebts();

    if (debts.length === 0) {
      console.log("No debts found. No emails to send.");
      return;
    }

    // Get users who should receive email (from users table with sendMail: true)
    const recipients = await getEmailRecipients();

    if (recipients.length === 0) {
      console.log("No recipients found with sendMail: true");
      return;
    }

    const transporter = createTransporter(emailUser.value(), emailPass.value());
    const totalDebt = debts.reduce((sum, d) => sum + d.totalDebt, 0);

    // Generate summary email for all debts
    const emailHtml = generateAllDebtsEmailHtml(debts);

    let emailsSent = 0;
    let emailsFailed = 0;

    // Send to all recipients
    for (const recipientEmail of recipients) {
      try {
        await transporter.sendMail({
          from: `"ועד הבית" <${emailUser.value()}>`,
          to: recipientEmail,
          subject: `סיכום חובות - ועד הבית - ${debts.length} דיירים - סה"כ: ₪${totalDebt.toLocaleString()}`,
          html: emailHtml,
        });

        console.log(`Email sent to ${recipientEmail}`);
        emailsSent++;
      } catch (emailError) {
        console.error(`Failed to send email to ${recipientEmail}:`, emailError);
        emailsFailed++;
      }
    }

    console.log(`Monthly debt reminders completed. Sent: ${emailsSent}, Failed: ${emailsFailed}`);
  } catch (error) {
    console.error("Error in sendMonthlyDebtReminders:", error);
    throw error;
  }
});

// Callable function to get debt summary
export const getDebtSummary = onCall({
  timeoutSeconds: 60,
  memory: "256MiB",
}, async () => {
  try {
    console.log("getDebtSummary called");
    const debts = await collectAllDebts();
    console.log(`getDebtSummary: returning ${debts.length} residents with debt`);
    return {
      totalResidentsWithDebt: debts.length,
      debts: debts.map((d) => ({
        residentName: d.resident.name,
        apartmentNumber: d.resident.apartmentNumber,
        totalDebt: d.totalDebt,
        hasEmail: !!d.resident.email,
        committeeFeeCount: d.committeeFees.length,
        committeeFeeTotal: d.committeeFees.reduce((sum, f) => sum + f.amount, 0),
        committeeFeeMonths: d.committeeFees.map((f) => f.month),
        pendingPaymentCount: d.pendingPayments.length,
        chargingBillCount: d.chargingBills.length,
      })),
    };
  } catch (error) {
    console.error("Error getting debt summary:", error);
    throw new HttpsError("internal", "Failed to get debt summary");
  }
});

// Callable function to manually send debt reminders
export const sendDebtRemindersManual = onCall({
  timeoutSeconds: 540,
  memory: "512MiB",
  secrets: [emailUser, emailPass],
}, async () => {
  try {
    console.log("sendDebtRemindersManual: starting...");

    // Get all debts
    const debts = await collectAllDebts();
    console.log(`sendDebtRemindersManual: found ${debts.length} residents with debts`);

    if (debts.length === 0) {
      console.log("sendDebtRemindersManual: no debts found, returning");
      return { message: "No debts found", sent: 0, recipients: 0 };
    }

    // Get users who should receive email (from users table with sendMail: true)
    const recipients = await getEmailRecipients();
    console.log(`sendDebtRemindersManual: found ${recipients.length} recipients`);

    if (recipients.length === 0) {
      console.log("sendDebtRemindersManual: no recipients found, returning");
      return { message: "No recipients found with sendMail: true", sent: 0, recipients: 0 };
    }

    console.log(`sendDebtRemindersManual: creating transporter with user=${emailUser.value()}`);
    const transporter = createTransporter(emailUser.value(), emailPass.value());
    const totalDebt = debts.reduce((sum, d) => sum + d.totalDebt, 0);

    // Generate summary email for all debts
    const emailHtml = generateAllDebtsEmailHtml(debts);
    console.log(`sendDebtRemindersManual: generated email HTML, total debt=${totalDebt}`);

    let emailsSent = 0;

    // Send to all recipients
    for (const recipientEmail of recipients) {
      try {
        console.log(`sendDebtRemindersManual: sending email to ${recipientEmail}...`);
        await transporter.sendMail({
          from: `"ועד הבית" <${emailUser.value()}>`,
          to: recipientEmail,
          subject: `סיכום חובות - ועד הבית - ${debts.length} דיירים - סה"כ: ₪${totalDebt.toLocaleString()}`,
          html: emailHtml,
        });
        console.log(`sendDebtRemindersManual: email sent successfully to ${recipientEmail}`);
        emailsSent++;
      } catch (emailError) {
        console.error(`sendDebtRemindersManual: Failed to send to ${recipientEmail}:`, emailError);
      }
    }

    return {
      message: "Debt reminders sent",
      sent: emailsSent,
      recipients: recipients.length,
      totalResidentsWithDebt: debts.length,
      totalDebt: totalDebt
    };
  } catch (error) {
    console.error("Error:", error);
    throw new HttpsError("internal", "Failed to send reminders");
  }
});

// Callable function to initialize admin user (one-time setup)
export const initializeAdminUser = onCall({
  timeoutSeconds: 30,
  memory: "128MiB",
}, async (request) => {
  const email = request.data?.email;

  if (!email || typeof email !== "string") {
    throw new HttpsError("invalid-argument", "Email is required");
  }

  try {
    // Check if admin already exists
    const existingAdmin = await db.collection("adminUsers")
      .where("email", "==", email.toLowerCase())
      .get();

    if (!existingAdmin.empty) {
      return { message: "Admin already exists", email };
    }

    // Add new admin
    await db.collection("adminUsers").add({
      email: email.toLowerCase(),
      createdAt: admin.firestore.Timestamp.now(),
    });

    return { message: "Admin initialized successfully", email };
  } catch (error) {
    console.error("Error initializing admin:", error);
    throw new HttpsError("internal", "Failed to initialize admin");
  }
});

// Callable function to get email settings
export const getEmailSettings = onCall({
  timeoutSeconds: 30,
  memory: "128MiB",
}, async () => {
  try {
    const settingsSnapshot = await db.collection("emailSettings").limit(1).get();

    if (settingsSnapshot.empty) {
      // Return defaults
      return {
        scheduleDay: 20,
        scheduleHour: 9,
        isEnabled: true,
        excludedResidentIds: [],
      };
    }

    const doc = settingsSnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error("Error getting email settings:", error);
    throw new HttpsError("internal", "Failed to get email settings");
  }
});
