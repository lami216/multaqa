import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {loadModule,response} from './helpers.js';
async function controller(User,sendPasswordResetEmail=async()=>{}) {
 return loadModule('../controllers/authController.js',{
 'bcrypt':{default:{hash:async()=> 'hash'}},'bcryptjs':{default:{hash:async()=> 'hash'}},
 'crypto':{default:crypto},'../config/redis.js':{default:{fixedWindow:async()=>1}},'../models/User.js':{default:User},'../services/emailVerificationService.js':{issueVerification:async()=>{},isEmailVerified:u=>Boolean(u?.emailVerifiedAt),hasVerifiedIdentity:()=>true},'../models/Profile.js':{default:{}},
 '../utils/jwt.js':{generateAccessToken:()=> 'access',generateRefreshToken:()=> 'refresh',verifyRefreshToken:()=>({userId:'u',tokenVersion:0})},
 '../utils/passwordResetEmail.js':{sendPasswordResetEmail}
 });
}
test('password reset request never reveals secret; stores only hash and emails raw token',async()=>{
 let emailed;const user={email:'student@example.invalid',emailVerifiedAt:new Date(),save:async()=>{}};
 const auth=await controller({findOne:async()=>user,findOneAndUpdate:async(f,u)=>{Object.assign(user,u.$set);return user;}},async(email,token)=>{emailed=token;});
 const res=response();await auth.forgotPassword({body:{email:user.email}},res);
 assert.equal(res.body.resetToken,undefined);assert.equal(typeof emailed,'string');
 assert.equal(user.resetPasswordToken,crypto.createHash('sha256').update(emailed).digest('hex'));
});
test('reset rejects query operators before any DB access',async()=>{
 let accessed=false;const auth=await controller({findOne:async()=>{accessed=true;return null;}});
 const res=response();await auth.resetPassword({body:{token:{$ne:null},password:'long-password'}},res);
 assert.equal(res.statusCode,400);assert.equal(accessed,false);
});
test('valid reset consumes hashed token atomically and invalidates sessions',async()=>{
 let filter,update;const auth=await controller({findOneAndUpdate:async(f,u)=>{filter=f;update=u;return {_id:'u'};}});
 const res=response();const token='a'.repeat(64);
 await auth.resetPassword({body:{token,password:'long-password'}},res);
 assert.equal(res.statusCode,200);
 assert.equal(filter.resetPasswordToken,crypto.createHash('sha256').update(token).digest('hex'));
 assert.equal(update.$inc.tokenVersion,1);assert.equal(update.$unset.refreshToken,'');
});
