# Firebase Setup Guide for Glow Authentication

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `glow-website-builder`
4. Enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In your Firebase project, go to **Authentication** → **Sign-in method**
2. Enable these providers:
   - **Email/Password**: Enable both Email/password and Email link
   - **Google**: Enable and configure
3. Click "Save"

## 3. Set up Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Choose "Start in test mode" (you can change this later)
3. Select a location for your database
4. Click "Done"

## 4. Configure Web App

1. Go to **Project Settings** (gear icon) → **General** tab
2. Scroll down to "Your apps" and click the web icon `</>`
3. Register your app with nickname: `glow-web`
4. Copy the Firebase configuration object

## 5. Update Firebase Config

Replace the placeholder values in `lib/firebase.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## 6. Add Video Background (Optional)

1. Add your video file to `public/videos/auth-background.mp4`
2. Add a poster image to `public/images/auth-poster.jpg`
3. The VideoBackground component will automatically use these files

## 7. Security Rules for Firestore

Go to **Firestore Database** → **Rules** and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to read usernames for validation (but not other user data)
    match /users/{userId} {
      allow read: if request.auth != null && resource.data.keys().hasOnly(['username']);
    }
  }
}
```

## 8. Test Authentication

1. Start your development server: `npm run dev`
2. Navigate to `/Login` or `/Signup` 
3. Test registration with email/password
4. Test Google sign-in
5. Test username login

## 9. Features Included

✅ **Email/Password Authentication**
- User registration with email validation
- Secure password requirements (min 6 characters)
- Password reset functionality

✅ **Username Support**
- Users can sign in with username or email
- Username uniqueness validation
- Automatic username generation for Google users

✅ **Google Authentication**
- One-click Google sign-in
- Automatic user profile creation
- Seamless integration with existing accounts

✅ **Video Background Template**
- Ready-to-use VideoBackground component
- Fallback gradient background
- Optimized for mobile and desktop

✅ **User Management**
- User data stored in Firestore
- Authentication state management
- Secure user session handling

## 10. Next Steps

- Add user profile management
- Implement role-based access
- Add email verification
- Set up production security rules
- Add analytics and monitoring

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify Firebase configuration
3. Ensure Firestore security rules are correct
4. Test with different browsers/devices
