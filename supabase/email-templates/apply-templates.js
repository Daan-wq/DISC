/**
 * Script om email templates toe te passen op Supabase project
 * 
 * Gebruik:
 * 1. Zet je SUPABASE_ACCESS_TOKEN in een .env bestand of als environment variable
 * 2. Run: node apply-templates.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'lsfhegbphxdapjodmjua';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN environment variable is niet ingesteld!');
  console.log('\nHaal je access token op van: https://supabase.com/dashboard/account/tokens');
  console.log('En run dan: SUPABASE_ACCESS_TOKEN=your-token node apply-templates.js');
  process.exit(1);
}

// Template configuratie
const templates = [
  {
    file: 'confirmation.html',
    subjectKey: 'mailer_subjects_confirmation',
    contentKey: 'mailer_templates_confirmation_content',
    subject: 'Bevestig je aanmelding bij TLC Profielen'
  },
  {
    file: 'invite.html',
    subjectKey: 'mailer_subjects_invite',
    contentKey: 'mailer_templates_invite_content',
    subject: 'Je bent uitgenodigd voor TLC Profielen'
  },
  {
    file: 'magic_link.html',
    subjectKey: 'mailer_subjects_magic_link',
    contentKey: 'mailer_templates_magic_link_content',
    subject: 'Je Magic Link voor TLC Profielen'
  },
  {
    file: 'recovery.html',
    subjectKey: 'mailer_subjects_recovery',
    contentKey: 'mailer_templates_recovery_content',
    subject: 'Reset je wachtwoord voor TLC Profielen'
  },
  {
    file: 'email_change.html',
    subjectKey: 'mailer_subjects_email_change',
    contentKey: 'mailer_templates_email_change_content',
    subject: 'Bevestig je nieuwe e-mailadres'
  }
];

async function applyTemplate(template) {
  const filePath = path.join(__dirname, template.file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Bestand niet gevonden: ${template.file}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  const payload = {
    [template.subjectKey]: template.subject,
    [template.contentKey]: content
  };

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Fout bij ${template.file}:`, error);
      return false;
    }

    console.log(`✅ ${template.file} succesvol toegepast`);
    return true;
  } catch (error) {
    console.error(`❌ Fout bij ${template.file}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Email templates toepassen op Supabase project...\n');
  console.log(`Project: ${PROJECT_REF}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const template of templates) {
    const success = await applyTemplate(template);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    // Kleine pauze tussen requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 Resultaat:');
  console.log(`✅ Succesvol: ${successCount}`);
  console.log(`❌ Mislukt: ${failCount}`);

  if (failCount === 0) {
    console.log('\n🎉 Alle templates zijn succesvol toegepast!');
    console.log('\nTest de templates door:');
    console.log('1. Een nieuwe gebruiker aan te maken');
    console.log('2. Een wachtwoord reset aan te vragen');
    console.log('3. Een magic link te versturen');
  } else {
    console.log('\n⚠️  Sommige templates konden niet worden toegepast.');
    console.log('Controleer de error berichten hierboven.');
  }
}

main().catch(console.error);
