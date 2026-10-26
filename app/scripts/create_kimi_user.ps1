# Creates database `kimi_agent` and user `kimi` with password Rahul@8052
# You will be prompted for the MySQL root password when this runs.

$sql = @"
CREATE DATABASE IF NOT EXISTS kimi_agent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'kimi'@'127.0.0.1' IDENTIFIED BY 'Rahul@8052';
CREATE USER IF NOT EXISTS 'kimi'@'localhost' IDENTIFIED BY 'Rahul@8052';
GRANT ALL PRIVILEGES ON kimi_agent.* TO 'kimi'@'127.0.0.1';
GRANT ALL PRIVILEGES ON kimi_agent.* TO 'kimi'@'localhost';
FLUSH PRIVILEGES;
"@

Write-Host "Running MySQL commands. When prompted, enter MySQL root password."

# Run mysql client and pass the SQL string
# Note: This will prompt for root password interactively.
mysql -u root -p -e $sql

if ($LASTEXITCODE -eq 0) {
  Write-Host "MySQL commands executed successfully."
} else {
  Write-Host "MySQL command failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
