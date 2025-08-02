# Admin Tier Setup Guide

## 🔧 **Manual Admin Upgrade Process**

Since the admin tier is hidden from regular users, you'll need to manually set it in Firebase Firestore.

### **Method 1: Firebase Console (Recommended)**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database**
4. Find the user document: `users/{userId}`
5. Edit the document and add/update:
   ```javascript
   {
     "subscriptionTier": "admin",
     "adminUpgradeDate": new Date(),
     "adminUpgradedBy": "manual"
   }
   ```

### **Method 2: Using the Admin Function**

If you want to use the built-in function, you can create a temporary admin page or run this in the browser console:

```javascript
import { upgradeUserToAdmin } from './lib/subscriptions';

// Replace with the actual user ID
const userId = "USER_ID_HERE";
await upgradeUserToAdmin(userId);
```

### **Method 3: Firebase Admin SDK (Server-side)**

If you're using Firebase Admin SDK on the backend:

```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

async function makeUserAdmin(userId) {
  await db.collection('users').doc(userId).update({
    subscriptionTier: 'admin',
    adminUpgradeDate: admin.firestore.FieldValue.serverTimestamp(),
    adminUpgradedBy: 'manual'
  });
}
```

## 👑 **Admin Features**

Admins get:
- **Unlimited storage**
- **Unlimited images & videos**
- **Unlimited websites**
- **Unlimited file sizes**
- **All Pro features**
- **Special admin features**:
  - `adminPanel: true`
  - `userManagement: true`
  - `systemSettings: true`
  - `fullAccess: true`

## 🎯 **Admin UI Indicators**

- **MediaLibrary**: Shows 👑 Admin with "Unlimited Access" text
- **Dashboard**: Shows "Admin" tier with unlimited site limits
- **Storage Display**: Shows "Unlimited" for all limits

## 🔍 **Checking Admin Status**

```javascript
import { isUserAdmin } from './lib/subscriptions';

const isAdmin = await isUserAdmin(userId);
if (isAdmin) {
  // Show admin features
}
```

## ⚠️ **Security Notes**

- Admin tier is not exposed in any public UI
- No upgrade buttons or payments for admin tier
- Admin status must be manually set in Firebase
- Consider adding additional authentication checks for admin features
