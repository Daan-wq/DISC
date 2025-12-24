# DISC Quiz Platform

A modern Next.js application for administering DISC personality assessments with PDF report generation, email delivery, and comprehensive admin dashboard.

**Built with:** Next.js 16, React 19, Supabase, Tailwind CSS, TypeScript

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier)
- Gmail account (for email delivery)

### Setup

1. **Clone and install:**
```bash
git clone https://github.com/Daan-wq/DISC.git
cd DISC/quiz-interface
npm install
```

2. **Configure environment:**
```bash
cp env.example .env.local
# Edit .env.local with your credentials
```

3. **Run development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
quiz-interface/
├── app/
│   ├── admin/                          # Admin dashboard (protected routes)
│   │   ├── (protected)/
│   │   │   ├── candidates/             # Manage quiz participants
│   │   │   ├── results/                # View quiz results & scores
│   │   │   ├── allowlist/              # Manage access allowlist
│   │   │   ├── export/                 # Export data (CSV, Excel)
│   │   │   ├── settings/               # Admin settings
│   │   │   └── activity/               # Activity logs
│   │   ├── login/                      # Admin login page
│   │   └── allowlist-import/           # Bulk import allowlist
│   ├── api/                            # API routes
│   │   ├── auth/                       # Authentication endpoints
│   │   ├── admin/                      # Admin API endpoints
│   │   ├── quiz/                       # Quiz submission & scoring
│   │   └── ...
│   ├── quiz/                           # Quiz pages
│   ├── login/                          # User login
│   └── result/                         # Results display
├── lib/
│   ├── supabase.ts                     # Supabase client
│   ├── services/                       # PDF generation, etc.
│   └── utils/                          # Utilities
├── supabase/
│   ├── sql/                            # Database schema files
│   ├── functions/                      # Edge functions
│   └── email-templates/                # Email templates
├── scripts/                            # Utility scripts
├── env.example                         # Environment variables template
└── .env.local                          # Local secrets (not committed)
```

## Key Features

### 🎯 Quiz Administration
- **Magic Link Authentication** - Secure email-based access
- **Allowlist Management** - Control who can take the quiz
- **Admin Dashboard** - View results, manage candidates, export data
- **Activity Logging** - Track all admin actions

### 📊 DISC Assessment
- **48-Question Assessment** - Standardized DISC questionnaire
- **Dual Scoring** - Natural and Adapted behavior profiles
- **Instant Results** - Real-time DISC profile calculation
- **PDF Reports** - Auto-generated professional reports

### 📧 Email & Delivery
- **Gmail SMTP** - Configured for email delivery
- **PDF Attachments** - Reports sent directly to users
- **Trainer Notifications** - Optional trainer email delivery
- **180-Day Retention** - Automatic PDF cleanup

### 🔐 Security
- **Role-Based Access Control** - Admin vs. User roles
- **Row-Level Security (RLS)** - Database-level protection
- **Input Validation** - Zod schemas for all inputs
- **Rate Limiting** - Protection against abuse
- **IP Whitelist** - Optional admin access restriction

## Database Schema

**Core Tables:**
- `candidates` - Quiz participants
- `quiz_attempts` - Quiz submissions with scores
- `answers` - Individual answer responses
- `allowlist` - Access control list
- `admin_events` - Audit trail

**Key Columns:**
```sql
quiz_attempts:
  - id (UUID)
  - user_id (UUID, FK to auth.users)
  - quiz_id (UUID)
  - score (numeric)
  - pdf_path (text)
  - pdf_expires_at (timestamptz)
  - alert (boolean)
  - finished_at (timestamptz)
```

## CSV Storage Adapters

### Development (Local File System)
```typescript
// Automatically uses LocalCsvWriter
// Writes to: ./storage/responses.csv
```

### Production (Supabase Storage)
```typescript
// Set environment variables:
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
SUPABASE_BUCKET=exports

// Automatically switches to SupabaseCsvWriter
```

## Email Configuration

### Gmail with App Password
1. Enable 2-factor authentication
2. Generate app password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Configure `.env.local`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
```


## Allowlist Management

The system allows admins to control who can access the quiz through an allowlist. Users can only take the quiz if their email is on the allowlist.

### Quick Start

1. **Access Admin Dashboard:**
   - Go to `/admin/login`
   - Login with admin credentials

2. **Add Users to Allowlist:**
   - Navigate to `/admin/allowlist`
   - Add emails individually or bulk import CSV
   - Optional: Send invitation emails automatically

3. **Bulk Import:**
   - Go to `/admin/allowlist-import`
   - Upload CSV with email addresses
   - System validates and imports

### Email Notifications

When users are added to the allowlist, they receive an invitation email with:
- Direct link to the quiz
- Instructions for taking the assessment
- Deadline information (if configured)

**Configuration:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL="Your Company" <noreply@yourdomain.com>
```

## API Endpoints

Key endpoints for quiz administration:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/request-magic-link` | POST | Request magic link for quiz access |
| `/api/quiz/finish` | POST | Submit completed quiz |
| `/api/compute` | POST | Calculate DISC scores |
| `/api/admin/results/list` | GET | Get all quiz results (admin) |
| `/api/admin/candidates/list` | GET | Get all candidates (admin) |
| `/api/admin/export/[type]` | GET | Export data as CSV/Excel (admin) |

## Security Features

- **CSP Headers**: Strict Content Security Policy
- **Rate Limiting**: 5 requests/minute per IP
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Protection**: Parameterized queries via Prisma
- **XSS Protection**: React auto-escaping + headers

## Testing

### E2E Test (Playwright)
```bash
npm install -D @playwright/test
npx playwright test
```

### Manual Testing
```bash
# 1. Submit a form
# 2. Check database
npx prisma studio

# 3. Check CSV
cat storage/responses.csv

# 4. Check email (if configured)
```

## Deployment

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```


## Troubleshooting

### Email Not Sending
- Verify Gmail app password is correct
- Check SMTP credentials in `.env.local`
- Verify port 587 is accessible
- Check spam folder
- Review server logs: `npm run dev` console

### Database Connection Issues
- Verify `NEXT_PUBLIC_SUPABASE_URL` and keys are correct
- Check Supabase project status at [supabase.com](https://supabase.com)
- Ensure Row-Level Security (RLS) policies are configured

### Build Errors
```bash
# Reinstall dependencies and rebuild
rm -rf .next node_modules
npm install
npm run build
```

## Environment Variables

See `env.example` for the complete list. Key variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL="Company Name" <noreply@domain.com>

# Admin Authentication
ADMIN_USERNAME=admin@example.com
ADMIN_PASSWORD_BCRYPT=$2a$12$...
ADMIN_SESSION_SECRET=your-64-char-hex
ADMIN_IP_WHITELIST=optional-ip-list

# Cloudflare Turnstile (Bot Protection)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_key
TURNSTILE_SECRET_KEY=your_key

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
COMPANY_NAME=Your Company
```

### Getting Credentials

**Gmail App Password:**
1. Enable 2FA on your Google account
2. Visit [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Generate app-specific password

**Supabase Keys:**
1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → API → Copy keys

**Cloudflare Turnstile:**
1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Create Turnstile site

## License

MIT

## Support

For issues or questions, please create a GitHub issue or contact support.
