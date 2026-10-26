This file describes how to create and use the `unierp_complement` database included in `unierp_complement.sql` inside this folder.

Options:

1) Using Docker (recommended):
- Bring up MySQL container (project root):

```powershell
# start mysql container provided in docker-compose.yml (if present)
docker compose up -d
# import the SQL into the running container or run from host if mysql client installed
mysql -u kimi -pRahul@8052 -h 127.0.0.1 -P 3306 < db\unierp_package\unierp_complement.sql
```

2) Using local MySQL (if installed locally):

```powershell
# run from repo root
mysql -u root -p < db\unierp_package\unierp_complement.sql
```

3) Manually inspect or import in a GUI (MySQL Workbench, DBeaver):
- Open the SQL file `db/unierp_package/unierp_complement.sql` and run it against a MySQL server.

Notes:
- The dump creates database `unierp_complement` and several tables (departments, faculty, programmes, subjects, students, enrollments, grades, timetable) and inserts sample data.
- Update credentials and host if your MySQL user/password differ.
- If `docker` isn't available on your machine, use option 2 or run MySQL in a VM.
