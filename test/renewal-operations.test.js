const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../scripts/google-apps-script-catalogo.gs'),'utf8');
function harness() {
 const sheets=new Map(),props=new Map(),writes=[];let failOrder=false;
 function sheet(name, rows=[]) {
  const value={ rows, getLastRow:()=>rows.length,
   getRange(row,col,height=1,width=1){return {
    getValues:()=>Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>rows[row+r-1]?.[col+c-1]??'')),
    setValues(values){if(name==='Pedidos'&&row>1&&failOrder){failOrder=false;throw new Error('fallo simulado pedido');}
     values.forEach((values,r)=>{rows[row+r-1]??=[];values.forEach((v,c)=>rows[row+r-1][col+c-1]=v);});if(row>1)writes.push(name);},
    setValue(v){this.setValues([[v]]);},
   };},getRangeList:()=>({setNumberFormat(){}}),
  };sheets.set(name,value);return value;
 }
 const spreadsheet={getSheetByName:name=>sheets.get(name),insertSheet:name=>sheet(name)};
 const c=vm.createContext({console:{log(){}},SpreadsheetApp:{openById:()=>spreadsheet,getActiveSpreadsheet:()=>spreadsheet,flush(){}},
  LockService:{getScriptLock:()=>({waitLock(){},hasLock:()=>true,releaseLock(){}})},
  PropertiesService:{getScriptProperties:()=>({setProperties(values){Object.entries(values).forEach(([k,v])=>props.set(k,v));}})},
  Utilities:{getUuid:()=>Math.random().toString()},ContentService:{MimeType:{JSON:'json'},createTextOutput: text=>({setMimeType:()=>JSON.parse(text)})},
 });vm.runInContext(source,c);
 const headers=name=>Array.from(vm.runInContext(name,c));
 sheet('InventarioCuentas',[headers('INVENTORY_HEADERS'),Array.from(c.inventoryItemToRow_(c.normalizeInventoryItem_({inventario_id:'I1',pedido_id:'P1',producto_nombre:'Demo',proveedor:'Proveedor',estado:'ocupado',fecha_vencimiento_cliente:'2026-10-26',notas:'original'})))]);
 sheet('Pedidos',[headers('ORDER_HEADERS'),Array.from(c.orderToRow_(c.normalizeOrder_({pedido_id:'P1',producto_nombre:'Demo',estado:'entregado',fecha_vencimiento_cliente:'2026-10-26',asignaciones_inventario:[{inventario_id:'I1',precio_venta:20}]})))]);
 sheet('Renovaciones',[headers('RENEWAL_HEADERS'),Array.from(c.renewalToRow_(c.normalizeRenewal_({renovacion_id:'R1',inventario_id:'I1',pedido_id:'P1',estado:'pendiente_aviso',monto:20,vencimiento_nuevo:'2026-11-26'})))]);
 const call=(action='renewals.confirm',id='R1',operationId='operation_test_0001',patch={vencimiento_nuevo:'2026-11-26',comprobante_referencia:'ref'})=>c.doPost({postData:{contents:JSON.stringify({action,id,operation_id:operationId,patch,token:'cambia-este-token-largo'})}});
 return {c,sheets,writes,props,call,fail:()=>{failOrder=true;}};
}
test('confirmacion coordinada sincroniza tres registros y conserva precios del combo',()=>{
 const h=harness(),result=h.call();assert.equal(result.ok,true,result.error);
 assert.equal(result.item.fecha_vencimiento_cliente,'2026-11-26');assert.equal(result.renewal.estado,'renovado');
 assert.equal(result.order.asignaciones_inventario[0].precio_venta,20);
 assert.equal(result.order.asignaciones_inventario[0].fecha_vencimiento_cliente,'2026-11-26');
 assert.equal(h.props.has('cache-version:renewals'),true);
});
test('respuesta perdida se recupera sin otra escritura ni notas duplicadas',()=>{
 const h=harness();const first=h.call();const count=h.writes.length;const replay=h.call();
 assert.equal(replay.ok,true,replay.error);assert.equal(replay.replayed,true);
 assert.equal(h.writes.length,count);assert.equal(replay.item.notas,first.item.notas);
});
test('fallo parcial se reanuda con el plan original y no duplica notas',()=>{
 const h=harness();h.fail();assert.equal(h.call().ok,false);
 const item=h.c.rowToInventoryItem_(h.sheets.get('InventarioCuentas').rows[1]);assert.equal(item.fecha_vencimiento_cliente,'2026-11-26');
 assert.equal(h.c.rowToRenewal_(h.sheets.get('Renovaciones').rows[1]).estado,'pendiente_aviso');
 const resumed=h.call();assert.equal(resumed.ok,true,resumed.error);assert.equal(resumed.renewal.estado,'renovado');
 assert.equal(resumed.item.notas,'original | Renovacion R1 confirmada');
});
test('no escribe datos de negocio si falta el pedido o falla validacion',()=>{
 const h=harness();h.sheets.get('Pedidos').rows.length=1;
 const result=h.call();assert.equal(result.code,'NOT_FOUND');assert.equal(h.writes.includes('InventarioCuentas'),false);
 const h2=harness();const invalid=h2.call('renewals.confirm','R1','operation_test_0001',{vencimiento_nuevo:'invalido'});
 assert.equal(invalid.code,'VALIDATION');assert.equal(h2.writes.includes('InventarioCuentas'),false);
});
test('otra operacion pendiente bloquea renovaciones superpuestas',()=>{
 const h=harness();h.fail();h.call();const result=h.call('inventory.renew','I1','operation_test_0002',{fecha_vencimiento_cliente:'2026-12-26'});
 assert.equal(result.code,'OPERATION_PENDING');
});
test('reintento no pisa modificaciones posteriores ni acepta otro payload',()=>{
 const h=harness();h.fail();h.call();
 const changed=h.call('renewals.confirm','R1','operation_test_0001',{vencimiento_nuevo:'2026-12-26',comprobante_referencia:'ref'});
 assert.equal(changed.code,'OPERATION_CONFLICT');
 const values=h.sheets.get('InventarioCuentas').rows[1];values[5]='cambio-externo';
 assert.equal(h.call().code,'OPERATION_CONFLICT');assert.equal(values[5],'cambio-externo');
});
test('renovar inventario conserva reservado y devuelve el antes para auditoria',()=>{
 const h=harness();h.sheets.get('InventarioCuentas').rows[1][9]='reservado';
 const result=h.call('inventory.renew','I1','operation_test_0003',{fecha_vencimiento_cliente:'2026-11-26'});
 assert.equal(result.ok,true,result.error);assert.equal(result.item.estado,'reservado');
 assert.equal(result.before.fecha_vencimiento_cliente,'2026-10-26');
});
test('confirmacion no permite cambiar la cuenta asociada desde el formulario',()=>{
 const h=harness();const result=h.call('renewals.confirm','R1','operation_test_0004',{inventario_id:'otra',vencimiento_nuevo:'2026-11-26',comprobante_referencia:'ref'});
 assert.equal(result.ok,true,result.error);assert.equal(result.item.inventario_id,'I1');
});

