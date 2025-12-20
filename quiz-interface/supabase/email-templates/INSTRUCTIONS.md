# 📧 TLC Profielen Email Templates - Instructies

## ✅ Wat is er gedaan?

1. **Images bucket is publiek gemaakt** ✓
   - De `Images` bucket in Supabase Storage is nu publiek
   - Het TLC logo is toegankelijk via: `https://lsfhegbphxdapjodmjua.supabase.co/storage/v1/object/public/Images/TLC-3.png`

2. **Email templates zijn aangemaakt** ✓
   - 5 professionele HTML email templates met het TLC logo
   - Nederlandse teksten
   - Modern, responsive design
   - Alle templates bevatten het TLC Profielen logo

## 📋 Wat moet je nu doen?

Je moet de templates nog toepassen op je Supabase project. Er zijn 2 manieren:

### Methode 1: Via Supabase Dashboard (Aanbevolen - Makkelijkst)

1. **Open het Supabase Dashboard**
   - Ga naar: https://supabase.com/dashboard/project/lsfhegbphxdapjodmjua/auth/templates

2. **Pas elke template toe:**
   
   **a) Confirmation Template (Bevestig aanmelding)**
   - Klik op "Confirm signup" in het dashboard
   - Open het bestand: `confirmation.html`
   - Kopieer de volledige HTML inhoud
   - Plak het in de "Message Body" editor in het dashboard
   - Pas het onderwerp aan naar: "Bevestig je aanmelding bij TLC Profielen"
   - Klik op **Save**

   **b) Invite Template (Uitnodiging)**
   - Klik op "Invite user" in het dashboard
   - Open het bestand: `invite.html`
   - Kopieer de volledige HTML inhoud
   - Plak het in de "Message Body" editor
   - Pas het onderwerp aan naar: "Je bent uitgenodigd voor TLC Profielen"
   - Klik op **Save**

   **c) Magic Link Template**
   - Klik op "Magic Link" in het dashboard
   - Open het bestand: `magic_link.html`
   - Kopieer de volledige HTML inhoud
   - Plak het in de "Message Body" editor
   - Pas het onderwerp aan naar: "Je Magic Link voor TLC Profielen"
   - Klik op **Save**

   **d) Recovery Template (Wachtwoord reset)**
   - Klik op "Reset Password" in het dashboard
   - Open het bestand: `recovery.html`
   - Kopieer de volledige HTML inhoud
   - Plak het in de "Message Body" editor
   - Pas het onderwerp aan naar: "Reset je wachtwoord voor TLC Profielen"
   - Klik op **Save**

   **e) Email Change Template**
   - Klik op "Change Email Address" in het dashboard
   - Open het bestand: `email_change.html`
   - Kopieer de volledige HTML inhoud
   - Plak het in de "Message Body" editor
   - Pas het onderwerp aan naar: "Bevestig je nieuwe e-mailadres"
   - Klik op **Save**

### Methode 2: Via Script (Automatisch)

1. **Haal je Supabase Access Token op**
   - Ga naar: https://supabase.com/dashboard/account/tokens
   - Klik op "Generate new token"
   - Geef het een naam (bijv. "Email Templates")
   - Kopieer de token

2. **Run het script**
   ```bash
   cd "c:\Users\Daant\Documents\Windsurf projects\DISC\MyPlatform\apps\quiz-interface\supabase\email-templates"
   
   # Windows PowerShell:
   $env:SUPABASE_ACCESS_TOKEN="your-token-here"
   node apply-templates.js
   
   # Of in één commando:
   node apply-templates.js
   # (en voer de token in als environment variable)
   ```

## 🧪 Templates testen

Na het toepassen van de templates, test ze:

1. **Test Confirmation Email**
   - Maak een nieuwe test gebruiker aan
   - Controleer of je de email ontvangt met het TLC logo

2. **Test Recovery Email**
   - Vraag een wachtwoord reset aan
   - Controleer of het logo zichtbaar is

3. **Test Magic Link**
   - Gebruik de magic link login functie
   - Controleer de email

## 👀 Templates bekijken

Open `preview.html` in je browser om alle templates te bekijken voordat je ze toepast:

```bash
# Open in je standaard browser
start preview.html
```

## 📁 Bestanden overzicht

```
email-templates/
├── confirmation.html      # Bevestig aanmelding template
├── invite.html           # Uitnodiging template
├── magic_link.html       # Magic link template
├── recovery.html         # Wachtwoord reset template
├── email_change.html     # Email wijziging template
├── apply-templates.js    # Script om templates toe te passen
├── preview.html          # Preview van alle templates
├── README.md            # Technische documentatie
└── INSTRUCTIONS.md      # Deze instructies
```

## ❓ Problemen oplossen

### Logo wordt niet weergegeven

1. **Controleer of de Images bucket publiek is:**
   ```sql
   SELECT public FROM storage.buckets WHERE name = 'Images';
   ```
   Moet `true` zijn ✓ (Dit is al gedaan)

2. **Test de logo URL direct:**
   Open in je browser: https://lsfhegbphxdapjodmjua.supabase.co/storage/v1/object/public/Images/TLC-3.png
   
   Als dit werkt, werkt het ook in de emails.

3. **Controleer je email client:**
   Sommige email clients blokkeren externe afbeeldingen standaard. Klik op "Afbeeldingen weergeven" in je email.

### Templates worden niet toegepast

1. Controleer of je de juiste project ID gebruikt: `lsfhegbphxdapjodmjua`
2. Controleer of je access token geldig is
3. Controleer of je de juiste rechten hebt op het project

## 📞 Hulp nodig?

Als je problemen hebt:
1. Controleer de Supabase logs in het dashboard
2. Test de logo URL in je browser
3. Controleer of de templates correct zijn opgeslagen in het dashboard

## ✨ Klaar!

Na het toepassen van de templates zullen alle auth emails het TLC Profielen logo bevatten en er professioneel uitzien! 🎉
