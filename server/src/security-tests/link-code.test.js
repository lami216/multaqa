import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {loadModule} from './helpers.js';
test('Telegram code is reserved atomically and consumed once without reusable JWT fallback',async()=>{
 const values=new Map();let atomicSet=0,atomicGet=0;
 const redis={get:async key=>values.get(key),set:async(key,value)=>{values.set(key,value);return true;},del:async key=>values.delete(key),
 setIfAbsent:async(key,value)=>{atomicSet++;if(values.has(key))return false;values.set(key,value);return true;},
 getdel:async key=>{atomicGet++;const value=values.get(key);values.delete(key);return value ?? null;}};
 const m=await loadModule('../utils/telegram.js',{'crypto':{default:crypto},'../models/User.js':{default:{}},'../config/redis.js':{default:redis},'./jwt.js':{verifyTelegramLinkToken:()=>({userId:'victim',purpose:'telegram_link'})}});
 const code=await m.createTelegramLinkToken('u');assert.equal(atomicSet,1);
 assert.equal(await m.getUserIdFromTelegramLinkToken(code),'u');
 assert.equal(await m.getUserIdFromTelegramLinkToken(code),null);assert.equal(atomicGet,2);
 assert.equal(await m.getUserIdFromTelegramLinkToken('legacy-jwt'),null);
});
