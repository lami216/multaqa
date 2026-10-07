import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModule} from './helpers.js';
test('Redis reads late environment and counts with atomic expiry',async()=>{
 delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;
 const original=globalThis.fetch;let command,url;
 globalThis.fetch=async(u,options)=>{url=u;command=JSON.parse(options.body);return {ok:true,status:200,text:async()=>JSON.stringify({result:1})};};
 try {
 const {default:redis}=await loadModule('../config/redis.js',{});
 process.env.UPSTASH_REDIS_REST_URL='https://redis.example.invalid';process.env.UPSTASH_REDIS_REST_TOKEN='test';
 assert.equal(typeof redis.fixedWindow,'function');
 assert.equal(await redis.fixedWindow('test-key',60),1);
 assert.equal(url,process.env.UPSTASH_REDIS_REST_URL);assert.equal(command[0],'EVAL');assert.match(command[1],/EXPIRE/);
 } finally {globalThis.fetch=original;delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;}
});
