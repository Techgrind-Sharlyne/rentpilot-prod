# Real Estate Rent & Billing Management System (REMS)

A comprehensive, full-stack Real Estate Rent & Billing Management System designed for the Kenyan market with automated M-Pesa rent collection, enterprise-level property management, and advanced financial tracking.

## 🏗️ Architecture Overview

### System Components
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript  
- **Database**: PostgreSQL with Neon serverless + Drizzle ORM
- **Payment Integration**: M-Pesa API with SMS notifications
- **Authentication**: Replit Auth (OpenID Connect)
- **Real-time Features**: SMS notifications for payments and reminders

### Key Features Implemented
- ✅ **Property Management**: Multi-type properties (apartments, townhouses, commercial)
- ✅ **Unit Management**: Individual rental units with status tracking
- ✅ **Tenant Management**: Complete tenant lifecycle management
- ✅ **Lease Management**: Automated lease tracking and renewals
- ✅ **Payment Processing**: M-Pesa integration with automatic confirmations
- ✅ **Payment Tracking**: Comprehensive payment history and balance calculation
- ✅ **SMS Notifications**: Automated payment confirmations and reminders
- ✅ **Financial Analytics**: Rent income tracking and reporting
- ✅ **Audit System**: Complete audit trail for all operations
- ✅ **Database Optimization**: Enterprise-grade performance optimization

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Git

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd rems-system

# Install dependencies
npm install
```

### 2. Database Setup

#### Option A: Local PostgreSQL
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE rems_db;
CREATE USER rems_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE rems_db TO rems_user;
\q
```

#### Option B: Docker PostgreSQL
```bash
# Run PostgreSQL in Docker
docker run --name rems-postgres \
  -e POSTGRES_DB=rems_db \
  -e POSTGRES_USER=rems_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  -d postgres:14
```

### 3. Environment Configuration

Create `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL="postgresql://rems_user:your_secure_password@localhost:5432/rems_db"
PGHOST=localhost
PGPORT=5432
PGUSER=rems_user
PGPASSWORD=your_secure_password
PGDATABASE=rems_db

# Authentication (Replit Auth)
REPLIT_DOMAINS=localhost:5000
SESSION_SECRET=your_super_secure_session_secret_here

# M-Pesa Configuration (Sandbox)
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=your_mpesa_passkey

# SMS Configuration (Africa's Talking)
SMS_API_URL=https://api.africastalking.com/version1/messaging
SMS_API_KEY=your_africas_talking_api_key
SMS_SENDER_ID=REMS

# Optional: Payment Gateway Secrets
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
```

### 4. Database Migration and Seeding

```bash
# Push database schema
npm run db:push

# Verify database connection
npm run db:check
```

### 5. Start Development Server

```bash
# Start the application (runs both frontend and backend)
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:5000/api

### 6. Sample Data (Optional)

The system includes comprehensive sample data:
- Multiple properties with various unit types
- Active tenant users and lease agreements  
- Payment records with different statuses (paid, pending, overdue)
- Demonstration of M-Pesa payment flows

## 📱 M-Pesa Integration Setup

### Sandbox Environment
1. Register at [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. Create an app and get your Consumer Key and Secret
3. Configure your callback URL: `https://your-domain.com/api/mpesa/callback`
4. Test with sandbox credentials

### Production Environment
1. Apply for M-Pesa Go-Live approval
2. Update environment variables with production credentials
3. Configure production callback URLs
4. Ensure SSL certificates are properly configured

## 🏗️ Database Schema Overview

### Core Tables
- **users**: Authentication and user management
- **properties**: Property information and settings
- **units**: Individual rental units
- **leases**: Tenant-unit relationships and agreements
- **payments**: Payment records and M-Pesa transactions
- **invoices**: Automated billing system
- **maintenance_requests**: Property maintenance tracking
- **audit_log**: Complete system audit trail

