const mysql = require('mysql2/promise');
const { URL } = require('url');

async function main() {
  const databaseUrl = process.env.DATABASE_URL || 'mysql://root:@127.0.0.1:3306/kimi_agent';
  const parsed = new URL(databaseUrl);
  const user = parsed.username || 'root';
  const password = parsed.password || '';
  const host = parsed.hostname || '127.0.0.1';
  const port = parsed.port || 3306;
  const database = parsed.pathname ? parsed.pathname.replace('/', '') : 'kimi_agent';

  const conn = await mysql.createConnection({ host, port, user, password, database });

  const roll = '123465';
  const enrollment = '2345678';
  console.log('Verifying student record for', roll, enrollment);

  const [students] = await conn.execute('SELECT * FROM students WHERE roll_number = ? AND enrollment_number = ? LIMIT 1', [roll, enrollment]);
  if (!students || students.length === 0) {
    console.error('Student not found');
    process.exit(1);
  }
  const student = students[0];
  console.log('Found student:', student.name);

  // Ask for contact details (use student's existing user if present)
  let contactEmail = process.argv[2] || null;
  let contactMobile = process.argv[3] || null;
  if (!contactEmail && !contactMobile) {
    // try from linked user
    if (student.user_id) {
      const [users] = await conn.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [student.user_id]);
      if (users && users.length) {
        contactEmail = users[0].email || null;
        contactMobile = users[0].mobile || null;
      }
    }
  }
  if (!contactEmail && !contactMobile) {
    contactEmail = 'student@example.com';
    contactMobile = '9876543210';
  }

  // Generate OTPs and insert
  function genOtp() { return Math.floor(100000 + Math.random() * 900000).toString(); }
  const emailOtp = genOtp();
  const mobileOtp = genOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  await conn.execute('INSERT INTO otp_records (email,mobile,otp,purpose,expires_at,is_used,created_at) VALUES (?, ?, ?, ?, ?, 0, ?)', [contactEmail, contactMobile, emailOtp, 'final_submit', expiresAt, now]);
  await conn.execute('INSERT INTO otp_records (email,mobile,otp,purpose,expires_at,is_used,created_at) VALUES (?, ?, ?, ?, ?, 0, ?)', [contactEmail, contactMobile, mobileOtp, 'final_submit', expiresAt, now]);

  console.log('Email OTP:', emailOtp);
  console.log('Mobile OTP:', mobileOtp);

  console.log('Simulating student entering OTPs... verifying now');

  // Mark OTPs as used (simulate verification)
  await conn.execute('UPDATE otp_records SET is_used = 1 WHERE email = ? AND otp IN (?, ?) AND purpose = ?', [contactEmail, emailOtp, mobileOtp, 'final_submit']);

  // Create user account
  const hashedPassword = '$2a$10$demohashedpasswordstring';
  const [res] = await conn.execute('INSERT INTO users (userId,name,email,mobile,password,role,is_active,createdAt,updatedAt) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)', [`STU${String(student.id).padStart(4,'0')}`, student.name || 'Student User', contactEmail, contactMobile, hashedPassword, 'student', now, now]);
  const userId = res.insertId;
  console.log('Created user id', userId);

  // Link student
  await conn.execute('UPDATE students SET user_id = ? WHERE id = ?', [userId, student.id]);

  const [rows] = await conn.execute('SELECT s.*, u.email, u.mobile FROM students s LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ? LIMIT 1', [student.id]);
  console.log('Final student record:');
  console.log(rows[0]);

  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
