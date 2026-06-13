import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
  getDoc,
  setDoc
} from 'firebase/firestore';
import firebaseConfig, { isFirebaseConfigured } from './firebaseConfig';

let db = null;

// Convert Firestore Timestamp objects to ISO strings recursively
function normalizeTimestamps(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
  if (Array.isArray(obj)) return obj.map(normalizeTimestamps);
  const result = {};
  for (const key of Object.keys(obj)) {
    result[key] = normalizeTimestamps(obj[key]);
  }
  return result;
}
let analytics = null;
let initialized = false;

export const initFirebase = () => {
  if (initialized) return db;
  initialized = true;

  if (!isFirebaseConfigured()) {
    console.log('[Firebase] Tidak dikonfigurasi — fallback ke localStorage');
    return null;
  }

  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    analytics = getAnalytics(app);
    console.log('[Firebase] Terhubung:', firebaseConfig.projectId);
  } catch (e) {
    console.warn('[Firebase] Gagal init:', e);
    db = null;
  }
  return db;
};

export const getAnalyticsInstance = () => analytics;

// ─── Helper: buat subscription real-time ───
const createSubscriber = (collectionName, callback, orderField = 'createdAt', opts = {}) => {
  const database = initFirebase();
  if (!database) {
    callback(null);
    return () => {};
  }
  let constraints = [orderBy(orderField, 'desc')];
  if (opts.limit) constraints.push(limit(opts.limit));
  const q = query(collection(database, collectionName), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      list.push({ firebaseId: doc.id, ...normalizeTimestamps(doc.data()) });
    });
    callback(list);
  }, (error) => {
    console.warn(`[Firebase] Gagal baca ${collectionName}:`, error);
    callback(null);
  });
};

const createAdder = (collectionName) => async (data) => {
  const database = initFirebase();
  if (!database) return null;
  try {
    const docRef = await addDoc(collection(database, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      firebaseSavedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (e) {
    console.warn(`[Firebase] Gagal simpan ${collectionName}:`, e);
    return null;
  }
};

const createUpdater = (collectionName) => async (firebaseId, updates) => {
  const database = initFirebase();
  if (!database) return;
  try {
    await updateDoc(doc(database, collectionName, firebaseId), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn(`[Firebase] Gagal update ${collectionName}:`, e);
  }
};

const createDeleter = (collectionName) => async (firebaseId) => {
  const database = initFirebase();
  if (!database) return;
  try {
    await deleteDoc(doc(database, collectionName, firebaseId));
  } catch (e) {
    console.warn(`[Firebase] Gagal hapus ${collectionName}:`, e);
  }
};

const createLoader = (collectionName, orderField = 'createdAt') => async () => {
  const database = initFirebase();
  if (!database) return null;
  try {
    const q = query(collection(database, collectionName), orderBy(orderField, 'desc'));
    const snapshot = await getDocs(q);
    const list = [];
    snapshot.forEach((doc) => {
      list.push({ firebaseId: doc.id, ...normalizeTimestamps(doc.data()) });
    });
    return list;
  } catch (e) {
    console.warn(`[Firebase] Gagal load ${collectionName}:`, e);
    return null;
  }
};

// ─── Complaints ───
export const subscribeComplaints = (callback, opts = {}) =>
  createSubscriber('complaints', callback, 'createdAt', opts);

export const addComplaintToFirestore = createAdder('complaints');

export const updateComplaintInFirestore = createUpdater('complaints');

export const loadAllComplaintsFromFirestore = createLoader('complaints');

// ─── Patrol Reports ───
export const subscribeReports = (callback, opts = {}) =>
  createSubscriber('patrol_reports', callback, 'timestamp', opts);

export const addReportToFirestore = createAdder('patrol_reports');

export const updateReportInFirestore = createUpdater('patrol_reports');

export const deleteReportFromFirestore = createDeleter('patrol_reports');

// ─── Findings ───
export const subscribeFindings = (callback, opts = {}) =>
  createSubscriber('findings', callback, 'createdAt', opts);

export const addFindingToFirestore = createAdder('findings');

export const updateFindingInFirestore = createUpdater('findings');

// ─── Attendance Logs ───
export const subscribeAttendanceLogs = (callback, opts = {}) =>
  createSubscriber('attendance_logs', callback, 'tanggal', opts);

export const addAttendanceLogToFirestore = createAdder('attendance_logs');

export const updateAttendanceLogInFirestore = createUpdater('attendance_logs');

// ─── Mutasi Logs ───
export const subscribeMutasiLogs = (callback, opts = {}) =>
  createSubscriber('mutasi_logs', callback, 'createdAt', opts);

export const addMutasiLogToFirestore = createAdder('mutasi_logs');

export const updateMutasiLogInFirestore = createUpdater('mutasi_logs');

export const deleteMutasiLogFromFirestore = createDeleter('mutasi_logs');

// ─── Users ───
export const subscribeUsers = (callback, opts = {}) =>
  createSubscriber('users', callback, 'nrp', opts);

export const addUserToFirestore = createAdder('users');

export const updateUserInFirestore = createUpdater('users');

export const deleteUserFromFirestore = createDeleter('users');

export const resetUsersInFirestore = async (defaultUsers) => {
  const database = initFirebase();
  if (!database) return false;
  try {
    const q = query(collection(database, 'users'));
    const snapshot = await getDocs(q);
    const deletePromises = [];
    snapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(docSnapshot.ref));
    });
    await Promise.all(deletePromises);

    const addPromises = defaultUsers.map(async (u) => {
      const { firebaseId, ...userData } = u;
      const docRef = await addDoc(collection(database, 'users'), {
        ...userData,
        createdAt: serverTimestamp(),
        firebaseSavedAt: serverTimestamp()
      });
      return docRef.id;
    });
    await Promise.all(addPromises);
    return true;
  } catch (e) {
    console.warn('[Firebase] Gagal reset users:', e);
    return false;
  }
};

// ─── Areas / Checkpoints ───
export const subscribeAreas = (callback, opts = {}) =>
  createSubscriber('areas', callback, 'createdAt', opts);

export const addAreaToFirestore = createAdder('areas');

export const updateAreaInFirestore = createUpdater('areas');

export const deleteAreaFromFirestore = createDeleter('areas');

export const clearAllPatrolDataInFirestore = async () => {
  const database = initFirebase();
  if (!database) return false;
  const collections = ['patrol_reports', 'findings', 'mutasi_logs', 'attendance_logs', 'complaints'];
  try {
    for (const collName of collections) {
      const q = query(collection(database, collName));
      const snapshot = await getDocs(q);
      const deletePromises = [];
      snapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(docSnapshot.ref));
      });
      await Promise.all(deletePromises);
    }
    return true;
  } catch (e) {
    console.warn('[Firebase] Gagal membersihkan data:', e);
    return false;
  }
};