### Key Relationships
```
Properties (1:N) Units (1:N) Leases (N:1) Users(Tenants)
Units (1:N) Payments (N:1) Users(Tenants)
Leases (1:N) Invoices (N:1) Users(Tenants)
```

## 🔐 API Endpoints

### Authentication
- `GET /api/auth/user` - Get current authenticated user
- `GET /api/login` - Initiate login flow
- `GET /api/logout` - Logout user

### Properties
- `GET /api/properties` - List all properties
- `POST /api/properties` - Create new property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Soft delete property

### Units
- `GET /api/units` - List all units
- `POST /api/units` - Create new unit
- `PUT /api/units/:id` - Update unit
- `DELETE /api/units/:id` - Soft delete unit

### Payments
- `GET /api/payments` - List payments with filters
- `POST /api/payments` - Create payment record
- `GET /api/tenants/:id/payments` - Get tenant payment history
- `GET /api/tenants/:id/payment-summary` - Get payment balance and status

### M-Pesa Integration
- `POST /api/mpesa/initiate` - Initiate M-Pesa payment
- `POST /api/mpesa/callback` - M-Pesa callback handler
- `POST /api/mpesa/query` - Query payment status

### SMS Notifications
- `POST /api/sms/payment-reminder` - Send payment reminder
- `POST /api/sms/overdue-notification` - Send overdue notice
- `POST /api/sms/balance-inquiry` - Send balance information
- `POST /api/sms/bulk-reminders` - Send bulk notifications

## 🚀 Deployment Instructions

### Production Environment Setup

#### 1. Server Requirements
- **Minimum**: 2 CPU cores, 4GB RAM, 50GB SSD
- **Recommended**: 4 CPU cores, 8GB RAM, 100GB SSD
- **OS**: Ubuntu 20.04 LTS or later

#### 2. Dependencies Installation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx

# Install SSL certificates (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
```

#### 3. Application Deployment
```bash
# Clone application
git clone <repository-url> /var/www/rems
cd /var/www/rems

# Install dependencies
npm ci --production

# Build application
npm run build

# Set up environment variables
sudo cp .env.example .env
sudo nano .env  # Configure production values

# Run database migrations
npm run db:push --force

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 4. Nginx Configuration
```nginx
# /etc/nginx/sites-available/rems
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/rems /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Set up SSL
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Cloud Deployment Options

#### AWS Deployment
1. **EC2**: Use t3.medium or larger instance
2. **RDS**: PostgreSQL 14+ with automated backups
3. **CloudFront**: CDN for static assets
4. **Route 53**: DNS management
5. **ACM**: SSL certificate management

#### Digital Ocean Deployment
1. **Droplet**: 4GB RAM, 2 CPU cores minimum
2. **Managed Database**: PostgreSQL cluster
3. **Load Balancer**: For high availability
4. **Spaces**: Static asset storage

#### Google Cloud Platform
1. **Compute Engine**: e2-standard-2 or larger
2. **Cloud SQL**: PostgreSQL with automatic backups
3. **Cloud CDN**: Global content delivery
4. **Cloud DNS**: Domain management

## ⚠️ Current System Vulnerabilities & Security Recommendations

### Critical Security Issues

#### 1. Authentication & Authorization
**Current Issues:**
- Session management relies on express-session with memory store
- No rate limiting on authentication endpoints
- Missing CSRF protection
- No multi-factor authentication

**Recommendations:**
```javascript
// Implement rate limiting
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later.'
});
app.use('/api/login', authLimiter);

// Add CSRF protection
const csrf = require('csurf');
app.use(csrf({ cookie: true }));

// Implement 2FA
const speakeasy = require('speakeasy');
// Add 2FA setup and verification endpoints
```

#### 2. Input Validation & SQL Injection
**Current Issues:**
- Limited input sanitization
- Potential SQL injection through raw queries
- No file upload restrictions

**Recommendations:**
```javascript
// Enhanced input validation
const joi = require('joi');
const createPropertySchema = joi.object({
  name: joi.string().min(3).max(100).required(),
  address: joi.string().min(10).max(255).required(),
  // Add comprehensive validation rules
});

