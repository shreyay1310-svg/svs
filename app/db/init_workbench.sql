-- MySQL Workbench compatible schema for Kimi Agent
-- Open this file in MySQL Workbench and Execute All (lightning bolt)

CREATE DATABASE IF NOT EXISTS `kimi_agent` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `kimi_agent`;

-- Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `name_hi` VARCHAR(255),
  `email` VARCHAR(320) NOT NULL UNIQUE,
  `mobile` VARCHAR(20),
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','staff','student') NOT NULL DEFAULT 'student',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `dob` DATE,
  `gender` ENUM('male','female','other'),
  `college_id` BIGINT UNSIGNED,
  `avatar` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignInAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- OTP records
CREATE TABLE IF NOT EXISTS `otp_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(320),
  `mobile` VARCHAR(20),
  `otp` VARCHAR(10) NOT NULL,
  `purpose` ENUM('login','forgot_password','final_submit') NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_used` TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_name` VARCHAR(100) NOT NULL,
  `short_name` VARCHAR(50) NOT NULL,
  `description` TEXT,
  `permissions` TEXT,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Colleges
CREATE TABLE IF NOT EXISTS `colleges` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `college_name` VARCHAR(255) NOT NULL,
  `college_name_hi` VARCHAR(255),
  `college_code` VARCHAR(50) NOT NULL UNIQUE,
  `address` TEXT,
  `contact_email` VARCHAR(320),
  `phone` VARCHAR(20),
  `website` VARCHAR(255),
  `established_year` INT,
  `accreditation` VARCHAR(255),
  `affiliation` VARCHAR(255),
  `state` VARCHAR(100),
  `district` VARCHAR(100),
  `pincode` VARCHAR(20),
  `principal_name` VARCHAR(255),
  `total_students` INT,
  `campus_area` VARCHAR(100),
  `land_area` VARCHAR(100),
  `motto` VARCHAR(255),
  `logo_url` TEXT,
  `description` TEXT,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Courses
CREATE TABLE IF NOT EXISTS `courses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_name` VARCHAR(255) NOT NULL,
  `course_name_hi` VARCHAR(255),
  `course_code` VARCHAR(50),
  `college_id` BIGINT UNSIGNED NOT NULL,
  `duration_years` INT,
  `duration_months` INT,
  `credits` INT,
  `level` VARCHAR(100),
  `seats` INT,
  `fee` INT,
  `eligibility` TEXT,
  `syllabus_url` TEXT,
  `coordinator_name` VARCHAR(255),
  `coordinator_email` VARCHAR(320),
  `is_professional` TINYINT(1),
  `intake_per_year` INT,
  `mode` VARCHAR(50),
  `campus` VARCHAR(255),
  `remarks` TEXT,
  `description` TEXT,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`college_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Subjects
CREATE TABLE IF NOT EXISTS `subjects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `subject_name` VARCHAR(255) NOT NULL,
  `subject_name_hi` VARCHAR(255),
  `course_type` ENUM('honors','masters') NOT NULL,
  `course_id` BIGINT UNSIGNED NOT NULL,
  `college_id` BIGINT UNSIGNED NOT NULL,
  `subject_code` VARCHAR(100),
  `credits` INT,
  `semester` INT,
  `theory_marks` INT,
  `practical_marks` INT,
  `total_marks` INT,
  `is_elective` TINYINT(1),
  `prerequisites` TEXT,
  `learning_outcomes` TEXT,
  `syllabus_url` TEXT,
  `reference_books` TEXT,
  `lab_required` TINYINT(1),
  `hours_per_week` INT,
  `assessment_method` VARCHAR(100),
  `remarks` TEXT,
  `description` TEXT,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`course_id`),
  INDEX (`college_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Students
CREATE TABLE IF NOT EXISTS `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED,
  `roll_number` VARCHAR(100) NOT NULL UNIQUE,
  `enrollment_number` VARCHAR(100) NOT NULL UNIQUE,
  `college_id` BIGINT UNSIGNED NOT NULL,
  `course_id` BIGINT UNSIGNED NOT NULL,
  `subject_id` BIGINT UNSIGNED,
  `course_type` ENUM('honors','masters'),
  `name` VARCHAR(255) NOT NULL,
  `name_hi` VARCHAR(255),
  `father_name` VARCHAR(255),
  `father_name_hi` VARCHAR(255),
  `mother_name` VARCHAR(255),
  `mother_name_hi` VARCHAR(255),
  `gender` ENUM('male','female','other') NOT NULL,
  `category` ENUM('regular','private','ex','back') NOT NULL,
  `division` VARCHAR(100),
  `passing_year` INT,
  `passing_month` VARCHAR(50),
  `photo_url` TEXT,
  `marksheet_url` TEXT,
  `application_letter_url` TEXT,
  `signature_data` LONGTEXT,
  `is_final_submitted` TINYINT(1) NOT NULL DEFAULT 0,
  `is_locked` TINYINT(1) NOT NULL DEFAULT 0,
  `can_reedit` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`user_id`),
  INDEX (`college_id`),
  INDEX (`course_id`),
  INDEX (`subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Activity logs
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `user_name` VARCHAR(255),
  `action` VARCHAR(255) NOT NULL,
  `entity_type` VARCHAR(100),
  `entity_id` BIGINT UNSIGNED,
  `details` TEXT,
  `ip_address` VARCHAR(100),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (`user_id`),
  INDEX (`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create application DB user and grant privileges
CREATE USER IF NOT EXISTS 'kimi'@'127.0.0.1' IDENTIFIED BY 'Rahul@8052';
CREATE USER IF NOT EXISTS 'kimi'@'localhost' IDENTIFIED BY 'Rahul@8052';
GRANT ALL PRIVILEGES ON `kimi_agent`.* TO 'kimi'@'127.0.0.1';
GRANT ALL PRIVILEGES ON `kimi_agent`.* TO 'kimi'@'localhost';
FLUSH PRIVILEGES;

-- End of file
