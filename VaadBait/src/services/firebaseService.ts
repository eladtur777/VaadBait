import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  deleteField,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { db, storage, auth } from '../config/firebase';

// Collection names
const COLLECTIONS = {
  RESIDENTS: 'residents',
  TRANSACTIONS: 'transactions',
  COMMITTEE_EXPENSES: 'committeeExpenses',
  COMMITTEE_INCOME: 'committeeIncome',
  CHARGING_STATIONS: 'chargingStations',
  METER_READINGS: 'meterReadings',
  CATEGORIES: 'categories',
  SETTINGS: 'settings',
  FEE_PAYMENTS: 'feePayments',
  ADMIN_USERS: 'adminUsers',
  EMAIL_SETTINGS: 'emailSettings',
  MAINTENANCE_TASKS: 'maintenanceTasks',
  PERIODIC_MAINTENANCE: 'periodicMaintenance',
};

// ==================== RESIDENTS ====================
export interface Resident {
  id?: string;
  name: string;
  apartmentNumber: string;
  phone?: string;
  phone2?: string;
  email?: string;
  joinDate: Date;
  monthlyFee: number;
  isActive: boolean;
  createdAt?: Date;
}

export const ResidentsService = {
  async getAll(): Promise<Resident[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.RESIDENTS));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      joinDate: doc.data().joinDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Resident[];
  },

  async add(resident: Omit<Resident, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.RESIDENTS), {
      ...resident,
      joinDate: Timestamp.fromDate(resident.joinDate),
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<Resident>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.RESIDENTS, id);
    await updateDoc(docRef, {
      ...data,
      ...(data.joinDate && { joinDate: Timestamp.fromDate(data.joinDate) }),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.RESIDENTS, id));
  },
};

// ==================== TRANSACTIONS (Personal) ====================
export interface Transaction {
  id?: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: Date;
  createdAt?: Date;
}

export const TransactionsService = {
  async getAll(): Promise<Transaction[]> {
    const q = query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Transaction[];
  },

  async getByMonth(year: number, month: number): Promise<Transaction[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const q = query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
    })) as Transaction[];
  },

  async add(transaction: Omit<Transaction, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), {
      ...transaction,
      date: Timestamp.fromDate(transaction.date),
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<Transaction>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.TRANSACTIONS, id);
    await updateDoc(docRef, {
      ...data,
      ...(data.date && { date: Timestamp.fromDate(data.date) }),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.TRANSACTIONS, id));
  },
};

// ==================== COMMITTEE EXPENSES ====================
export interface CommitteeExpense {
  id?: string;
  category: string;
  amount: number;
  description: string;
  date: Date;
  notes?: string;
  receiptUrl?: string;
  receiptImageBase64?: string; // Base64 encoded receipt image (for Firestore storage)
  createdAt?: Date;
}

export const CommitteeExpensesService = {
  async getAll(): Promise<CommitteeExpense[]> {
    const q = query(
      collection(db, COLLECTIONS.COMMITTEE_EXPENSES),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as CommitteeExpense[];
  },

  async add(expense: Omit<CommitteeExpense, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.COMMITTEE_EXPENSES), {
      ...expense,
      date: Timestamp.fromDate(expense.date),
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<CommitteeExpense>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COMMITTEE_EXPENSES, id);
    await updateDoc(docRef, {
      ...data,
      ...(data.date && { date: Timestamp.fromDate(data.date) }),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.COMMITTEE_EXPENSES, id));
  },
};

// ==================== COMMITTEE INCOME ====================
export interface CommitteeIncome {
  id?: string;
  category: string;
  amount: number;
  description: string;
  date: Date;
  isPaid: boolean;
  notes?: string;
  receiptUrl?: string;
  receiptImageBase64?: string; // Base64 encoded receipt image (for Firestore storage)
  createdAt?: Date;
  payerName?: string;
  payerPhone?: string;
}

