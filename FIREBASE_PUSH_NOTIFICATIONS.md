# Firebase Push Notification Integration

This document explains how to use the Firebase push notification integration in your application.

## Setup

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Navigate to Project Settings > Service Accounts
4. Click "Generate New Private Key" to download your service account JSON file

### 2. Environment Configuration

Add one of the following to your `.env` file:

**Option 1: Using file path (recommended for local development)**

```env
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/your/serviceAccountKey.json
```

**Option 2: Using JSON string (recommended for production/cloud deployment)**

```env
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project-id",...}'
```

### 3. Database Setup

The `tbl_device_token` table will be **automatically created** when you start the server. Alternatively, you can run the SQL script manually:

```bash
mysql -u your_user -p your_database < sql/create_device_tokens_table.sql
```

Or execute the raw SQL directly in your database:

````sql
CREATE TABLE IF NOT EXISTS `tbl_device_token` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `token` VARCHAR(500) NOT NULL UNIQUE,
  `device_id` VARCHAR(255) DEFAULT NULL,
  `platform` ENUM('ios', 'android', 'web') DEFAULT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `last_used_at` DATETIME DEFAULT NULL,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_by` BIGINT UNSIGNED DEFAULT NULL,
  `updated_by` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT `fk_device_token_user_id`
    FOREIGN KEY (`user_id`)
    REFERENCES `tbl_user` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```## API Endpoints

All notification endpoints are prefixed with `/api/notifications` and require authentication.

### Device Token Management

#### Register Device Token

**POST** `/api/notifications/tokens/register`

Register a device FCM token for push notifications.

**Request Body:**

```json
{
  "token": "fcm_device_token_here",
  "deviceId": "unique_device_identifier (optional)",
  "platform": "ios | android | web (optional)"
}
````

**Response:**

```json
{
  "success": true,
  "message": "Device token registered successfully",
  "data": {
    "id": 1,
    "userId": 123,
    "token": "fcm_device_token_here",
    "deviceId": "unique_device_identifier",
    "platform": "android",
    "isActive": true,
    "lastUsedAt": "2024-11-11T10:30:00.000Z"
  }
}
```

#### Unregister Device Token

**POST** `/api/notifications/tokens/unregister`

Deactivate a device token (e.g., when user logs out).

**Request Body:**

```json
{
  "token": "fcm_device_token_here"
}
```

#### Get Device Tokens

**GET** `/api/notifications/tokens`

Get all active device tokens for the authenticated user.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "deviceId": "device_1",
      "platform": "android",
      "lastUsedAt": "2024-11-11T10:30:00.000Z",
      "createdAt": "2024-11-01T08:00:00.000Z"
    }
  ]
}
```

### Sending Notifications

#### Send to Single User

**POST** `/api/notifications/send/user`

Send a notification to all devices of a specific user.

**Request Body:**

```json
{
  "userId": 123,
  "title": "New Message",
  "body": "You have a new message from John",
  "data": {
    "type": "message",
    "messageId": "456"
  },
  "imageUrl": "https://example.com/image.png (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Notification sent successfully",
  "data": {
    "successCount": 2,
    "failureCount": 0
  }
}
```

#### Send to Multiple Users

**POST** `/api/notifications/send/users`

Send a notification to multiple users at once.

**Request Body:**

```json
{
  "userIds": [123, 456, 789],
  "title": "Event Reminder",
  "body": "Your event starts in 1 hour",
  "data": {
    "type": "event",
    "eventId": "event_123"
  }
}
```

#### Send to Topic

**POST** `/api/notifications/send/topic`

Send a notification to all users subscribed to a topic.

**Request Body:**

```json
{
  "topic": "news",
  "title": "Breaking News",
  "body": "Important update available",
  "data": {
    "type": "news",
    "articleId": "news_456"
  }
}
```

### Topic Subscriptions

#### Subscribe to Topic

**POST** `/api/notifications/topics/subscribe`

Subscribe the authenticated user's devices to a topic.

**Request Body:**

```json
{
  "topic": "news"
}
```

#### Unsubscribe from Topic

**POST** `/api/notifications/topics/unsubscribe`

Unsubscribe the authenticated user's devices from a topic.

**Request Body:**

```json
{
  "topic": "news"
}
```

## Usage in Code

### Sending Notifications Programmatically

You can use the notification service directly in your code:

