# Apple-Style Calculator

A production-ready Next.js application with Apple.com-level visual polish, featuring a modern calculator interface with beautiful data visualization, PDF generation, and email delivery.

## ✨ Features

- **Apple-inspired Design**: Clean, minimalist interface with generous white space and subtle shadows
- **Interactive Form**: Real-time validation with React Hook Form + Zod
- **Data Visualization**: Beautiful charts with Recharts including a prominent 50% threshold line
- **PDF Generation**: Professional reports with embedded charts using @react-pdf/renderer
- **Email Delivery**: SMTP-based email service with PDF attachments via Nodemailer
- **Accessibility**: Full a11y support with proper ARIA labels and keyboard navigation
- **Dark Mode**: Complete dark mode support
- **Animations**: Smooth transitions with Framer Motion

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   cd src
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your SMTP credentials (see SMTP Configuration below).

3. **Run the development server:**
   ```bash
   pnpm dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📧 SMTP Configuration

### Gmail Setup (Recommended)
1. Enable 2-factor authentication on your Google account
2. Generate an App Password at [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Use the 16-character app password (not your regular password)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
FROM_EMAIL=your-email@gmail.com
```

### Other SMTP Providers
- **Outlook**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Use your provider's settings

## 📊 Chart Implementation

The 50% threshold line is implemented in `src/components/chart/ResultChart.tsx`:

```tsx
<ReferenceLine 
  y={50} 
  label={{ value: "50%", position: "topRight", fontSize: 14, fontWeight: 600 }}
  stroke="#ef4444" 
  strokeWidth={3} 
  strokeDasharray="6 6"
  aria-label="50% threshold line"
/>
```

**Customization Options:**
- Change threshold value: Modify `y={50}` to your desired percentage
- Adjust line style: Update `strokeWidth`, `strokeDasharray`, or `stroke` color
- Modify label: Update the `label` prop with custom text and positioning

## 📄 PDF Generation

PDFs are generated server-side using @react-pdf/renderer in `src/lib/pdf/generateReport.ts`:

1. **Chart Embedding**: Charts are converted to images and embedded in PDFs
2. **Branded Layout**: Apple-style minimal design with proper typography
3. **Data Tables**: Clean presentation of user inputs and results
4. **Metadata**: Automatic timestamps and user information

**PDF Contents:**
- Header with title and generation date
- User information table
- Results data table
- Embedded chart visualization
- Branded footer

## 📧 Email Integration

Email functionality is handled by `src/lib/email/mailer.ts`:

1. **SMTP Validation**: Checks for required environment variables
2. **PDF Attachment**: Automatically attaches generated PDF reports
3. **HTML Templates**: Beautiful email templates with inline CSS
4. **Error Handling**: Comprehensive error handling with user feedback

**Email Flow:**
1. User clicks "Send to Email"
2. Server generates PDF report
3. Email service attaches PDF and sends via SMTP
4. User receives confirmation toast

## 🗂️ Code Map

| Component | Location | Purpose |
|-----------|----------|---------|
| **Graph Maker** | `src/components/chart/ResultChart.tsx` | Recharts component with 50% dotted ReferenceLine |
| **PDF Maker** | `src/lib/pdf/generateReport.ts` | PDF generation with chart embedding |
| **Email Sender** | `src/lib/email/mailer.ts` | SMTP email service with PDF attachments |
| **Server Actions** | `src/app/actions.ts` | Form processing, PDF generation, email sending |
| **Main Page** | `src/app/page.tsx` | Landing page with form and results |
| **UI Components** | `src/components/ui/*` | shadcn/ui components |
| **Styles** | `src/app/globals.css` | Tailwind base + Apple-style utilities |

## 🎨 Design System

### Typography
- **Font**: Inter with SF Pro Display fallback
- **Scale**: Generous sizing with tight leading for headlines
- **Hierarchy**: Clear visual hierarchy with proper contrast

### Colors
- **Light Mode**: Clean whites and subtle grays
- **Dark Mode**: Deep blues and grays with proper contrast
- **Accents**: Blue primary with purple gradients

### Spacing
- **Generous White Space**: Apple-style breathing room
- **Consistent Grid**: 8px base unit system
- **Rounded Corners**: 16px (rounded-2xl) for cards and buttons

### Shadows
- **Subtle Depth**: Custom Apple-style shadow utilities
- **Layered Elevation**: Different shadow levels for hierarchy

## 🛠️ Available Scripts

```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm start      # Start production server
pnpm lint       # Run ESLint
pnpm typecheck  # Run TypeScript checks
```

## 🔒 Security

- **CSP Headers**: Content Security Policy via next.config.js
- **SMTP Validation**: Environment variable validation
- **Input Sanitization**: Zod schema validation
- **Error Handling**: Secure error messages without sensitive data exposure

## 🧪 Testing

Basic Playwright e2e test structure is included for form submission and chart rendering validation.

## 📱 Responsive Design

- **Mobile-First**: Responsive design with mobile-first approach
- **Breakpoints**: Tailwind's responsive system
- **Touch-Friendly**: Proper touch targets and interactions

## 🌙 Dark Mode

Complete dark mode support with:
- CSS custom properties for theme switching
- Proper contrast ratios
- Consistent component theming

## 📖 Documentation

Visit `/about/build` in the application for detailed technical documentation and code locations.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

Built with ❤️ using Next.js 14, TypeScript, and Tailwind CSS.
