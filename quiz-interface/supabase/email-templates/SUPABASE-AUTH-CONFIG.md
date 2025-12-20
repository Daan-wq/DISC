# Supabase Auth Email Configuratie

## Sender Name wijzigen naar "TLC Profielen"

De "Supabase Auth" sender name die je ziet in de authenticatie emails (magic link, etc.) kan worden aangepast via de Supabase Dashboard.

### Stappen om de sender name te wijzigen:

1. **Ga naar je Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/lsfhegbphxdapjodmjua

2. **Navigeer naar Authentication instellingen**
   - Klik op **Authentication** in het linker menu
   - Klik op **Email Templates**

3. **Configureer SMTP instellingen**
   - Scroll naar beneden naar de sectie **SMTP Settings**
   - Vul de volgende gegevens in:
     - **Sender email**: `noreply@tlcprofielen.nl`
     - **Sender name**: `TLC Profielen`
     - **Host**: `smtp.gmail.com`
     - **Port**: `587`
     - **Username**: `daan.tuinman.2004@gmail.com`
     - **Password**: Je app-specific password

4. **Enable Custom SMTP**
   - Zet de toggle **Enable Custom SMTP** aan
   - Klik op **Save**

### Alternatief: Via Supabase Management API

Je kunt de SMTP instellingen ook programmatisch updaten:

```bash
# Haal je access token op van: https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="lsfhegbphxdapjodmjua"

curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "smtp_admin_email": "daan.tuinman.2004@gmail.com",
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_user": "daan.tuinman.2004@gmail.com",
    "smtp_pass": "agnt bhwl qmak pvhx",
    "smtp_sender_name": "TLC Profielen",
    "mailer_autoconfirm": false,
    "external_email_enabled": true
  }'
```

### Verificatie

Na het configureren van de SMTP instellingen:

1. Test de magic link functionaliteit door in te loggen
2. Controleer de ontvangen email
3. De sender zou nu "TLC Profielen" moeten zijn in plaats van "Supabase Auth"

### Belangrijke opmerkingen

- **App-specific password**: Zorg ervoor dat je een app-specific password gebruikt voor Gmail (niet je normale wachtwoord)
- **FROM_EMAIL in .env**: De `FROM_EMAIL` in je `.env.local` bestand wordt gebruikt voor emails die via je eigen mailer.ts worden verstuurd (zoals rapport emails en allowlist uitnodigingen)
- **Supabase SMTP**: De SMTP configuratie in Supabase Dashboard wordt alleen gebruikt voor authenticatie emails (magic link, password reset, etc.)

### Huidige configuratie

**Voor custom emails (mailer.ts):**
```env
FROM_EMAIL="TLC Profielen <noreply@tlcprofielen.nl>"
```

**Voor Supabase Auth emails:**
- Configureer via Dashboard zoals hierboven beschreven
- Sender name: `TLC Profielen`
- Sender email: `noreply@tlcprofielen.nl`
