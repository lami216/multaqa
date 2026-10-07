import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModule,response} from './helpers.js';
import {validate,profileUpdateSchema} from '../middleware/validation.js';
import * as jwt from '../utils/jwt.js';
test('validated profile body discards unapproved ownership fields',()=>{
 const req={body:{facultyId:'f',majorId:'m',level:'L1',semesterId:'s',subjectCodes:['x'],userId:'victim'}};
 let passed=false;validate(profileUpdateSchema)(req,response(),()=>passed=true);
 assert(passed);assert.equal(req.body.userId,undefined);
});
test('access authentication rejects revoked token versions',async()=>{
 const middleware=await loadModule('../middleware/auth.js',{
 '../utils/jwt.js':{verifyAccessToken:()=>({userId:'u',tokenVersion:0})},
 '../services/emailVerificationService.js':{hasVerifiedIdentity:()=>true},'../models/User.js':{default:{findById:()=>({select:async()=>({tokenVersion:1,banned:false})})}}
 });
 const res=response();let next=false;
 await middleware.authenticate({headers:{authorization:'Bearer test'},cookies:{}},res,()=>next=true);
 assert.equal(res.statusCode,401);assert.equal(next,false);
});
test('Telegram purpose token cannot authenticate as access token with same key',()=>{
 process.env.JWT_ACCESS_SECRET='a'.repeat(40);delete process.env.JWT_TELEGRAM_SECRET;
 const token=jwt.generateTelegramLinkToken('u');
 assert.equal(jwt.verifyAccessToken(token),null);
});
