const test=require('node:test'),assert=require('node:assert/strict');
const RenewalStore=require('../src/services/renewals/appsScriptRenewalStore');
const InventoryStore=require('../src/services/inventory/appsScriptInventoryStore');
const config={endpointUrl:'https://example.invalid/exec',adminToken:'private-test-token',operationTimeoutMs:1000};
test('renovar inventario realiza una sola solicitud sin lecturas auxiliares',async t=>{
 const original=global.fetch; t.after(()=>global.fetch=original);const calls=[];
 global.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return Response.json({ok:true,item:{inventario_id:'I1'},before:{}});};
 const store=new InventoryStore(config);await store.renewItem('I1',{fecha_vencimiento_cliente:'2026-11-26',operation_id:'operation_test_001'},'operation_test_001');
 assert.equal(calls.length,1);assert.equal(calls[0].action,'inventory.renew');assert.equal(calls[0].patch.operation_id,undefined);
 assert.equal(calls[0].token,config.adminToken);
});
test('timeout de renovaciones no se reintenta ni utiliza JSON local',async t=>{
 const original=global.fetch;t.after(()=>global.fetch=original);let requests=0,fallback=0;
 global.fetch=async()=>{requests++;const error=new Error('timeout');error.name='AbortError';throw error;};
 const store=new RenewalStore({...config,fallbackStore:{updateRenewal:()=>fallback++}});
 await assert.rejects(store.updateRenewal('R1',{}),error=>error.code==='RESULT_UNKNOWN'&&error.statusCode===504);
 assert.equal(requests,1);assert.equal(fallback,0);
});
test('comprobante se sube una vez y la confirmacion solo lleva referencia',async t=>{
 const original=global.fetch;t.after(()=>global.fetch=original);const calls=[];
 global.fetch=async(url,options)=>{const body=JSON.parse(options.body);calls.push(body);return Response.json(body.action==='proof.upload'?{ok:true,file:{url:'https://drive.test/proof',nombre:'proof.png'}}:{ok:true,renewal:{estado:'renovado'},item:{inventario_id:'I1'}});};
 const store=new RenewalStore(config);const file=await store.uploadOperationProof({nombre:'proof.png',contenido_base64:'AA=='},'operation_test_001');
 await store.confirmRenewal('R1',{comprobante_url:file.url,vencimiento_nuevo:'2026-11-26'},'operation_test_001');
 assert.deepEqual(calls.map(call=>call.action),['proof.upload','renewals.confirm']);
 assert.equal(JSON.stringify(calls[1]).includes('contenido_base64'),false);
});
test('conflictos y Apps Script antiguo producen errores explicitos',async t=>{
 const original=global.fetch;t.after(()=>global.fetch=original);const store=new RenewalStore(config);
 global.fetch=async()=>Response.json({ok:false,code:'OPERATION_CONFLICT',error:'El registro cambio'});
 await assert.rejects(store.confirmRenewal('R1',{},'operation_test_001'),error=>error.statusCode===409);
 global.fetch=async()=>Response.json({ok:false,error:'Accion no soportada.'});
 await assert.rejects(store.confirmRenewal('R1',{},'operation_test_001'),/Actualiza y publica el Apps Script/);
});
