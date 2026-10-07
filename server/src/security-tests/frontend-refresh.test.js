import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import ts from '../../../node_modules/typescript/lib/typescript.js';
import axios, {AxiosError,AxiosHeaders} from '../../../node_modules/axios/index.js';
test('expired frontend requests share refresh and retry with new token',async()=>{
 const storage=new Map([['accessToken','expired']]);
 const context=vm.createContext({console,setTimeout,window:{localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}}});
 const source=await readFile(new URL('../../../src/lib/http.ts',import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const m=new vm.SourceTextModule(js,{context});
 await m.link(()=>new vm.SyntheticModule(['default','AxiosHeaders'],function(){this.setExport('default',axios);this.setExport('AxiosHeaders',AxiosHeaders);},{context}));
 await m.evaluate();let refreshes=0;
 m.namespace.http.defaults.adapter=async config=>{
  if(config.url==='/auth/refresh'){refreshes++;await new Promise(r=>setTimeout(r,10));return {status:200,data:{accessToken:'fresh'},config,headers:{}};}
  if(config.headers.get('Authorization')==='Bearer expired')throw new AxiosError('expired','ERR_BAD_REQUEST',config,{}, {status:401,data:{},config,headers:{}});
  return {status:200,data:{ok:true},config,headers:{}};
 };
 await Promise.all([m.namespace.http.get('/posts'),m.namespace.http.get('/notifications')]);
 assert.equal(refreshes,1);assert.equal(storage.get('accessToken'),'fresh');
});