export const CommitteeIncomeService = {
  async getAll(): Promise<CommitteeIncome[]> {
    const q = query(
      collection(db, COLLECTIONS.COMMITTEE_INCOME),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as CommitteeIncome[];
  },

  async add(income: Omit<CommitteeIncome, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.COMMITTEE_INCOME), {
      ...income,
      date: Timestamp.fromDate(income.date),
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<CommitteeIncome>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COMMITTEE_INCOME, id);
    await updateDoc(docRef, {
      ...data,
      ...(data.date && { date: Timestamp.fromDate(data.date) }),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.COMMITTEE_INCOME, id));
  },
};

// ==================== CHARGING STATIONS ====================
export interface ChargingStation {
  id?: string;
  apartmentNumber: string;
  residentName: string;
  meterNumber?: string;
  isActive: boolean;
  createdAt?: Date;
}

export const ChargingStationsService = {
  async getAll(): Promise<ChargingStation[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.CHARGING_STATIONS));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as ChargingStation[];
  },

  async add(station: Omit<ChargingStation, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.CHARGING_STATIONS), {
      ...station,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<ChargingStation>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.CHARGING_STATIONS, id);
    await updateDoc(docRef, data);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.CHARGING_STATIONS, id));
  },
};

// ==================== METER READINGS ====================
export interface MeterReading {
  id?: string;
  stationId: string;
  previousReading: number;
  currentReading: number;
  consumption: number;
  pricePerKwh: number;
  totalCost: number;
  month: number;
  year: number;
  readingDate: Date;
  isPaid: boolean;
  paidDate?: Date;
  createdAt?: Date;
  receiptImageBase64?: string; // Base64 encoded meter reading image
}

export const MeterReadingsService = {
  async getAll(): Promise<MeterReading[]> {
    const q = query(
      collection(db, COLLECTIONS.METER_READINGS),
      orderBy('readingDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      readingDate: doc.data().readingDate?.toDate(),
      paidDate: doc.data().paidDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as MeterReading[];
  },

  async getByMonth(year: number, month: number): Promise<MeterReading[]> {
    const q = query(
      collection(db, COLLECTIONS.METER_READINGS),
      where('year', '==', year),
      where('month', '==', month)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      readingDate: doc.data().readingDate?.toDate(),
      paidDate: doc.data().paidDate?.toDate(),
    })) as MeterReading[];
  },

  async add(reading: Omit<MeterReading, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.METER_READINGS), {
      ...reading,
      readingDate: Timestamp.fromDate(reading.readingDate),
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<MeterReading>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.METER_READINGS, id);
    const updateData: any = {};

    // Copy all fields except dates which need special handling
    Object.keys(data).forEach(key => {
      if (key !== 'readingDate' && key !== 'paidDate') {
        const value = (data as any)[key];
        if (value !== undefined) {
          updateData[key] = value;
        }
      }
    });

    // Handle readingDate conversion
    if (data.readingDate) {
      updateData.readingDate = Timestamp.fromDate(data.readingDate);
    }

    // Handle paidDate - convert to Timestamp or delete field if explicitly set to undefined/null
    if ('paidDate' in data) {
      if (data.paidDate) {
        updateData.paidDate = Timestamp.fromDate(data.paidDate);
      } else {
        // paidDate is undefined or null - delete the field
        updateData.paidDate = deleteField();
      }
    }

    await updateDoc(docRef, updateData);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.METER_READINGS, id));
  },
};

// ==================== FEE PAYMENTS ====================
export interface FeePayment {
  id?: string;
  residentId: string;
  residentName: string;
  apartmentNumber: string;
  amount: number;
  month: number;
  year: number;
  paymentDate: Date;
  isPaid: boolean;
  createdAt?: Date;
}

