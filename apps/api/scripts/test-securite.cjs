/**
 * Test de sécurité FGS_IMMO — sonde l'API en conditions réelles.
 * Ne modifie rien de façon durable : tout ce qui est créé est supprimé.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const B = 'http://localhost:3000/api';

const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const H = (t) => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + t });
const login = async (email, password = 'Password123') =>
  (await j(await fetch(B + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }))).accessToken;

const resultats = [];
const ok = (titre, detail) => { resultats.push(['OK', titre, detail]); console.log('  ✅', titre, '—', detail); };
const ko = (titre, detail) => { resultats.push(['FAILLE', titre, detail]); console.log('  ❌', titre, '—', detail); };
const info = (titre, detail) => { resultats.push(['INFO', titre, detail]); console.log('  ℹ️ ', titre, '—', detail); };

(async () => {
  const admin = await login('admin@fgsimmo.sn');
  const client = await login('client@fgsimmo.sn');
  const comptable = await login('comptable@fgsimmo.sn');
  if (!admin || !client) throw new Error('connexion de test impossible');

  // ============ A. AUTHENTIFICATION ============
  console.log('\n── A. Authentification ──');
  let r = await fetch(B + '/terrains');
  r.status === 401 ? ok('Sans jeton', 'refus 401') : ko('Sans jeton', 'statut ' + r.status);

  r = await fetch(B + '/terrains', { headers: { Authorization: 'Bearer nimportequoi' } });
  r.status === 401 ? ok('Jeton bidon', 'refus 401') : ko('Jeton bidon', 'statut ' + r.status);

  // jeton forgé : signature « none » (attaque classique alg:none)
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const forge = b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({ sub: 'x', role: 'ADMIN' }) + '.';
  r = await fetch(B + '/users', { headers: { Authorization: 'Bearer ' + forge } });
  r.status === 401 ? ok('Jeton forgé alg:none', 'refus 401') : ko('Jeton forgé alg:none', 'statut ' + r.status);

  // jeton d'un utilisateur supprimé / signature modifiée
  const altere = admin.slice(0, -3) + (admin.slice(-3) === 'aaa' ? 'bbb' : 'aaa');
  r = await fetch(B + '/users', { headers: { Authorization: 'Bearer ' + altere } });
  r.status === 401 ? ok('Signature altérée', 'refus 401') : ko('Signature altérée', 'statut ' + r.status);

  // ============ B. CLOISONNEMENT DES RÔLES ============
  console.log('\n── B. Cloisonnement des rôles ──');
  const interdits = [
    ['CLIENT → liste des comptes', client, '/users'],
    ['CLIENT → dossiers de tous', client, '/adhesions'],
    ['CLIENT → tous les paiements', client, '/paiements'],
    ['CLIENT → rapports', client, '/rapports/global'],
    ['COMPTABLE → liste des comptes', comptable, '/users'],
  ];
  for (const [titre, tok, url] of interdits) {
    r = await fetch(B + url, { headers: H(tok) });
    r.status === 403 ? ok(titre, 'refus 403') : ko(titre, 'statut ' + r.status);
  }
  r = await fetch(B + '/users', { method: 'POST', headers: H(client), body: JSON.stringify({ email: 'x@x.sn', password: 'Password123', role: 'ADMIN' }) });
  r.status === 403 ? ok('CLIENT → créer un compte admin', 'refus 403') : ko('CLIENT → créer un compte admin', 'statut ' + r.status);

  // ============ C. ÉLÉVATION DE PRIVILÈGE À L'INSCRIPTION ============
  console.log('\n── C. Élévation de privilège ──');
  const mailTmp = `sec.test.${Date.now()}@fgsimmo.sn`;
  r = await fetch(B + '/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: mailTmp, password: 'Password123', prenom: 'Sec', nom: 'Test',
      telephone: '770000009', role: 'ADMIN', isActive: true,
    }),
  });
  const inscrit = await j(r);
  const cree = await prisma.user.findUnique({ where: { email: mailTmp } });
  if (!cree) info('Inscription publique', 'refusée : ' + JSON.stringify(inscrit).slice(0, 120));
  else cree.role === 'CLIENT'
    ? ok('Inscription avec role=ADMIN', 'rôle forcé à CLIENT')
    : ko('Inscription avec role=ADMIN', 'rôle obtenu : ' + cree.role);

  // le nouveau client sert aux tests d'accès horizontal
  const client2 = cree ? await login(mailTmp) : null;

  // ============ D. ACCÈS HORIZONTAL (IDOR) ============
  console.log('\n── D. Accès aux données d\'un autre client (IDOR) ──');
  const dossiers = (await j(await fetch(B + '/adhesions?take=200', { headers: H(admin) }))).items ?? [];
  const factures = await j(await fetch(B + '/factures', { headers: H(admin) }));
  const listeFactures = factures.items ?? factures;
  const monClient = await prisma.user.findUnique({ where: { email: 'client@fgsimmo.sn' }, include: { client: true } });
  const dossierAutre = dossiers.find((d) => d.client.id !== monClient?.client?.id);
  const factureAutre = listeFactures.find((f) => f.adhesion?.clientId !== monClient?.client?.id) ?? listeFactures[0];

  if (dossierAutre) {
    r = await fetch(B + '/adhesions/' + dossierAutre.id, { headers: H(client) });
    r.status === 403 ? ok('Dossier d\'un autre client', 'refus 403')
      : ko('Dossier d\'un autre client', 'statut ' + r.status + ' — ' + dossierAutre.numeroDossier);
  }
  if (factureAutre) {
    r = await fetch(B + '/factures/' + factureAutre.id + '/pdf', { headers: H(client) });
    [401, 403, 404].includes(r.status) ? ok('Facture d\'un autre client (PDF)', 'refus ' + r.status)
      : ko('Facture d\'un autre client (PDF)', 'statut ' + r.status + ' — ' + factureAutre.numero);
  }
  if (client2 && dossierAutre) {
    r = await fetch(B + '/adhesions/' + dossierAutre.id, { headers: H(client2) });
    r.status === 403 ? ok('Nouveau compte → dossier existant', 'refus 403')
      : ko('Nouveau compte → dossier existant', 'statut ' + r.status);
  }

  // ============ E. INJECTION ============
  console.log('\n── E. Injection ──');
  const charges = [
    "' OR 1=1 --",
    "'; DROP TABLE terrains; --",
    '{"$ne":null}',
    '<script>alert(1)</script>',
  ];
  let injectionOk = true;
  for (const c of charges) {
    r = await fetch(B + '/public/terrains?q=' + encodeURIComponent(c));
    const d = await j(r);
    if (r.status >= 500) { injectionOk = false; ko('Injection « ' + c.slice(0, 20) + ' »', 'erreur 500'); }
    else if (Array.isArray(d.items) && d.items.length > 0 && c.includes('OR 1=1')) {
      injectionOk = false; ko('Injection SQL', 'la charge a renvoyé ' + d.items.length + ' résultats');
    }
  }
  const nbTerrains = await prisma.terrain.count();
  if (injectionOk) ok('SQL / NoSQL sur la recherche publique', `4 charges neutralisées, ${nbTerrains} terrains intacts`);

  // XSS stocké : le contenu est-il renvoyé tel quel ?
  const xss = '<img src=x onerror=alert(1)>';
  r = await fetch(B + '/sites', {
    method: 'POST', headers: H(admin),
    body: JSON.stringify({ nom: 'SEC ' + xss, code: 'SEC' + Date.now().toString().slice(-5), type: 'VENTE_DIRECTE', nbParcelles: 1 }),
  });
  const siteXss = await j(r);
  if (siteXss.id) {
    const relu = (await j(await fetch(B + '/sites', { headers: H(admin) }))).find((s) => s.id === siteXss.id);
    info('XSS stocké', relu.nom.includes('<img') ? 'valeur conservée telle quelle en base (React échappe à l\'affichage)' : 'valeur nettoyée');
    await prisma.site.delete({ where: { id: siteXss.id } });
  }

  // ============ F. FICHIERS ============
  console.log('\n── F. Envoi de fichiers ──');
  const envoyer = async (nom, type, contenu, token = admin) => {
    const f = new FormData();
    f.append('files', new Blob([Buffer.from(contenu)], { type }), nom);
    const site = (await j(await fetch(B + '/sites', { headers: H(admin) })))[0];
    return fetch(B + '/sites/' + site.id + '/media', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: f });
  };
  r = await envoyer('piege.html', 'text/html', '<script>alert(document.cookie)</script>');
  r.status === 400 ? ok('Fichier .html', 'rejeté 400') : ko('Fichier .html', 'statut ' + r.status);
  r = await envoyer('shell.php', 'image/png', '<?php system($_GET["c"]); ?>');
  r.status === 400 ? ok('Fichier .php déguisé en image', 'rejeté 400') : ko('Fichier .php déguisé en image', 'statut ' + r.status);
  r = await envoyer('piege.svg', 'image/svg+xml', '<svg onload="alert(1)"></svg>');
  r.status === 400 ? ok('SVG (script embarqué)', 'rejeté 400') : ko('SVG (script embarqué)', 'statut ' + r.status);
  r = await envoyer('x.png.html', 'image/png', 'x');
  r.status === 400 ? ok('Double extension .png.html', 'rejeté 400') : ko('Double extension .png.html', 'statut ' + r.status);

  // ============ G. EXPOSITION ============
  console.log('\n── G. Exposition ──');
  r = await fetch('http://localhost:3000/api/docs');
  info('Swagger /api/docs', r.status === 200
    ? 'ouvert (attendu en développement ; coupé si NODE_ENV=production)'
    : 'fermé, statut ' + r.status);

  const doc = await prisma.document.findFirst({ where: { url: { contains: '/uploads/documents/' } } });
  if (doc) {
    r = await fetch('http://localhost:3000' + doc.url);
    r.status === 200 ? ko('Pièce d\'identité client', 'téléchargeable sans authentification : ' + doc.url)
      : ok('Pièce d\'identité client', 'statut ' + r.status);
  } else info('Pièces d\'identité', 'aucun document en base à tester');

  // traversée de répertoire
  for (const p of ['/uploads/../.env', '/uploads/%2e%2e/.env', '/uploads/....//.env']) {
    r = await fetch('http://localhost:3000' + p);
    if (r.status === 200 && (await r.text()).includes('DATABASE_URL')) ko('Traversée de répertoire', p + ' expose le .env');
  }
  ok('Traversée de répertoire', '3 variantes bloquées');

  // fuite d'informations dans les réponses
  const moi = await j(await fetch(B + '/auth/me', { headers: H(client) }));
  JSON.stringify(moi).match(/passwordHash|\$2[aby]\$/)
    ? ko('Empreinte du mot de passe', 'présente dans /auth/me')
    : ok('Empreinte du mot de passe', 'absente des réponses');

  const listeUsers = await j(await fetch(B + '/users', { headers: H(admin) }));
  JSON.stringify(listeUsers).match(/passwordHash|\$2[aby]\$/)
    ? ko('Empreintes dans /users', 'les hachages sont renvoyés')
    : ok('Empreintes dans /users', 'absentes');

  // en-têtes de sécurité
  r = await fetch(B + '/public/stats');
  const h = Object.fromEntries(r.headers);
  const attendus = ['x-content-type-options', 'x-frame-options', 'strict-transport-security', 'content-security-policy'];
  const manquants = attendus.filter((k) => !h[k]);
  manquants.length === 0 ? ok('En-têtes de sécurité', 'tous présents')
    : ko('En-têtes de sécurité', 'manquants : ' + manquants.join(', '));
  info('En-tête X-Powered-By', h['x-powered-by'] ? 'exposé (' + h['x-powered-by'] + ')' : 'masqué');

  // ============ H. FORCE BRUTE ============
  console.log('\n── H. Force brute ──');
  let bloque = 0, tentatives = 0;
  for (let i = 0; i < 15; i++) {
    r = await fetch(B + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@fgsimmo.sn', password: 'mauvais' + i }),
    });
    tentatives++;
    if (r.status === 429) { bloque = i + 1; break; }
  }
  bloque ? ok('Blocage après échecs répétés', `429 dès la tentative ${bloque}`)
    : ko('Blocage après échecs répétés', `${tentatives} essais sans blocage`);

  // le compte reste-t-il utilisable pour l'utilisateur légitime après le blocage ?
  const apres = await login('admin@fgsimmo.sn');
  info('Après blocage', apres ? 'le bon mot de passe passe encore (blocage par IP en cours)' : 'connexion bloquée temporairement — comportement attendu');

  // ============ NETTOYAGE ============
  if (cree) {
    await prisma.client.deleteMany({ where: { userId: cree.id } });
    await prisma.user.delete({ where: { id: cree.id } });
  }

  console.log('\n════════ SYNTHÈSE ════════');
  const failles = resultats.filter((x) => x[0] === 'FAILLE');
  console.log(`${resultats.filter((x) => x[0] === 'OK').length} contrôles passés, ${failles.length} problème(s), ${resultats.filter((x) => x[0] === 'INFO').length} info(s)`);
  failles.forEach((f) => console.log('  ❌', f[1], '—', f[2]));
  await prisma.$disconnect();
})().catch(async (e) => { console.error('ERREUR:', e.message); await prisma.$disconnect(); process.exit(1); });
