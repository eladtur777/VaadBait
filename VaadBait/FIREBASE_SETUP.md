# Firebase Setup Guide / הגדרת Firebase

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" / "צור פרויקט"
3. Name it "VaadBait" or any name you prefer
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Add Web App

1. In the Firebase Console, click the web icon (</>)
2. Register app with nickname "VaadBait App"
3. Copy the Firebase configuration

## Step 3: Update Firebase Config

Open `src/config/firebase.ts` and replace the config with your values:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // Your API Key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 4: Create Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location close to your users (e.g., "europe-west1" for Israel)

## Step 5: Set Security Rules (for production)

Go to Firestore > Rules and update:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for authenticated users
    match /{document=**} {
      allow read, write: if true;  // For testing only!
      // For production: allow read, write: if request.auth != null;
    }
  }
}
```

## Database Collections (Tables)

The app uses these Firestore collections:

| Collection | Hebrew | Description |
|------------|--------|-------------|
| `residents` | דיירים | Building residents |
| `transactions` | תנועות | Personal income/expenses |
| `committeeExpenses` | הוצאות ועד | Committee expenses |
| `committeeIncome` | הכנסות ועד | Committee income |
| `chargingStations` | עמדות טעינה | EV charging stations |
| `meterReadings` | קריאות מונה | Meter readings |
| `feePayments` | תשלומי ועד | Committee fee payments |
| `categories` | קטגוריות | Expense/Income categories |
| `settings` | הגדרות | App settings |

## Data Structure Examples

### Resident Document
```json
{
  "name": "ישראל ישראלי",
  "apartmentNumber": "12",
  "phone": "050-1234567",
  "email": "israel@example.com",
  "joinDate": "2024-01-15",
  "monthlyFee": 350,
  "isActive": true
}
```

### Committee Expense Document
```json
{
  "category": "ניקיון",
  "amount": 1200,
  "description": "שירותי ניקיון חודשיים",
  "date": "2026-01-15"
}
```

### Meter Reading Document
```json
{
  "stationId": "abc123",
  "previousReading": 1000,
  "currentReading": 1150,
  "consumption": 150,
  "pricePerKwh": 0.55,
  "totalCost": 82.50,
  "month": 1,
  "year": 2026
}
```

## Free Tier Limits

Firebase Spark (Free) plan includes:
- **Firestore**: 50K reads, 20K writes, 20K deletes per day
- **Storage**: 1GB stored, 5GB/day downloaded
- **Hosting**: 10GB storage, 360MB/day transferred

This is more than enough for a small building management app!

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Quick Start](https://firebase.google.com/docs/firestore/quickstart)