export const FeePaymentsService = {
  async getAll(): Promise<FeePayment[]> {
    const q = query(
      collection(db, COLLECTIONS.FEE_PAYMENTS),
      orderBy('paymentDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      paymentDate: doc.data().paymentDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as FeePayment[];
  },

  async getByMonth(year: number, month: number): Promise<FeePayment[]> {
    const q = query(
      collection(db, COLLECTIONS.FEE_PAYMENTS),
      where('year', '==', year),
      where('month', '==', month)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      paymentDate: doc.data().paymentDate?.toDate(),
    })) as FeePayment[];
  },

  async add(payment: Omit<FeePayment, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.FEE_PAYMENTS), {
      ...payment,
      paymentDate: Timestamp.fromDate(payment.paymentDate),
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<FeePayment>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.FEE_PAYMENTS, id);
    await updateDoc(docRef, {
      ...data,
      ...(data.paymentDate && { paymentDate: Timestamp.fromDate(data.paymentDate) }),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.FEE_PAYMENTS, id));
  },
};

// ==================== CATEGORIES ====================
export interface Category {
  id?: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
  createdAt?: Date;
}

export const CategoriesService = {
  async getAll(): Promise<Category[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Category[];
  },

  async add(category: Omit<Category, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.CATEGORIES), {
      ...category,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<Category>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.CATEGORIES, id);
    await updateDoc(docRef, data);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, id));
  },
};

// ==================== SETTINGS ====================
export interface Settings {
  id?: string;
  kwhPrice: number;
  monthlyFee: number;
  buildingName?: string;
  buildingAddress?: string;
  personalBalance?: number;
  updatedAt?: Date;
}

