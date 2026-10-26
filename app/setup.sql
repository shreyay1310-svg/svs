-- Create database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'kimi_agent')
BEGIN
    CREATE DATABASE kimi_agent;
END;
GO

USE kimi_agent;
GO

-- Users table
IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        userId VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        name_hi NVARCHAR(255),
        email VARCHAR(320) NOT NULL UNIQUE,
        mobile VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'student',
        is_active BIT DEFAULT 1 NOT NULL,
        dob DATE,
        gender VARCHAR(10),
        college_id BIGINT,
        avatar NVARCHAR(MAX),
        createdAt DATETIME2 DEFAULT GETDATE() NOT NULL,
        updatedAt DATETIME2 DEFAULT GETDATE() NOT NULL,
        lastSignInAt DATETIME2 DEFAULT GETDATE() NOT NULL,
        CONSTRAINT chk_users_role CHECK (role IN ('admin','staff','student')),
        CONSTRAINT chk_users_gender CHECK (gender IN ('male','female','other'))
    );
    CREATE INDEX id_userId ON users(userId);
    CREATE INDEX id_email ON users(email);
    CREATE INDEX id_role ON users(role);
END;
GO

-- OTP Records table
IF OBJECT_ID('dbo.otp_records', 'U') IS NULL
BEGIN
    CREATE TABLE otp_records (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email VARCHAR(320),
        mobile VARCHAR(20),
        otp VARCHAR(10) NOT NULL,
        purpose VARCHAR(20) NOT NULL,
        expires_at DATETIME2 NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE() NOT NULL,
        is_used BIT DEFAULT 0 NOT NULL,
        CONSTRAINT chk_otp_purpose CHECK (purpose IN ('login','forgot_password','final_submit'))
    );
END;
GO

-- Roles table
IF OBJECT_ID('dbo.roles', 'U') IS NULL
BEGIN
    CREATE TABLE roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        role_name VARCHAR(100) NOT NULL,
        short_name VARCHAR(50) NOT NULL,
        description NVARCHAR(MAX),
        permissions NVARCHAR(MAX),
        is_active BIT DEFAULT 1 NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE() NOT NULL,
        updated_at DATETIME2 DEFAULT GETDATE() NOT NULL
    );
END;
GO

-- Colleges table
IF OBJECT_ID('dbo.colleges', 'U') IS NULL
BEGIN
    CREATE TABLE colleges (
        id INT IDENTITY(1,1) PRIMARY KEY,
        college_name VARCHAR(255) NOT NULL,
        college_name_hi NVARCHAR(255),
        college_code VARCHAR(50) NOT NULL UNIQUE,
        address NVARCHAR(MAX),
        description NVARCHAR(MAX),
        is_active BIT DEFAULT 1 NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE() NOT NULL,
        updated_at DATETIME2 DEFAULT GETDATE() NOT NULL
    );
END;
GO

-- Courses table
IF OBJECT_ID('dbo.courses', 'U') IS NULL
BEGIN
    CREATE TABLE courses (
        id INT IDENTITY(1,1) PRIMARY KEY,
        course_name VARCHAR(255) NOT NULL,
        course_name_hi NVARCHAR(255),
        course_code VARCHAR(50),
        college_id BIGINT NOT NULL,
        description NVARCHAR(MAX),
        is_active BIT DEFAULT 1 NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE() NOT NULL,
        updated_at DATETIME2 DEFAULT GETDATE() NOT NULL
    );
END;
GO

-- Subjects table
IF OBJECT_ID('dbo.subjects', 'U') IS NULL
BEGIN
    CREATE TABLE subjects (
        id INT IDENTITY(1,1) PRIMARY KEY,
        subject_name VARCHAR(255) NOT NULL,
        subject_name_hi NVARCHAR(255),
        course_type VARCHAR(10) NOT NULL,
        course_id BIGINT NOT NULL,
        college_id BIGINT NOT NULL,
        description NVARCHAR(MAX),
        is_active BIT DEFAULT 1 NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE() NOT NULL,
        updated_at DATETIME2 DEFAULT GETDATE() NOT NULL,
        CONSTRAINT chk_subject_course_type CHECK (course_type IN ('honors','masters'))
    );
END;
GO

