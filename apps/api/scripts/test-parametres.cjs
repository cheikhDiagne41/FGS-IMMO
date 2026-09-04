/** Vérifie que les interrupteurs coupent réellement les fonctionnalités. */
const B='http://localhost:3000/api';
const j=async r=>{const t=await r.text();try{return JSON.parse(t)}catch{return t}};
const H=t=>({'Content-Type':'application/json',Authorization:'Bearer '+t});
const login=async e=>(await j(await fetch(B+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email:e,password:'Password123'})}))).accessToken;
const regler=async(tok,cle,valeur)=>(await fetch(B+'/parametres/'+cle,{method:'PATCH',headers:H(tok),
  body:JSON.stringify({valeur})})).status;
const inscrire=async()=>{
  const r=await fetch(B+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:`p${Date.now()}@test.sn`,password:'Password123',prenom:'P',nom:'T',telephone:'770000000'})});
  return {statut:r.status, message:(await j(r)).message};
};
const messagePublic=async()=>{
  const t=(await j(await fetch(B+'/public/terrains?take=1'))).items[0];
  const r=await fetch(B+`/public/terrains/${t.id}/message`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({nom:'Test',contenu:'Bonjour'})});
  return {statut:r.status, message:(await j(r)).message};
};
(async()=>{
  const admin=await login('admin@fgsimmo.sn');
  const client=await login('client@fgsimmo.sn');

  console.log('— accès —');
  let r=await fetch(B+'/parametres'); console.log('sans jeton    :',r.status,r.status===401?'✅':'❌');
  r=await fetch(B+'/parametres',{headers:H(client)}); console.log('par un client :',r.status,r.status===403?'✅':'❌');
  const liste=await j(await fetch(B+'/parametres',{headers:H(admin)}));
  console.log('par l\'admin   :',liste.length,'paramètres');

  console.log('\n— interrupteur « inscription_publique » —');
  console.log('avant  :',await inscrire());
  console.log('coupure:',await regler(admin,'inscription_publique','false'));
  console.log('pendant:',await inscrire());
  await regler(admin,'inscription_publique','true');
  console.log('après  :',(await inscrire()).statut);

  console.log('\n— interrupteur « messagerie_active » —');
  await regler(admin,'messagerie_active','false');
  console.log('coupée :',await messagePublic());
  await regler(admin,'messagerie_active','true');
  console.log('rétablie:',(await messagePublic()).statut);

  console.log('\n— contrôles de saisie —');
  r=await fetch(B+'/parametres/reservation_duree_jours',{method:'PATCH',headers:H(admin),body:JSON.stringify({valeur:'abc'})});
  console.log('nombre = « abc »        :',r.status,(await j(r)).message);
  r=await fetch(B+'/parametres/mode_maintenance',{method:'PATCH',headers:H(admin),body:JSON.stringify({valeur:'peut-etre'})});
  console.log('booléen = « peut-etre » :',r.status,(await j(r)).message);
  r=await fetch(B+'/parametres/site_nom',{method:'DELETE',headers:H(admin)});
  console.log('supprimer un paramètre du socle :',r.status,(await j(r)).message);

  console.log('\n— ajout d\'un paramètre pour une fonctionnalité future —');
  r=await fetch(B+'/parametres',{method:'POST',headers:H(admin),body:JSON.stringify({
    cle:'paiement_carte', valeur:'false', type:'BOOLEEN', libelle:'Paiement par carte bancaire',
    groupe:'Fonctionnalités', description:'À activer quand la banque aura ouvert le service.', public:true})});
  console.log('création :',r.status,(await j(r)).cle ?? '');
  const pub=await j(await fetch(B+'/public/parametres'));
  console.log('visible côté site :', 'paiement_carte' in pub, '→', pub.paiement_carte);
  r=await fetch(B+'/parametres/paiement_carte',{method:'DELETE',headers:H(admin)});
  console.log('suppression (non-socle) :',r.status,r.status===200?'✅':'❌');
})();