// Parameterized queries only (already using Drizzle ORM)
// Add file upload restrictions
const multer = require('multer');
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});
```

#### 3. API Security
**Current Issues:**
- No API versioning
- Missing request/response logging
- No API documentation with security schemes

**Recommendations:**
```javascript
// API versioning
app.use('/api/v1', routes);

// Request logging
const morgan = require('morgan');
app.use(morgan('combined'));

// API documentation with OpenAPI/Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
```

#### 4. Data Protection
**Current Issues:**
- Sensitive data not encrypted at rest
- No data masking in logs
- Missing data retention policies

**Recommendations:**
```javascript
// Encrypt sensitive fields
const crypto = require('crypto');
const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_KEY;

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, secretKey, iv);
  // Implementation...
}

// Data masking in logs
function maskSensitiveData(data) {
  return {
    ...data,
    phoneNumber: data.phoneNumber?.replace(/(\d{3})\d{6}(\d{3})/, '$1****$2'),
    email: data.email?.replace(/(.{2}).*(@.*)/, '$1***$2')
  };
}
```

### Medium Priority Security Issues

#### 1. Session Management
```javascript
// Enhanced session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 60 * 1000, // 30 minutes
    sameSite: 'strict'
  },
  store: new (require('connect-pg-simple')(session))({
    conString: process.env.DATABASE_URL,
    tableName: 'user_sessions'
  })
}));
```

#### 2. Security Headers
```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

## 📈 Scaling Recommendations

### Horizontal Scaling

#### 1. Load Balancing
```nginx
# Nginx load balancer configuration
upstream rems_backend {
    least_conn;
    server 10.0.1.10:5000 weight=3;
    server 10.0.1.11:5000 weight=2;
    server 10.0.1.12:5000 weight=1;
}

server {
    location / {
        proxy_pass http://rems_backend;
    }
}
```

#### 2. Database Scaling
```javascript
// Read replica configuration
const dbConfig = {
  master: {
    host: 'rems-db-master.cluster-xyz.amazonaws.com',
    database: 'rems_prod',
    user: 'rems_user',
    password: process.env.DB_PASSWORD,
  },
  slaves: [
    {
      host: 'rems-db-replica1.cluster-xyz.amazonaws.com',
      database: 'rems_prod',
      user: 'rems_readonly',
      password: process.env.DB_READONLY_PASSWORD,
    }
  ]
};

// Route read queries to replicas
const readDb = drizzle(readOnlyConnection);
const writeDb = drizzle(masterConnection);
```

#### 3. Caching Strategy
```javascript
// Redis caching implementation
const redis = require('redis');
const client = redis.createClient({
  host: 'rems-redis.cluster.local',
  port: 6379
});

// Cache frequently accessed data
async function getCachedProperties() {
  const cached = await client.get('properties:all');
  if (cached) return JSON.parse(cached);
  
  const properties = await storage.getAllProperties();
  await client.setex('properties:all', 300, JSON.stringify(properties)); // 5min cache
  return properties;
}
```

### Vertical Scaling

#### 1. Performance Optimization
```javascript
// Database connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients
  idle_timeout: 30000,
  connection_timeout: 2000,
});

// Query optimization
CREATE INDEX CONCURRENTLY idx_payments_tenant_status 
ON payments (tenant_id, status) 
WHERE status IN ('pending', 'overdue');

CREATE INDEX CONCURRENTLY idx_units_property_status 
ON units (property_id, status);
```

#### 2. Memory Management
```javascript
// PM2 cluster mode
module.exports = {
  apps: [{
    name: 'rems-api',
    script: './server/index.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### Microservices Architecture

#### 1. Service Decomposition
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Property      │  │    Payment      │  │      SMS        │
│   Service       │  │    Service      │  │    Service      │
│   Port: 3001    │  │   Port: 3002    │  │   Port: 3003    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │   Port: 3000    │
                    └─────────────────┘
```

