-- MySQL dump 10.13  Distrib 8.0.44, for macos15 (arm64)
--
-- Host: 127.0.0.1    Database: transactplus
-- ------------------------------------------------------
-- Server version	9.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `auth_group`
--

DROP TABLE IF EXISTS `auth_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group`
--

LOCK TABLES `auth_group` WRITE;
/*!40000 ALTER TABLE `auth_group` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_group_permissions`
--

DROP TABLE IF EXISTS `auth_group_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group_permissions`
--

LOCK TABLES `auth_group_permissions` WRITE;
/*!40000 ALTER TABLE `auth_group_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_permission`
--

DROP TABLE IF EXISTS `auth_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=113 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_permission`
--

LOCK TABLES `auth_permission` WRITE;
/*!40000 ALTER TABLE `auth_permission` DISABLE KEYS */;
INSERT INTO `auth_permission` VALUES (1,'Can add log entry',1,'add_logentry'),(2,'Can change log entry',1,'change_logentry'),(3,'Can delete log entry',1,'delete_logentry'),(4,'Can view log entry',1,'view_logentry'),(5,'Can add permission',2,'add_permission'),(6,'Can change permission',2,'change_permission'),(7,'Can delete permission',2,'delete_permission'),(8,'Can view permission',2,'view_permission'),(9,'Can add group',3,'add_group'),(10,'Can change group',3,'change_group'),(11,'Can delete group',3,'delete_group'),(12,'Can view group',3,'view_group'),(13,'Can add content type',4,'add_contenttype'),(14,'Can change content type',4,'change_contenttype'),(15,'Can delete content type',4,'delete_contenttype'),(16,'Can view content type',4,'view_contenttype'),(17,'Can add session',5,'add_session'),(18,'Can change session',5,'change_session'),(19,'Can delete session',5,'delete_session'),(20,'Can view session',5,'view_session'),(21,'Can add user',6,'add_user'),(22,'Can change user',6,'change_user'),(23,'Can delete user',6,'delete_user'),(24,'Can view user',6,'view_user'),(25,'Can add user email token',7,'add_useremailtoken'),(26,'Can change user email token',7,'change_useremailtoken'),(27,'Can delete user email token',7,'delete_useremailtoken'),(28,'Can view user email token',7,'view_useremailtoken'),(29,'Can add password reset token',8,'add_passwordresettoken'),(30,'Can change password reset token',8,'change_passwordresettoken'),(31,'Can delete password reset token',8,'delete_passwordresettoken'),(32,'Can view password reset token',8,'view_passwordresettoken'),(33,'Can add login attempt',9,'add_loginattempt'),(34,'Can change login attempt',9,'change_loginattempt'),(35,'Can delete login attempt',9,'delete_loginattempt'),(36,'Can view login attempt',9,'view_loginattempt'),(37,'Can add subscription plan',10,'add_subscriptionplan'),(38,'Can change subscription plan',10,'change_subscriptionplan'),(39,'Can delete subscription plan',10,'delete_subscriptionplan'),(40,'Can view subscription plan',10,'view_subscriptionplan'),(41,'Can add User Subscription',11,'add_usersubscription'),(42,'Can change User Subscription',11,'change_usersubscription'),(43,'Can delete User Subscription',11,'delete_usersubscription'),(44,'Can view User Subscription',11,'view_usersubscription'),(45,'Can add Usage Log',12,'add_usagelog'),(46,'Can change Usage Log',12,'change_usagelog'),(47,'Can delete Usage Log',12,'delete_usagelog'),(48,'Can view Usage Log',12,'view_usagelog'),(49,'Can add Usage Limit',13,'add_usagelimit'),(50,'Can change Usage Limit',13,'change_usagelimit'),(51,'Can delete Usage Limit',13,'delete_usagelimit'),(52,'Can view Usage Limit',13,'view_usagelimit'),(53,'Can add User Usage Stats',14,'add_userusagestats'),(54,'Can change User Usage Stats',14,'change_userusagestats'),(55,'Can delete User Usage Stats',14,'delete_userusagestats'),(56,'Can view User Usage Stats',14,'view_userusagestats'),(57,'Can add Trial Period',15,'add_trialperiod'),(58,'Can change Trial Period',15,'change_trialperiod'),(59,'Can delete Trial Period',15,'delete_trialperiod'),(60,'Can view Trial Period',15,'view_trialperiod'),(61,'Can add Trial Conversion Log',16,'add_trialconversionlog'),(62,'Can change Trial Conversion Log',16,'change_trialconversionlog'),(63,'Can delete Trial Conversion Log',16,'delete_trialconversionlog'),(64,'Can view Trial Conversion Log',16,'view_trialconversionlog'),(65,'Can add bank account',17,'add_bankaccount'),(66,'Can change bank account',17,'change_bankaccount'),(67,'Can delete bank account',17,'delete_bankaccount'),(68,'Can view bank account',17,'view_bankaccount'),(69,'Can add category',18,'add_category'),(70,'Can change category',18,'change_category'),(71,'Can delete category',18,'delete_category'),(72,'Can view category',18,'view_category'),(73,'Can add table configuration',19,'add_tableconfiguration'),(74,'Can change table configuration',19,'change_tableconfiguration'),(75,'Can delete table configuration',19,'delete_tableconfiguration'),(76,'Can view table configuration',19,'view_tableconfiguration'),(77,'Can add table column',20,'add_tablecolumn'),(78,'Can change table column',20,'change_tablecolumn'),(79,'Can delete table column',20,'delete_tablecolumn'),(80,'Can view table column',20,'view_tablecolumn'),(81,'Can add transaction',21,'add_transaction'),(82,'Can change transaction',21,'change_transaction'),(83,'Can delete transaction',21,'delete_transaction'),(84,'Can view transaction',21,'view_transaction'),(85,'Can add transfer',22,'add_transfer'),(86,'Can change transfer',22,'change_transfer'),(87,'Can delete transfer',22,'delete_transfer'),(88,'Can view transfer',22,'view_transfer'),(89,'Can add recurring expense',23,'add_recurringexpense'),(90,'Can change recurring expense',23,'change_recurringexpense'),(91,'Can delete recurring expense',23,'delete_recurringexpense'),(92,'Can view recurring expense',23,'view_recurringexpense'),(93,'Can add investment',24,'add_investment'),(94,'Can change investment',24,'change_investment'),(95,'Can delete investment',24,'delete_investment'),(96,'Can view investment',24,'view_investment'),(97,'Can add loan taken',25,'add_loantaken'),(98,'Can change loan taken',25,'change_loantaken'),(99,'Can delete loan taken',25,'delete_loantaken'),(100,'Can view loan taken',25,'view_loantaken'),(101,'Can add loan given',26,'add_loangiven'),(102,'Can change loan given',26,'change_loangiven'),(103,'Can delete loan given',26,'delete_loangiven'),(104,'Can view loan given',26,'view_loangiven'),(105,'Can add loan payment',27,'add_loanpayment'),(106,'Can change loan payment',27,'change_loanpayment'),(107,'Can delete loan payment',27,'delete_loanpayment'),(108,'Can view loan payment',27,'view_loanpayment'),(109,'Can add reminder',28,'add_reminder'),(110,'Can change reminder',28,'change_reminder'),(111,'Can delete reminder',28,'delete_reminder'),(112,'Can view reminder',28,'view_reminder');
/*!40000 ALTER TABLE `auth_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_accounts`
--

DROP TABLE IF EXISTS `bank_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_accounts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_number` (`account_number`),
  KEY `user_id` (`user_id`),
  KEY `ix_bank_accounts_created_at` (`created_at`),
  KEY `idx_bank_accounts_is_deleted` (`is_deleted`),
  KEY `idx_bank_accounts_deleted_at` (`deleted_at`),
  CONSTRAINT `bank_accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_accounts`
--

LOCK TABLES `bank_accounts` WRITE;
/*!40000 ALTER TABLE `bank_accounts` DISABLE KEYS */;
INSERT INTO `bank_accounts` VALUES (10,2,'HDFC Savings','HDFC123456789','HDFC Bank','savings',150000.00,1,'2025-11-22 19:01:32.251219','2025-11-22 19:01:32.251463',0,NULL),(11,2,'ICICI Current','ICICI987654321','ICICI Bank','current',80000.00,1,'2025-11-22 19:01:32.252084','2025-11-22 19:01:32.252092',0,NULL),(12,2,'SBI Credit Card','SBI-CC-5555','SBI','credit_card',-25000.00,1,'2025-11-22 19:01:32.252496','2025-11-22 19:01:32.252502',0,NULL),(13,2,'PayTM Wallet','PAYTM-98765','PayTM','wallet',5000.00,1,'2025-11-22 19:01:32.252876','2025-11-22 19:01:32.252885',0,NULL),(14,1,'Savings','ACC001','HDFC','savings',0.00,1,'2025-11-23 08:18:43.000000','2025-11-23 08:18:43.000000',0,NULL),(16,2,'Own Name','123','Own Bank','savings',0.00,1,'2025-11-23 09:23:46.321051','2025-11-23 09:23:46.321106',0,NULL),(17,2,'HDFC Credit Card','1213','HDFC','credit_card',0.00,1,'2025-11-23 15:32:54.691223','2025-11-23 15:32:54.691288',0,NULL),(18,5,'SBI Savings','1234','SBI Bank','savings',0.00,1,'2025-11-30 12:12:06.654716','2025-11-30 12:12:06.654780',0,NULL),(19,5,'Axis Savings','4567','Axis Bank','savings',0.00,1,'2025-11-30 12:12:26.113795','2025-11-30 12:12:26.113866',0,NULL),(20,5,'YES Current','100','YES Bank','current',0.00,1,'2025-11-30 14:28:28.405236','2025-11-30 14:28:28.405282',0,NULL);
/*!40000 ALTER TABLE `bank_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_categories_name` (`name`),
  KEY `idx_categories_is_deleted` (`is_deleted`),
  KEY `idx_categories_deleted_at` (`deleted_at`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (30,2,'Salary','in','?','',1,'2025-11-22 19:01:32.253700',0,NULL),(31,2,'Freelance','in','?','',1,'2025-11-22 19:01:32.254176',0,NULL),(32,2,'Business Income','in','?','',1,'2025-11-22 19:01:32.254631',0,NULL),(33,2,'Investment Returns','in','?','',1,'2025-11-22 19:01:32.255046',0,NULL),(34,2,'Food & Dining','out','?','',1,'2025-11-22 19:01:32.255528',0,NULL),(35,2,'Transportation','out','?','',1,'2025-11-22 19:01:32.255977',0,NULL),(36,2,'Utilities','out','⚡','',1,'2025-11-22 19:01:32.256570',0,NULL),(37,2,'Shopping','out','?️','',1,'2025-11-22 19:01:32.257062',0,NULL),(38,2,'Healthcare','out','?','',1,'2025-11-22 19:01:32.257872',0,NULL),(39,2,'Entertainment','out','?','',1,'2025-11-22 19:01:32.258449',0,NULL),(40,2,'Education','out','?','',1,'2025-11-22 19:01:32.259102',0,NULL),(41,2,'Rent','out','?','',1,'2025-11-22 19:01:32.259501',0,NULL),(42,2,'Insurance','out','?️','',1,'2025-11-22 19:01:32.259891',0,NULL),(43,1,'Entertainment','out',NULL,NULL,1,'2025-11-23 08:18:43.000000',0,NULL),(44,1,'Utilities','out',NULL,NULL,1,'2025-11-23 08:18:43.000000',0,NULL),(45,1,'Healthcare','out',NULL,NULL,1,'2025-11-23 08:18:43.000000',0,NULL),(46,1,'Food & Groceries','out',NULL,NULL,1,'2025-11-23 08:18:43.000000',0,NULL),(47,1,'Groceries','out',NULL,NULL,1,'2025-11-23 08:21:06.000000',0,NULL),(48,1,'Entertainment','out',NULL,NULL,1,'2025-11-23 08:21:06.000000',0,NULL),(49,1,'Utilities','out',NULL,NULL,1,'2025-11-23 08:21:06.000000',0,NULL),(50,1,'Healthcare','out',NULL,NULL,1,'2025-11-23 08:21:06.000000',0,NULL),(51,2,'Something','out','?','#22c55e',1,'2025-11-23 09:23:59.692923',0,NULL),(52,2,'Dss','out','?','#eab308',1,'2025-11-23 09:27:07.942344',0,NULL),(53,2,'jjj','out','?','#3b82f6',1,'2025-11-23 09:27:22.298204',0,NULL),(54,2,'Investment','out','trending_up','#3B82F6',1,'2025-11-29 03:19:02.130975',0,NULL);
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_admin_log`
--

DROP TABLE IF EXISTS `django_admin_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_admin_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint unsigned NOT NULL,
  `change_message` longtext NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_users_user_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`),
  CONSTRAINT `django_admin_log_chk_1` CHECK ((`action_flag` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_admin_log`
--

LOCK TABLES `django_admin_log` WRITE;
/*!40000 ALTER TABLE `django_admin_log` DISABLE KEYS */;
INSERT INTO `django_admin_log` VALUES (1,'2025-11-22 16:11:21.787137','3','newuser@test.com',2,'[{\"changed\": {\"fields\": [\"password\"]}}]',6,1),(2,'2025-11-22 16:12:27.075114','1','admin@transactplus.com',2,'[{\"changed\": {\"fields\": [\"password\"]}}]',6,1),(3,'2025-11-22 16:12:42.349871','3','newuser@test.com',2,'[{\"changed\": {\"fields\": [\"password\"]}}]',6,1),(4,'2025-11-22 16:36:22.066089','2','test@example.com',2,'[{\"changed\": {\"fields\": [\"password\"]}}]',6,1),(5,'2025-11-28 15:34:48.861266','3','newuser@test.com',2,'[{\"changed\": {\"fields\": [\"password\"]}}]',6,1),(6,'2025-11-28 15:43:25.265335','2','test@example.com',2,'[{\"changed\": {\"fields\": [\"password\"]}}]',6,1);
/*!40000 ALTER TABLE `django_admin_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_content_type`
--

DROP TABLE IF EXISTS `django_content_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_content_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_content_type`
--

LOCK TABLES `django_content_type` WRITE;
/*!40000 ALTER TABLE `django_content_type` DISABLE KEYS */;
INSERT INTO `django_content_type` VALUES (1,'admin','logentry'),(3,'auth','group'),(2,'auth','permission'),(4,'contenttypes','contenttype'),(17,'core','bankaccount'),(18,'core','category'),(20,'core','tablecolumn'),(19,'core','tableconfiguration'),(24,'investments','investment'),(26,'loans','loangiven'),(27,'loans','loanpayment'),(25,'loans','loantaken'),(28,'reminders','reminder'),(5,'sessions','session'),(10,'subscriptions','subscriptionplan'),(16,'subscriptions','trialconversionlog'),(15,'subscriptions','trialperiod'),(13,'subscriptions','usagelimit'),(12,'subscriptions','usagelog'),(11,'subscriptions','usersubscription'),(14,'subscriptions','userusagestats'),(23,'transactions','recurringexpense'),(21,'transactions','transaction'),(22,'transactions','transfer'),(9,'users','loginattempt'),(8,'users','passwordresettoken'),(6,'users','user'),(7,'users','useremailtoken');
/*!40000 ALTER TABLE `django_content_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_migrations`
--

DROP TABLE IF EXISTS `django_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_migrations`
--

LOCK TABLES `django_migrations` WRITE;
/*!40000 ALTER TABLE `django_migrations` DISABLE KEYS */;
INSERT INTO `django_migrations` VALUES (1,'contenttypes','0001_initial','2025-11-22 13:58:39.983851'),(2,'admin','0001_initial','2025-11-22 13:58:40.010232'),(3,'admin','0002_logentry_remove_auto_add','2025-11-22 13:58:40.013268'),(4,'admin','0003_logentry_add_action_flag_choices','2025-11-22 13:58:40.015790'),(5,'contenttypes','0002_remove_content_type_name','2025-11-22 13:58:40.040956'),(6,'auth','0001_initial','2025-11-22 13:58:40.078295'),(7,'auth','0002_alter_permission_name_max_length','2025-11-22 13:58:40.089948'),(8,'auth','0003_alter_user_email_max_length','2025-11-22 13:58:40.092288'),(9,'auth','0004_alter_user_username_opts','2025-11-22 13:58:40.093976'),(10,'auth','0005_alter_user_last_login_null','2025-11-22 13:58:40.095485'),(11,'auth','0006_require_contenttypes_0002','2025-11-22 13:58:40.095892'),(12,'auth','0007_alter_validators_add_error_messages','2025-11-22 13:58:40.097603'),(13,'auth','0008_alter_user_username_max_length','2025-11-22 13:58:40.099913'),(14,'auth','0009_alter_user_last_name_max_length','2025-11-22 13:58:40.101899'),(15,'auth','0010_alter_group_name_max_length','2025-11-22 13:58:40.106970'),(16,'auth','0011_update_proxy_permissions','2025-11-22 13:58:40.117624'),(17,'auth','0012_alter_user_first_name_max_length','2025-11-22 13:58:40.120011'),(18,'sessions','0001_initial','2025-11-22 13:58:40.125435');
/*!40000 ALTER TABLE `django_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_session`
--

DROP TABLE IF EXISTS `django_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_session`
--

LOCK TABLES `django_session` WRITE;
/*!40000 ALTER TABLE `django_session` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `investment_income`
--

DROP TABLE IF EXISTS `investment_income`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `investment_income` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `investment_id` bigint NOT NULL,
  `income_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `income_date` date NOT NULL,
  `frequency` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'one_time',
  `next_income_date` date DEFAULT NULL,
  `income_transaction_id` bigint DEFAULT NULL,
  `remarks` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_investment_income` (`investment_id`,`income_date`,`income_type`),
  KEY `fk_investment_income_transaction` (`income_transaction_id`),
  KEY `idx_investment_income_investment_date` (`investment_id`,`income_date` DESC),
  KEY `idx_investment_income_user_date` (`user_id`,`income_date` DESC),
  KEY `idx_investment_income_type` (`income_type`),
  KEY `idx_investment_income_is_deleted` (`is_deleted`),
  KEY `idx_investment_income_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_investment_income_investment` FOREIGN KEY (`investment_id`) REFERENCES `investments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_investment_income_transaction` FOREIGN KEY (`income_transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_investment_income_user` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `investment_income`
--

LOCK TABLES `investment_income` WRITE;
/*!40000 ALTER TABLE `investment_income` DISABLE KEYS */;
/*!40000 ALTER TABLE `investment_income` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `investments`
--

DROP TABLE IF EXISTS `investments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `investments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `investment_title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `investment_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `principal_amount` decimal(12,2) NOT NULL,
  `current_value` decimal(12,2) NOT NULL,
  `interest_rate` decimal(5,2) DEFAULT NULL,
  `investment_date` date NOT NULL,
  `maturity_date` date DEFAULT NULL,
  `risk_level` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `institution_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `purchase_transaction_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_investment_date` (`investment_date`),
  KEY `idx_investment_type` (`investment_type`),
  KEY `idx_risk_level` (`risk_level`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_investment_purchase_transaction` (`purchase_transaction_id`),
  KEY `idx_investments_is_deleted` (`is_deleted`),
  KEY `idx_investments_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_investment_purchase_transaction` FOREIGN KEY (`purchase_transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `investments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `investments`
--

LOCK TABLES `investments` WRITE;
/*!40000 ALTER TABLE `investments` DISABLE KEYS */;
INSERT INTO `investments` VALUES (1,2,'TCS Shares','stocks',50000.00,65000.00,NULL,'2024-01-15',NULL,'medium','NSE','TCS-12345','Blue chip stock holding',1,'2025-11-28 22:31:15','2025-11-28 22:33:43',0,NULL,NULL),(2,2,'HDFC Bank FD','fixed_deposit',100000.00,106500.00,6.50,'2024-02-01','2025-02-01','low','HDFC Bank','FD-98765','1 year fixed deposit',1,'2025-11-28 22:31:15','2025-11-28 22:33:44',0,NULL,NULL);
/*!40000 ALTER TABLE `investments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loan_documents`
--

DROP TABLE IF EXISTS `loan_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loan_documents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `loan_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `document_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `file` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint DEFAULT '0',
  `description` longtext COLLATE utf8mb4_unicode_ci,
  `uploaded_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_loan_documents_loan_type` (`loan_id`,`document_type`),
  KEY `idx_loan_documents_uploaded_date` (`uploaded_date`),
  KEY `idx_loan_documents_user` (`user_id`),
  KEY `idx_loan_documents_is_deleted` (`is_deleted`),
  KEY `idx_loan_documents_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_loan_documents_loan` FOREIGN KEY (`loan_id`) REFERENCES `loans_taken` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_loan_documents_user` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_document_type` CHECK ((`document_type` in (_utf8mb4'loan_agreement',_utf8mb4'emi_schedule',_utf8mb4'sanction_letter',_utf8mb4'property_documents',_utf8mb4'insurance_policy',_utf8mb4'repayment_certificate',_utf8mb4'bank_statement',_utf8mb4'other')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loan_documents`
--

LOCK TABLES `loan_documents` WRITE;
/*!40000 ALTER TABLE `loan_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `loan_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loan_given_payments`
--

DROP TABLE IF EXISTS `loan_given_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loan_given_payments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `loan_id` bigint DEFAULT NULL,
  `payment_date` date NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'cash',
  `reference_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_loan_given_payments_sort` (`payment_date`),
  KEY `loan_given_payments_ibfk_1` (`loan_id`),
  KEY `loan_given_payments_ibfk_2` (`user_id`),
  KEY `idx_loan_given_payments_is_deleted` (`is_deleted`),
  KEY `idx_loan_given_payments_deleted_at` (`deleted_at`),
  CONSTRAINT `loan_given_payments_ibfk_1` FOREIGN KEY (`loan_id`) REFERENCES `loans_given` (`id`) ON DELETE CASCADE,
  CONSTRAINT `loan_given_payments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loan_given_payments`
--

LOCK TABLES `loan_given_payments` WRITE;
/*!40000 ALTER TABLE `loan_given_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `loan_given_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loan_given_recoveries`
--

DROP TABLE IF EXISTS `loan_given_recoveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loan_given_recoveries` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `loan_id` bigint NOT NULL,
  `recovery_amount` decimal(12,2) NOT NULL,
  `recovery_date` date NOT NULL,
  `recovery_method` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `transaction_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `interest_received` decimal(12,2) NOT NULL DEFAULT '0.00',
  `principal_recovered` decimal(12,2) NOT NULL,
  `remarks` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_loan_given_recoveries_sort` (`recovery_date`),
  KEY `loan_given_recoveries_ibfk_1` (`loan_id`),
  KEY `loan_given_recoveries_ibfk_2` (`user_id`),
  KEY `ix_loan_given_recoveries_loan_date` (`loan_id`,`recovery_date`),
  CONSTRAINT `loan_given_recoveries_ibfk_1` FOREIGN KEY (`loan_id`) REFERENCES `loans_given` (`id`) ON DELETE CASCADE,
  CONSTRAINT `loan_given_recoveries_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loan_given_recoveries`
--

LOCK TABLES `loan_given_recoveries` WRITE;
/*!40000 ALTER TABLE `loan_given_recoveries` DISABLE KEYS */;
INSERT INTO `loan_given_recoveries` VALUES (1,2,8,10.00,'2025-11-30','cash','',0.00,10.00,'','2025-11-30 05:51:09.614163','2025-11-30 05:51:09.614194');
/*!40000 ALTER TABLE `loan_given_recoveries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loan_payments`
--

DROP TABLE IF EXISTS `loan_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loan_payments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `loan_id` bigint NOT NULL,
  `payment_date` date NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'cash',
  `reference_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_loan_payments_sort` (`payment_date`),
  KEY `idx_loan_payment_date` (`loan_id`,`payment_date`),
  KEY `idx_loan_payments_is_deleted` (`is_deleted`),
  KEY `idx_loan_payments_deleted_at` (`deleted_at`),
  CONSTRAINT `loan_payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `loan_payments_ibfk_2` FOREIGN KEY (`loan_id`) REFERENCES `loans_taken` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loan_payments`
--

LOCK TABLES `loan_payments` WRITE;
/*!40000 ALTER TABLE `loan_payments` DISABLE KEYS */;
INSERT INTO `loan_payments` VALUES (1,2,8,'2025-11-30',100.00,'cash',NULL,'','2025-11-30 04:53:13.654342','2025-11-30 12:15:58.156492',0,NULL);
/*!40000 ALTER TABLE `loan_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loan_roi_history`
--

DROP TABLE IF EXISTS `loan_roi_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loan_roi_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `loan_id` bigint NOT NULL,
  `old_interest_rate` decimal(5,2) NOT NULL,
  `new_interest_rate` decimal(5,2) NOT NULL,
  `effective_date` date NOT NULL,
  `reason` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_loan_effective_date` (`loan_id`,`effective_date` DESC),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_loan_roi_history_is_deleted` (`is_deleted`),
  KEY `idx_loan_roi_history_deleted_at` (`deleted_at`),
  CONSTRAINT `loan_roi_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `loan_roi_history_ibfk_2` FOREIGN KEY (`loan_id`) REFERENCES `loans_taken` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loan_roi_history`
--

LOCK TABLES `loan_roi_history` WRITE;
/*!40000 ALTER TABLE `loan_roi_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `loan_roi_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loans_given`
--

DROP TABLE IF EXISTS `loans_given`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loans_given` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `loan_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `loan_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'personal',
  `lender_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `borrower_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `borrower_contact` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `principal_amount` decimal(12,2) NOT NULL,
  `amount_recovered` decimal(12,2) NOT NULL DEFAULT '0.00',
  `outstanding_amount` decimal(12,2) NOT NULL,
  `interest_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `emi_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `loan_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `due_day` int NOT NULL DEFAULT '1',
  `tenure_months` int NOT NULL DEFAULT '0',
  `loan_account_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `terms_conditions` longtext COLLATE utf8mb4_unicode_ci,
  `remarks` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_loans_given_sort` (`loan_date`),
  KEY `ix_loans_given_loan_date` (`loan_date`),
  KEY `idx_loans_given_is_deleted` (`is_deleted`),
  KEY `idx_loans_given_deleted_at` (`deleted_at`),
  CONSTRAINT `loans_given_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loans_given`
--

LOCK TABLES `loans_given` WRITE;
/*!40000 ALTER TABLE `loans_given` DISABLE KEYS */;
INSERT INTO `loans_given` VALUES (7,2,'Loan','personal',NULL,'Rahul Kumar','9876543210',50000.00,30000.00,20000.00,0.00,0.00,'2024-06-01','2025-06-01',1,0,NULL,'active','','','2025-11-22 19:01:32.298903','2025-11-22 19:01:32.298910',0,NULL),(8,2,'Loan','personal',NULL,'Priya Sharma','9988776655',25000.00,10.00,24990.00,0.00,0.00,'2024-09-15','2025-03-15',1,0,NULL,'active','','','2025-11-22 19:01:32.299150','2025-11-30 05:51:09.617718',0,NULL),(9,2,'Loan','personal',NULL,'Amit Patel','9123456789',100000.00,100000.00,0.00,0.00,0.00,'2023-05-01','2024-05-01',1,0,NULL,'paid-off','','','2025-11-22 19:01:32.299340','2025-11-22 19:01:32.299346',0,NULL);
/*!40000 ALTER TABLE `loans_given` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loans_taken`
--

DROP TABLE IF EXISTS `loans_taken`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loans_taken` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `loan_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `loan_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lender_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `borrower_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `borrower_contact` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `principal_amount` decimal(12,2) NOT NULL,
  `amount_recovered` decimal(12,2) DEFAULT '0.00',
  `interest_rate` decimal(5,2) NOT NULL,
  `emi_amount` decimal(10,2) NOT NULL,
  `outstanding_amount` decimal(12,2) NOT NULL,
  `loan_date` date NOT NULL,
  `due_day` int NOT NULL,
  `tenure_months` int NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `loan_account_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `terms_conditions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `remarks` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `emi_start_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_loans_taken_sort` (`loan_date`),
  KEY `idx_loans_taken_is_deleted` (`is_deleted`),
  KEY `idx_loans_taken_deleted_at` (`deleted_at`),
  CONSTRAINT `loans_taken_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loans_taken`
--

LOCK TABLES `loans_taken` WRITE;
/*!40000 ALTER TABLE `loans_taken` DISABLE KEYS */;
INSERT INTO `loans_taken` VALUES (7,2,'Home Loan','home','HDFC Bank',NULL,NULL,3500000.00,0.00,8.50,35000.00,2800000.00,'2020-05-01',5,240,'active','HDFC-HL-123456',NULL,'','2025-11-22 19:01:32.298079','2025-11-22 19:01:32.298084',0,NULL,NULL,NULL),(8,2,'Car Loan','auto','ICICI Bank',NULL,NULL,800000.00,0.00,9.50,18000.00,450000.00,'2022-08-15',10,60,'active','ICICI-AL-789012',NULL,'','2025-11-22 19:01:32.298313','2025-11-22 19:01:32.298317',0,NULL,NULL,NULL),(9,2,'Personal Loan','personal','SBI',NULL,NULL,200000.00,0.00,11.00,6500.00,125000.00,'2023-03-01',15,36,'active','SBI-PL-345678',NULL,'','2025-11-22 19:01:32.298520','2025-11-22 19:01:32.298525',0,NULL,NULL,NULL);
/*!40000 ALTER TABLE `loans_taken` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lump_sum_payments`
--

DROP TABLE IF EXISTS `lump_sum_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lump_sum_payments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `loan_id` bigint NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_date` date NOT NULL,
  `adjustment_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `new_principal` decimal(12,2) NOT NULL,
  `new_emi` decimal(10,2) NOT NULL,
  `new_tenure_months` int NOT NULL,
  `interest_saved` decimal(12,2) NOT NULL DEFAULT '0.00',
  `transaction_id` bigint DEFAULT NULL,
  `remarks` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_loan_payment_date` (`loan_id`,`payment_date` DESC),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_lump_sum_payments_is_deleted` (`is_deleted`),
  KEY `idx_lump_sum_payments_deleted_at` (`deleted_at`),
  CONSTRAINT `lump_sum_payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lump_sum_payments_ibfk_2` FOREIGN KEY (`loan_id`) REFERENCES `loans_taken` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lump_sum_payments_ibfk_3` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lump_sum_payments`
--

LOCK TABLES `lump_sum_payments` WRITE;
/*!40000 ALTER TABLE `lump_sum_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `lump_sum_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_history`
--

DROP TABLE IF EXISTS `payment_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `recurring_expense_id` bigint NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `due_date` date NOT NULL,
  `paid_date` date DEFAULT NULL,
  `transaction_id` bigint DEFAULT NULL,
  `failure_reason` longtext COLLATE utf8mb4_unicode_ci,
  `notes` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_history_recurring_expense_due_date_uniq` (`recurring_expense_id`,`due_date`),
  KEY `payment_history_status_due_date_idx` (`status`,`due_date`),
  KEY `payment_history_user_due_date_idx` (`user_id`,`due_date`),
  KEY `payment_history_recurring_expense_id_fk` (`recurring_expense_id`),
  KEY `payment_history_user_id_fk` (`user_id`),
  KEY `payment_history_transaction_id_fk` (`transaction_id`),
  CONSTRAINT `payment_history_ibfk_1` FOREIGN KEY (`recurring_expense_id`) REFERENCES `recurring_expenses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_history_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_history_ibfk_3` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `payment_history_chk_1` CHECK ((`status` in (_utf8mb4'pending',_utf8mb4'paid',_utf8mb4'failed',_utf8mb4'skipped')))
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_history`
--

LOCK TABLES `payment_history` WRITE;
/*!40000 ALTER TABLE `payment_history` DISABLE KEYS */;
INSERT INTO `payment_history` VALUES (1,29,2,318.60,'pending','2025-11-21',NULL,NULL,'','','2025-11-23 15:33:52.909499','2025-11-23 15:33:52.909521'),(2,29,2,318.60,'pending','2025-12-21',NULL,NULL,'','','2025-11-23 15:33:52.912181','2025-11-23 15:33:52.912201'),(3,29,2,318.60,'pending','2026-01-21',NULL,NULL,'','','2025-11-23 15:33:52.914801','2025-11-23 15:33:52.914824'),(4,29,2,318.60,'pending','2026-02-21',NULL,NULL,'','','2025-11-23 15:33:52.916742','2025-11-23 15:33:52.916763'),(5,29,2,318.60,'pending','2026-03-21',NULL,NULL,'','','2025-11-23 15:33:52.918546','2025-11-23 15:33:52.918566'),(6,29,2,318.60,'pending','2026-04-21',NULL,NULL,'','','2025-11-23 15:33:52.920380','2025-11-23 15:33:52.920400'),(7,29,2,318.60,'pending','2026-05-21',NULL,NULL,'','','2025-11-23 15:33:52.922999','2025-11-23 15:33:52.923022'),(8,29,2,318.60,'pending','2026-06-21',NULL,NULL,'','','2025-11-23 15:33:52.925475','2025-11-23 15:33:52.925497'),(9,29,2,318.60,'pending','2026-07-21',NULL,NULL,'','','2025-11-23 15:33:52.929280','2025-11-23 15:33:52.929380'),(10,29,2,318.60,'paid','2026-08-21','2025-11-28',230,'','','2025-11-23 15:33:52.932036','2025-11-28 15:56:06.019255'),(11,29,2,318.60,'paid','2026-09-21','2025-11-28',229,'','','2025-11-23 15:33:52.934446','2025-11-28 15:45:59.256100'),(12,29,2,318.60,'paid','2026-10-21','2025-11-28',228,'','','2025-11-23 15:33:52.936459','2025-11-28 15:45:46.222804'),(13,29,2,318.60,'paid','2026-11-21','2025-11-28',227,'','','2025-11-23 15:33:52.939007','2025-11-28 15:45:34.624401');
/*!40000 ALTER TABLE `payment_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recurring_expenses`
--

DROP TABLE IF EXISTS `recurring_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recurring_expenses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'expense',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `category_id` bigint NOT NULL,
  `bank_account_id` bigint NOT NULL,
  `frequency` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `due_day` int NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `auto_debit` tinyint(1) NOT NULL DEFAULT '0',
  `remarks` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `category_id` (`category_id`),
  KEY `bank_account_id` (`bank_account_id`),
  KEY `ix_recurring_expenses_sort` (`due_day`,`name`),
  KEY `idx_recurring_type` (`is_active`),
  KEY `idx_recurring_type_active` (`type`,`is_active`),
  KEY `idx_recurring_expenses_is_deleted` (`is_deleted`),
  KEY `idx_recurring_expenses_deleted_at` (`deleted_at`),
  CONSTRAINT `recurring_expenses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recurring_expenses_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recurring_expenses_ibfk_3` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recurring_expenses`
--

LOCK TABLES `recurring_expenses` WRITE;
/*!40000 ALTER TABLE `recurring_expenses` DISABLE KEYS */;
INSERT INTO `recurring_expenses` VALUES (16,2,'out','House Rent',25000.00,41,10,'monthly','2025-01-01',NULL,1,1,0,'','2025-11-22 19:01:32.293571','2025-11-22 19:01:32.293576',0,NULL),(17,2,'out','Netflix Subscription',649.00,39,12,'monthly','2025-01-01',NULL,5,1,0,'','2025-11-22 19:01:32.293840','2025-11-22 19:01:32.293845',0,NULL),(18,2,'out','Spotify Premium',119.00,39,12,'monthly','2025-01-01',NULL,10,1,0,'','2025-11-22 19:01:32.294066','2025-11-22 19:01:32.294071',0,NULL),(19,2,'out','Gym Membership',2000.00,38,10,'monthly','2025-01-01',NULL,15,1,0,'','2025-11-22 19:01:32.294265','2025-11-22 19:01:32.294270',0,NULL),(20,2,'out','Internet Bill',1200.00,36,10,'monthly','2025-01-01',NULL,20,1,0,'','2025-11-22 19:01:32.294466','2025-11-22 19:01:32.294471',0,NULL),(21,2,'out','Mobile Recharge',599.00,36,13,'monthly','2025-01-01',NULL,25,1,0,'','2025-11-22 19:01:32.294673','2025-11-22 19:01:32.294677',0,NULL),(22,2,'out','Amazon Prime',1499.00,39,12,'yearly','2025-01-01',NULL,1,1,0,'','2025-11-22 19:01:32.294897','2025-11-22 19:01:32.294903',0,NULL),(23,2,'out','Maid Salary',3000.00,36,10,'monthly','2025-01-01',NULL,1,1,0,'','2025-11-22 19:01:32.295161','2025-11-22 19:01:32.295166',0,NULL),(24,1,'out','Test Rent',25000.00,47,14,'monthly','2025-01-01',NULL,1,1,0,NULL,'2025-11-23 08:21:06.000000','2025-11-23 08:21:06.000000',0,NULL),(25,1,'out','Test Netflix',649.00,43,14,'monthly','2025-01-01',NULL,5,1,1,NULL,'2025-11-23 08:21:06.000000','2025-11-23 08:21:06.000000',0,NULL),(26,1,'out','Test Electricity',1500.00,44,14,'monthly','2025-01-01',NULL,10,1,1,NULL,'2025-11-23 08:21:06.000000','2025-11-23 08:21:06.000000',0,NULL),(27,1,'out','Test Internet',1200.00,44,14,'monthly','2025-01-01',NULL,15,1,1,NULL,'2025-11-23 08:21:06.000000','2025-11-23 08:21:06.000000',0,NULL),(28,1,'out','Test Gym',2000.00,45,14,'monthly','2025-01-01',NULL,20,1,0,NULL,'2025-11-23 08:21:06.000000','2025-11-23 08:21:06.000000',0,NULL),(29,2,'out','Adobe',318.60,40,17,'monthly','2025-11-21',NULL,21,1,1,'Adobe remarks','2025-11-23 15:33:52.906867','2025-11-23 15:33:52.906892',0,NULL);
/*!40000 ALTER TABLE `recurring_expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reminders`
--

DROP TABLE IF EXISTS `reminders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reminders` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `reminder_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `due_date` date NOT NULL,
  `frequency` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `advance_days` int NOT NULL DEFAULT '0',
  `priority` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `is_completed` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `amount` decimal(10,2) DEFAULT NULL,
  `remarks` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_reminders_sort` (`due_date`,`priority`),
  KEY `idx_reminders_is_deleted` (`is_deleted`),
  KEY `idx_reminders_deleted_at` (`deleted_at`),
  CONSTRAINT `reminders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reminders`
--

LOCK TABLES `reminders` WRITE;
/*!40000 ALTER TABLE `reminders` DISABLE KEYS */;
INSERT INTO `reminders` VALUES (14,2,'House Rent Payment','Monthly rent due for December 2025','bill_payment','2025-12-01','monthly',3,'high',0,1,25000.00,'','2025-11-22 19:01:32.300096','2025-11-22 19:01:32.300106',0,NULL),(15,2,'Home Loan EMI','HDFC home loan EMI payment','emi_due','2025-12-05','monthly',2,'high',0,1,35000.00,'','2025-11-22 19:01:32.300382','2025-11-22 19:01:32.300387',0,NULL),(16,2,'Car Loan EMI','ICICI car loan EMI payment','emi_due','2025-12-10','monthly',2,'high',0,1,18000.00,'','2025-11-22 19:01:32.300590','2025-11-22 19:01:32.300594',0,NULL),(17,2,'Credit Card Payment','Pay SBI credit card bill','bill_payment','2025-12-15','monthly',5,'medium',0,1,25000.00,'','2025-11-22 19:01:32.300983','2025-11-22 19:01:32.300987',0,NULL),(18,2,'Follow up with Priya','Follow up for loan repayment','loan_collection','2025-12-15','once',7,'medium',0,1,25000.00,'','2025-11-22 19:01:32.301170','2025-11-22 19:01:32.301174',0,NULL),(19,2,'Fixed Deposit Maturity','SBI FD maturing soon','investment_maturity','2025-06-01','once',30,'high',0,1,100000.00,'','2025-11-22 19:01:32.301356','2025-11-22 19:01:32.301361',0,NULL),(20,2,'Electricity Bill','Monthly electricity bill payment','bill_payment','2025-12-07','monthly',3,'medium',0,1,4500.00,'','2025-11-22 19:01:32.301545','2025-11-22 19:01:32.301548',0,NULL);
/*!40000 ALTER TABLE `reminders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_plans`
--

DROP TABLE IF EXISTS `subscription_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscription_plans` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `description` longtext NOT NULL,
  `price_monthly` decimal(10,2) NOT NULL DEFAULT '0.00',
  `price_yearly` decimal(10,2) NOT NULL DEFAULT '0.00',
  `max_transactions_per_month` int NOT NULL DEFAULT '0',
  `max_bank_accounts` int NOT NULL DEFAULT '0',
  `max_investment_records` int NOT NULL DEFAULT '0',
  `max_loan_records` int NOT NULL DEFAULT '0',
  `max_reminders` int NOT NULL DEFAULT '0',
  `max_api_calls_per_day` int NOT NULL DEFAULT '0',
  `features` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_price` (`price_monthly`),
  KEY `idx_subscription_plans_is_deleted` (`is_deleted`),
  KEY `idx_subscription_plans_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_plans`
--

LOCK TABLES `subscription_plans` WRITE;
/*!40000 ALTER TABLE `subscription_plans` DISABLE KEYS */;
/*!40000 ALTER TABLE `subscription_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `table_columns`
--

DROP TABLE IF EXISTS `table_columns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_columns` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `table_config_id` bigint NOT NULL,
  `field_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `is_visible` tinyint(1) NOT NULL DEFAULT '1',
  `is_sortable` tinyint(1) NOT NULL DEFAULT '1',
  `is_filterable` tinyint(1) NOT NULL DEFAULT '0',
  `filter_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sequence` int NOT NULL DEFAULT '0',
  `width` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alignment` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'left',
  `format_string` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `badge_config` json DEFAULT NULL,
  `filter_source` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `table_config_id` (`table_config_id`),
  CONSTRAINT `table_columns_ibfk_1` FOREIGN KEY (`table_config_id`) REFERENCES `table_configurations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=167 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `table_columns`
--

LOCK TABLES `table_columns` WRITE;
/*!40000 ALTER TABLE `table_columns` DISABLE KEYS */;
INSERT INTO `table_columns` VALUES (114,12,'transaction_date','Date','date',1,1,1,'date_range',0,'100px','left',NULL,NULL,NULL),(115,12,'description','Description','text',1,1,1,'text',1,'180px','left',NULL,NULL,NULL),(116,12,'type','Type','text',1,1,1,'text',2,'100px','center',NULL,NULL,NULL),(117,12,'category_name','Category','text',1,1,1,'text',3,'120px','left',NULL,NULL,NULL),(118,12,'amount','Amount','currency',1,1,1,'number_range',4,'120px','right',NULL,NULL,NULL),(119,12,'bank_account_name','Account','text',1,1,1,'select',5,'120px','left',NULL,NULL,'bank_accounts'),(120,12,'remarks','Remarks','text',1,1,0,'text',6,'180px','left',NULL,NULL,NULL),(121,13,'transfer_date','Date','date',1,1,1,'date_range',0,'100px','left',NULL,NULL,NULL),(122,13,'from_account_name','From Account','text',1,1,1,'select',1,'120px','left',NULL,NULL,'bank_accounts'),(123,13,'to_account_name','To Account','text',1,1,1,'select',2,'120px','left',NULL,NULL,'bank_accounts'),(124,13,'amount','Amount','currency',1,1,0,'number_range',3,'100px','right',NULL,NULL,NULL),(125,13,'description','Description','text',1,1,0,'text',4,'150px','left',NULL,NULL,NULL),(126,14,'investment_date','Investment Date','date',1,1,0,'date_range',0,'120px','left',NULL,NULL,NULL),(127,14,'type','Type','text',1,1,0,'select',1,'100px','left',NULL,NULL,NULL),(128,14,'name','Name','text',1,1,0,'text',2,'150px','left',NULL,NULL,NULL),(129,14,'principal_amount','Principal','currency',1,1,0,NULL,3,'120px','right',NULL,NULL,NULL),(130,14,'current_value','Current Value','currency',1,1,0,NULL,4,'120px','right',NULL,NULL,NULL),(131,14,'is_active','Status','text',1,1,0,NULL,5,'100px','center',NULL,NULL,NULL),(132,16,'loan_date','Loan Date','date',1,1,0,NULL,0,'100px','left',NULL,NULL,NULL),(133,16,'loan_name','Loan Name','text',1,1,0,NULL,1,'150px','left',NULL,NULL,NULL),(134,16,'lender_name','Lender','text',1,1,0,NULL,2,'150px','left',NULL,NULL,NULL),(135,16,'principal_amount','Principal','currency',1,1,0,NULL,3,'120px','right',NULL,NULL,NULL),(136,16,'interest_rate','Interest Rate','text',1,1,0,NULL,4,'100px','center',NULL,NULL,NULL),(137,16,'outstanding_balance','Outstanding','currency',1,1,0,NULL,5,'120px','right',NULL,NULL,NULL),(138,16,'emi_amount','EMI','currency',1,1,0,NULL,6,'100px','right',NULL,NULL,NULL),(139,16,'status','Status','text',1,1,0,NULL,7,'100px','center',NULL,NULL,NULL),(140,17,'loan_date','Loan Date','date',1,1,0,NULL,0,'100px','left',NULL,NULL,NULL),(141,17,'borrower_name','Borrower','text',1,1,0,NULL,1,'150px','left',NULL,NULL,NULL),(142,17,'principal_amount','Principal','currency',1,1,0,NULL,2,'120px','right',NULL,NULL,NULL),(143,17,'amount_recovered','Recovered','currency',1,1,0,NULL,3,'120px','right',NULL,NULL,NULL),(144,17,'outstanding_amount','Outstanding','currency',1,1,0,NULL,4,'120px','right',NULL,NULL,NULL),(145,17,'interest_rate','Interest Rate','text',1,1,0,NULL,5,'100px','center',NULL,NULL,NULL),(146,17,'due_date','Due Date','date',1,1,0,NULL,6,'100px','left',NULL,NULL,NULL),(147,17,'status','Status','text',1,1,0,NULL,7,'100px','center',NULL,NULL,NULL),(148,18,'due_date','Due Date','date',1,1,0,NULL,0,'100px','left',NULL,NULL,NULL),(149,18,'title','Title','text',1,1,0,NULL,1,'150px','left',NULL,NULL,NULL),(150,18,'description','Description','text',1,1,0,NULL,2,'200px','left',NULL,NULL,NULL),(151,18,'reminder_type','Type','text',1,1,0,NULL,3,'120px','left',NULL,NULL,NULL),(152,18,'priority','Priority','text',1,1,0,NULL,4,'100px','center',NULL,NULL,NULL),(153,18,'is_completed','Status','text',1,1,0,NULL,5,'100px','center',NULL,NULL,NULL),(154,15,'name','Name','text',1,1,0,NULL,0,'150px','left',NULL,NULL,NULL),(155,15,'category_name','Category','text',1,1,0,NULL,1,'120px','left',NULL,NULL,NULL),(156,15,'amount','Amount','currency',1,1,0,NULL,2,'100px','right',NULL,NULL,NULL),(157,15,'frequency','Frequency','text',1,1,0,NULL,3,'100px','center',NULL,NULL,NULL),(158,15,'bank_account_name','Account','text',1,1,1,'select',4,'120px','left',NULL,NULL,'bank_accounts'),(159,15,'auto_debit','Auto Debit','text',1,1,0,NULL,5,'100px','center',NULL,NULL,NULL),(160,15,'is_active','Status','text',1,1,0,NULL,6,'100px','center',NULL,NULL,NULL);
/*!40000 ALTER TABLE `table_columns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `table_configurations`
--

DROP TABLE IF EXISTS `table_configurations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_configurations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `table_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `page_size` int NOT NULL DEFAULT '20',
  `enable_search` tinyint(1) NOT NULL DEFAULT '1',
  `enable_sorting` tinyint(1) NOT NULL DEFAULT '1',
  `enable_filtering` tinyint(1) NOT NULL DEFAULT '1',
  `enable_column_visibility` tinyint(1) NOT NULL DEFAULT '1',
  `enable_export` tinyint(1) NOT NULL DEFAULT '0',
  `default_sort_column` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `default_sort_order` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'desc',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `table_name` (`table_name`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `table_configurations`
--

LOCK TABLES `table_configurations` WRITE;
/*!40000 ALTER TABLE `table_configurations` DISABLE KEYS */;
INSERT INTO `table_configurations` VALUES (12,'transactions',10,1,1,1,1,1,'transaction_date','desc','2025-11-22 19:01:32.301912','2025-11-22 19:01:32.301918'),(13,'transfers',20,1,1,1,1,1,'transfer_date','desc','2025-11-22 19:01:32.302671','2025-11-22 19:01:32.302678'),(14,'investments',20,1,1,1,1,1,'investment_date','desc','2025-11-22 19:01:32.303256','2025-11-22 19:01:32.303263'),(15,'recurring_expenses',20,1,1,1,1,1,'name','asc','2025-11-22 19:01:32.303969','2025-11-22 19:01:32.303975'),(16,'loans_taken',20,1,1,1,1,0,'loan_date','desc','2025-11-23 09:29:06.000000','2025-11-23 09:29:06.000000'),(17,'loans_given',20,1,1,1,1,0,'loan_date','desc','2025-11-23 09:29:06.000000','2025-11-23 09:29:06.000000'),(18,'reminders',20,1,1,1,1,0,'due_date','asc','2025-11-23 09:29:06.000000','2025-11-23 09:29:06.000000');
/*!40000 ALTER TABLE `table_configurations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `type` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `category_id` bigint NOT NULL,
  `bank_account_id` bigint NOT NULL,
  `description` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `investment_id` bigint DEFAULT NULL,
  `remarks` longtext COLLATE utf8mb4_unicode_ci,
  `transaction_date` date NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `loan_taken_id` bigint DEFAULT NULL,
  `loan_given_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `category_id` (`category_id`),
  KEY `bank_account_id` (`bank_account_id`),
  KEY `ix_transactions_transaction_date` (`transaction_date`),
  KEY `ix_transactions_type` (`type`),
  KEY `ix_transactions_sort` (`transaction_date`,`created_at`),
  KEY `idx_transactions_investment_id` (`investment_id`),
  KEY `idx_transactions_investment_date` (`investment_id`,`transaction_date`),
  KEY `idx_transactions_loan_taken` (`loan_taken_id`),
  KEY `idx_transactions_loan_given` (`loan_given_id`),
  KEY `idx_transactions_is_deleted` (`is_deleted`),
  KEY `idx_transactions_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_transactions_investment` FOREIGN KEY (`investment_id`) REFERENCES `investments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transactions_loan_given` FOREIGN KEY (`loan_given_id`) REFERENCES `loans_given` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transactions_loan_taken` FOREIGN KEY (`loan_taken_id`) REFERENCES `loans_taken` (`id`) ON DELETE SET NULL,
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transactions_ibfk_3` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=232 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (118,2,'in',85000.00,30,10,'Monthly salary - November 2025',NULL,'','2025-11-01','2025-11-22 19:01:32.260618','2025-11-22 19:01:32.260624',0,NULL,NULL,NULL),(119,2,'in',25000.00,31,10,'Website development project',NULL,'','2025-11-05','2025-11-22 19:01:32.261089','2025-11-22 19:01:32.261094',0,NULL,NULL,NULL),(120,2,'in',5000.00,33,10,'Mutual fund dividend',NULL,'','2025-11-10','2025-11-22 19:01:32.261499','2025-11-22 19:01:32.261504',0,NULL,NULL,NULL),(121,2,'in',3000.00,31,10,'Logo design work',NULL,'','2025-11-12','2025-11-22 19:01:32.263047','2025-11-22 19:01:32.263051',0,NULL,NULL,NULL),(122,2,'out',8500.00,34,10,'Groceries and restaurants',NULL,'','2025-11-03','2025-11-22 19:01:32.266253','2025-11-22 19:01:32.266265',0,NULL,NULL,NULL),(123,2,'out',3000.00,35,13,'Fuel and metro card recharge',NULL,'','2025-11-05','2025-11-22 19:01:32.266791','2025-11-22 19:01:32.266799',0,NULL,NULL,NULL),(124,2,'out',4500.00,36,10,'Electricity and water bill',NULL,'','2025-11-07','2025-11-22 19:01:32.267468','2025-11-22 19:01:32.267474',0,NULL,NULL,NULL),(125,2,'out',12000.00,37,12,'Clothing and electronics',NULL,'','2025-11-10','2025-11-22 19:01:32.267878','2025-11-22 19:01:32.267883',0,NULL,NULL,NULL),(126,2,'out',2500.00,39,12,'Movie tickets and dinner',NULL,'','2025-11-12','2025-11-22 19:01:32.268130','2025-11-22 19:01:32.268138',0,NULL,NULL,NULL),(127,2,'out',1500.00,38,10,'Pharmacy medicines',NULL,'','2025-11-15','2025-11-22 19:01:32.268372','2025-11-22 19:01:32.268376',0,NULL,NULL,NULL),(128,2,'out',5000.00,40,10,'Online course subscription',NULL,'','2025-11-18','2025-11-22 19:01:32.268639','2025-11-22 19:01:32.268644',0,NULL,NULL,NULL),(129,2,'out',2200.00,34,12,'Restaurant dinner with family',NULL,'','2025-11-20','2025-11-22 19:01:32.269272','2025-11-22 19:01:32.269279',0,NULL,NULL,NULL),(130,2,'out',1800.00,35,13,'Uber rides',NULL,'','2025-11-22','2025-11-22 19:01:32.269837','2025-11-22 19:01:32.269843',0,NULL,NULL,NULL),(131,2,'out',3500.00,37,10,'Books and stationery',NULL,'','2025-11-25','2025-11-22 19:01:32.270093','2025-11-22 19:01:32.270101',0,NULL,NULL,NULL),(132,2,'in',85000.00,30,10,'Monthly salary - October 2025',NULL,'','2025-10-01','2025-11-22 19:01:32.270315','2025-11-22 19:01:32.270320',0,NULL,NULL,NULL),(133,2,'in',18000.00,31,10,'Mobile app UI design',NULL,'','2025-10-08','2025-11-22 19:01:32.270528','2025-11-22 19:01:32.270534',0,NULL,NULL,NULL),(134,2,'in',4500.00,33,10,'Stock dividend',NULL,'','2025-10-15','2025-11-22 19:01:32.270735','2025-11-22 19:01:32.270739',0,NULL,NULL,NULL),(135,2,'in',12000.00,32,11,'Consulting work',NULL,'','2025-10-20','2025-11-22 19:01:32.270947','2025-11-22 19:01:32.270952',0,NULL,NULL,NULL),(136,2,'out',9200.00,34,10,'Monthly groceries',NULL,'','2025-10-02','2025-11-22 19:01:32.271148','2025-11-22 19:01:32.271153',0,NULL,NULL,NULL),(137,2,'out',4200.00,35,10,'Fuel expenses',NULL,'','2025-10-05','2025-11-22 19:01:32.271342','2025-11-22 19:01:32.271347',0,NULL,NULL,NULL),(138,2,'out',5500.00,36,10,'Electricity, water, internet',NULL,'','2025-10-08','2025-11-22 19:01:32.271539','2025-11-22 19:01:32.271543',0,NULL,NULL,NULL),(139,2,'out',15000.00,37,12,'New laptop accessories',NULL,'','2025-10-12','2025-11-22 19:01:32.271743','2025-11-22 19:01:32.271747',0,NULL,NULL,NULL),(140,2,'out',3800.00,39,12,'Concert tickets',NULL,'','2025-10-16','2025-11-22 19:01:32.271976','2025-11-22 19:01:32.271981',0,NULL,NULL,NULL),(141,2,'out',2200.00,38,10,'Doctor consultation',NULL,'','2025-10-18','2025-11-22 19:01:32.272336','2025-11-22 19:01:32.272342',0,NULL,NULL,NULL),(142,2,'out',6000.00,40,10,'Professional certification',NULL,'','2025-10-22','2025-11-22 19:01:32.272570','2025-11-22 19:01:32.272575',0,NULL,NULL,NULL),(143,2,'out',1900.00,34,13,'Coffee shop and snacks',NULL,'','2025-10-25','2025-11-22 19:01:32.272842','2025-11-22 19:01:32.272847',0,NULL,NULL,NULL),(144,2,'out',2800.00,35,10,'Car maintenance',NULL,'','2025-10-28','2025-11-22 19:01:32.273078','2025-11-22 19:01:32.273083',0,NULL,NULL,NULL),(145,2,'in',85000.00,30,10,'Monthly salary - September 2025',NULL,'','2025-09-01','2025-11-22 19:01:32.273411','2025-11-22 19:01:32.273417',0,NULL,NULL,NULL),(146,2,'in',22000.00,31,10,'E-commerce website project',NULL,'','2025-09-10','2025-11-22 19:01:32.273950','2025-11-22 19:01:32.273955',0,NULL,NULL,NULL),(147,2,'in',3800.00,33,10,'Bond interest',NULL,'','2025-09-15','2025-11-22 19:01:32.274202','2025-11-22 19:01:32.274209',0,NULL,NULL,NULL),(148,2,'out',8008.00,40,11,'aWorkshop trainings',NULL,'','2025-09-25','2025-11-22 19:01:32.274519','2025-11-23 09:30:38.668618',0,NULL,NULL,NULL),(149,2,'out',8800.00,34,10,'Groceries and dining',NULL,'','2025-09-04','2025-11-22 19:01:32.274859','2025-11-22 19:01:32.274868',0,NULL,NULL,NULL),(150,2,'out',3600.00,35,13,'Fuel and parking',NULL,'','2025-09-07','2025-11-22 19:01:32.275180','2025-11-22 19:01:32.275186',0,NULL,NULL,NULL),(151,2,'out',4800.00,36,10,'Monthly bills',NULL,'','2025-09-10','2025-11-22 19:01:32.275421','2025-11-22 19:01:32.275426',0,NULL,NULL,NULL),(152,2,'out',18000.00,37,12,'Festival shopping',NULL,'','2025-09-15','2025-11-22 19:01:32.275634','2025-11-22 19:01:32.275639',0,NULL,NULL,NULL),(153,2,'out',4500.00,39,12,'Weekend getaway',NULL,'','2025-09-20','2025-11-22 19:01:32.275842','2025-11-22 19:01:32.275847',0,NULL,NULL,NULL),(154,2,'out',3200.00,38,10,'Medical tests',NULL,'','2025-09-22','2025-11-22 19:01:32.276048','2025-11-22 19:01:32.276052',0,NULL,NULL,NULL),(155,2,'out',5500.00,40,10,'Books and courses',NULL,'','2025-09-25','2025-11-22 19:01:32.276252','2025-11-22 19:01:32.276257',0,NULL,NULL,NULL),(156,2,'out',2100.00,34,10,'Party catering',NULL,'','2025-09-28','2025-11-22 19:01:32.276452','2025-11-22 19:01:32.276456',0,NULL,NULL,NULL),(157,2,'in',85000.00,30,10,'Monthly salary - August 2025',NULL,'','2025-08-01','2025-11-22 19:01:32.276659','2025-11-22 19:01:32.276663',0,NULL,NULL,NULL),(158,2,'in',15000.00,31,10,'Content writing project',NULL,'','2025-08-12','2025-11-22 19:01:32.276858','2025-11-22 19:01:32.276863',0,NULL,NULL,NULL),(159,2,'in',4200.00,33,10,'Mutual fund returns',NULL,'','2025-08-20','2025-11-22 19:01:32.277061','2025-11-22 19:01:32.277068',0,NULL,NULL,NULL),(160,2,'in',10000.00,32,11,'Client consultation',NULL,'','2025-08-28','2025-11-22 19:01:32.277263','2025-11-22 19:01:32.277268',0,NULL,NULL,NULL),(161,2,'out',9500.00,34,10,'Monthly food expenses',NULL,'','2025-08-03','2025-11-22 19:01:32.277518','2025-11-22 19:01:32.277523',0,NULL,NULL,NULL),(162,2,'out',4000.00,35,13,'Fuel and metro',NULL,'','2025-08-06','2025-11-22 19:01:32.277744','2025-11-22 19:01:32.277752',0,NULL,NULL,NULL),(163,2,'out',5200.00,36,10,'Bills payment',NULL,'','2025-08-09','2025-11-22 19:01:32.278058','2025-11-22 19:01:32.278065',0,NULL,NULL,NULL),(164,2,'out',14000.00,37,12,'Furniture shopping',NULL,'','2025-08-14','2025-11-22 19:01:32.278376','2025-11-22 19:01:32.278382',0,NULL,NULL,NULL),(165,2,'out',3200.00,39,12,'Movies and games',NULL,'','2025-08-18','2025-11-22 19:01:32.278656','2025-11-22 19:01:32.278661',0,NULL,NULL,NULL),(166,2,'out',2800.00,38,10,'Gym supplements',NULL,'','2025-08-20','2025-11-22 19:01:32.279045','2025-11-22 19:01:32.279054',0,NULL,NULL,NULL),(167,2,'out',4800.00,40,10,'Online workshop',NULL,'','2025-08-24','2025-11-22 19:01:32.279402','2025-11-22 19:01:32.279412',0,NULL,NULL,NULL),(168,2,'out',2400.00,34,10,'Birthday celebration',NULL,'','2025-08-26','2025-11-22 19:01:32.279751','2025-11-22 19:01:32.279759',0,NULL,NULL,NULL),(169,2,'out',3100.00,35,10,'Bike service',NULL,'','2025-08-29','2025-11-22 19:01:32.280123','2025-11-22 19:01:32.280132',0,NULL,NULL,NULL),(170,2,'out',1200.00,34,13,'Pizza delivery',NULL,'','2025-11-08','2025-11-22 19:01:32.280420','2025-11-22 19:01:32.280426',0,NULL,NULL,NULL),(171,2,'out',2600.00,37,12,'Gift items',NULL,'','2025-11-14','2025-11-22 19:01:32.280662','2025-11-22 19:01:32.280667',0,NULL,NULL,NULL),(172,2,'out',1800.00,39,12,'Gaming subscription',NULL,'','2025-11-17','2025-11-22 19:01:32.281069','2025-11-22 19:01:32.281074',0,NULL,NULL,NULL),(173,2,'out',3400.00,38,10,'Dental checkup',NULL,'','2025-11-19','2025-11-22 19:01:32.281271','2025-11-22 19:01:32.281275',0,NULL,NULL,NULL),(174,2,'out',1600.00,35,13,'Auto rickshaw rides',NULL,'','2025-11-21','2025-11-22 19:01:32.281494','2025-11-22 19:01:32.281498',0,NULL,NULL,NULL),(175,2,'out',2900.00,34,10,'Lunch meetings',NULL,'','2025-10-11','2025-11-22 19:01:32.281715','2025-11-22 19:01:32.281719',0,NULL,NULL,NULL),(176,2,'out',1500.00,37,13,'Mobile accessories',NULL,'','2025-10-14','2025-11-22 19:01:32.281928','2025-11-22 19:01:32.281932',0,NULL,NULL,NULL),(177,2,'out',2200.00,39,12,'Sports event tickets',NULL,'','2025-10-19','2025-11-22 19:01:32.282181','2025-11-22 19:01:32.282188',0,NULL,NULL,NULL),(178,2,'out',1700.00,34,13,'Street food',NULL,'','2025-10-24','2025-11-22 19:01:32.282433','2025-11-22 19:01:32.282439',0,NULL,NULL,NULL),(179,2,'out',3600.00,37,12,'Home decor',NULL,'','2025-09-12','2025-11-22 19:01:32.282667','2025-11-22 19:01:32.282672',0,NULL,NULL,NULL),(180,2,'out',2000.00,39,13,'Museum tickets',NULL,'','2025-09-18','2025-11-22 19:01:32.282973','2025-11-22 19:01:32.282978',0,NULL,NULL,NULL),(181,2,'out',1400.00,34,13,'Breakfast cafe',NULL,'','2025-09-23','2025-11-22 19:01:32.283266','2025-11-22 19:01:32.283273',0,NULL,NULL,NULL),(182,2,'out',2700.00,38,10,'Physiotherapy',NULL,'','2025-09-26','2025-11-22 19:01:32.283593','2025-11-22 19:01:32.283599',0,NULL,NULL,NULL),(183,2,'out',1900.00,35,10,'Toll charges',NULL,'','2025-08-11','2025-11-22 19:01:32.283864','2025-11-22 19:01:32.283870',0,NULL,NULL,NULL),(184,2,'out',2500.00,37,12,'Shoes purchase',NULL,'','2025-08-16','2025-11-22 19:01:32.284064','2025-11-22 19:01:32.284073',0,NULL,NULL,NULL),(185,2,'out',3300.00,39,12,'Adventure park',NULL,'','2025-08-22','2025-11-22 19:01:32.284254','2025-11-22 19:01:32.284258',0,NULL,NULL,NULL),(186,2,'out',1600.00,34,13,'Ice cream parlor',NULL,'','2025-08-27','2025-11-22 19:01:32.284438','2025-11-22 19:01:32.284442',0,NULL,NULL,NULL),(187,2,'out',2800.00,34,10,'Office lunch',NULL,'','2025-11-09','2025-11-22 19:01:32.284619','2025-11-22 19:01:32.284623',0,NULL,NULL,NULL),(188,2,'out',1350.00,35,13,'Taxi fare',NULL,'','2025-11-11','2025-11-22 19:01:32.284814','2025-11-22 19:01:32.284818',0,NULL,NULL,NULL),(189,2,'out',4200.00,37,12,'Gadgets purchase',NULL,'','2025-11-13','2025-11-22 19:01:32.284984','2025-11-22 19:01:32.284988',0,NULL,NULL,NULL),(190,2,'out',1750.00,39,12,'Streaming services',NULL,'','2025-11-16','2025-11-22 19:01:32.285173','2025-11-22 19:01:32.285177',0,NULL,NULL,NULL),(191,2,'out',3200.00,38,10,'Health supplements',NULL,'','2025-11-23','2025-11-22 19:01:32.285351','2025-11-22 19:01:32.285355',0,NULL,NULL,NULL),(192,2,'out',2150.00,34,10,'Weekend brunch',NULL,'','2025-10-06','2025-11-22 19:01:32.285532','2025-11-22 19:01:32.285536',0,NULL,NULL,NULL),(193,2,'out',1850.00,35,10,'Train tickets',NULL,'','2025-10-09','2025-11-22 19:01:32.285710','2025-11-22 19:01:32.285716',0,NULL,NULL,NULL),(194,2,'out',3800.00,37,12,'Sports equipment',NULL,'','2025-10-15','2025-11-22 19:01:32.285886','2025-11-22 19:01:32.285890',0,NULL,NULL,NULL),(195,2,'out',2400.00,39,12,'Theatre show',NULL,'','2025-10-21','2025-11-22 19:01:32.286069','2025-11-22 19:01:32.286075',0,NULL,NULL,NULL),(196,2,'out',1950.00,34,13,'Fast food',NULL,'','2025-10-26','2025-11-22 19:01:32.286270','2025-11-22 19:01:32.286276',0,NULL,NULL,NULL),(197,2,'out',3500.00,38,10,'Eye checkup',NULL,'','2025-10-29','2025-11-22 19:01:32.286477','2025-11-22 19:01:32.286481',0,NULL,NULL,NULL),(198,2,'out',2250.00,35,10,'Bike repair',NULL,'','2025-09-05','2025-11-22 19:01:32.286735','2025-11-22 19:01:32.286741',0,NULL,NULL,NULL),(199,2,'out',4100.00,37,12,'Kitchen appliances',NULL,'','2025-09-11','2025-11-22 19:01:32.287257','2025-11-22 19:01:32.287264',0,NULL,NULL,NULL),(200,2,'out',1650.00,39,13,'Amusement park',NULL,'','2025-09-16','2025-11-22 19:01:32.287493','2025-11-22 19:01:32.287497',0,NULL,NULL,NULL),(201,2,'out',2850.00,34,10,'Family dinner',NULL,'','2025-09-21','2025-11-22 19:01:32.287705','2025-11-22 19:01:32.287711',0,NULL,NULL,NULL),(202,2,'out',1450.00,35,13,'Bus pass',NULL,'','2025-09-27','2025-11-22 19:01:32.287917','2025-11-22 19:01:32.287921',0,NULL,NULL,NULL),(203,2,'out',3700.00,38,10,'Lab tests',NULL,'','2025-09-29','2025-11-22 19:01:32.288115','2025-11-22 19:01:32.288119',0,NULL,NULL,NULL),(204,2,'out',2050.00,37,12,'Cosmetics',NULL,'','2025-08-05','2025-11-22 19:01:32.288301','2025-11-22 19:01:32.288309',0,NULL,NULL,NULL),(205,2,'out',1550.00,39,13,'Book club',NULL,'','2025-08-10','2025-11-22 19:01:32.288493','2025-11-22 19:01:32.288497',0,NULL,NULL,NULL),(206,2,'out',2950.00,34,10,'Cooking ingredients',NULL,'','2025-08-15','2025-11-22 19:01:32.288728','2025-11-22 19:01:32.288732',0,NULL,NULL,NULL),(207,2,'out',1750.00,35,13,'Parking fees',NULL,'','2025-08-19','2025-11-22 19:01:32.288950','2025-11-22 19:01:32.288954',0,NULL,NULL,NULL),(208,2,'out',3400.00,38,10,'Vaccination',NULL,'','2025-08-23','2025-11-22 19:01:32.289154','2025-11-22 19:01:32.289159',0,NULL,NULL,NULL),(209,2,'out',2650.00,37,10,'Pet supplies',NULL,'','2025-08-28','2025-11-22 19:01:32.289420','2025-11-22 19:01:32.289427',0,NULL,NULL,NULL),(210,2,'in',7500.00,31,10,'Content editing',NULL,'','2025-11-24','2025-11-22 19:01:32.289805','2025-11-22 19:01:32.289813',0,NULL,NULL,NULL),(211,2,'in',6200.00,32,11,'Consultation fee',NULL,'','2025-10-27','2025-11-22 19:01:32.290100','2025-11-22 19:01:32.290105',0,NULL,NULL,NULL),(212,2,'in',5800.00,31,10,'Graphic design',NULL,'','2025-09-19','2025-11-22 19:01:32.290319','2025-11-22 19:01:32.290325',0,NULL,NULL,NULL),(213,2,'in',8500.00,32,11,'Training session',NULL,'','2025-08-21','2025-11-22 19:01:32.290523','2025-11-22 19:01:32.290527',0,NULL,NULL,NULL),(214,2,'out',2300.00,34,10,'Catering service',NULL,'','2025-11-26','2025-11-22 19:01:32.290778','2025-11-22 19:01:32.290786',0,NULL,NULL,NULL),(215,2,'out',1900.00,35,12,'Flight booking',NULL,'','2025-10-30','2025-11-22 19:01:32.290994','2025-11-22 19:01:32.290998',0,NULL,NULL,NULL),(216,2,'out',3100.00,37,12,'Gifts and flowers',NULL,'','2025-09-30','2025-11-22 19:01:32.291266','2025-11-22 19:01:32.291273',0,NULL,NULL,NULL),(217,2,'out',2700.00,39,12,'DJ night',NULL,'','2025-08-31','2025-11-22 19:01:32.291603','2025-11-22 19:01:32.291612',0,NULL,NULL,NULL),(218,2,'out',20.00,35,13,'dfdfdf',NULL,'','2025-11-22','2025-11-22 19:26:09.143682','2025-11-22 19:26:09.143735',0,NULL,NULL,NULL),(219,2,'out',1122.00,53,16,'dddd',NULL,'','2025-11-23','2025-11-23 09:27:50.128218','2025-11-23 09:27:50.128256',0,NULL,NULL,NULL),(227,2,'out',318.60,40,17,'Adobe',NULL,'Auto-payment for Adobe','2025-11-28','2025-11-28 15:45:20.672571','2025-11-28 15:45:20.672612',0,NULL,NULL,NULL),(228,2,'out',318.60,40,17,'Adobe',NULL,'Auto-payment for Adobe','2025-11-28','2025-11-28 15:45:46.213739','2025-11-28 15:45:46.213766',0,NULL,NULL,NULL),(229,2,'out',318.60,40,17,'Adobe',NULL,'Auto-payment for Adobe','2025-11-28','2025-11-28 15:45:59.246119','2025-11-28 15:45:59.246150',0,NULL,NULL,NULL),(230,2,'out',318.60,40,17,'Adobe',NULL,'Auto-payment for Adobe','2025-11-28','2025-11-28 15:56:06.009525','2025-11-28 15:56:06.009656',0,NULL,NULL,NULL),(231,2,'in',100.00,33,12,'df',2,'','2025-11-29','2025-11-29 05:39:37.495901','2025-11-29 05:39:37.495942',0,NULL,NULL,NULL);
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transfers`
--

DROP TABLE IF EXISTS `transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transfers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `from_account_id` bigint NOT NULL,
  `to_account_id` bigint NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `description` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` longtext COLLATE utf8mb4_unicode_ci,
  `transfer_date` date NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `from_account_id` (`from_account_id`),
  KEY `to_account_id` (`to_account_id`),
  KEY `ix_transfers_sort` (`transfer_date`,`created_at`),
  KEY `idx_transfers_is_deleted` (`is_deleted`),
  KEY `idx_transfers_deleted_at` (`deleted_at`),
  CONSTRAINT `transfers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transfers_ibfk_2` FOREIGN KEY (`from_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transfers_ibfk_3` FOREIGN KEY (`to_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transfers`
--

LOCK TABLES `transfers` WRITE;
/*!40000 ALTER TABLE `transfers` DISABLE KEYS */;
INSERT INTO `transfers` VALUES (12,2,10,11,20000.00,'Transfer for business expenses','','2025-11-02','2025-11-22 19:01:32.292246','2025-11-22 19:01:32.292251',0,NULL),(13,2,10,13,5000.00,'Wallet top-up','','2025-11-06','2025-11-22 19:01:32.292499','2025-11-22 19:01:32.292504',0,NULL),(14,2,11,10,15000.00,'Moving funds to savings','','2025-11-14','2025-11-22 19:01:32.292720','2025-11-22 19:01:32.292725',0,NULL),(15,2,10,12,25000.00,'Credit card payment','','2025-11-20','2025-11-22 19:01:32.293151','2025-11-22 19:01:32.293156',0,NULL),(16,2,16,12,12900.00,'Trnnnadfdf','','2025-11-23','2025-11-23 09:36:00.613039','2025-11-23 09:36:00.613104',0,NULL);
/*!40000 ALTER TABLE `transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trial_conversion_log`
--

DROP TABLE IF EXISTS `trial_conversion_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trial_conversion_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `trial_id` bigint NOT NULL,
  `conversion_date` datetime(6) NOT NULL,
  `plan_id` bigint NOT NULL,
  `billing_cycle` varchar(20) NOT NULL DEFAULT 'monthly',
  `notes` longtext,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `trial_id` (`trial_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `trial_conversion_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trial_conversion_log_ibfk_2` FOREIGN KEY (`trial_id`) REFERENCES `trial_period` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trial_conversion_log_ibfk_3` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trial_conversion_log`
--

LOCK TABLES `trial_conversion_log` WRITE;
/*!40000 ALTER TABLE `trial_conversion_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `trial_conversion_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trial_period`
--

DROP TABLE IF EXISTS `trial_period`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trial_period` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `plan_id` bigint NOT NULL,
  `started_at` datetime(6) NOT NULL,
  `ends_at` datetime(6) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `converted_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `trial_period_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trial_period_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trial_period`
--

LOCK TABLES `trial_period` WRITE;
/*!40000 ALTER TABLE `trial_period` DISABLE KEYS */;
/*!40000 ALTER TABLE `trial_period` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usage_limits`
--

DROP TABLE IF EXISTS `usage_limits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usage_limits` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `plan_id` bigint NOT NULL,
  `limit_type` varchar(50) NOT NULL,
  `limit_value` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_plan_limit_type` (`plan_id`,`limit_type`),
  CONSTRAINT `usage_limits_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usage_limits`
--

LOCK TABLES `usage_limits` WRITE;
/*!40000 ALTER TABLE `usage_limits` DISABLE KEYS */;
/*!40000 ALTER TABLE `usage_limits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usage_logs`
--

DROP TABLE IF EXISTS `usage_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usage_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `resource_type` varchar(50) NOT NULL,
  `resource_id` bigint DEFAULT NULL,
  `action` varchar(20) NOT NULL,
  `endpoint` varchar(255) DEFAULT NULL,
  `method` varchar(10) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` longtext,
  `response_time_ms` int NOT NULL DEFAULT '0',
  `status_code` int DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_created` (`user_id`,`created_at`),
  KEY `idx_user_resource` (`user_id`,`resource_type`),
  KEY `idx_usage_logs_is_deleted` (`is_deleted`),
  KEY `idx_usage_logs_deleted_at` (`deleted_at`),
  CONSTRAINT `usage_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usage_logs`
--

LOCK TABLES `usage_logs` WRITE;
/*!40000 ALTER TABLE `usage_logs` DISABLE KEYS */;
INSERT INTO `usage_logs` VALUES (1,5,'bank_account',18,'create',NULL,NULL,NULL,NULL,0,NULL,'2025-11-30 12:12:06.657683',0,NULL),(2,5,'bank_account',19,'create',NULL,NULL,NULL,NULL,0,NULL,'2025-11-30 12:12:26.115811',0,NULL),(3,5,'transfer',17,'create',NULL,NULL,NULL,NULL,0,NULL,'2025-11-30 12:13:00.105337',0,NULL),(4,5,'bank_account',20,'create',NULL,NULL,NULL,NULL,0,NULL,'2025-11-30 14:28:28.408663',0,NULL);
/*!40000 ALTER TABLE `usage_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_subscriptions`
--

DROP TABLE IF EXISTS `user_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_subscriptions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `plan_id` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `billing_cycle` varchar(20) NOT NULL DEFAULT 'monthly',
  `started_at` datetime(6) NOT NULL,
  `current_period_start` date NOT NULL,
  `current_period_end` date NOT NULL,
  `cancelled_at` datetime(6) DEFAULT NULL,
  `auto_renew` tinyint(1) NOT NULL DEFAULT '1',
  `payment_method_id` varchar(100) DEFAULT NULL,
  `is_trial` tinyint(1) NOT NULL DEFAULT '0',
  `trial_ends_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `plan_id` (`plan_id`),
  KEY `idx_user_subscriptions_is_deleted` (`is_deleted`),
  KEY `idx_user_subscriptions_deleted_at` (`deleted_at`),
  CONSTRAINT `user_subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_subscriptions_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_subscriptions`
--

LOCK TABLES `user_subscriptions` WRITE;
/*!40000 ALTER TABLE `user_subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_usage_stats`
--

DROP TABLE IF EXISTS `user_usage_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_usage_stats` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `month` date NOT NULL,
  `transactions_created` int NOT NULL DEFAULT '0',
  `bank_accounts_created` int NOT NULL DEFAULT '0',
  `investments_created` int NOT NULL DEFAULT '0',
  `loans_created` int NOT NULL DEFAULT '0',
  `reminders_created` int NOT NULL DEFAULT '0',
  `api_calls_today` int NOT NULL DEFAULT '0',
  `api_calls_last_reset` datetime(6) NOT NULL,
  `storage_used_mb` float NOT NULL DEFAULT '0',
  `updated_at` datetime(6) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_month` (`user_id`,`month`),
  KEY `idx_user_usage_stats_is_deleted` (`is_deleted`),
  KEY `idx_user_usage_stats_deleted_at` (`deleted_at`),
  CONSTRAINT `user_usage_stats_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_usage_stats`
--

LOCK TABLES `user_usage_stats` WRITE;
/*!40000 ALTER TABLE `user_usage_stats` DISABLE KEYS */;
INSERT INTO `user_usage_stats` VALUES (1,5,'2025-11-01',0,3,0,0,0,0,'2025-11-30 12:12:06.662138',0,'2025-11-30 14:28:28.418452',0,NULL);
/*!40000 ALTER TABLE `user_usage_stats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_loginattempt`
--

DROP TABLE IF EXISTS `users_loginattempt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_loginattempt` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` char(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempt_time` datetime(6) NOT NULL,
  `success` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `ix_users_loginattempt_email_attempt_time` (`email`,`attempt_time`),
  KEY `ix_users_loginattempt_ip_address_attempt_time` (`ip_address`,`attempt_time`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_loginattempt`
--

LOCK TABLES `users_loginattempt` WRITE;
/*!40000 ALTER TABLE `users_loginattempt` DISABLE KEYS */;
INSERT INTO `users_loginattempt` VALUES (1,'test@example.com','127.0.0.1','2025-11-22 16:13:35.319758',0),(2,'test@example.com','127.0.0.1','2025-11-22 16:13:51.818200',0),(3,'test@example.com','127.0.0.1','2025-11-22 16:15:15.848548',0),(4,'test@example.com','127.0.0.1','2025-11-22 16:15:26.140777',0),(5,'test@example.com','127.0.0.1','2025-11-22 16:35:45.377714',0),(6,'test@example.com','127.0.0.1','2025-11-22 16:35:50.937243',0),(7,'test@example.com','127.0.0.1','2025-11-22 16:36:04.581999',0),(8,'test@example.com','127.0.0.1','2025-11-22 16:36:25.142082',1),(9,'test@example.com','127.0.0.1','2025-11-22 17:21:49.451665',1),(10,'test@example.com','127.0.0.1','2025-11-22 18:46:57.344023',1),(11,'test@example.com','127.0.0.1','2025-11-22 19:43:38.080218',1),(12,'test@example.com','127.0.0.1','2025-11-23 03:29:16.412778',0),(13,'test@example.com','127.0.0.1','2025-11-23 03:29:20.987478',1),(14,'test@example.com','127.0.0.1','2025-11-28 14:43:52.183240',0),(15,'newuser@test.com','127.0.0.1','2025-11-28 15:35:04.516864',1),(16,'testuser@example.com','127.0.0.1','2025-11-28 15:35:44.986760',0),(17,'testuser@example.com','127.0.0.1','2025-11-28 15:35:50.305013',0),(18,'testuser@example.com','127.0.0.1','2025-11-28 15:43:13.570375',0),(19,'testuser@example.com','127.0.0.1','2025-11-28 15:43:30.635890',0),(20,'test@example.com','127.0.0.1','2025-11-28 15:43:36.155404',1),(21,'test@example.com','127.0.0.1','2025-11-29 02:59:37.689264',1),(22,'test@example.com','127.0.0.1','2025-11-29 03:00:03.767512',1),(23,'test@example.com','127.0.0.1','2025-11-30 04:52:03.192408',1),(24,'test@example.com','127.0.0.1','2025-11-30 05:43:43.284625',1),(25,'test@example.com','127.0.0.1','2025-11-30 06:35:45.840602',1),(26,'test@example.com','127.0.0.1','2025-11-30 10:49:14.763584',1),(27,'test@example.com','127.0.0.1','2025-11-30 11:35:40.894899',1);
/*!40000 ALTER TABLE `users_loginattempt` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_passwordresettoken`
--

DROP TABLE IF EXISTS `users_passwordresettoken`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_passwordresettoken` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT '0',
  `used_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `users_passwordresettoken_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_passwordresettoken`
--

LOCK TABLES `users_passwordresettoken` WRITE;
/*!40000 ALTER TABLE `users_passwordresettoken` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_passwordresettoken` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_user`
--

DROP TABLE IF EXISTS `users_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `password` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL DEFAULT '0',
  `username` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `last_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `email` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_staff` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `date_joined` datetime(6) NOT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `address` longtext COLLATE utf8mb4_unicode_ci,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `email_verified_at` datetime(6) DEFAULT NULL,
  `subscription_plan` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free',
  `subscription_active` tinyint(1) NOT NULL DEFAULT '1',
  `subscription_expires_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `ix_users_user_email` (`email`),
  KEY `ix_users_user_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_user`
--

LOCK TABLES `users_user` WRITE;
/*!40000 ALTER TABLE `users_user` DISABLE KEYS */;
INSERT INTO `users_user` VALUES (1,'pbkdf2_sha256$870000$97m0dzjKZ104VQYL9m6SsZ$5HWp4r+34zYyH9RU+IdmVgXUZReCGa9EsZFLjv7/u9I=','2025-11-22 14:03:34.053798',1,'admin','Admin','User','admin@transactplus.com',1,1,'2025-11-22 19:24:39.000000','+91-8888888888',NULL,NULL,'Mumbai','Maharashtra','India',NULL,1,'2025-11-22 19:24:39.000000','enterprise',1,NULL,'2025-11-22 19:24:39.000000','2025-11-22 16:12:27.070479'),(2,'pbkdf2_sha256$870000$YNU6Oqz9ryRufJLFx3E1yf$x4jF67Phm17uJvx2LsfEhzqN3cVaLZsfKdVIjEEH+ss=',NULL,0,'testuser','Test','User','test@example.com',0,1,'2025-11-22 19:24:39.000000','+91-9876543210',NULL,NULL,'Mumbai','Maharashtra','India',NULL,1,'2025-11-22 19:24:39.000000','premium',1,NULL,'2025-11-22 19:24:39.000000','2025-11-28 15:43:25.258384'),(3,'pbkdf2_sha256$870000$1GXl39ZaxOXP5VSQsNkpnM$yfaf4Lx0z0ZCO85d7zPTXp/zgJfimeMqcWTmnA1jUWw=',NULL,0,'newuser@test.com','new','user','newuser@test.com',0,1,'2025-11-22 14:15:36.238585',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,'free',1,NULL,'2025-11-22 14:15:36.438630','2025-11-28 15:34:48.853677'),(5,'pbkdf2_sha256$870000$VW5MMa9O0MCVlR2m9Hjcj2$jOGryUJSO6QZZrJOKxSNXiGjviMqu62QfIMxHp0nHgg=',NULL,0,'first@test.com','first','test','first@test.com',0,1,'2025-11-30 12:11:20.483598',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,'free',1,NULL,'2025-11-30 12:11:20.677930','2025-11-30 12:11:20.677940');
/*!40000 ALTER TABLE `users_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_user_groups`
--

DROP TABLE IF EXISTS `users_user_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_user_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_user_groups_user_group_uniq` (`user_id`,`group_id`),
  KEY `users_user_groups_group_id_fk` (`group_id`),
  CONSTRAINT `users_user_groups_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `users_user_groups_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_user_groups`
--

LOCK TABLES `users_user_groups` WRITE;
/*!40000 ALTER TABLE `users_user_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_user_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_user_user_permissions`
--

DROP TABLE IF EXISTS `users_user_user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_user_user_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_user_user_perms_uniq` (`user_id`,`permission_id`),
  KEY `users_user_user_perms_permission_id_fk` (`permission_id`),
  CONSTRAINT `users_user_user_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `users_user_user_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_user_user_permissions`
--

LOCK TABLES `users_user_user_permissions` WRITE;
/*!40000 ALTER TABLE `users_user_user_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_user_user_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_useremailtoken`
--

DROP TABLE IF EXISTS `users_useremailtoken`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_useremailtoken` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `token` (`token`),
  CONSTRAINT `users_useremailtoken_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_useremailtoken`
--

LOCK TABLES `users_useremailtoken` WRITE;
/*!40000 ALTER TABLE `users_useremailtoken` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_useremailtoken` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-30 20:57:53
