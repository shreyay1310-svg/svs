const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Use same JWT secret as backend
const JWT_SECRET = 'university-erp-secret-key-2024';

(async () => {
  const dotenv = require('dotenv');
  dotenv.config({ path: '../.env' });
  const dbUrl = process.env.DATABASE_URL || "mysql://kimi:Rahul%408052@127.0.0.1:3306/kimi_agent";
  // parse database url
  const match = dbUrl.match(/mysql:\/\/(.*?):(.*?)@(.*?):(\d+)\/(.*)$/);
  let conn;
  if (match) {
    const user = match[1];
    const pass = decodeURIComponent(match[2]);
    const host = match[3];
    const port = match[4];
    const db = match[5];
    conn = await mysql.createConnection({ host, port, user, password: pass, database: db });
  } else {
    conn = await mysql.createConnection(dbUrl);
  }

  // get a college and course
  const [colleges] = await conn.query('SELECT id FROM colleges LIMIT 1');
  const [courses] = await conn.query('SELECT id FROM courses LIMIT 1');
  if (!colleges.length || !courses.length) {
    console.error('No college/course found. Run seed first.');
    process.exit(1);
  }
  const collegeId = colleges[0].id;
  const courseId = courses[0].id;

  const testRoll = '999999';
  const testEnrollment = '888888';
  const testEmail = 'teststudent@example.com';
  const testMobile = '9999999999';
  const testPassword = 'Student@123';

  // create user
  const hashed = await bcrypt.hash(testPassword, 10);
  const [userRes] = await conn.query('INSERT INTO users (userId,name,email,mobile,password,role,is_active,college_id) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
    [`STU${testRoll}`, 'Test Student', testEmail, testMobile, hashed, 'student', collegeId]);
  const userId = userRes.insertId;

  // create student
  await conn.query('INSERT INTO students (user_id, roll_number, enrollment_number, college_id, course_id, name, gender, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, testRoll, testEnrollment, collegeId, courseId, 'Test Student', 'male', 'regular']);

  // insert used OTPs to simulate verification
  const nowPlus = new Date(Date.now() + 10*60*1000);
  await conn.query('INSERT INTO otp_records (email,mobile,otp,purpose,expires_at,is_used) VALUES (?, ?, ?, ?, ?, 1)',
    [testEmail, testMobile, '000000', 'final_submit', nowPlus]);

  // sign token
  const token = jwt.sign({ userId, role: 'student', email: testEmail }, JWT_SECRET || 'university-erp-secret-key-2024', { expiresIn: '7d' });

  console.log('Created test user and student:');
  console.log('roll:', testRoll, 'enrollment:', testEnrollment);
  console.log('email:', testEmail, 'mobile:', testMobile, 'password:', testPassword);
  console.log('JWT token (use as Authorization: Bearer <token>):');
  console.log(token);

  await conn.end();
})();
