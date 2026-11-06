async function auditClientBundles() {
  console.log('--- Auditing Client JS Bundles on Production ---');
  const res = await fetch('https://meal-pass-pi.vercel.app/');
  const html = await res.text();
  const scriptUrls = Array.from(html.matchAll(/src="([^"]+\.js)"/g)).map(m => m[1]);
  console.log(`Found ${scriptUrls.length} script tags in homepage.`);

  let leaked = false;
  for (const sUrl of scriptUrls) {
    const fullUrl = sUrl.startsWith('http') ? sUrl : `https://meal-pass-pi.vercel.app${sUrl}`;
    const sRes = await fetch(fullUrl);
    const code = await sRes.text();
    
    // Check for service_role key leak or staging project ref leak
    if (code.includes('service_role') || code.includes('twgsmumoyfrcwicfllwh')) {
      console.error(`ALERT: Possible leak in ${sUrl}`);
      leaked = true;
    }
    // Check for project reference
    if (code.includes('ipdqfejoctltasrzbdaj')) {
      console.log(`Verified production Supabase reference (ipdqfejoctltasrzbdaj) in client bundle: ${sUrl.split('/').pop()}`);
    }
  }

  if (!leaked) {
    console.log('PASS: Zero service_role keys or staging references found in any public client bundles.');
  }
}

auditClientBundles();

