import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from '../server/node_modules/bcryptjs/index.js';
import User from '../server/src/models/User.js';
import Profile from '../server/src/models/Profile.js';
import * as jwt from '../server/src/utils/jwt.js';
import {loadModule,response} from '../server/src/security-tests/helpers.js';

export async function runLoginRaces() {
  process.env.JWT_ACCESS_SECRET = 'race-access-test'.repeat(4);
  process.env.JWT_REFRESH_SECRET = 'race-refresh-test'.repeat(4);
  const passwordHash = await bcrypt.hash('old-password-123',10);
  for (const action of ['reset','logout','refresh']) {
    const email=`race-${action}@example.invalid`;
    const user=await User.create({email,username:`race-${action}`,passwordHash});
    const originalRefresh=jwt.generateRefreshToken(user._id,0);
    await User.updateOne({_id:user._id},{$set:{refreshToken:originalRefresh},...(action !== 'refresh'?{$unset:{tokenVersion:''}}:{})});
    let resume, signal;
    const compared=new Promise(resolve=>signal=resolve);
    const gate=new Promise(resolve=>resume=resolve);
    const auth=await loadModule('../controllers/authController.js',{
      'bcryptjs':{default:{...bcrypt,compare:async(...args)=>{const valid=await bcrypt.compare(...args);signal();await gate;return valid;}}},
      'crypto':{default:crypto},'../models/User.js':{default:User},'../models/Profile.js':{default:Profile},
      '../utils/jwt.js':jwt,'../utils/passwordResetEmail.js':{sendPasswordResetEmail:async()=>{}}
    });
    const loginResponse=response();
    const pending=auth.login({body:{email,password:'old-password-123'}},loginResponse);
    await compared;
    if(action==='reset') {
      const token=crypto.randomBytes(32).toString('hex');
      await User.updateOne({_id:user._id},{$set:{resetPasswordToken:crypto.createHash('sha256').update(token).digest('hex'),resetPasswordExpires:new Date(Date.now()+60000)}});
      const resetResponse=response();await auth.resetPassword({body:{token,password:'new-password-123'}},resetResponse);
      assert.equal(resetResponse.statusCode,200);
    } else if(action==='logout') {
      const logoutResponse=response();await auth.logout({user:{_id:user._id}},logoutResponse);assert.equal(logoutResponse.statusCode,200);
    } else {
      const refreshResponse=response();await auth.refresh({cookies:{refreshToken:originalRefresh}},refreshResponse);assert.equal(refreshResponse.statusCode,200);
    }
    resume();await pending;
    const stored=await User.findById(user._id).lean();
    if(action==='refresh') {
      assert.equal(loginResponse.statusCode,200);
      assert.equal(stored.previousRefreshTokenHash,undefined,'login must atomically remove concurrently-created grace');
      assert.equal(stored.previousRefreshExpires,undefined);
      const replay=response();await auth.refresh({cookies:{refreshToken:originalRefresh}},replay);assert.equal(replay.statusCode,401);
    } else {
      assert.equal(loginResponse.statusCode,401,`stale login must not bypass ${action} revocation`);
      assert.equal(stored.tokenVersion,1,`stale legacy login must not roll back ${action} token version`);
      assert.equal(stored.refreshToken,undefined);
    }
  }
  console.log('PASS: real MongoDB/bcrypt deterministic legacy login-vs-reset, login-vs-logout, and login-vs-refresh cleanup races');
}
