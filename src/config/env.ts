import dotenv from "dotenv";
import type { Dialect } from "sequelize";

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number.parseInt(process.env.PORT ?? "8081", 10),
  lensPort: Number.parseInt(process.env.LENS_PORT ?? "8082", 10),
  jwt: {
    secret: process.env.JWT_SECRET ?? "changeme",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "1h"
  },
  auth: {
    masterOtp: process.env.MASTER_OTP ?? "999999",
    otpExpiryMinutes: Number.parseInt(process.env.OTP_EXPIRY_MINUTES ?? "5", 10)
  },
  database: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number.parseInt(process.env.DB_PORT ?? "3306", 10),
    name: process.env.DB_NAME ?? "feed_app",
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    dialect: (process.env.DB_DIALECT ?? "mysql") as Dialect
  }
};

export default env;
