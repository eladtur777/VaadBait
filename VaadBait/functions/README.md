# Firebase Cloud Functions - VaadBait Email Notifications

## תיאור
פונקציות שרת לשליחת התראות אוטומטיות במייל לדיירים עם חובות פתוחים.

## התקנה

### 1. התקנת Firebase CLI (אם לא מותקן)
```bash
npm install -g firebase-tools
firebase login
```

### 2. התקנת התלויות
```bash
cd functions
npm install
```

### 3. הגדרת משתני סביבה לאימייל
יש להגדיר את פרטי חשבון המייל ששולח את ההתראות:

```bash
# עבור Gmail (מומלץ להשתמש ב-App Password)
firebase functions:config:set email.service="gmail" email.user="your-email@gmail.com" email.pass="your-app-password"

# או עבור שירותים אחרים (Outlook, Yahoo, etc.)
firebase functions:config:set email.service="outlook" email.user="your-email@outlook.com" email.pass="your-password"
```

#### יצירת App Password ב-Gmail:
1. עבור לחשבון Google שלך: https://myaccount.google.com/
2. לחץ על "אבטחה"
3. הפעל "אימות דו-שלבי" (אם לא מופעל)
4. חפש "סיסמאות לאפליקציות" (App Passwords)
5. צור סיסמה חדשה לאפליקציה "Mail"
6. השתמש בסיסמה הזו ב-email.pass

### 4. הגדרת סוד API לקריאות ידניות (אופציונלי)
```bash
firebase functions:config:set api.secret="your-random-secret-string"
```

### 5. פריסה ל-Firebase
```bash
npm run deploy
# או
firebase deploy --only functions
```

## הפונקציות

### `sendWeeklyDebtReminders`
- **סוג**: Scheduled (Pub/Sub)
- **לוח זמנים**: כל יום ראשון בשעה 9:00 בבוקר (שעון ישראל)
- **תיאור**: שולח מייל אוטומטי לכל הדיירים עם חובות פתוחים

### `sendDebtRemindersManual`
- **סוג**: HTTP POST
- **תיאור**: שליחה ידנית של תזכורות חוב
- **אימות**: דורש Bearer token עם הסוד שהוגדר

### `getDebtSummary`
- **סוג**: Callable Function
- **תיאור**: מחזיר סיכום של כל הדיירים עם חובות

## מה נכלל במייל?
המייל כולל מידע על 3 סוגי חובות:

1. **דמי ועד** - תשלומי ועד שלא שולמו (חודש נוכחי ועבר)
2. **תשלומים צפויים** - תשלומים נוספים שממתינים לתשלום
3. **חשבונות טעינה** - חשבונות מונה טעינה שלא שולמו

## דרישות מקדימות
- הדיירים חייבים להיות עם `isActive: true`
- לכל דייר חייבת להיות כתובת מייל רשומה בשדה `email`
- הפונקציות בודקות רק חובות מהחודש הנוכחי ולאחור (לא עתידיים)

## פתרון בעיות

### הפונקציות לא נטענות?
```bash
firebase functions:log
```

### המיילים לא נשלחים?
1. וודא שהגדרת את משתני הסביבה נכון
2. בדוק אם Gmail חסם את הגישה (בדוק את תיבת הדואר)
3. וודא שיש ל-App Password הרשאות נכונות

### שגיאת CORS מהאפליקציה?
הפונקציות צריכות להיות פרוסות לאותו פרויקט Firebase

## בדיקה מקומית
```bash
npm run serve
```

זה יריץ אמולטור מקומי לבדיקת הפונקציות לפני פריסה.
