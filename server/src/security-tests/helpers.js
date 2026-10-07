import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
export async function loadModule(relative, imports) {
 const context=vm.createContext({console,process,Buffer,URL,fetch,AbortSignal});
 const source=await readFile(new URL(relative,import.meta.url),'utf8');
 const module=new vm.SourceTextModule(source,{context});
 await module.link(async spec=>{
  if (!(spec in imports)) throw new Error(`Missing test dependency: ${spec}`);
  const values=imports[spec];
  return new vm.SyntheticModule(Object.keys(values),function(){for(const key of Object.keys(values))this.setExport(key,values[key]);},{context});
 });
 await module.evaluate();return module.namespace;
}
export const response=()=>({statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;},cookie(){},clearCookie(){}});
