import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Client, Risco, Corte } from '../types';

let app;
let auth: any;
let db: any;

try {
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    throw new Error('Configuração do Firebase ausente no firebase-applet-config.json');
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  
  // Garantir persistência local para evitar loops de login
  setPersistence(auth, browserLocalPersistence).catch(console.error);
  
  console.log('Firebase inicializado com sucesso');
} catch (error) {
  console.error('Erro ao inicializar Firebase:', error);
  // Fallback para evitar crash total nos imports
  auth = { onAuthStateChanged: () => () => {}, isDummy: true };
  db = { isDummy: true };
}

export { auth, db };

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

export const loginWithEmail = (email: string, pass: string) => 
  signInWithEmailAndPassword(auth, email, pass);

export const registerWithEmail = async (email: string, pass: string, name: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(userCredential.user, { displayName: name });
  return userCredential.user;
};

export const logout = () => signOut(auth);

// Error Handling helper
export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: any[];
  }
}

export const handleFirestoreError = (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) => {
  const user = auth.currentUser;
  const errorInfo: FirestoreErrorInfo = {
    error: error.message || 'Unknown error',
    operationType,
    path,
    authInfo: {
      userId: user?.uid || 'none',
      email: user?.email || 'none',
      emailVerified: user?.emailVerified || false,
      isAnonymous: user?.isAnonymous || false,
      providerInfo: user?.providerData.map(p => ({ providerId: p.providerId, displayName: p.displayName, email: p.email })) || []
    }
  };
  console.error("Firestore Error:", errorInfo);
  throw new Error(JSON.stringify(errorInfo));
};

// --- Test Connection ---
export async function testConnection() {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await getDocFromServer(doc(db, 'users', user.uid, 'test', 'connection'));
  } catch (error: any) {
    if (error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// --- Data Operations ---

export const ensureUserDoc = async (user: User) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Erro ao garantir documento do usuário:", error);
    // Não lançamos o erro aqui para não travar o login se as regras do Firestore
    // estiverem sendo restritivas demais no primeiro acesso do usuário.
  }
};

// Clients
export const subscribeClients = (userId: string, callback: (clients: Client[]) => void) => {
  const q = query(collection(db, 'users', userId, 'clients'));
  return onSnapshot(q, (snapshot) => {
    const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
    callback(clients);
  }, (error) => handleFirestoreError(error, 'list', `users/${userId}/clients`));
};

export const addClient = async (userId: string, client: Omit<Client, 'id'>) => {
  try {
    const id = Date.now().toString();
    await setDoc(doc(db, 'users', userId, 'clients', id), { ...client, id, userId });
  } catch (error) {
    handleFirestoreError(error, 'create', `users/${userId}/clients`);
  }
};

export const updateClient = async (userId: string, client: Client) => {
  try {
    await updateDoc(doc(db, 'users', userId, 'clients', client.id), { ...client });
  } catch (error) {
    handleFirestoreError(error, 'update', `users/${userId}/clients/${client.id}`);
  }
};

export const deleteClient = async (userId: string, clientId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'clients', clientId));
  } catch (error) {
    handleFirestoreError(error, 'delete', `users/${userId}/clients/${clientId}`);
  }
};

// Riscos
export const subscribeRiscos = (userId: string, callback: (riscos: Risco[]) => void) => {
  const q = query(collection(db, 'users', userId, 'riscos'));
  return onSnapshot(q, (snapshot) => {
    const riscos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Risco));
    callback(riscos);
  }, (error) => handleFirestoreError(error, 'list', `users/${userId}/riscos`));
};

export const addRisco = async (userId: string, risco: Omit<Risco, 'id'>) => {
  try {
    const id = Date.now().toString();
    await setDoc(doc(db, 'users', userId, 'riscos', id), { ...risco, id, userId });
  } catch (error) {
    handleFirestoreError(error, 'create', `users/${userId}/riscos`);
  }
};

export const deleteRisco = async (userId: string, riscoId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'riscos', riscoId));
  } catch (error) {
    handleFirestoreError(error, 'delete', `users/${userId}/riscos/${riscoId}`);
  }
};

// Cortes
export const subscribeCortes = (userId: string, callback: (cortes: Corte[]) => void) => {
  const q = query(collection(db, 'users', userId, 'cortes'));
  return onSnapshot(q, (snapshot) => {
    const cortes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Corte));
    callback(cortes);
  }, (error) => handleFirestoreError(error, 'list', `users/${userId}/cortes`));
};

export const addCorte = async (userId: string, corte: Omit<Corte, 'id'>) => {
  try {
    const id = Date.now().toString();
    await setDoc(doc(db, 'users', userId, 'cortes', id), { ...corte, id, userId });
  } catch (error) {
    handleFirestoreError(error, 'create', `users/${userId}/cortes`);
  }
};

export const deleteCorte = async (userId: string, corteId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'cortes', corteId));
  } catch (error) {
    handleFirestoreError(error, 'delete', `users/${userId}/cortes/${corteId}`);
  }
};