export const SettingsService = {
  async get(): Promise<Settings | null> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.SETTINGS));
    if (querySnapshot.empty) return null;
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as Settings;
  },

  async update(data: Partial<Settings>): Promise<void> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.SETTINGS));
    if (querySnapshot.empty) {
      await addDoc(collection(db, COLLECTIONS.SETTINGS), {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } else {
      const docRef = doc(db, COLLECTIONS.SETTINGS, querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    }
  },
};

// ==================== AUTHENTICATION ====================
export const AuthService = {
  async login(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },
};

// ==================== RECEIPT STORAGE ====================
export const ReceiptStorageService = {
  async uploadReceipt(uri: string, folder: 'expenses' | 'incomes'): Promise<string> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `receipts/${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      throw error;
    }
  },

  async deleteReceipt(url: string): Promise<void> {
    try {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting receipt:', error);
    }
  },
};

// ==================== BASE64 IMAGE SERVICE ====================
export const Base64ImageService = {
  async convertImageToBase64(uri: string, maxWidth: number = 600, maxHeight: number = 600, quality: number = 0.5): Promise<string> {
    try {
      // If it's already a base64 string (from web file input), handle it directly
      if (uri.startsWith('data:')) {
        // Check if it's a PDF - don't compress PDFs
        if (uri.startsWith('data:application/pdf')) {
          const sizeInBytes = (uri.length * 3) / 4;
          if (sizeInBytes > 900000) {
            throw new Error('קובץ ה-PDF גדול מדי. נא לבחור קובץ קטן יותר (עד 900KB)');
          }
          return uri;
        }

        // For images that are already base64, compress them
        return this.compressBase64Image(uri, maxWidth, maxHeight, quality);
      }

      // Create an image element to load the source
      const img = new Image();

      return new Promise((resolve, reject) => {
        img.onload = () => {
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const base64String = canvas.toDataURL('image/jpeg', quality);

          // Check if still too large (Firestore limit is ~1MB)
          const sizeInBytes = (base64String.length * 3) / 4;
          if (sizeInBytes > 900000) {
            // Try with lower quality
            const lowerQualityBase64 = canvas.toDataURL('image/jpeg', 0.3);
            resolve(lowerQualityBase64);
          } else {
            resolve(base64String);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        // Handle CORS for blob URLs
        img.crossOrigin = 'anonymous';
        img.src = uri;
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  },

  async compressBase64Image(base64: string, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);

        const sizeInBytes = (compressed.length * 3) / 4;
        if (sizeInBytes > 900000) {
          resolve(canvas.toDataURL('image/jpeg', 0.3));
        } else {
          resolve(compressed);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64;
    });
  },

  isBase64Image(str: string): boolean {
    return str?.startsWith('data:image/') || false;
  },

  isBase64Pdf(str: string): boolean {
    return str?.startsWith('data:application/pdf') || false;
  },
};

// ==================== ADMIN USERS ====================
export interface AdminUser {
  id?: string;
  email: string;
  name?: string;
  createdAt?: Date;
}

export const AdminUsersService = {
  async getAll(): Promise<AdminUser[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.ADMIN_USERS));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as AdminUser[];
  },

  async isAdmin(email: string): Promise<boolean> {
    const q = query(
      collection(db, COLLECTIONS.ADMIN_USERS),
      where('email', '==', email.toLowerCase())
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  },

  async add(adminUser: Omit<AdminUser, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.ADMIN_USERS), {
      ...adminUser,
      email: adminUser.email.toLowerCase(),
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.ADMIN_USERS, id));
  },
};

// ==================== EMAIL SETTINGS ====================
export interface EmailSettings {
  id?: string;
  scheduleDay: number; // Day of month (1-28)
  scheduleHour: number; // Hour (0-23)
  isEnabled: boolean;
  excludedResidentIds: string[]; // Residents excluded from email notifications
  updatedAt?: Date;
}

export const EmailSettingsService = {
  async get(): Promise<EmailSettings | null> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.EMAIL_SETTINGS));
    if (querySnapshot.empty) return null;
    const docData = querySnapshot.docs[0];
    return {
      id: docData.id,
      ...docData.data(),
      updatedAt: docData.data().updatedAt?.toDate(),
    } as EmailSettings;
  },

  async update(data: Partial<EmailSettings>): Promise<void> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.EMAIL_SETTINGS));
    if (querySnapshot.empty) {
      await addDoc(collection(db, COLLECTIONS.EMAIL_SETTINGS), {
        scheduleDay: 20,
        scheduleHour: 9,
        isEnabled: true,
        excludedResidentIds: [],
        ...data,
        updatedAt: Timestamp.now(),
      });
    } else {
      const docRef = doc(db, COLLECTIONS.EMAIL_SETTINGS, querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    }
  },

  async toggleResidentExclusion(residentId: string, exclude: boolean): Promise<void> {
    const settings = await this.get();
    const excludedIds = settings?.excludedResidentIds || [];

    let newExcludedIds: string[];
    if (exclude) {
      newExcludedIds = [...new Set([...excludedIds, residentId])];
    } else {
      newExcludedIds = excludedIds.filter(id => id !== residentId);
    }

    await this.update({ excludedResidentIds: newExcludedIds });
  },
};

// ==================== MAINTENANCE TASKS ====================
export interface MaintenanceTask {
  id?: string;
  type: 'issue' | 'improvement' | 'general';
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reportedBy?: string;
  reportedByPhone?: string;
  assignedTo?: string;
  location?: string;
  estimatedCost?: number;
  actualCost?: number;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
  notes?: string;
  imageBase64?: string;
}

export const MaintenanceTasksService = {
  async getAll(): Promise<MaintenanceTask[]> {
    const q = query(
      collection(db, COLLECTIONS.MAINTENANCE_TASKS),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      completedAt: doc.data().completedAt?.toDate(),
    })) as MaintenanceTask[];
  },

  async getByStatus(status: MaintenanceTask['status']): Promise<MaintenanceTask[]> {
    const q = query(
      collection(db, COLLECTIONS.MAINTENANCE_TASKS),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      completedAt: doc.data().completedAt?.toDate(),
    })) as MaintenanceTask[];
  },

  async add(task: Omit<MaintenanceTask, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.MAINTENANCE_TASKS), {
      ...task,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<MaintenanceTask>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.MAINTENANCE_TASKS, id);

    // Remove undefined values - Firebase doesn't accept undefined
    const cleanData: any = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanData[key] = value;
      }
    });

    cleanData.updatedAt = Timestamp.now();

    if (cleanData.completedAt) {
      cleanData.completedAt = Timestamp.fromDate(cleanData.completedAt);
    }

    await updateDoc(docRef, cleanData);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.MAINTENANCE_TASKS, id));
  },
};

// ==================== PERIODIC MAINTENANCE ====================
export interface PeriodicMaintenance {
  id?: string;
  title: string;
  description: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  lastPerformed?: Date;
  nextDue: Date;
  reminderDate?: Date;
  reminderEmail?: string;
  isActive: boolean;
  estimatedCost?: number;
  assignedTo?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const PeriodicMaintenanceService = {
  async getAll(): Promise<PeriodicMaintenance[]> {
    const q = query(
      collection(db, COLLECTIONS.PERIODIC_MAINTENANCE),
      orderBy('nextDue', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastPerformed: doc.data().lastPerformed?.toDate(),
      nextDue: doc.data().nextDue?.toDate(),
      reminderDate: doc.data().reminderDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as PeriodicMaintenance[];
  },

  async getActive(): Promise<PeriodicMaintenance[]> {
    const q = query(
      collection(db, COLLECTIONS.PERIODIC_MAINTENANCE),
      where('isActive', '==', true),
      orderBy('nextDue', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastPerformed: doc.data().lastPerformed?.toDate(),
      nextDue: doc.data().nextDue?.toDate(),
      reminderDate: doc.data().reminderDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as PeriodicMaintenance[];
  },

  async add(maintenance: Omit<PeriodicMaintenance, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.PERIODIC_MAINTENANCE), {
      ...maintenance,
      nextDue: Timestamp.fromDate(maintenance.nextDue),
      ...(maintenance.lastPerformed && { lastPerformed: Timestamp.fromDate(maintenance.lastPerformed) }),
      ...(maintenance.reminderDate && { reminderDate: Timestamp.fromDate(maintenance.reminderDate) }),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<PeriodicMaintenance>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PERIODIC_MAINTENANCE, id);

    // Remove undefined values - Firebase doesn't accept undefined
    const cleanData: any = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanData[key] = value;
      }
    });

    cleanData.updatedAt = Timestamp.now();

    if (cleanData.nextDue) {
      cleanData.nextDue = Timestamp.fromDate(cleanData.nextDue);
    }
    if (cleanData.lastPerformed) {
      cleanData.lastPerformed = Timestamp.fromDate(cleanData.lastPerformed);
    }
    if (cleanData.reminderDate) {
      cleanData.reminderDate = Timestamp.fromDate(cleanData.reminderDate);
    }

    await updateDoc(docRef, cleanData);
  },

  async markAsPerformed(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PERIODIC_MAINTENANCE, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data() as PeriodicMaintenance;
    const now = new Date();
    let nextDue = new Date(now);

    // Calculate next due date based on frequency
    switch (data.frequency) {
      case 'weekly':
        nextDue.setDate(nextDue.getDate() + 7);
        break;
      case 'monthly':
        nextDue.setMonth(nextDue.getMonth() + 1);
        break;
      case 'quarterly':
        nextDue.setMonth(nextDue.getMonth() + 3);
        break;
      case 'semi_annual':
        nextDue.setMonth(nextDue.getMonth() + 6);
        break;
      case 'annual':
        nextDue.setFullYear(nextDue.getFullYear() + 1);
        break;
    }

    await updateDoc(docRef, {
      lastPerformed: Timestamp.fromDate(now),
      nextDue: Timestamp.fromDate(nextDue),
      updatedAt: Timestamp.now(),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.PERIODIC_MAINTENANCE, id));
  },
};
