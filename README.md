This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
apps/quiz-interface/
├── src/
│   ├── app/
│   │   └── page.tsx                    # Landing + form + results
│   ├── components/
│   │   ├── ui/                         # Button, Input, Card components
│   │   ├── form/
│   │   │   └── SubmissionForm.tsx      # Main form with validation
│   │   └── chart/
│   │       └── ResultChart.tsx         # DISC chart with 50% line
│   ├── server/
│   │   ├── actions/
│   │   │   └── submit.ts               # Server action for submissions
│   │   ├── db/
│   │   │   └── prisma.ts              # Prisma client instance
│   │   ├── csv/
│   │   │   └── CsvWriter.ts           # Local/Supabase CSV adapters
│   │   ├── email/
│   │   │   ├── mailer.ts              # Nodemailer transport
│   │   │   └── templates/
│   │   │       └── submission.ts      # HTML/text email templates
│   │   ├── charts/
│   │   │   └── generateDiscChart.ts   # Chart generation with 50% line
│   │   ├── pdf/
│   │   │   └── renderPdf.ts          # Puppeteer PDF generation
│   │   └── flows/
│   │       └── buildAndSendRapport.ts # Main orchestration
│   ├── lib/
│   │   ├── utils.ts                   # Utility functions
│   │   └── validations.ts             # Zod schemas
│   └── middleware.ts                   # Security headers
├── prisma/
│   ├── schema.prisma                  # Database schema
│   └── migrations/                    # SQLite migrations
├── scripts/
│   └── postgres-migration.sql         # PostgreSQL production schema
├── storage/
│   └── responses.csv                  # Local CSV file (auto-created)
└── env.example                        # Environment variables template
```

## Code Map

### Core Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main landing page with hero, form container |
| `src/components/form/SubmissionForm.tsx` | React Hook Form + Zod validation |
| `src/components/chart/ResultChart.tsx` | Recharts bar chart with 50% dotted line |
| `src/server/actions/submit.ts` | Validate → Save DB → Append CSV → Send email |
| `src/server/csv/CsvWriter.ts` | CSV adapter interface (Local/Supabase) |
| `src/server/email/templates/submission.ts` | Responsive HTML email template |
| `prisma/schema.prisma` | Database schema with indexes |
| `scripts/postgres-migration.sql` | Production PostgreSQL migration |

## Database Schema

```prisma
model Submission {
  id             String   @id @default(uuid())
  createdAt      DateTime @default(now())
  fullName       String
  email          String
  profileCode    String   // e.g., "DC", "IS"
  
  // Raw scores
  naturalD       Int
  naturalI       Int
  naturalS       Int
  naturalC       Int
  
  // Percentages
  naturalDPct    Float
  naturalIPct    Float
  naturalSPct    Float
  naturalCPct    Float
  
  // JSON snapshot
  answersJson    Json
}
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

### Other SMTP Providers
```env
# SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key

# Mailgun
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
```

## Allowlist Email Automation

The system automatically sends confirmation emails when email addresses are added to the allowlist. This provides immediate access notification with a direct link to the quiz.

### Quick Start (Local Development)

1. **Sign up for Resend** (free tier: 3000 emails/month):
   - Go to https://resend.com and create an account
   - Get your API key from https://resend.com/api-keys

2. **Configure environment** in `.env.local`:
```env
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM="DISC Team" <noreply@yourdomain.com>
ALLOWLIST_WEBHOOK_SECRET=local-dev-secret-123
```

3. **Run migrations**:
```bash
# Apply the allowlist migrations to your Supabase database
# Files: supabase/migrations/20251010_create_allowlist.sql
#        supabase/migrations/20251010_trigger_allowlist_webhook.sql
```

4. **Test the flow**:
```sql
-- Insert a test email in Supabase Studio
INSERT INTO allowlist (email, invited_by) 
VALUES ('test@example.com', 'admin@example.com');
```

5. **Check Resend Dashboard**: Open https://resend.com/emails to see the sent email

### How It Works