```typescript
import notificationService from "./services/notificationService";
import DeviceToken from "./models/DeviceToken";

// Send to a specific device token
await notificationService.sendToDevice({
  token: "device_fcm_token",
  notification: {
    title: "Hello",
    body: "Welcome to our app!",
    data: { customKey: "customValue" }
  }
});

// Send to multiple devices
const userTokens = await DeviceToken.findAll({
  where: { userId: 123, isActive: true }
});

await notificationService.sendToMultipleDevices({
  tokens: userTokens.map((t) => t.token),
  notification: {
    title: "Bulk Notification",
    body: "This goes to all your devices"
  }
});

// Send to a topic
await notificationService.sendToTopic("general", {
  title: "Topic Notification",
  body: "All subscribers will receive this"
});
```

### Integrating with Events

You can trigger notifications based on application events:

```typescript
// Example: Send notification when a new post is created
import notificationService from "./services/notificationService";
import DeviceToken from "./models/DeviceToken";

async function notifyFollowers(userId: number, postContent: string) {
  // Get follower user IDs (example)
  const followerIds = await getFollowerIds(userId);

  // Get all device tokens
  const tokens = await DeviceToken.findAll({
    where: {
      userId: { [Op.in]: followerIds },
      isActive: true
    }
  });

  // Send notification
  await notificationService.sendToMultipleDevices({
    tokens: tokens.map((t) => t.token),
    notification: {
      title: "New Post",
      body: postContent,
      data: { type: "post", userId: userId.toString() }
    }
  });
}
```

## Client-Side Integration

### Android (Kotlin/Java)

1. Add Firebase to your Android app
2. Get the FCM token:

```kotlin
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        // Send token to your backend
        registerToken(token)
    }
}
```

### iOS (Swift)

1. Add Firebase to your iOS app
2. Get the FCM token:

```swift
Messaging.messaging().token { token, error in
    if let token = token {
        // Send token to your backend
        registerToken(token)
    }
}
```

### React Native

```javascript
import messaging from "@react-native-firebase/messaging";

async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    const token = await messaging().getToken();
    // Send token to your backend
    await registerToken(token);
  }
}
```

## Database Schema

### tbl_device_token Table

| Column       | Type         | Description                         |
| ------------ | ------------ | ----------------------------------- |
| id           | BIGINT       | Primary key                         |
| user_id      | BIGINT       | Foreign key to tbl_user table       |
| token        | VARCHAR(500) | FCM device token (unique)           |
| device_id    | VARCHAR(255) | Optional device identifier          |
| platform     | ENUM         | ios, android, or web                |
| is_active    | BOOLEAN      | Whether token is active             |
| last_used_at | DATETIME     | Last time notification was sent     |
| status       | TINYINT      | Status (1=active, 0=inactive)       |
| created_by   | BIGINT       | User ID who created the record      |
| updated_by   | BIGINT       | User ID who last updated the record |
| created_at   | DATETIME     | When token was registered           |
| updated_at   | DATETIME     | Last update time                    |

## Best Practices

1. **Token Management**: Always unregister tokens when users log out
2. **Error Handling**: Invalid tokens are automatically identified by Firebase - consider cleaning them up periodically
3. **Payload Size**: Keep notification data under 4KB
4. **User Preferences**: Consider adding a user preferences table to manage notification settings
5. **Rate Limiting**: Be mindful of notification frequency to avoid user fatigue
6. **Testing**: Use Firebase Console to send test notifications during development

### Troubleshooting

### Firebase not initialized

- Ensure `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON` is set
- Check that the service account JSON is valid

### Notifications not received

- Verify the device token is registered and active
- Check Firebase Console for delivery status
- Ensure the mobile app has notification permissions enabled
- Verify the FCM token is valid and not expired

### Database errors

### Database errors

- The `tbl_device_token` table is created automatically on server startup
- If manual creation is needed, run: `mysql -u user -p database < sql/create_device_tokens_table.sql`
- Check foreign key constraints with the tbl_user table (ensure tbl_user table exists)

## Security Considerations

1. **Service Account**: Keep your Firebase service account JSON secure - never commit to version control
2. **Authorization**: Add proper authorization middleware for sending notifications (admin-only endpoints)
3. **Rate Limiting**: Implement rate limiting for notification sending endpoints
4. **Data Validation**: Always validate notification payload data

## Example .env File

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret

# Firebase (choose one method)
# Method 1: File path
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json

# Method 2: JSON string (for production)
# FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```
