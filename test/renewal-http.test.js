const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
let remote,server,base,cookie,temp,password='renewal-secret',failProof=false;const calls=[];
test.before(async()=>{
 temp=await fs.mkdtemp(path.join(os.tmpdir(),'mawg-renewal-http-'));
 remote=http.createServer(async(req,res)=>{let text='';for await(const chunk of req)text+=chunk;const body=JSON.parse(text);calls.push(body);
  assert.equal(body.token,'renewal-token');let data;
  if(body.action==='users.credentials')data={ok:true,user:{usuario:'renewal-admin',nombre:'Test',rol:'admin',estado:'activo',permisos:'*',password}};
  else if(body.action==='users.password-upgrade'){password=body.hash;data={ok:true};}
  else if(body.action==='renewals.operation')data={ok:true,state:'pending',action:'renewals.confirm',target_id:'R1',result:null};
  else if(body.action==='proof.upload')data=failProof?{ok:false,error:'Drive no disponible'}:{ok:true,file:{url:'https://drive.test/proof',nombre:'proof.png'}};
  else if(body.action==='inventory.renew'||body.action==='renewals.confirm')data={ok:true,operation_id:body.operation_id,before:{fecha_vencimiento_cliente:'2026-10-26'},
   item:{inventario_id:'I1',pedido_id:'P1',producto_nombre:'Demo',proveedor:'Demo',estado:'ocupado',fecha_vencimiento_cliente:'2026-11-26'},
   order:{pedido_id:'P1',fecha_vencimiento_cliente:'2026-11-26'},renewal:{renovacion_id:'R1',inventario_id:'I1',estado:'renovado',vencimiento_nuevo:'2026-11-26'}};
  else data={ok:false,error:'Accion inesperada: '+body.action};
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(data));
 });await new Promise(resolve=>remote.listen(0,'127.0.0.1',resolve));
 Object.assign(process.env,{NODE_ENV:'test',SESSION_STORE:'memory',ADMIN_USER:'renewal-admin',ADMIN_PASSWORD:'renewal-secret',SESSION_SECRET:'renewal-http-session-secret-long-enough',
 CATALOG_STORAGE:'apps-script',OPERATIONS_STORAGE:'apps-script',RENEWALS_STORAGE:'apps-script',APPS_SCRIPT_CATALOG_URL:'http://127.0.0.1:'+remote.address().port+'/exec',APPS_SCRIPT_ADMIN_TOKEN:'renewal-token',
 APPS_SCRIPT_TIMEOUT_MS:'2000',APPS_SCRIPT_OPERATION_TIMEOUT_MS:'2000',AUDIT_LOG_JSON_PATH:path.join(temp,'audit.json')});
 server=require('../server').app.listen(0);await new Promise(resolve=>server.once('listening',resolve));base='http://127.0.0.1:'+server.address().port;
 const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario:'renewal-admin',password:'renewal-secret'})});
 assert.equal(login.status,200,await login.text());cookie=login.headers.getSetCookie().find(value=>value.startsWith('streamhub.sid=')).split(';')[0];calls.length=0;
});
test.after(async()=>{await Promise.all([new Promise(resolve=>server.close(resolve)),new Promise(resolve=>remote.close(resolve))]);await fs.rm(temp,{recursive:true,force:true});});
test('HTTP renovar inventario usa una sola llamada y devuelve el pedido actualizado',async()=>{
 calls.length=0;const response=await fetch(base+'/api/admin/inventario/I1/renovar',{method:'PUT',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({operation_id:'operation_http_0001',fecha_vencimiento_cliente:'2026-11-26'})});
 const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));assert.equal(data.updated_order.pedido_id,'P1');assert.deepEqual(calls.map(call=>call.action),['inventory.renew']);
});
test('HTTP confirmar con archivo usa dos llamadas y no reenvia base64 al guardar',async()=>{
 calls.length=0;const form=new FormData();form.set('operation_id','operation_http_0002');form.set('vencimiento_nuevo','2026-11-26');form.set('comprobante_archivo',new Blob(['proof'],{type:'image/png'}),'proof.png');
 const response=await fetch(base+'/api/admin/renovaciones/R1/confirmar',{method:'POST',headers:{Cookie:cookie},body:form});const data=await response.json();
 assert.equal(response.status,200,JSON.stringify(data));assert.deepEqual(calls.map(call=>call.action),['proof.upload','renewals.confirm']);assert.equal(JSON.stringify(calls[1]).includes('contenido_base64'),false);
 assert.equal(data.before,undefined);assert.equal(data.renewal.estado,'renovado');
});
test('HTTP fallo de Drive impide confirmar y no se oculta',async()=>{
 calls.length=0;failProof=true;const form=new FormData();form.set('operation_id','operation_http_0003');form.set('vencimiento_nuevo','2026-11-26');form.set('comprobante_archivo',new Blob(['proof'],{type:'image/png'}),'proof.png');
 const response=await fetch(base+'/api/admin/renovaciones/R1/confirmar',{method:'POST',headers:{Cookie:cookie},body:form});const data=await response.json();
 assert.equal(response.status,502);assert.match(data.error,/Drive/);assert.deepEqual(calls.map(call=>call.action),['proof.upload']);failProof=false;
});

test('HTTP confirmar sin archivo usa una sola llamada',async()=>{
 calls.length=0;const response=await fetch(base+'/api/admin/renovaciones/R1/confirmar',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({operation_id:'operation_http_0004',vencimiento_nuevo:'2026-11-26',comprobante_referencia:'ref'})});
 assert.equal(response.status,200,await response.text());assert.deepEqual(calls.map(call=>call.action),['renewals.confirm']);
});
test('HTTP consulta de estado requiere sesion y el identificador de guardado es obligatorio',async()=>{
 calls.length=0;const denied=await fetch(base+'/api/admin/operaciones-renovacion/operation_http_0004');assert.equal(denied.status,401);assert.equal(calls.length,0);
 const status=await fetch(base+'/api/admin/operaciones-renovacion/operation_http_0004',{headers:{Cookie:cookie}});assert.equal((await status.json()).state,'pending');
 calls.length=0;const invalid=await fetch(base+'/api/admin/inventario/I1/renovar',{method:'PUT',headers:{Cookie:cookie,'Content-Type':'application/json'},body:'{}'});assert.equal(invalid.status,400);assert.equal(calls.length,0);
});
