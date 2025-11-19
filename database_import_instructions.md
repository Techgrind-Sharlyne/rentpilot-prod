# Database Import Instructions for REMS System

## Files Available
- `rems_database_export.sql` (164KB) - Complete database export
- `rems_database_export.sql.gz` (27KB) - Compressed version

## What's Included
✅ **Complete Schema** (17 tables):
- properties, units, leases, payments
- users, invoices, maintenance_requests  
- audit_log, sessions, property_recurring_fees
- And 7 more system tables

✅ **Sample Data**:
- Multiple properties (Kileleshwa Heights, Eldoret Plaza, etc.)
- 200+ rental units with different rent levels
- Active tenant users and lease agreements
- Payment records with various statuses (paid, pending, overdue)
- Complete audit trails and system data

## How to Import to Local PostgreSQL

### 1. Prepare Local Database
```bash
# Create database (choose one method)

# Method A: Using createdb command
createdb rems_local

# Method B: Using psql
psql -U postgres
CREATE DATABASE rems_local;
\q
```

### 2. Import the Database
```bash
# Option 1: Import uncompressed file
psql -U postgres -d rems_local < rems_database_export.sql

# Option 2: Import compressed file directly
gunzip -c rems_database_export.sql.gz | psql -U postgres -d rems_local

# Option 3: With specific user/host
psql -h localhost -U your_user -d rems_local < rems_database_export.sql
```

### 3. Verify Import
```bash
# Connect to database
psql -U postgres -d rems_local

# Check tables
\dt

# Verify data
SELECT COUNT(*) FROM properties;
SELECT COUNT(*) FROM units;
SELECT COUNT(*) FROM users WHERE role = 'tenant';
SELECT COUNT(*) FROM payments;

# Exit
\q
```

### 4. Update Application Config
Update your `.env` file to point to the local database:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/rems_local"
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=rems_local
```

## Expected Results After Import
- **Properties**: 8+ properties including sample data
- **Units**: 200+ rental units with different configurations
- **Tenants**: 5+ active tenant users
- **Payments**: Multiple payment records demonstrating M-Pesa integration
- **Complete audit system** with all tracking enabled

## Troubleshooting

### Permission Issues
```bash
# If you get permission denied
sudo -u postgres psql -d rems_local < rems_database_export.sql
```

### Connection Issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Start if needed
sudo systemctl start postgresql
```

### Database Already Exists
```bash
# Drop and recreate if needed
dropdb rems_local
createdb rems_local
psql -d rems_local < rems_database_export.sql
```

The imported database contains all the features we built including M-Pesa integration, payment tracking, SMS notifications, and comprehensive audit logging.