#### 2. Service Communication
```javascript
// API Gateway with Express Gateway
const gateway = require('express-gateway');

gateway()
  .load(path.join(__dirname, 'gateway.config.yml'))
  .run();

// gateway.config.yml
http:
  port: 3000

routes:
  properties:
    host: property-service:3001
    paths: '/api/properties/*'
  payments:
    host: payment-service:3002
    paths: '/api/payments/*'
```

### Monitoring & Observability

#### 1. Application Monitoring
```javascript
// Prometheus metrics
const promClient = require('prom-client');
const register = new promClient.Registry();

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Grafana dashboard configuration
// Monitor: Request rate, Error rate, Response time, Database connections
```

#### 2. Error Tracking
```javascript
// Sentry integration
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
  ],
  tracesSampleRate: 1.0,
});
```

## 🧪 Testing Strategy

### Unit Testing
```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage
```

### Integration Testing
```javascript
// Example API test
const request = require('supertest');
const app = require('../server/app');

describe('Properties API', () => {
  test('GET /api/properties should return properties list', async () => {
    const response = await request(app)
      .get('/api/properties')
      .expect(200);
    
    expect(response.body).toHaveProperty('length');
    expect(response.body[0]).toHaveProperty('name');
  });
});
```

### Load Testing
```bash
# Artillery load testing
npm install -g artillery
artillery run load-test.yml

# load-test.yml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Property listing"
    requests:
      - get:
          url: "/api/properties"
```

## 📋 Maintenance & Monitoring

### Database Maintenance
```sql
-- Weekly maintenance tasks
VACUUM ANALYZE payments;
VACUUM ANALYZE properties;
REINDEX INDEX CONCURRENTLY idx_payments_tenant_status;

-- Monitor database size
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Application Health Checks
```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      external_apis: await checkExternalAPIs()
    }
  };
  
  const isHealthy = Object.values(health.checks).every(check => check.status === 'ok');
  res.status(isHealthy ? 200 : 503).json(health);
});
```

## 🔄 Backup & Recovery

### Database Backups
```bash
#!/bin/bash
# Daily backup script
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/rems"
DB_NAME="rems_prod"

# Create backup
pg_dump $DB_NAME > "$BACKUP_DIR/rems_backup_$DATE.sql"

# Compress backup
gzip "$BACKUP_DIR/rems_backup_$DATE.sql"

# Upload to S3
aws s3 cp "$BACKUP_DIR/rems_backup_$DATE.sql.gz" s3://rems-backups/

# Keep only last 30 days locally
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### Disaster Recovery
```bash
# Recovery procedure
# 1. Restore from latest backup
psql $DB_NAME < rems_backup_latest.sql

# 2. Restart application services
pm2 restart all

# 3. Verify system health
curl http://localhost:5000/health
```

## 📞 Support & Troubleshooting

### Common Issues

#### 1. M-Pesa Integration Failures
```bash
# Check logs
tail -f logs/mpesa.log

# Verify credentials
curl -X POST "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials" \
  -H "Authorization: Basic $(echo -n "$MPESA_CONSUMER_KEY:$MPESA_CONSUMER_SECRET" | base64)"
```

#### 2. Database Connection Issues
```javascript
// Connection debugging
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});
```

#### 3. SMS Service Issues
```javascript
// SMS service debugging
async function testSMSService() {
  try {
    const result = await smsService.sendSMS('254712345678', 'Test message');
    console.log('SMS test result:', result);
  } catch (error) {
    console.error('SMS service error:', error);
  }
}
```

## 📚 Additional Resources

- [Safaricom M-Pesa API Documentation](https://developer.safaricom.co.ke/APIs/MpesaExpress)
- [Africa's Talking SMS API](https://africastalking.com/sms)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for the Kenyan real estate market**