```
INSERT into allowlist → PostgreSQL Trigger → Webhook to Next.js API → Send Email → Update emailed_at
```

**Key Features:**
- ✅ Automatic email within seconds of INSERT
- ✅ Idempotent (no duplicate emails)
- ✅ Retry logic with exponential backoff (5s, 15s, 45s)
- ✅ Rate limiting (10 req/min)
- ✅ Uses Resend API (same as rest of project)
- ✅ Responsive HTML email template
- ✅ Comprehensive logging and error handling

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20251010_create_allowlist.sql` | Allowlist table with email tracking |
| `supabase/migrations/20251010_trigger_allowlist_webhook.sql` | Database trigger for webhook |
| `app/api/hooks/allowlist-created/route.ts` | Webhook endpoint with validation |
| `lib/email/allowlist-mailer.ts` | Email service with Resend & retry logic |
| `docs/allowlist-email-flow.md` | Complete documentation |
| `tests/email/allowlist-created.test.ts` | Unit tests |

### Production Setup

For production deployment, see the comprehensive guide:
📖 **[docs/allowlist-email-flow.md](docs/allowlist-email-flow.md)**

Covers:
- Resend domain verification
- Webhook security configuration
- DNS setup (SPF, DKIM, DMARC)
- Monitoring and troubleshooting
- Rate limiting best practices

## API Endpoints

### Submit Form
```typescript
POST /api/submit
Body: {
  fullName: string,
  email: string,
  company?: string,
  answers: Array<{
    questionId: string,
    naturalAnswer: 'most' | 'least' | 'neutral',
    responseAnswer: 'most' | 'least' | 'neutral'
  }>
}
```

### Email Preview (Development)
```
GET /email/preview?id={submissionId}
```

### Download CSV (Admin)
```
GET /api/admin/export-csv
```

### Persist DISC Answers (A4 → letters)

```
POST /api/answers
Body:
{
  "quiz_session_id": "uuid-optional-if-exists",
  "answers": ["A","B","C","D", "... 48 total ..."]
}
```

- Validates exactly 48 items.
- Each item must be one of `A|B|C|D` or a number `1..4` (numbers are normalized to letters server-side: 1→A, 2→B, 3→C, 4→D).
- Inserts into `public.answers(raw_answers)`; a DB trigger populates `answers_export_txt` for Excel.
- If your schema enforces unique `quiz_session_id`, the API falls back to update on unique violation.

Response 200:
```json
{
  "id": "uuid-of-inserted-row",
  "quiz_session_id": "uuid-or-null",
  "count": 48
}
```

Errors:
- 400 Invalid payload (length ≠ 48, wrong symbols, invalid uuid)
- 401/403 Unauthorized (if RLS blocks and no service role)
- 500 DB failure

Environment (server):
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # server-only secret
```

curl example:
```bash
curl -X POST http://localhost:3000/api/answers \
  -H "Content-Type: application/json" \
  -d '{
    "quiz_session_id":"11111111-1111-4111-8111-aaaaaaaaaaaa",
    "answers":["A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D","A","B","C","D"]
  }'
```

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

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Performance Optimizations

- Code splitting with dynamic imports
- Image optimization with Next.js Image
- Lazy loading below-the-fold content
- Prisma query optimization with indexes
- CSV writes are atomic and append-only

## Troubleshooting

### Database Issues
```bash
# Reset database
npx prisma migrate reset

# View database
npx prisma studio
```

### Email Not Sending
- Check SMTP credentials
- Verify port (587 for TLS, 465 for SSL)
- Check spam folder
- Enable "Less secure apps" for Gmail (not recommended)

### CSV Not Creating
```bash
# Check permissions
mkdir -p storage
chmod 755 storage

# Manual test
node -e "require('fs').writeFileSync('./storage/test.csv', 'test')"
```

### Build Errors
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

## Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"          # SQLite for dev
POSTGRES_URL=""                        # PostgreSQL for production

# Supabase (for CSV storage in production)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=exports

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## License

MIT

## Support

For issues or questions, please create a GitHub issue or contact support.
