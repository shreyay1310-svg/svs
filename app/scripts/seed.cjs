const dotenv = require('dotenv');
dotenv.config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

function parseDatabaseUrl(url) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
    };
  } catch (err) {
    throw new Error('Invalid DATABASE_URL: ' + err.message);
  }
}

(async () => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not set in .env');
    const cfg = parseDatabaseUrl(dbUrl);

    const conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
    });

    console.log('Connected to MySQL at', cfg.host + ':' + cfg.port, 'DB:', cfg.database);

    // Create minimal universities if not exists
    const [univRows] = await conn.execute(
      `SELECT id FROM universities WHERE university_code = ? LIMIT 1`,
      ['RU']
    );
    let universityId;
    if (univRows.length) {
      universityId = univRows[0].id;
      console.log('Found existing university id', universityId);
    } else {
      const [res] = await conn.execute(
        `INSERT INTO universities (university_name, university_name_hi, university_code, address, is_active) VALUES (?, ?, ?, ?, ?)`,
        ['Rajasthan University', 'राजस्थान विश्वविद्यालय', 'RU', 'Jaipur, Rajasthan', 1]
      );
      universityId = res.insertId;
      console.log('Inserted university id', universityId);
    }

    // Insert Delhi University as a secondary tenant for demonstration
    const [univRows2] = await conn.execute(
      `SELECT id FROM universities WHERE university_code = ? LIMIT 1`,
      ['DU']
    );
    if (!univRows2.length) {
      const [res] = await conn.execute(
        `INSERT INTO universities (university_name, university_name_hi, university_code, address, is_active) VALUES (?, ?, ?, ?, ?)`,
        ['Delhi University', 'दिल्ली विश्वविद्यालय', 'DU', 'New Delhi, Delhi', 1]
      );
      console.log('Inserted Delhi University id', res.insertId);
    }

    // Create a minimal college if not exists
    const [colRows] = await conn.execute(
      `SELECT id FROM colleges WHERE college_code = ? LIMIT 1`,
      ['RU001']
    );
    let collegeId;
    if (colRows.length) {
      collegeId = colRows[0].id;
      await conn.execute(
        `UPDATE colleges SET university_id = ? WHERE id = ?`,
        [universityId, collegeId]
      );
      console.log('Found existing college id', collegeId);
    } else {
      const [res] = await conn.execute(
        `INSERT INTO colleges (college_name, college_name_hi, college_code, address, description, is_active, university_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['Rajasthan University College', 'राजस्थान विश्वविद्यालय कॉलेज', 'RU001', 'Jaipur, Rajasthan', 'Premier college in Rajasthan', 1, universityId]
      );
      collegeId = res.insertId;
      console.log('Inserted college id', collegeId);
    }

    // Insert admin user if not exists
    const [adminRows] = await conn.execute(`SELECT id FROM users WHERE userId = ? LIMIT 1`, ['ADMIN001']);
    if (adminRows.length) {
      console.log('Admin already exists, id=', adminRows[0].id);
    } else {
      const hashed = await bcrypt.hash('Rahul@8052', 10);
      const [res] = await conn.execute(
        `INSERT INTO users (userId, name, name_hi, email, mobile, password, role, is_active, college_id, university_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['ADMIN001', 'System Admin', 'सिस्टम एडमिन', 'kumar712003@gmail.com', '8052797334', hashed, 'admin', 1, collegeId, null] // null university_id means Super Admin
      );
      console.log('Inserted admin id', res.insertId);
    }

    // Insert student user
    const [stuRows] = await conn.execute(`SELECT id FROM users WHERE userId = ? LIMIT 1`, ['STU123465']);
    let studentUserId;
    if (stuRows.length) {
      studentUserId = stuRows[0].id;
      await conn.execute(
        `UPDATE users SET university_id = ?, college_id = ? WHERE id = ?`,
        [universityId, collegeId, studentUserId]
      );
      console.log('Student user already exists id=', studentUserId);
    } else {
      const hashed2 = await bcrypt.hash('Rahil@8052', 10);
      const [res] = await conn.execute(
        `INSERT INTO users (userId, name, name_hi, email, mobile, password, role, is_active, college_id, university_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['STU123465', 'Student User', 'छात्र उपयोगकर्ता', 'student123465@example.com', '9876543210', hashed2, 'student', 1, collegeId, universityId]
      );
      studentUserId = res.insertId;
      console.log('Inserted student user id', studentUserId);
    }

    // Ensure a course exists (BA)
    const [courseRows] = await conn.execute(`SELECT id FROM courses WHERE course_code = ? LIMIT 1`, ['BA']);
    let courseId;
    if (courseRows.length) {
      courseId = courseRows[0].id;
      console.log('Found course id', courseId);
    } else {
      const [cres] = await conn.execute(
        `INSERT INTO courses (course_name, course_name_hi, course_code, college_id, is_active) VALUES (?, ?, ?, ?, ?)`,
        ['Bachelor of Arts', 'बैचलर ऑफ आर्ट्स', 'BA', collegeId, 1]
      );
      courseId = cres.insertId;
      console.log('Inserted course id', courseId);
    }

    // Insert student record if not exists
    const [studentRec] = await conn.execute(`SELECT id FROM students WHERE user_id = ? LIMIT 1`, [studentUserId]);
    if (studentRec.length) {
      await conn.execute(
        `UPDATE students SET university_id = ?, college_id = ?, course_id = ? WHERE id = ?`,
        [universityId, collegeId, courseId, studentRec[0].id]
      );
      console.log('Student record already exists id=', studentRec[0].id);
    } else {
      const [sres] = await conn.execute(
        `INSERT INTO students (user_id, roll_number, enrollment_number, college_id, course_id, course_type, name, gender, category, university_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [studentUserId, '123465', '2345678', collegeId, courseId, 'honors', 'Student User', 'male', 'regular', universityId]
      );
      console.log('Inserted student record id', sres.insertId);
    }

    console.log('\nSeeding complete. Admin: ADMIN001 / Rahul@8052');
    console.log('Student: roll 123465, enrollment 2345678, password Rahil@8052');

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Seed script error:', err.message || err);
    process.exit(1);
  }
});
