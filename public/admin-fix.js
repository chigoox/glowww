// Admin Subscription Fix Script
// Run this in your browser console while logged into the app

console.log('🔧 Starting admin subscription fix...');

// Check if user is logged in
if (typeof firebase === 'undefined' || !firebase.auth().currentUser) {
  console.error('❌ Firebase not available or user not logged in!');
  console.log('Please make sure you are:');
  console.log('1. Logged into the app');
  console.log('2. Have Firebase initialized');
  alert('Please log in to the app first, then run this script again.');
} else {
  console.log('✅ User is logged in:', firebase.auth().currentUser.email);
  
  // Get auth token and call fix API
  firebase.auth().currentUser.getIdToken().then(token => {
    console.log('🔑 Got auth token, calling fix API...');
    
    return fetch('/api/fix-admin-subscription', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  })
  .then(response => response.json())
  .then(data => {
    console.log('📋 Fix API response:', data);
    
    if (data.success) {
      console.log('✅ SUCCESS: Admin subscription fixed!');
      console.log('Before:', data.before);
      console.log('After:', data.after);
      
      alert(`✅ Admin subscription fixed successfully!\n\nBefore: subscriptionTier = "${data.before.subscriptionTier}"\nAfter: subscriptionTier = "${data.after.subscriptionTier}"\n\nPlease refresh the page to see changes.`);
      
      // Auto-refresh page
      setTimeout(() => {
        location.reload();
      }, 2000);
    } else {
      console.error('❌ Fix failed:', data.message);
      alert('❌ Fix failed: ' + data.message);
    }
  })
  .catch(error => {
    console.error('❌ Error calling fix API:', error);
    alert('❌ Error: ' + error.message);
  });
}