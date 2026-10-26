-- unierp_complement SQL dump
-- Creates a complementary university ERP database with sample data

CREATE DATABASE IF NOT EXISTS `unierp_complement` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `unierp_complement`;

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  head VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Faculty / Lecturers
CREATE TABLE IF NOT EXISTS faculty (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_code VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  department_id INT,
  hire_date DATE,
  role VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Programmes / Courses
CREATE TABLE IF NOT EXISTS programmes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  level ENUM('undergraduate','postgraduate','diploma','certificate') DEFAULT 'undergraduate',
  duration_months INT,
  credits INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Subjects (complementary)
CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  credits INT DEFAULT 0,
  semester INT,
  programme_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Students
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_code VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  dob DATE,
  gender ENUM('male','female','other') DEFAULT 'male',
  programme_id INT,
  enrolment_year INT,
  status ENUM('active','alumni','suspended','withdrawn') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Enrollments (student -> subject)
CREATE TABLE IF NOT EXISTS enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  academic_year VARCHAR(20),
  semester INT,
  date_enrolled DATE DEFAULT CURRENT_TIMESTAMP,
  status ENUM('enrolled','completed','dropped') DEFAULT 'enrolled',
  UNIQUE KEY uniq_enrollment (student_id, subject_id, academic_year),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Grades / Results
CREATE TABLE IF NOT EXISTS grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL,
  grade VARCHAR(10),
  marks DECIMAL(5,2),
  remarks TEXT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Timetable (simple)
CREATE TABLE IF NOT EXISTS timetable (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  faculty_id INT,
  day_of_week ENUM('Mon','Tue','Wed','Thu','Fri','Sat') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(100),
  semester INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Sample seed data
INSERT INTO departments (code,name,head,phone,email) VALUES
('CS','Computer Science','Dr. A Singh','+91-111-222-3333','cs@unierp.test'),
('ENG','English','Dr. R Kumar','+91-111-222-4444','eng@unierp.test');

INSERT INTO programmes (code,name,level,duration_months,credits) VALUES
('BSC-CS','BSc Computer Science','undergraduate',36,120),
('BA-ENG','BA English','undergraduate',36,120);

INSERT INTO subjects (code,name,credits,semester,programme_id) VALUES
('CS101','Introduction to Programming',4,1,1),
('CS102','Data Structures',4,2,1),
('ENG101','English Literature I',3,1,2);

INSERT INTO faculty (staff_code,first_name,last_name,email,phone,department_id,hire_date,role) VALUES
('F001','Amit','Sharma','amit@unierp.test','+91-90000-11111',1,'2018-07-01','Professor'),
('F002','Rekha','Verma','rekha@unierp.test','+91-90000-22222',2,'2019-09-15','Lecturer');

INSERT INTO students (student_code,first_name,last_name,email,phone,dob,gender,programme_id,enrolment_year) VALUES
('S2026001','Rahul','Meena','rahul.meena@unierp.test','+91-90000-33333','2003-05-10','male',1,2023),
('S2026002','Priya','Singh','priya.singh@unierp.test','+91-90000-44444','2002-11-20','female',2,2023);

INSERT INTO enrollments (student_id,subject_id,academic_year,semester) VALUES
(1,1,'2023-24',1),(1,2,'2023-24',2),(2,3,'2023-24',1);

INSERT INTO grades (enrollment_id,grade,marks,remarks) VALUES
(1,'A',89.50,'Good'),(2,'B+',78.00,'Satisfactory'),(3,'A-',85.00,'Very Good');

-- Done
COMMIT;
