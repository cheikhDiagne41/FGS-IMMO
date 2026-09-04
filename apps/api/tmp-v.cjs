const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const us=await p.user.findMany({where:{OR:[{email:{startsWith:'v1.'}},{email:{startsWith:'v2.'}},{email:{startsWith:'g1.'}},{email:{startsWith:'g2.'}},{email:{startsWith:'c1.'}},{email:{startsWith:'cl'}}]},include:{client:true,vendeurProfil:true}});
  us.forEach(u=>console.log(u.role.padEnd(13),u.email,'| client:',u.client?`${u.client.prenom} ${u.client.nom}`:'—','| vendeur:',u.vendeurProfil?.nom??'—'));
  for(const u of us){
    await p.client.deleteMany({where:{userId:u.id}});
    await p.vendeur.deleteMany({where:{userId:u.id}});
    await p.user.delete({where:{id:u.id}});
  }
  console.log('\nnettoyé — comptes :',await p.user.count());
  await p.$disconnect();
})();
