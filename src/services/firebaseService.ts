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
    await updateDoc(docRef, {
      ...data,
      ...(data.readingDate && { readingDate: Timestamp.fromDate(data.readingDate) }),
      ...(data.paidDate && { paidDate: Timestamp.fromDate(data.paidDate) }),
    });
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