// ─── Roster (per-month document upsert) ───
export const saveRosterToFirestore = async (yearMonth, rosterData, userId) => {
  const database = initFirebase();
  if (!database) return false;
  try {
    const ref = doc(database, 'rosters', yearMonth);
    await setDoc(ref, {
      rosterData,
      yearMonth,
      updatedAt: new Date().toISOString(),
      updatedBy: userId || 'unknown'
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('[Firebase] Gagal simpan roster:', e);
    return false;
  }
};

export const loadRosterFromFirestore = async (yearMonth) => {
  const database = initFirebase();
  if (!database) return null;
  try {
    const ref = doc(database, 'rosters', yearMonth);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data().rosterData || {};
    }
    return null;
  } catch (e) {
    console.warn('[Firebase] Gagal baca roster:', e);
    return null;
  }
};

export const subscribeRoster = (yearMonth, callback) => {
  const database = initFirebase();
  if (!database) { callback(null); return () => {}; }
  const ref = doc(database, 'rosters', yearMonth);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) callback(snap.data().rosterData || {});
    else callback(null);
  }, (error) => {
    console.warn(`[Firebase] Gagal subscribe roster ${yearMonth}:`, error);
    callback(null);
  });
};

export const deleteOldDataInFirestore = async (olderThanDays = 90) => {
  const database = initFirebase();
  if (!database) return { success: false, count: 0 };
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const cutoffStr = cutoff.toISOString();
  const collections = [
    { name: 'patrol_reports', dateField: 'timestamp' },
    { name: 'findings', dateField: 'createdAt' },
    { name: 'mutasi_logs', dateField: 'createdAt' },
    { name: 'attendance_logs', dateField: 'tanggal' },
    { name: 'complaints', dateField: 'createdAt' }
  ];
  let totalDeleted = 0;
  try {
    for (const { name, dateField } of collections) {
      const allDocs = await getDocs(collection(database, name));
      const deletePromises = [];
      allDocs.forEach((docSnap) => {
        const data = docSnap.data();
        const dateVal = data[dateField];
        if (dateVal) {
          const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
          if (d < cutoff) {
            deletePromises.push(deleteDoc(docSnap.ref));
          }
        }
      });
      const results = await Promise.allSettled(deletePromises);
      totalDeleted += results.filter(r => r.status === 'fulfilled').length;
    }
    return { success: true, count: totalDeleted };
  } catch (e) {
    console.warn('[Firebase] Gagal hapus data lama:', e);
    return { success: false, count: totalDeleted };
  }
};

// ─── Pos List / Checkpoints ───
export const subscribePosList = (callback, opts = {}) =>
  createSubscriber('pos_list', callback, 'createdAt', opts);

export const addPosToFirestore = createAdder('pos_list');

export const updatePosInFirestore = createUpdater('pos_list');

export const deletePosFromFirestore = createDeleter('pos_list');

// ─── WA Contacts (single doc in config collection) ───
export const subscribeWAContacts = (callback) => {
  const database = initFirebase();
  if (!database) { callback(null); return () => {}; }
  const ref = doc(database, 'config', 'wa_contacts');
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) callback(snap.data());
    else callback(null);
  }, (error) => {
    console.warn('[Firebase] Gagal subscribe WA contacts:', error);
    callback(null);
  });
};

export const saveWAContactsToFirestore = async (contacts) => {
  const database = initFirebase();
  if (!database) return false;
  try {
    const ref = doc(database, 'config', 'wa_contacts');
    await setDoc(ref, {
      ...contacts,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('[Firebase] Gagal simpan WA contacts:', e);
    return false;
  }
};
