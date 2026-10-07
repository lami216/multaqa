import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModule,response} from './helpers.js';
test('login rate limiter blocks requests if Redis fails',async()=>{
 const m=await loadModule('../middleware/rateLimit.js',{'../config/redis.js':{default:{incr:async()=>null,fixedWindow:async()=>null}}});
 const res=response();let next=false;await m.loginRateLimit({ip:'127.0.0.1'},res,()=>next=true);
 assert.equal(res.statusCode,503);assert.equal(next,false);
});
test('Telegram webhook rejects unsigned requests before processing messages',async()=>{
 process.env.TELEGRAM_WEBHOOK_SECRET='webhook-test-secret';let touched=false;
 const m=await loadModule('../controllers/telegramController.js',{
 '../models/User.js':{default:{}},'node:crypto':{default:await import('node:crypto'),timingSafeEqual:(await import('node:crypto')).timingSafeEqual},
 '../services/telegramConsentService.js':{consentPredicate:()=>null,consentMarker:()=>({})},'../utils/telegram.js':{createTelegramLinkToken:async()=>null,getUserIdFromTelegramLinkToken:async()=>{touched=true;return null;},sendTelegramMessageToChat:async()=>{touched=true;}}
 });
 const res=response();await m.webhook({headers:{},body:{message:{chat:{id:1},text:'/start ABCDEF'}}},res);
 assert.equal(res.statusCode,403);assert.equal(touched,false);
});
