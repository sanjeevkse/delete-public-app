# Firebase Push Notifications - Quick Setup

## 1. Install Dependencies

```bash
npm install
```

_(firebase-admin already added to package.json)_

## 2. Configure Firebase

Add to `.env`:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
```

## 3. Database Setup

**Automatic:** The table is created automatically when you start the server.

**Manual (if needed):**

```bash
mysql -u your_user -p your_database < sql/create_device_tokens_table.sql
```

## 4. Start Server

```bash
npm run dev
```

## 5. Access Test Portal

Open your browser and navigate to:

```
http://localhost:8081/firebase-test
```

This provides a web interface to:

- Register device tokens
- View your registered tokens
- Send test notifications to users
- Send notifications to multiple users
- Manage topic subscriptions
- Send notifications to topics

## Quick Test

### Register a device token:

```bash
curl -X POST http://localhost:8081/api/notifications/tokens/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "token": "your_fcm_device_token",
    "platform": "android"
  }'
```

### Send a test notification:

```bash
curl -X POST http://localhost:8081/api/notifications/send/user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": 1,
    "title": "Test Notification",
    "body": "This is a test message"
  }'
```

## API Endpoints

- `POST /api/notifications/tokens/register` - Register device
- `POST /api/notifications/tokens/unregister` - Unregister device
- `GET /api/notifications/tokens` - Get user's tokens
- `POST /api/notifications/send/user` - Send to one user
- `POST /api/notifications/send/users` - Send to multiple users
- `POST /api/notifications/send/topic` - Send to topic
- `POST /api/notifications/topics/subscribe` - Subscribe to topic
- `POST /api/notifications/topics/unsubscribe` - Unsubscribe from topic

See **FIREBASE_PUSH_NOTIFICATIONS.md** for complete documentation.
