import dotenv from "dotenv";
import type { Dialect } from "sequelize";

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number.parseInt(process.env.PORT ?? "8081", 10),
  jwt: {
    secret: process.env.JWT_SECRET ?? "changeme",
    expiresIn: undefined
    // expiresIn: process.env.JWT_EXPIRES_IN === "infinite" ? undefined : (process.env.JWT_EXPIRES_IN ?? "1h")
  },
  auth: {
    masterOtp: process.env.MASTER_OTP ?? "999999",
    otpExpiryMinutes: Number.parseInt(process.env.OTP_EXPIRY_MINUTES ?? "5", 10)
  },
  otp: {
    provider: process.env.OTP_PROVIDER ?? "bulk9",
    bulk9: {
      url: process.env.OTP_BULK9_URL ?? "https://bulk9.com/dev/bulkV2",
      apiKey: process.env.OTP_BULK9_API_KEY ?? "",
      senderId: process.env.OTP_BULK9_SENDER_ID ?? "",
      route: process.env.OTP_BULK9_ROUTE ?? "dlt",
      flash: process.env.OTP_BULK9_FLASH ?? "0",
      scheduleTime: process.env.OTP_BULK9_SCHEDULE_TIME ?? "",
      smsDetails: process.env.OTP_BULK9_SMS_DETAILS ?? "1",
      message: process.env.OTP_BULK9_MESSAGE ?? "0"
    }
  },
  database: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number.parseInt(process.env.DB_PORT ?? "3306", 10),
    name: process.env.DB_NAME ?? "feed_app",
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    dialect: (process.env.DB_DIALECT ?? "mysql") as Dialect
  },
  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "",
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? ""
  }
};

export default env;
