const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../public/admin.js'),'utf8');
function harness(){
 const storage=new Map(),calls=[];let sequence=0;
 const c=vm.createContext({Map,crypto:{randomUUID:()=> 'operation_ui_'+String(++sequence).padStart(16,'0')},sessionUser:{usuario:'operator'},
  window:{sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}},
  setStatus(){},apiRequest:async(url,options)=>{calls.push(url);throw new Error('lost response');},
 });vm.runInContext(source.slice(source.indexOf('const pendingRenewalOperations ='),source.indexOf('function updateRenewalOrder(')),c);
 return {c,storage,calls};
}
test('ID se conserva entre reintentos y recargas y se elimina solo tras exito',()=>{
 const h=harness(),url='/api/admin/inventario/I1/renovar';const id=h.c.getRenewalOperationId(url);
 assert.equal(h.c.getRenewalOperationId(url),id);
 vm.runInContext('pendingRenewalOperations.clear()',h.c);assert.equal(h.c.getRenewalOperationId(url),id);
 assert.equal([...h.storage.values()].every(value=>/^operation_ui_/.test(value)),true);
 h.c.finishRenewalOperation(url);assert.equal(h.storage.size,0);assert.notEqual(h.c.getRenewalOperationId(url),id);
});
test('respuesta perdida consulta estado sin repetir la escritura',async()=>{
 const h=harness();h.c.apiRequest=async(url)=>{h.calls.push(url);if(!url.includes('/operaciones-renovacion/'))throw new Error('lost');return {state:'completed',action:'inventory.renew',target_id:'I1',result:{item:{inventario_id:'I1'},order:null}};};
 const result=await h.c.requestRenewalWrite('/api/admin/inventario/I1/renovar',{method:'PUT'});
 assert.equal(result.inventario_id,'I1');assert.equal(h.calls.length,2);assert.match(h.calls[1],/operaciones-renovacion/);
});
test('error de validacion no consulta estado ni borra el ID',async()=>{
 const h=harness();const url='/api/admin/inventario/I1/renovar';const id=h.c.getRenewalOperationId(url);
 h.c.apiRequest=async()=>{h.calls.push(url);const error=new Error('fecha invalida');error.status=400;throw error;};
 await assert.rejects(h.c.requestRenewalWrite(url,{method:'PUT'}),/fecha invalida/);
 assert.equal(h.calls.length,1);assert.equal(h.c.getRenewalOperationId(url),id);
});

test('ID recuperado tras recarga consulta el resultado sin reenviar formulario ni archivo',async()=>{
 const h=harness();const url='/api/admin/renovaciones/R1/confirmar';h.c.getRenewalOperationId(url);
 vm.runInContext('pendingRenewalOperations.clear(); freshRenewalOperationIds.clear()',h.c);
 h.c.apiRequest=async(resource)=>{h.calls.push(resource);return {state:'completed',action:'renewals.confirm',target_id:'R1',result:{renewal:{estado:'renovado'}}};};
 const result=await h.c.requestRenewalWrite(url,{method:'POST'});
 assert.equal(result.renewal.estado,'renovado');assert.equal(h.calls.length,1);assert.match(h.calls[0],/operaciones-renovacion/);
});

 test('NetworkError al confirmar recupera el resultado aunque venga con codigo del servidor',async()=>{
 const h=harness();h.c.apiRequest=async(url)=>{h.calls.push(url);if(!url.includes('/operaciones-renovacion/')){const error=new Error('NetworkError when attempting to fetch resource.');error.status=502;error.code='APPS_SCRIPT_ERROR';throw error;}return {state:'completed',action:'renewals.confirm',target_id:'R1',result:{renewal:{estado:'renovado'}}};};
 const result=await h.c.requestRenewalWrite('/api/admin/renovaciones/R1/confirmar',{method:'POST'});assert.equal(result.renewal.estado,'renovado');assert.equal(h.calls.length,2);
 });
 test('desconexion completa conserva el ID y advierte que el resultado es desconocido',async()=>{
 const h=harness(),url='/api/admin/renovaciones/R1/confirmar',id=h.c.getRenewalOperationId(url);h.c.apiRequest=async()=>{throw new Error('NetworkError when attempting to fetch resource.');};
 await assert.rejects(h.c.requestRenewalWrite(url,{method:'POST'}),/podria estar guardada/);assert.equal(h.c.getRenewalOperationId(url),id);
 });
