import {runLoginRaces} from './login-races.mjs';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from '../server/node_modules/mongoose/index.js';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
let mongo,child;const values=new Map();
const redis=createServer(async(req,res)=>{
 let body='';for await (const chunk of req)body+=chunk;const c=JSON.parse(body);let result=null;
 if(c[0]==='EVAL'){result=(values.get(c[3])??0)+1;values.set(c[3],result);}
 if(c[0]==='GET')result=values.get(c[1])??null;
 if(c[0]==='DEL'){values.delete(c[1]);result=1;}
 if(c[0]==='GETDEL'){result=values.get(c[1])??null;values.delete(c[1]);}
 if(c[0]==='SETEX'){values.set(c[1],c[3]);result='OK';}
 if(c[0]==='SET' && !values.has(c[1])){values.set(c[1],c[2]);result='OK';}
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify({result}));
});
try {
 mongo=await MongoMemoryServer.create();redis.listen(0,'127.0.0.1');await once(redis,'listening');
 await mongoose.connect(mongo.getUri('security_smoke'));
 const oldUsers=mongoose.connection.collection('users');
 await oldUsers.createIndex({email:1},{name:'email_1',unique:true});
 const legacyId=new mongoose.Types.ObjectId();
 await oldUsers.insertOne({_id:legacyId,email:'legacy@example.invalid',username:'legacy-verified-flag',passwordHash:'unused-fixture-hash',emailVerified:true,telegramLinked:true,telegramChatId:'555888123'});
 const portServer=createServer();portServer.listen(0,'127.0.0.1');await once(portServer,'listening');const port=portServer.address().port;await new Promise(r=>portServer.close(r));
 child=spawn(process.execPath,['server/src/server.js'],{cwd:root,env:{...process.env,NODE_ENV:'production',PORT:String(port),HOST:'127.0.0.1',MONGODB_URI:mongo.getUri('security_smoke'),CORS_ORIGIN:'https://test.example.invalid',JWT_ACCESS_SECRET:'a'.repeat(40),JWT_REFRESH_SECRET:'b'.repeat(40),UPSTASH_REDIS_REST_URL:`http://127.0.0.1:${redis.address().port}`,UPSTASH_REDIS_REST_TOKEN:'test',IMAGEKIT_PUBLIC_KEY:'test_public',IMAGEKIT_PRIVATE_KEY:'test_private',IMAGEKIT_URL_ENDPOINT:'https://ik.imagekit.io/test',WEEKLY_SUMMARY_ENABLED:'false'}});
 let logs='';child.stdout.on('data',c=>logs+=c);child.stderr.on('data',c=>logs+=c);
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Startup timeout: '+logs)),20000);child.stdout.on('data',c=>{if(String(c).includes('Server running')){clearTimeout(timeout);resolve();}});child.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Startup exit ${code}: ${logs}`));});});
 const indexes=await oldUsers.indexes();
 assert(!indexes.some(index=>index.name==='email_1'));
 assert(indexes.some(index=>index.name==='email_unique_present'&&index.unique&&index.partialFilterExpression));
 const migratedLegacy=await oldUsers.findOne({_id:legacyId});assert.equal(migratedLegacy.telegramNotificationsEnabled,true);assert.equal(migratedLegacy.telegramOwnerId,'555888123');assert.equal(migratedLegacy.emailVerifiedAt,undefined,'upgrade must not forge mailbox proof');
 await oldUsers.insertMany([{username:'migration-telegram-one',telegramSub:'migration-one',telegramUserId:'555888124',telegramOwnerId:'555888124'},{username:'migration-telegram-two',telegramSub:'migration-two',telegramUserId:'555888125',telegramOwnerId:'555888125'}]);
 const url=`http://127.0.0.1:${port}/api`;
 const request=async(path,body,token,cookie)=>{
  const r=await fetch(url+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{ }),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
  return {status:r.status,body:await r.json(),cookies:r.headers.getSetCookie()};
 };
 assert.equal((await request('/health')).status,200);
 const registered=await request('/auth/register',{email:'smoke@example.invalid',username:'smoke',password:'old-password-123'});assert.equal(registered.status,201);
 const oldAccess=registered.body.accessToken;assert.equal((await request('/auth/me',undefined,oldAccess)).status,200);
 for(const path of ['/imagekit-auth','/ImageKit-Auth','/IMAGEKIT-AUTH'])assert.equal((await request(path,undefined,oldAccess)).status,403,'every upload-signature route spelling requires a verified identity');
 for(const path of ['/posts','/Posts','/POSTS'])assert.equal((await request(path,{},oldAccess)).status,403,'every publishing route spelling requires a verified identity');
 const cookie=registered.cookies.find(x=>x.startsWith('refreshToken=')).split(';')[0];
 // Contend on the initial token BEFORE any grace window exists.
 const parallel=await Promise.all(Array.from({length:6},()=>request('/auth/refresh',{},undefined,cookie)));
 assert(parallel.every(r=>r.status===200),'parallel refreshes should succeed idempotently');
 const successorCookies=parallel.map(r=>r.cookies.find(x=>x.startsWith('refreshToken=')).split(';')[0]);
 assert.equal(new Set(successorCookies).size,1,'parallel refresh responses must share one successor');
 assert.notEqual(parallel[0].body.accessToken,oldAccess);
 const forgot=await request('/auth/forgot-password',{email:'smoke@example.invalid'});assert.equal(forgot.status,200);assert.equal(forgot.body.resetToken,undefined);
 assert.equal((await request('/auth/reset-password',{token:{$ne:null},password:'new-password-123'})).status,400);
 await mongoose.connect(mongo.getUri('security_smoke'));const users=mongoose.connection.collection('users');
 await users.updateOne({email:'smoke@example.invalid'},{$set:{previousRefreshExpires:new Date(Date.now()-1)}});
 assert.equal((await request('/auth/refresh',{},undefined,cookie)).status,401,'predecessor must be rejected after grace expiry');
 assert.equal((await request('/auth/refresh',{},undefined,successorCookies[0])).status,200,'current successor should rotate after grace');
 const raw=crypto.randomBytes(32).toString('hex');await users.updateOne({email:'smoke@example.invalid'},{$set:{resetPasswordToken:crypto.createHash('sha256').update(raw).digest('hex'),resetPasswordExpires:new Date(Date.now()+60000),emailVerified:true,emailVerifiedAt:new Date()}});
 assert.equal((await request('/auth/reset-password',{token:raw,password:'new-password-123'})).status,200);
 assert.equal((await request('/auth/reset-password',{token:raw,password:'other-password-123'})).status,400);
 assert.equal((await request('/auth/me',undefined,oldAccess)).status,401);
 assert.equal((await request('/auth/refresh',{},undefined,cookie)).status,401);
 const login=await request('/auth/login',{email:'smoke@example.invalid',password:'new-password-123'});assert.equal(login.status,200);
 const webhook=await request('/telegram/webhook',{message:{chat:{id:1},text:'/start ABCDEF'}});assert.equal(webhook.status,403);
 assert.equal((await request('/auth/logout',{},login.body.accessToken)).status,200);
 assert.equal((await request('/auth/me',undefined,login.body.accessToken)).status,401);
 await runLoginRaces();
 console.log('PASS: actual production server startup, health, registration, authenticated profile, refresh rotation/concurrency/grace expiry, reset secrecy, NoSQL rejection, atomic reset/replay rejection, session revocation, new-password login, webhook rejection, logout revocation. MongoDB ephemeral; Redis HTTP test fixture; SMTP not configured.');
} finally {
 if(child){child.kill('SIGTERM');await once(child,'exit').catch(()=>{});}
 await mongoose.disconnect();await new Promise(r=>redis.close(r));if(mongo)await mongo.stop();
}