test('consulta de estado informa pendientes y recupera resultado completado',()=>{
 const h=harness();assert.equal(h.c.getRenewalOperationStatus_('operation_test_0001').state,'not_started');
 h.fail();h.call();assert.equal(h.c.getRenewalOperationStatus_('operation_test_0001').state,'pending');
 h.call();const state=h.c.getRenewalOperationStatus_('operation_test_0001');
 assert.equal(state.state,'completed');assert.equal(state.result.renewal.estado,'renovado');
});
test('subida de comprobante reutiliza el archivo y no toma bloqueo de Sheets',()=>{
 const h=harness();let created=0;const files=new Map();let userLocks=0;
 h.c.DriveApp={getFolderById:()=>({getFilesByName:name=>({hasNext:()=>files.has(name),next:()=>files.get(name)})})};
 h.c.Utilities.DigestAlgorithm={SHA_256:'sha256'};
 h.c.Utilities.computeDigest=(algorithm,value)=>Array.from(require('node:crypto').createHash('sha256').update(value).digest());
 h.c.LockService.getUserLock=()=>({waitLock(){userLocks++;},releaseLock(){}});
 h.c.LockService.getScriptLock=()=>{throw new Error('No usar bloqueo de Sheets para archivos');};
 h.c.uploadProofFile_=(proof,folder,prefix)=>{created++;const name=prefix+proof.nombre;files.set(name,{getId:()=>name,getName:()=>name,getUrl:()=> 'https://drive.test/'+name});return {nombre:name,url:'https://drive.test/'+name};};
 const payload={operation_id:'operation_proof_001',proof:{nombre:'proof.png',contenido_base64:'AA=='}};
 const first=h.c.uploadOperationProof_(payload),retry=h.c.uploadOperationProof_(payload);
 assert.equal(created,1);assert.equal(userLocks,2);assert.equal(first.url,retry.url);
});
