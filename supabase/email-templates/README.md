# Email Templates voor TLC Profielen

Deze map bevat de aangepaste email templates voor Supabase Auth met het TLC Profielen logo.

## Overzicht

De volgende templates zijn beschikbaar:
- **confirmation.html** - Voor het bevestigen van nieuwe aanmeldingen
- **invite.html** - Voor het uitnodigen van nieuwe gebruikers
- **magic_link.html** - Voor passwordless login via magic link
- **recovery.html** - Voor het resetten van wachtwoorden
- **email_change.html** - Voor het bevestigen van e-mailadres wijzigingen

## Logo URL

Het TLC Profielen logo wordt geladen vanaf:
```
https://lsfhegbphxdapjodmjua.supabase.co/storage/v1/object/public/Images/TLC-3.png
```

De Images bucket is ingesteld als **public** zodat de afbeelding zichtbaar is in emails.

## Templates toepassen

### Optie 1: Via Supabase Dashboard (Aanbevolen)

1. Ga naar je Supabase project dashboard: https://supabase.com/dashboard/project/lsfhegbphxdapjodmjua
2. Navigeer naar **Authentication** → **Email Templates**
3. Voor elke template:
   - Selecteer de template (bijv. "Confirm signup")
   - Kopieer de inhoud van het bijbehorende HTML bestand
   - Plak het in de template editor
   - Klik op **Save**

### Optie 2: Via Management API

Je kunt de templates ook programmatisch updaten met de Supabase Management API:

```bash
# Haal je access token op van: https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="lsfhegbphxdapjodmjua"

# Update confirmation template
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mailer_subjects_confirmation": "Bevestig je aanmelding",
    "mailer_templates_confirmation_content": "'"$(cat confirmation.html | sed 's/"/\\"/g' | tr -d '\n')"'"
  }'
```

Herhaal dit voor elke template met de juiste veldnamen:
- `mailer_templates_confirmation_content` + `mailer_subjects_confirmation`
- `mailer_templates_invite_content` + `mailer_subjects_invite`
- `mailer_templates_magic_link_content` + `mailer_subjects_magic_link`
- `mailer_templates_recovery_content` + `mailer_subjects_recovery`
- `mailer_templates_email_change_content` + `mailer_subjects_email_change`

## Template variabelen

De templates gebruiken de volgende Supabase variabelen:
- `{{ .ConfirmationURL }}` - De bevestigings/actie URL
- `{{ .NewEmail }}` - Het nieuwe e-mailadres (alleen voor email_change)
- `{{ .Token }}` - 6-cijferige OTP code (optioneel)
- `{{ .SiteURL }}` - Je applicatie URL
- `{{ .Email }}` - Het e-mailadres van de gebruiker

## Styling

De templates gebruiken:
- Responsive design met HTML tables (voor maximale email client compatibiliteit)
- TLC Profielen branding met het logo
- Nederlandse teksten
- Modern design met afgeronde hoeken en schaduwen
- Primaire kleur: #4F46E5 (indigo)

## Sender Name configureren

Om de sender name te wijzigen van "Supabase Auth" naar "TLC Profielen", zie:
- **[SUPABASE-AUTH-CONFIG.md](./SUPABASE-AUTH-CONFIG.md)** - Gedetailleerde instructies voor het configureren van de SMTP instellingen

## Testen

Na het toepassen van de templates, test ze door:
1. Een nieuwe gebruiker aan te maken
2. Een wachtwoord reset aan te vragen
3. Een magic link te versturen
4. Een gebruiker uit te nodigen

Controleer of het logo correct wordt weergegeven in de ontvangen emails.
