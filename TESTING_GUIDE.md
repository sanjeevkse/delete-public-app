# Firebase Push Notifications - Testing Checklist ✅

## Prerequisites Before Testing

### 1. ✅ Firebase Setup

- [ ] Firebase project created at https://console.firebase.google.com/
- [ ] Service account JSON key downloaded
- [ ] Service account JSON path added to `.env` file

### 2. ✅ Environment Configuration

Add to your `.env` file:

```env
# Option 1: File path
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/your/serviceAccountKey.json

# OR Option 2: JSON string
# FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

### 3. ✅ Database Setup

- [ ] MySQL database running
- [ ] `tbl_user` table exists (required for foreign key)
- [ ] Server started successfully (auto-creates `tbl_device_token` table)

### 4. ✅ Get Your JWT Token

Login to get a valid JWT token:

```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "your_phone",
    "otp": "your_otp"
  }'
```

Copy the token from the response.

---

## Testing Steps

### Step 1: Start the Server

```bash
cd "/Users/sanjeev/project/anna/Public App/public-app-node"
npm run dev
```

**Expected Output:**

```
Database connection established
tbl_device_token table created successfully or already exists
Firebase initialized (or warning if not configured)
Server ready on port 8081
```

### Step 2: Open Test Portal

Open browser: **http://localhost:8081/firebase-test**

### Step 3: Setup Authentication

1. Paste your API base URL (default: `http://localhost:8081/api`)
2. Paste your JWT token from login
3. Click "💾 Save Token"
4. Should see: ✅ "Token saved successfully!"

### Step 4: Get a Test FCM Token

#### For Web (Quick Test):

You can use this dummy token for initial API testing:

```
dummy_fcm_token_for_testing_123456789
```

#### For Real Firebase Testing:

Set up Firebase in a web app:

```html
<!-- Add to a test HTML file -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import {
    getMessaging,
    getToken
  } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  getToken(messaging, { vapidKey: "YOUR_VAPID_KEY" }).then((currentToken) => {
    console.log("FCM Token:", currentToken);
    alert("Token: " + currentToken);
  });
</script>
```

### Step 5: Register Device Token

1. Paste FCM token in "📱 Register Device Token" section
2. Add Device ID (optional): `test_device_1`
3. Select Platform: `web` or `android` or `ios`
4. Click "✅ Register Token"
5. Should see: ✅ "Device token registered successfully!"

### Step 6: View Your Tokens

1. Click "🔄 Refresh Tokens" in "📋 My Device Tokens"
2. Should see your registered token(s) listed

### Step 7: Test Sending Notification to User

1. Go to "📤 Send to User" section
2. Enter Target User ID (your user ID from login)
3. Title: `Test Notification`
4. Body: `This is a test message from Firebase!`
5. Custom Data (optional): `{"type": "test", "id": "123"}`
6. Click "🚀 Send Notification"
7. Should see: ✅ "Notification sent successfully!"
8. Response shows `successCount` and `failureCount`

### Step 8: Test Multiple Users (Optional)

1. Go to "📤 Send to Multiple Users"
2. User IDs: `1, 2, 3` (comma-separated)
3. Add Title and Body
4. Click "🚀 Send to All"

### Step 9: Test Topics (Optional)

1. Go to "🏷️ Topic Management"
2. Topic Name: `news`
3. Click "➕ Subscribe to Topic"
4. Then try "🚀 Send to Topic"

---

## Common Issues & Solutions

### ❌ "Unauthorized" Error

**Problem:** JWT token is invalid or expired
**Solution:**

- Login again to get a fresh token
- Make sure you copied the complete token
- Check token format: should start with `eyJ`

### ❌ "Firebase has not been initialized"

**Problem:** Firebase credentials not configured
**Solution:**

- Check `.env` file has `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON`
- Verify the path to service account JSON is correct
- Restart the server after adding credentials

### ❌ "No active device tokens found"

**Problem:** No tokens registered for the user
**Solution:**

- First register a device token in Step 5
- Check the user ID matches your logged-in user

### ❌ Database/Table Errors

**Problem:** `tbl_device_token` table doesn't exist
**Solution:**

- Check server logs on startup
- Manually run: `mysql -u user -p database < sql/create_device_tokens_table.sql`
- Verify `tbl_user` table exists (foreign key requirement)

### ❌ CORS Errors in Browser

**Problem:** Browser blocking requests
**Solution:**

- Server already has CORS enabled
- Make sure API URL in test portal matches your server
- Check browser console for specific error

### ❌ "Failed to send notification" with Firebase

**Problem:** Invalid FCM token or Firebase not properly configured
**Solution:**

- For initial testing, just check if API responds (ignore Firebase errors)
- For real notifications, ensure you have a valid FCM token from a real device/web app
- Check Firebase Console for delivery logs

---

## Testing Without Real Firebase (API Only)

You can test the API endpoints work correctly even without Firebase configured:

1. ✅ Register Token - Should save to database
2. ✅ Get Tokens - Should retrieve from database
3. ✅ Unregister Token - Should update database
4. ❌ Send Notification - Will fail without Firebase, but API validates input

The database operations will work fine. Actual notification sending requires Firebase credentials.

---

## Quick Verification Commands

### Check if table exists:

```bash
mysql -u your_user -p -e "SHOW TABLES LIKE 'tbl_device_token';" your_database
```

### Check registered tokens:

```bash
mysql -u your_user -p -e "SELECT * FROM tbl_device_token;" your_database
```

### Test API directly:

```bash
# Register token
curl -X POST http://localhost:8081/api/notifications/tokens/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "token": "test_fcm_token_123",
    "platform": "web"
  }'

# Get tokens
curl -X GET http://localhost:8081/api/notifications/tokens \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Expected Test Results ✅

| Test            | Expected Result                                      |
| --------------- | ---------------------------------------------------- |
| Server Start    | ✅ "tbl_device_token table created successfully"     |
| Open Portal     | ✅ Page loads with purple gradient UI                |
| Save Token      | ✅ "Token saved successfully!"                       |
| Register Device | ✅ "Device token registered successfully!"           |
| Get Tokens      | ✅ Shows list of registered tokens                   |
| Send to User    | ✅ "Notification sent successfully!" (with Firebase) |
| Topics          | ✅ "Subscribed successfully!"                        |

---

## Next Steps After Testing

1. **Mobile Integration:** Integrate FCM in your iOS/Android app
2. **Production Setup:** Use `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable
3. **Permissions:** Add authorization middleware for admin-only notification endpoints
4. **Cleanup:** Schedule job to remove inactive/expired tokens
5. **Monitoring:** Track notification delivery rates in Firebase Console

---

Happy Testing! 🚀

If you encounter any issues, check the server logs first - they will show detailed error messages.