-- Students table
IF OBJECT_ID('dbo.students', 'U') IS NULL
BEGIN
    CREATE TABLE students (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id BIGINT NOT NULL,
        roll_number VARCHAR(100) NOT NULL UNIQUE,
        enrollment_number VARCHAR(100) NOT NULL UNIQUE,
        college_id BIGINT NOT NULL,
        course_id BIGINT NOT NULL,
        subject_id BIGINT,
        course_type VARCHAR(10),
        name VARCHAR(255) NOT NULL,
        name_hi NVARCHAR(255),
        father_name VARCHAR(255),
        father_name_hi NVARCHAR(255),
        mother_name VARCHAR(255),
        mother_name_hi NVARCHAR(255),
        gender VARCHAR(10) NOT NULL,
        category VARCHAR(10) NOT NULL,
        division VARCHAR(100),
        passing_year INT,
        passing_month VARCHAR(50),
        photo_url NVARCHAR(MAX),
        marksheet_url NVARCHAR(MAX),
        application_letter_url NVARCHAR(MAX),
        signature_data NVARCHAR(MAX),
        is_final_submitted BIT DEFAULT 0 NOT NULL,
        is_locked BIT DEFAULT 0 NOT NULL,
        can_reedit BIT DEFAULT 0 NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE() NOT NULL,
        updated_at DATETIME2 DEFAULT GETDATE() NOT NULL,
        CONSTRAINT chk_students_gender CHECK (gender IN ('male','female','other')),
        CONSTRAINT chk_students_category CHECK (category IN ('regular','private','ex','back')),
        CONSTRAINT chk_students_course_type CHECK (course_type IN ('honors','masters'))
    );
END;
GO

-- Activity logs table
IF OBJECT_ID('dbo.activity_logs', 'U') IS NULL
BEGIN
    CREATE TABLE activity_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id BIGINT,
        user_name VARCHAR(255),
        action VARCHAR(100),
        details NVARCHAR(MAX),
        ip_address VARCHAR(50),
        created_at DATETIME2 DEFAULT GETDATE() NOT NULL
    );
END;
GO

-- Seed data
-- Insert College
IF NOT EXISTS (SELECT 1 FROM colleges WHERE college_code = 'RU001')
BEGIN
    INSERT INTO colleges (college_name, college_name_hi, college_code, address, description, is_active) 
    VALUES ('Rajasthan University', N'राजस्थान विश्वविद्यालय', 'RU001', 'Jaipur, Rajasthan', 'Premier university in Rajasthan', 1);
END;
GO

-- Insert Courses
IF NOT EXISTS (SELECT 1 FROM courses WHERE course_code = 'BA' AND college_id = 1)
BEGIN
    INSERT INTO courses (course_name, course_name_hi, course_code, college_id, is_active) 
    VALUES ('Bachelor of Arts', N'बैचलर ऑफ आर्ट्स', 'BA', 1, 1);
END;
GO

IF NOT EXISTS (SELECT 1 FROM courses WHERE course_code = 'BSC' AND college_id = 1)
BEGIN
    INSERT INTO courses (course_name, course_name_hi, course_code, college_id, is_active) 
    VALUES ('Bachelor of Science', N'बैचलर ऑफ साइंस', 'BSC', 1, 1);
END;
GO

-- Insert Admin User
IF NOT EXISTS (SELECT 1 FROM users WHERE userId = 'ADMIN001')
BEGIN
    INSERT INTO users (userId, name, name_hi, email, mobile, password, role, is_active, college_id) 
    VALUES ('ADMIN001', 'System Admin', N'सिस्टम एडमिन', 'admin@example.com', '8052797334', '$2b$10$Zfr1fQcVIJ6V8pQQU7jH2OhqWsqv7p0rU6LX5pUbEQX3Z2j3qyJ.O', 'admin', 1, 1);
END;
GO

-- Insert Student User
IF NOT EXISTS (SELECT 1 FROM users WHERE userId = 'STU123465')
BEGIN
    INSERT INTO users (userId, name, name_hi, email, mobile, password, role, is_active, college_id) 
    VALUES ('STU123465', 'Student User', N'छात्र उपयोगकर्ता', 'student@example.com', '9876543210', '$2b$10$Zfr1fQcVIJ6V8pQQU7jH2OhqWsqv7p0rU6LX5pUbEQX3Z2j3qyJ.O', 'student', 1, 1);
END;
GO

-- Insert Student Record
IF NOT EXISTS (SELECT 1 FROM students WHERE roll_number = '123465')
BEGIN
    INSERT INTO students (user_id, roll_number, enrollment_number, college_id, course_id, course_type, name, name_hi, gender, category, is_final_submitted) 
    VALUES (2, '123465', '2345678', 1, 1, 'honors', 'Student User', N'छात्र उपयोगकर्ता', 'male', 'regular', 0);
END;
GO

-- Insert Roles
IF NOT EXISTS (SELECT 1 FROM roles WHERE short_name = 'SYS_ADMIN')
BEGIN
    INSERT INTO roles (role_name, short_name, description, permissions, is_active) 
    VALUES ('System Administrator', 'SYS_ADMIN', 'Full system access', '["all"]', 1);
END;
GO

IF NOT EXISTS (SELECT 1 FROM roles WHERE short_name = 'STAFF')
BEGIN
    INSERT INTO roles (role_name, short_name, description, permissions, is_active) 
    VALUES ('College Staff', 'STAFF', 'Limited college management access', '["students.view","students.edit","reports.view"]', 1);
END;
GO

IF NOT EXISTS (SELECT 1 FROM roles WHERE short_name = 'STUDENT')
BEGIN
    INSERT INTO roles (role_name, short_name, description, permissions, is_active) 
    VALUES ('Student', 'STUDENT', 'Student access - view and edit own profile', '["profile.view","profile.edit"]', 1);
END;
GO