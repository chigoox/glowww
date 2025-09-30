import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  query, 
  where, 
  collection, 
  getDocs 
} from '@/lib/firestoreDebug';
import { auth, googleProvider, db } from './firebase';

// Create user with email and password
export const createUser = async (email, password, username, fullName, phone = '') => {
  try {
    // Check if username already exists
    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
      throw new Error('Username already exists');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update user profile with display name
    await updateProfile(user, {
      displayName: fullName || username
    });

    // Store additional user data in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      username: username.toLowerCase(),
      fullName: fullName || username,
      phone: phone || '',
      createdAt: new Date().toISOString(),
      provider: 'email',
      subscription: {
        plan: 'free',
        status: 'active',
        sitesUsed: 0,
        maxSites: 1
      }
    });

    return user;
  } catch (error) {
    throw error;
  }
};

// Sign in with email and password
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign in with username and password
export const signInWithUsername = async (username, password) => {
  try {
    // Find user by username
    const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Username not found');
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    // Sign in with the email associated with the username
    const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user document exists, if not create one
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      // Generate a username from email or display name
      const username = generateUsernameFromEmail(user.email);
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        username: username,
        fullName: user.displayName || user.email.split('@')[0],
        phone: '',
        createdAt: new Date().toISOString(),
        provider: 'google',
        photoURL: user.photoURL,
        subscription: {
          plan: 'free',
          status: 'active',
          sitesUsed: 0,
          maxSites: 1
        }
      });
    }

    return user;
  } catch (error) {
    throw error;
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw error;
  }
};

// Check if username exists
export const checkUsernameExists = async (username) => {
  try {
    const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking username:', error);
    return false;
  }
};

// Generate username from email
const generateUsernameFromEmail = (email) => {
  const baseUsername = email.split('@')[0].toLowerCase();
  // Add random number to ensure uniqueness
  return `${baseUsername}${Math.floor(Math.random() * 1000)}`;
};

// Get user data
export const getUserData = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Update user data
export const updateUserData = async (uid, data) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating user data:', error);
    return false;
  }
};

// Update user editor settings
export const updateUserEditorSettings = async (uid, editorSettings) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { 
      editorSettings,
      editorSettingsUpdatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating editor settings:', error);
    return false;
  }
};

// Get user editor settings
export const getUserEditorSettings = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.editorSettings || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting editor settings:', error);
    return null;
  }
};

// Client-safe admin check (does not use Firebase Admin)
export const isAdmin = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.subscriptionTier === 'admin' || userData.isAdmin === true;
    }
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Client-safe stub functions (actual server functions are in serverAuth.js)
export const verifyAuth = () => {
  console.warn('verifyAuth should only be called from server-side code. Use serverAuth.js instead.');
  return { success: false, error: 'Client-side call not allowed' };
};

export const verifyIdToken = () => {
  console.warn('verifyIdToken should only be called from server-side code. Use serverAuth.js instead.');
  return { success: false, error: 'Client-side call not allowed' };
};
