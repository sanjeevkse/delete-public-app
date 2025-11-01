# ⚠️ CRITICAL: Database Migration Policy

## 🤖 INSTRUCTIONS FOR GITHUB COPILOT / AI ASSISTANTS

**READ THIS BEFORE ANY DATABASE WORK:**

This project **NEVER** uses Sequelize CLI migrations. When working with MySQL/database:

1. ❌ **NEVER create migration files**
2. ❌ **NEVER run `npx sequelize-cli` commands**
3. ❌ **NEVER suggest migration-based solutions**
4. ✅ **ALWAYS provide raw SQL queries**
5. ✅ **ALWAYS ask user to run SQL manually in their database client**

---

## DO NOT USE SEQUELIZE MIGRATIONS IN THIS REPO

**This project does NOT use Sequelize CLI migrations.**

### ❌ Never Do This:

```bash
# DO NOT RUN THESE COMMANDS
npx sequelize-cli db:migrate
npx sequelize-cli db:migrate:undo
npx sequelize-cli migration:generate
npx sequelize-cli migration:create
```

### ✅ Instead, Use Raw SQL Queries

All database schema changes must be done using **raw SQL queries** directly in your database client.

#### For Telescope Setup:

Run these SQL queries directly in your MySQL/MariaDB client:

```sql
-- Create telescope_requests table
CREATE TABLE IF NOT EXISTS `telescope_requests` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `method` VARCHAR(10) NOT NULL,
  `path` VARCHAR(500) NOT NULL,
  `fullUrl` TEXT NOT NULL,
  `statusCode` INT NOT NULL,
  `duration` INT NOT NULL COMMENT 'Duration in milliseconds',
  `ipAddress` VARCHAR(45) DEFAULT NULL,
  `userAgent` TEXT,
  `headers` JSON NOT NULL,
  `queryParams` JSON NOT NULL,
  `bodyParams` JSON NOT NULL,
  `responseBody` JSON,
  `responseHeaders` JSON,
  `userId` INT UNSIGNED DEFAULT NULL,
  `exceptionId` INT UNSIGNED DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `telescope_requests_uuid` (`uuid`),
  INDEX `telescope_requests_method` (`method`),
  INDEX `telescope_requests_status_code` (`statusCode`),
  INDEX `telescope_requests_created_at` (`createdAt`),
  INDEX `telescope_requests_user_id` (`userId`),
  INDEX `telescope_requests_exception_id` (`exceptionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create telescope_exceptions table
CREATE TABLE IF NOT EXISTS `telescope_exceptions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `type` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `code` VARCHAR(50) DEFAULT NULL,
  `file` TEXT,
  `line` INT DEFAULT NULL,
  `stackTrace` LONGTEXT,
  `context` JSON,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `telescope_exceptions_uuid` (`uuid`),
  INDEX `telescope_exceptions_type` (`type`),
  INDEX `telescope_exceptions_created_at` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Why Raw SQL?

1. **Direct Control** - Full control over schema changes
2. **No Migration Files** - Cleaner repository without migration clutter
3. **Flexibility** - Easier to modify and rollback
4. **Consistency** - Single source of truth in your database

### How to Apply Schema Changes

1. Open your MySQL/MariaDB client (MySQL Workbench, phpMyAdmin, CLI, etc.)
2. Select your database
3. Copy and paste the SQL query
4. Execute the query
5. Verify the tables were created

### Verifying Tables

```sql
-- Check if tables exist
SHOW TABLES LIKE 'telescope%';

-- Check table structure
DESCRIBE telescope_requests;
DESCRIBE telescope_exceptions;

-- Check indexes
SHOW INDEX FROM telescope_requests;
SHOW INDEX FROM telescope_exceptions;
```

### For Other Schema Changes

Always use raw SQL queries for:

- Creating tables
- Altering tables
- Adding columns
- Creating indexes
- Dropping tables
- Any other schema modifications

### Important Notes

- ⚠️ The `migrations/` folder should be **ignored** or **deleted**
- ⚠️ The `setup-telescope.sh` script should **NOT be used** (it runs migrations)
- ✅ Always test queries in development first
- ✅ Keep a backup of production data before schema changes
- ✅ Document schema changes in your project documentation

---

## 📋 Quick Reference for AI Assistants

**When user requests database changes:**

1. Provide the raw SQL query
2. Tell user to run it in their MySQL client
3. Do NOT create migration files
4. Do NOT run sequelize-cli commands
5. Do NOT suggest migration-based workflows

**Example Response:**

```
Here's the SQL query to create the table. Please run this directly in your MySQL client:

CREATE TABLE ...

Do NOT run migrations - use raw SQL as per DATABASE_POLICY.md
```

---

**Remember: Raw SQL queries only. No Sequelize CLI migrations. Ever.**

**This is a standing instruction for all AI assistants working on this project.**
