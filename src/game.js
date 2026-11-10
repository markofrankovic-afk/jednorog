
(function(){
const $=id=>document.getElementById(id);
const GEM_SVG='<svg viewBox="0 0 30 30"><path d="M8 4h14l6 8-13 15L2 12z" fill="#ff6fa5"/><path d="M8 4l7 8 7-8M2 12h26M15 12v15" stroke="#ffd6e8" stroke-width="1.6" fill="none"/></svg>';
const FOAL_SVG='<svg viewBox="0 0 30 30"><path d="M15 27C6 20 3 15 3 10a6 6 0 0 1 12-2 6 6 0 0 1 12 2c0 5-3 10-12 17z" fill="#c77dff"/><path d="M15 3l2 7h-4z" fill="#ffd166"/></svg>';
const BONE_SVG='<svg viewBox="0 0 30 30"><g transform="rotate(-35 15 15)"><rect x="7" y="12" width="16" height="6" rx="3" fill="#fff6e6" stroke="#4a2c6b" stroke-width="1.6"/><circle cx="7" cy="11" r="3.6" fill="#fff6e6" stroke="#4a2c6b" stroke-width="1.6"/><circle cx="7" cy="19" r="3.6" fill="#fff6e6" stroke="#4a2c6b" stroke-width="1.6"/><circle cx="23" cy="11" r="3.6" fill="#fff6e6" stroke="#4a2c6b" stroke-width="1.6"/><circle cx="23" cy="19" r="3.6" fill="#fff6e6" stroke="#4a2c6b" stroke-width="1.6"/><rect x="7.5" y="13.4" width="15" height="3.2" fill="#fff6e6"/></g></svg>';
document.querySelectorAll('.gemIcon').forEach(e=>e.innerHTML=GEM_SVG);$('foalIcon').innerHTML=FOAL_SVG;$('boneIcon').innerHTML=BONE_SVG;
const HEART=(on)=>`<svg viewBox="0 0 32 30"><path d="M16 28C6 20 2 15 2 9a7 7 0 0 1 14-2 7 7 0 0 1 14 2c0 6-4 11-14 19z" fill="${on?'#ff6fa5':'#fff'}" stroke="#4a2c6b" stroke-width="2.5"/></svg>`;

/* ---------- renderer ---------- */
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
$('app').appendChild(renderer.domElement);
const scene=new THREE.Scene();
let duo=false;let camera=new THREE.PerspectiveCamera(58,1,0.1,800);const camera1=camera,camera2=new THREE.PerspectiveCamera(58,1,0.1,800);
let viewShift=false;
function applyView(){const W=innerWidth,H=innerHeight;camera.aspect=W/H;camera.fov=W<H?Math.min(85,58+(H/W-1)*30):58;
  if(viewShift){if(W>=760)camera.setViewOffset(W,H,W*.22,0,W,H);else camera.setViewOffset(W,H,0,H*.26,W,H);}else camera.clearViewOffset();
  camera.updateProjectionMatrix();}
function resize(){renderer.setSize(innerWidth,innerHeight);applyView();if(duo)duoView();if(composer){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);}}
/* ---------- nicer graphics: bloom + outlines ("lijepa") or plain ("brza") ---------- */
const GFX_KEY='leonin-jednorog-gfx';let GFXON=(()=>{try{const v=localStorage.getItem(GFX_KEY);return v===null?true:v==='1';}catch(e){return true;}})();
let gradeP=null,composer=null,rpass=null,bloom=null,fxP={s:.35,t:.9,r:.45};
const PERF_KEY='leonin-jednorog-perf';let PERF=(()=>{try{const v=localStorage.getItem(PERF_KEY);return v===null?2:+v;}catch(e){return 2;}})();
const PRMAX=()=>PERF>=2?1.6:PERF===1?1.2:1.0;
function setupFX(){composer=null;if(!GFXON||!THREE.EffectComposer||!THREE.UnrealBloomPass)return;
  try{const pr=renderer.getPixelRatio(),W=Math.floor(innerWidth*pr),H=Math.floor(innerHeight*pr);
    const rt=PERF>=2&&renderer.capabilities.isWebGL2&&THREE.WebGLMultisampleRenderTarget?new THREE.WebGLMultisampleRenderTarget(W,H,{format:THREE.RGBAFormat}):undefined;
    composer=new THREE.EffectComposer(renderer,rt);rpass=new THREE.RenderPass(scene,camera);composer.addPass(rpass);
    const lowq=matchMedia('(pointer:coarse)').matches;bloom=new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth*(lowq?.5:1),innerHeight*(lowq?.5:1)),fxP.s,fxP.r,fxP.t);composer.addPass(bloom);
    const grade=new THREE.ShaderPass({uniforms:{tDiffuse:{value:null},sat:{value:1.16},con:{value:1.07},warm:{value:new THREE.Vector3(1.025,1.0,.975)},res:{value:new THREE.Vector2(W,H)},tilt:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`uniform sampler2D tDiffuse;uniform float sat;uniform float con;uniform vec3 warm;uniform vec2 res;uniform float tilt;varying vec2 vUv;
      void main(){vec4 c=texture2D(tDiffuse,vUv);float b=(smoothstep(.56,.98,vUv.y)+smoothstep(.2,0.,vUv.y)*.7)*tilt;
        if(b>.01){vec3 acc=c.rgb;float px=b*3.2*res.y/900.;for(int i=1;i<10;i++){float fi=float(i);float a=fi*2.39996;float r=sqrt(fi/9.)*px;acc+=texture2D(tDiffuse,vUv+vec2(cos(a),sin(a))*r/res).rgb;}c.rgb=acc/10.;}
        float l=dot(c.rgb,vec3(.299,.587,.114));vec3 r=mix(vec3(l),c.rgb,sat);r=(r-.5)*con+.5;r=mix(r,r*r*(3.-2.*r),.22);r*=warm;r+=vec3(.018,0.,.03)*(1.-l);
        gl_FragColor=vec4(clamp(r,0.,1.),c.a);}`});composer.addPass(grade);gradeP=grade;
    composer.setPixelRatio(pr);composer.setSize(innerWidth,innerHeight);}catch(e){composer=null;}}
function fxTune(s,t,r=.45){fxP={s,t,r};if(bloom){bloom.strength=s;bloom.threshold=t;bloom.radius=r;bloom.enabled=s>0;}}
function applyPerf(){const pr=Math.min(window.devicePixelRatio||1,PRMAX());if(!duo){renderer.setPixelRatio(pr);renderer.setSize(innerWidth,innerHeight);}setupFX();
  const sh=PERF>=1;if(renderer.shadowMap.enabled!==sh){renderer.shadowMap.enabled=sh;scene.traverse(o=>{if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true);}});}
  if(sh){const ms=PERF>=2&&!LOWQ?2048:1024;if(sun.shadow.mapSize.x!==ms){sun.shadow.mapSize.set(ms,ms);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}}
  if(PERF<1&&LUSH){for(const sl of LUSH.slots){sl.im.visible=false;sl.fl.visible=false;}LUSH=null;LUSHU.on.value=0;}else if(PERF<2&&LUSH_RAD>2){LUSH_RAD=2;LUSHU.fa.value=9;LUSHU.fb.value=15;}
  for(const c of FTCARDS)c.visible=PERF>=1;for(const k in FTM){if(FTM[k].color&&!k.endsWith('c')&&k!=='trunkk')FTM[k].color.setScalar(PERF>=1?1:1.3);}
  try{localStorage.setItem(PERF_KEY,String(PERF));}catch(e){}}
const perfMon={t:0,n:0,last:0,warm:0};
function perfTick(){const now=performance.now();if(mode!=='ride'||!GFXON||PERF<=0){perfMon.last=0;perfMon.warm=0;return;}
  if(perfMon.last){const ft=now-perfMon.last;perfMon.warm+=ft;if(perfMon.warm>2500&&ft<1500){perfMon.t+=ft;perfMon.n++;}}perfMon.last=now;
  if(perfMon.t>=4000&&perfMon.n>=8){const avg=perfMon.t/perfMon.n;perfMon.t=0;perfMon.n=0;if(avg>(PERF>=2?24:29)){PERF--;applyPerf();perfMon.warm=0;}}}
function draw(){if(STBTW&&mode!=='fly'&&mode!=='ride'){const tt=performance.now()/1000;for(const m of STBTW){if(!m.parent){STBTW=null;break;}m.position.y=m.userData.y0+Math.sin(tt*.6+m.userData.tw)*.35;const k=.5+.5*Math.sin(tt*2.2+m.userData.tw*3);m.scale.setScalar(.1+.2*k);}}syncLeonas();perfTick();fxUpdate();animateStableFx(performance.now()/1000);if(gradeP){const pr=renderer.getPixelRatio();gradeP.uniforms.res.value.set(innerWidth*pr,innerHeight*pr);gradeP.uniforms.tilt.value=PERF<2?0:mode==='ride'?1:.55;gradeP.uniforms.sat.value=glamOn()?1.27:1.16;const td=mode==='ride'?todNow():'dan';gradeP.uniforms.warm.value.set(...(td==='zalazak'?[1.07,.97,.9]:td==='jutro'?[1.04,1,.97]:[1.025,1,.975]));}if(mode==='ride')lushUpdate();else lushCenters.length=0;if(composer&&!duo){rpass.camera=camera;composer.render();}else renderer.render(scene,camera);}
function setGfx(on){GFXON=on;try{localStorage.setItem(GFX_KEY,on?'1':'0');}catch(e){}setupFX();document.body.classList.toggle('gfx',on);}
const OUTM={};function outlineMat(skin){const k=skin?'s':'m';if(OUTM[k])return OUTM[k];const m=new THREE.MeshBasicMaterial({color:0x3d2457,side:THREE.BackSide,skinning:!!skin});
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <project_vertex>',`vec4 mvPosition=modelViewMatrix*vec4(transformed,1.0);
    #ifdef USE_SKINNING
    mat4 sM=bindMatrixInverse*(boneMatX*skinWeight.x+boneMatY*skinWeight.y+boneMatZ*skinWeight.z+boneMatW*skinWeight.w)*bindMatrix;vec3 oN=normalize(normalMatrix*(sM*vec4(normal,0.0)).xyz);
    #else
    vec3 oN=normalize(normalMatrix*normal);
    #endif
    mvPosition.xyz+=oN*0.0007*clamp(-mvPosition.z,2.0,40.0);gl_Position=projectionMatrix*mvPosition;`);};
  return OUTM[k]=m;}
/* cartoon outline: an inflated back-face copy of every solid mesh */
function addOutline(root){if(true)return root;const list=[];root.traverse(o=>{if(o.isMesh&&!o.userData.isOutline&&o.material&&!o.material.isMeshBasicMaterial&&!o.isInstancedMesh)list.push(o);});
  for(const o of list){const s=o.scale;if(!o.isSkinnedMesh&&Math.min(s.x,s.y,s.z)<.05&&o.geometry.type!=='BufferGeometry')continue;
    if(!o.isSkinnedMesh){if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();const ws=new THREE.Vector3();o.getWorldScale(ws);const rs=root.getWorldScale(new THREE.Vector3()).x||1;if(o.geometry.boundingSphere.radius*Math.max(ws.x,ws.y,ws.z)/rs<.075)continue;}
    let q;if(o.isSkinnedMesh){q=new THREE.SkinnedMesh(o.geometry,outlineMat(true));q.bind(o.skeleton,o.bindMatrix);q.bindMode=o.bindMode;q.frustumCulled=false;
      q.position.copy(o.position);q.quaternion.copy(o.quaternion);q.scale.copy(o.scale);o.parent.add(q);}
    else{q=new THREE.Mesh(o.geometry,outlineMat(false));o.add(q);}
    q.userData.isOutline=true;q.castShadow=false;q.receiveShadow=false;q.renderOrder=-0.5;}
  return root;}
resize();addEventListener('resize',resize);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,PRMAX()));renderer.setSize(innerWidth,innerHeight);setupFX();document.body.classList.toggle('gfx',GFXON);
$('bGfx').textContent=GFXON?'✨ Grafika: lijepa':'⚡ Grafika: brza';$('bGfx').onclick=()=>{if(!GFXON){try{localStorage.setItem(PERF_KEY,'2');}catch(e){}}setGfx(!GFXON);location.reload();};
const hemi=new THREE.HemisphereLight(0xffffff,0xb48ad8,0.75);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,0.7);sun.position.set(30,60,-20);scene.add(sun);
const rimL=new THREE.DirectionalLight(0xffd6f0,0);rimL.position.set(-40,25,60);scene.add(rimL);

const G={box:new THREE.BoxGeometry(1,1,1),sph:new THREE.SphereGeometry(1,28,20),cyl:new THREE.CylinderGeometry(1,1,1,28),
  cone:new THREE.ConeGeometry(1,1,18),cone4:new THREE.ConeGeometry(1,1,4),circ:new THREE.CircleGeometry(1,24),gem:new THREE.OctahedronGeometry(1,0)};
const TOON=(()=>{const t=new THREE.DataTexture(new Uint8Array([100,155,205,240]),4,1,THREE.LuminanceFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;})();
const MATS={};
function mat(c){return MATS[c]||(MATS[c]=new THREE.MeshToonMaterial({color:c,gradientMap:TOON}));}
const basic=(c,o={})=>new THREE.MeshBasicMaterial(Object.assign({color:c},o));
let world=new THREE.Group();scene.add(world);
function put(geo,c,x,y,z,sx,sy,sz,p){const m=new THREE.Mesh(geo,typeof c==='number'?mat(c):c);m.position.set(x,y,z);m.scale.set(sx,sy,sz);(p||world).add(m);return m;}
const box=(x,y,z,w,h,d,c,p)=>put(G.box,c,x,y,z,w,h,d,p);
const sph=(x,y,z,rx,ry,rz,c,p)=>put(G.sph,c,x,y,z,rx,ry,rz,p);
const cyl=(x,y,z,r,h,c,p)=>put(G.cyl,c,x,y,z,r,h,r,p);
const cone=(x,y,z,r,h,c,p)=>put(G.cone,c,x,y,z,r,h,r,p);
const starGeo=(()=>{const s=new THREE.Shape();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?.45:1;const x=Math.cos(a)*r,y=-Math.sin(a)*r;i?s.lineTo(x,y):s.moveTo(x,y);}
  return new THREE.ExtrudeGeometry(s,{depth:.35,bevelEnabled:false});})();
const heartGeo=(()=>{const s=new THREE.Shape();s.moveTo(0,-.9);s.bezierCurveTo(-1.2,-.1,-1,.9,0,.45);s.bezierCurveTo(1,.9,1.2,-.1,0,-.9);
  return new THREE.ExtrudeGeometry(s,{depth:.3,bevelEnabled:false});})();


/* ---------- graphics helpers ---------- */
const LOWQ=matchMedia('(pointer:coarse)').matches;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
sun.castShadow=true;sun.shadow.mapSize.set(LOWQ?1024:2048,LOWQ?1024:2048);
{const sc=sun.shadow.camera;sc.left=-28;sc.right=28;sc.top=28;sc.bottom=-28;sc.near=1;sc.far=170;}
sun.shadow.bias=-0.0005;sun.shadow.normalBias=0.04;scene.add(sun.target);
const SUNOFF=new THREE.Vector3(30,60,-22);const TODS=[['dan','🌤️ Dan'],['zalazak','🌅 Zalazak'],['jutro','🌄 Jutro']];
function todNow(){return th&&!th.night&&GFXON&&save.tod&&save.tod!=='dan'?save.tod:'dan';}
function followSun(x,y,z){if(lushCenters.length<2)lushCenters.push([x,z]);sun.position.set(x+SUNOFF.x,y+SUNOFF.y,z+SUNOFF.z);sun.target.position.set(x,y,z);}
const glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
  const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
const GLOWM={};
function glowMat(c,fog=true,op=1){const k=c+'|'+fog+'|'+op;return GLOWM[k]||(GLOWM[k]=new THREE.SpriteMaterial({map:glowTex,color:c,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog,opacity:op}));}
function glow(parent,x,y,z,s,c,fog=true,op=1){const sp=new THREE.Sprite(glowMat(c,fog,op));sp.position.set(x,y,z);sp.scale.set(s,s,s);parent.add(sp);return sp;}
function castAll(root){root.traverse(o=>{if(o.isMesh&&!(o.material&&o.material.isMeshBasicMaterial))o.castShadow=true;});}
let skyMesh=null;
let _detail=null;function detailTex(){if(_detail)return _detail;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,128,128);
  for(let i=0;i<900;i++){const v=215+Math.floor(Math.random()*40);x.fillStyle=`rgba(${v},${v},${v},${.25+Math.random()*.35})`;const px=Math.random()*128,py=Math.random()*128;x.fillRect(px,py,1+Math.random()*2.5,1+Math.random()*2.5);}
  for(let i=0;i<120;i++){x.strokeStyle='rgba(205,215,205,.35)';x.lineWidth=1;const px=Math.random()*128,py=Math.random()*128;x.beginPath();x.moveTo(px,py);x.lineTo(px+(Math.random()-.5)*3,py-3-Math.random()*4);x.stroke();}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return _detail=t;}
function SUNSPOT(){const t=todNow();return t==='zalazak'?new THREE.Vector3(-150,28,300):t==='jutro'?new THREE.Vector3(260,45,-180):new THREE.Vector3(-120,130,290);}
function skyDome(base){
  const tod=todNow();let top=new THREE.Color(base).offsetHSL(0,.1,-.07),bot=new THREE.Color(base).offsetHSL(0,-.04,.08);
  if(tod==='zalazak'){top=new THREE.Color(0x6a5cc4);bot=new THREE.Color(0xffb48a);}else if(tod==='jutro'){top=new THREE.Color(0x9cc8f2);bot=new THREE.Color(0xffe0d2);}
  const day=th&&!th.night&&GFXON;const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:top},bot:{value:bot},sd:{value:SUNSPOT().normalize()},sg:{value:day?(tod==='dan'?1:1.8):0}},
    vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 top;uniform vec3 bot;uniform vec3 sd;uniform float sg;varying vec3 vP;void main(){float h=clamp(vP.y*1.5+.06,0.,1.);vec3 c=mix(bot,top,pow(h,.75));float k=max(dot(normalize(vP),sd),0.);c+=sg*(vec3(1.,.93,.75)*pow(k,48.)*.55+vec3(1.,.9,.8)*pow(k,6.)*.16);c=mix(c,vec3(1.,.97,.95),sg*(1.-smoothstep(0.,.18,vP.y))*.22);gl_FragColor=vec4(c,1.);}'});
  const s=new THREE.Mesh(new THREE.SphereGeometry(600,32,16),m);s.renderOrder=-1;s.frustumCulled=false;skyMesh=s;return {mesh:s,horizon:bot};
}
const windU={value:0};
const GLU={value:0};const RAMP0={};
function glamOn(){return save.glam!==false;}
function smoothGeo(g){const p=g.attributes.position,n=g.attributes.normal;if(!p||!n||g.userData.n0)return;
  const A=n.data?n.data.array:n.array,sc=A instanceof Int8Array?127:A instanceof Int16Array?32767:1;const n0=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){n0[i*3]=n.getX(i);n0[i*3+1]=n.getY(i);n0[i*3+2]=n.getZ(i);}g.userData.n0=n0;
  const acc=new Map(),P=i=>[p.getX(i),p.getY(i),p.getZ(i)];let mx=0;for(let i=0;i<p.count;i++)mx=Math.max(mx,Math.abs(p.getX(i)),Math.abs(p.getY(i)),Math.abs(p.getZ(i)));const q=2000/(mx||1);
  const key=i=>Math.round(p.getX(i)*q)+'|'+Math.round(p.getY(i)*q)+'|'+Math.round(p.getZ(i)*q);const ix=g.index?g.index.array:null,nt=(ix?ix.length:p.count)/3;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),fn=new THREE.Vector3();
  for(let t=0;t<nt;t++){const i0=ix?ix[t*3]:t*3,i1=ix?ix[t*3+1]:t*3+1,i2=ix?ix[t*3+2]:t*3+2;a.fromBufferAttribute(p,i0);b.fromBufferAttribute(p,i1);c.fromBufferAttribute(p,i2);fn.copy(b).sub(a).cross(c.sub(a));
    for(const i of [i0,i1,i2]){const k=key(i);let v=acc.get(k);if(!v){v=[0,0,0];acc.set(k,v);}v[0]+=fn.x;v[1]+=fn.y;v[2]+=fn.z;}}
  const n1=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const v=acc.get(key(i))||[0,1,0];const l=Math.hypot(v[0],v[1],v[2])||1;for(let k=0;k<3;k++){const w=v[k]/l*sc;n1[i*3+k]=sc>1?Math.round(w):w;}}g.userData.n1=n1;}
function smoothHorse(on){if(typeof HORSE==='undefined'||!HORSE)return;HORSE.scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;smoothGeo(g);const src=on?g.userData.n1:g.userData.n0;if(!src)return;const n=g.attributes.normal;for(let i=0;i<n.count;i++)n.setXYZ(i,src[i*3],src[i*3+1],src[i*3+2]);n.needsUpdate=true;});}
function applyGlam(){const on=glamOn();GLU.value=on?1:0;try{smoothHorse(on);}catch(e){console.warn(e);}
  for(const [k,t,lo] of [['T',TOON,[100,155,205,240]],['L',typeof LTOON!=='undefined'?LTOON:null,[125,172,212,232]]]){if(!t)continue;
    if(on){const n=32,d=new Uint8Array(n);for(let i=0;i<n;i++){const x=i/(n-1);const y=lo[0]+(lo[3]-lo[0])*(x*x*(3-2*x));d[i]=Math.round(y+(1-Math.abs(x-.5)*2)*6);}t.image={data:d,width:n,height:1};t.minFilter=t.magFilter=THREE.LinearFilter;}
    else{t.image={data:new Uint8Array(lo),width:4,height:1};t.minFilter=t.magFilter=THREE.NearestFilter;}t.needsUpdate=true;}}
function grassField(count,ca,area,topFn){
  const geo=new THREE.ConeGeometry(.055,.38,4);geo.translate(0,.19,0);
  const m=new THREE.MeshToonMaterial({color:0xffffff,gradientMap:TOON});
  m.onBeforeCompile=sh=>{sh.uniforms.uTime=windU;if(GFXON){sh.vertexShader='varying float vGH;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGH=position.y/.38;');
      sh.fragmentShader='varying float vGH;\n'+sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );','vec4 diffuseColor = vec4( diffuse*mix(.72,1.18,clamp(vGH,0.,1.)), opacity );');}
    Object.assign(sh.uniforms,LUSHU);sh.vertexShader='uniform float uTime;uniform vec2 c1;uniform vec2 c2;uniform float fa;uniform float on;\n'+sh.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ix=instanceMatrix[3][0],iz=instanceMatrix[3][2];\ntransformed*=mix(1.0,smoothstep(fa-2.0,fa+5.0,min(distance(vec2(ix,iz),c1),distance(vec2(ix,iz),c2))),on);\ntransformed.x+=sin(uTime*2.1+ix*.35+iz*.27)*.14*position.y;\ntransformed.z+=cos(uTime*1.6+ix*.21)*.07*position.y;\n#endif');};
  const im=new THREE.InstancedMesh(geo,m,count),d=new THREE.Object3D(),c=new THREE.Color(),A=new THREE.Color(ca).offsetHSL(0,.05,-.1),B=new THREE.Color(ca).offsetHSL(.02,.06,.06);let n=0;
  for(let i=0;i<count*4&&n<count;i++){const x=area.x0+Math.random()*(area.x1-area.x0),z=area.z0+Math.random()*(area.z1-area.z0);
    const t=topFn(x,z);if(t===null)continue;
    d.position.set(x,t-.02,z);d.rotation.set((Math.random()-.5)*.35,Math.random()*6.3,(Math.random()-.5)*.35);const s=.7+Math.random()*.9;d.scale.set(s,s*(.7+Math.random()*.7),s);
    d.updateMatrix();im.setMatrixAt(n,d.matrix);c.copy(A).lerp(B,Math.random());im.setColorAt(n,c);n++;}
  im.count=n;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.receiveShadow=true;return im;
}
/* ---------- lush grass carpet: dense blades in chunks that follow the player ---------- */
const LUSHU={c1:{value:new THREE.Vector2(0,0)},c2:{value:new THREE.Vector2(1e5,1e5)},fa:{value:15},fb:{value:22},on:{value:0}};
const LUSH_CH=8;let LUSH_RAD=3,lushPerf={t:0,n:0,cut:false};const LUSH_FIXED=0,LUSH_N=LOWQ?950:1700;let LUSH=null,lushCenters=[];
function lushGeo(){const g=new THREE.BufferGeometry(),P=[],H=[],I=[];const L=[[0,1],[.33,.82],[.66,.52],[1,0]],w=.045;
  L.forEach(([y,s],k)=>{const z=.16*y*y;if(s>0){P.push(-w*s,y,z,w*s,y,z);H.push(y,y);}else{P.push(0,y,z);H.push(y);}});
  I.push(0,1,2,1,3,2,2,3,4,3,5,4,4,5,6);g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('gh',new THREE.Float32BufferAttribute(H,1));
  const N=[];for(let i=0;i<P.length/3;i++)N.push(0,1,0);g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setIndex(I);return g;}
function lushMat(){const m=new THREE.MeshLambertMaterial({color:0xffffff,side:THREE.DoubleSide});
  m.onBeforeCompile=sh=>{sh.uniforms.uTime=windU;Object.assign(sh.uniforms,LUSHU);
    sh.vertexShader='uniform float uTime;uniform vec2 c1;uniform vec2 c2;uniform float fa;uniform float fb;attribute float gh;varying float vGH;\n'+sh.vertexShader.replace('#include <begin_vertex>',
`#include <begin_vertex>
vGH=gh;vec2 ip=vec2(instanceMatrix[3][0],instanceMatrix[3][2]);float d1=distance(ip,c1),d2=distance(ip,c2);float dm=min(d1,d2);
float fs=1.0-smoothstep(fa,fb,dm);transformed*=fs;
float gust=sin(uTime*1.3+ip.x*.11+ip.y*.07)*.5+.5;float bend=(sin(uTime*2.4+ip.x*.6+ip.y*.45)*.18+gust*.35)*gh*gh;
transformed.x+=bend;transformed.z+=bend*.4;
vec2 pd=ip-(d1<d2?c1:c2);float pl=length(pd);float push=(1.0-smoothstep(.3,1.6,pl))*gh*.55;transformed.xz+=normalize(pd+.0001)*push;transformed.y*=1.0-push*.5;`);
    sh.fragmentShader='varying float vGH;\n'+sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );','vec4 diffuseColor = vec4( diffuse*mix(vec3(.78,.81,.8),vec3(1.1,1.12,1.0),smoothstep(0.,1.,vGH)), opacity );');};return m;}
function flowerGeo(){const P=[0,0,0],C=[1,.95,.55],I=[];const n=10;for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,r=i%2?.05:.12;P.push(Math.cos(a)*r,0,Math.sin(a)*r);C.push(1,1,1);}
  for(let i=1;i<=n;i++)I.push(0,i+1,i);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  const N=[];for(let i=0;i<P.length/3;i++)N.push(0,1,0);g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setIndex(I);return g;}
const FLC=[0xffffff,0xfff3a0,0xffb3d9,0xd7b8ff,0xff8fb8];
function lushInit(gTop,col){LUSH=null;LUSHU.on.value=0;if(!GFXON||PERF<1||!th||th.snow||levelIdx===2||glamOn())return;if(PERF<2)LUSH_RAD=2;
  LUSH={gTop,slots:[],map:new Map(),geo:lushGeo(),mat:lushMat(),A:new THREE.Color(col).offsetHSL(-.01,.04,-.04),B:new THREE.Color(col).offsetHSL(.03,.1,.05),queue:[],fgeo:flowerGeo(),fmat:(()=>{const m=new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true,side:THREE.DoubleSide,emissive:0x221a22});m.onBeforeCompile=sh=>{sh.uniforms.uTime=windU;Object.assign(sh.uniforms,LUSHU);sh.vertexShader='uniform float uTime;uniform vec2 c1;uniform vec2 c2;uniform float fa;uniform float fb;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec2 ip=vec2(instanceMatrix[3][0],instanceMatrix[3][2]);transformed*=1.0-smoothstep(fa,fb,min(distance(ip,c1),distance(ip,c2)));');};return m;})()};
  LUSHU.on.value=1;LUSHU.fa.value=LUSH_RAD>2?11:9;LUSHU.fb.value=LUSH_RAD>2?23:15;}
function lushFill(slot,cx,cz){const L=LUSH,im=slot.im,r=mulberry((cx*73856093)^(cz*19349663)^levelIdx),d=new THREE.Object3D(),c=new THREE.Color();let n=0;
  for(let i=0;i<LUSH_N;i++){const x=(cx+r())*LUSH_CH,z=(cz+r())*LUSH_CH,t=L.gTop(x,z);const a=r(),b=r(),e=r(),f=r();if(t===null)continue;
    d.position.set(x,t-.03,z);d.rotation.set((b-.5)*.3,a*6.283,(e-.5)*.3);const s=.6+f*.5;d.scale.set(1.1+e*.7,s*(.3+b*.26),1);d.updateMatrix();im.setMatrixAt(n,d.matrix);
    c.copy(L.A).lerp(L.B,(a+f)*.5);if(e>.93)c.offsetHSL(.05,.1,.06);im.setColorAt(n,c);n++;}
  im.count=n;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;slot.key=cx+','+cz;slot.im.visible=n>0;
  const fl=slot.fl;let m=0;const nf=th.night?14:34;for(let i=0;i<nf;i++){const x=(cx+r())*LUSH_CH,z=(cz+r())*LUSH_CH,t=L.gTop(x,z),q=r(),w=r();if(t===null)continue;
    d.position.set(x,t+.24+q*.16,z);d.rotation.set((w-.5)*.5,q*6.283,(q-.5)*.4);d.scale.setScalar(1.5+w*.9);d.updateMatrix();fl.setMatrixAt(m,d.matrix);c.setHex(th.night?0x9ef0ff:FLC[Math.floor(w*FLC.length)]);fl.setColorAt(m,c);m++;}
  fl.count=m;fl.instanceMatrix.needsUpdate=true;if(fl.instanceColor)fl.instanceColor.needsUpdate=true;fl.visible=m>0;}
function lushUpdate(){const L=LUSH;if(!L){lushCenters.length=0;return;}const nw=performance.now();if(lushPerf.last){const ft=nw-lushPerf.last;if(ft<200){lushPerf.t+=ft;lushPerf.n++;}}lushPerf.last=nw;
  if(!lushPerf.cut&&lushPerf.n>=90){if(lushPerf.t/lushPerf.n>38){lushPerf.cut=true;LUSH_RAD=2;LUSHU.fa.value=9;LUSHU.fb.value=15;}lushPerf.t=0;lushPerf.n=0;}const cs=lushCenters.length?lushCenters:[[P.x,P.z]];
  LUSHU.c1.value.set(cs[0][0],cs[0][1]);if(cs[1])LUSHU.c2.value.set(cs[1][0],cs[1][1]);else LUSHU.c2.value.set(1e5,1e5);
  const want=new Set();for(const [x,z] of cs){const kx=Math.floor(x/LUSH_CH),kz=Math.floor(z/LUSH_CH);for(let i=-LUSH_RAD;i<=LUSH_RAD;i++)for(let j=-LUSH_RAD;j<=LUSH_RAD;j++)want.add((kx+i)+','+(kz+j));}
  lushCenters.length=0;
  const free=[];for(const s of L.slots){if(!want.has(s.key)){if(s.key)L.map.delete(s.key);s.key=null;s.im.visible=false;s.fl.visible=false;free.push(s);}}
  let budget=L.slots.length?3:999;
  for(const k of want){if(L.map.has(k))continue;if(budget--<=0)break;let s=free.pop();
    if(!s){const im=new THREE.InstancedMesh(L.geo,L.mat,LUSH_N);im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.frustumCulled=false;im.receiveShadow=true;im.setColorAt(0,new THREE.Color());world.add(im);const fl=new THREE.InstancedMesh(L.fgeo,L.fmat,40);fl.frustumCulled=false;fl.setColorAt(0,new THREE.Color());world.add(fl);s={im,fl,key:null};L.slots.push(s);}
    const [a,b]=k.split(',').map(Number);lushFill(s,a,b);L.map.set(k,s);}}
function waterPlane(color,y,cx,cz,size=520){
  const g=new THREE.PlaneGeometry(size,size,150,150);
  const m=new THREE.MeshPhongMaterial({color,shininess:90,specular:0xffffff,transparent:true,opacity:.86});
  m.onBeforeCompile=sh=>{sh.uniforms.uTime=windU;sh.uniforms.uSky={value:new THREE.Color(th?th.sky:0xa8dcff).lerp(new THREE.Color(0xffffff),.35)};sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\ntransformed.z+=sin(position.x*.45+uTime*1.4)*.07+cos(position.y*.55+uTime*1.1)*.07;')
    .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=normalize(vec3(-cos(position.x*.45+uTime*1.4)*.03,sin(position.y*.55+uTime*1.1)*.04,1.));');
    if(GFXON){sh.vertexShader='varying vec3 vWP;\n'+sh.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
      sh.fragmentShader='uniform float uTime;uniform vec3 uSky;varying vec3 vWP;\n'+sh.fragmentShader.replace('#include <tonemapping_fragment>',
      'float sp=sin(vWP.x*2.3+uTime*1.9)*sin(vWP.z*2.1-uTime*1.6)*sin((vWP.x-vWP.z)*1.1+uTime*.8);gl_FragColor.rgb+=vec3(smoothstep(.55,.85,sp)*.5);'+
      'float rp=sin(length(vWP.xz*.35)-uTime*1.2)*.5+.5;gl_FragColor.rgb+=vec3(.05,.07,.09)*rp;'+
      'vec3 vd=normalize(cameraPosition-vWP);float fr=pow(1.-max(dot(vd,vec3(0.,1.,0.)),0.),3.);vec2 q=vWP.xz*.08+vec2(uTime*.02,uTime*.013);float cl=smoothstep(.55,.8,sin(q.x*3.1+sin(q.y*2.3))*.5+.5);gl_FragColor.rgb=mix(gl_FragColor.rgb,mix(uSky,vec3(1.),cl*.45),clamp(fr*.55+.04,0.,.6));gl_FragColor.a=mix(gl_FragColor.a,1.,fr*.5);\n#include <tonemapping_fragment>');}};
  const w=new THREE.Mesh(g,m);w.rotation.x=-Math.PI/2;w.position.set(cx,y,cz);w.receiveShadow=true;return w;
}
const SPARK_N=LOWQ?90:180;
const sparkGeo=new THREE.BufferGeometry();const sparkPos=new Float32Array(SPARK_N*3);const sparkSeed=[];
for(let i=0;i<SPARK_N;i++)sparkSeed.push([Math.random()*40-20,Math.random()*8,Math.random()*40-20,Math.random()*6]);
sparkGeo.setAttribute('position',new THREE.BufferAttribute(sparkPos,3));
const sparkMat=new THREE.PointsMaterial({map:glowTex,size:.3,color:0xfff3c4,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.8});
const sparks=new THREE.Points(sparkGeo,sparkMat);sparks.frustumCulled=false;scene.add(sparks);
const PET_N=LOWQ?70:150;const petGeo=new THREE.BufferGeometry();const petPos=new Float32Array(PET_N*3);const petSeed=[];for(let i=0;i<PET_N;i++)petSeed.push([Math.random()*50-25,Math.random()*14,Math.random()*50-25,Math.random()*6.3]);
petGeo.setAttribute('position',new THREE.BufferAttribute(petPos,3));
const petTex=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');x.fillStyle='#fff';x.beginPath();x.ellipse(16,16,13,7,.6,0,Math.PI*2);x.fill();return new THREE.CanvasTexture(c);})();
const snowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');const gr=x.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.5,'rgba(255,255,255,.8)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,32,32);return new THREE.CanvasTexture(c);})();
const petMat=new THREE.PointsMaterial({map:petTex,size:.32,color:0xffb3d1,transparent:true,depthWrite:false,opacity:.9,alphaTest:.05});
const petals=new THREE.Points(petGeo,petMat);petals.frustumCulled=false;petals.visible=false;scene.add(petals);
function updatePetals(t,cx,cy,cz){const on=GFXON&&mode==='ride'&&th&&!th.night;petals.visible=on;if(!on)return;const snow=!!th.snow;
  petMat.map=snow?snowTex:petTex;petMat.size=snow?.42:.3;petMat.color.setHex(snow?0xffffff:th.candy?0xffd1ec:levelIdx===5?0xfff3c4:0xffb3d1);
  for(let i=0;i<PET_N;i++){const s=petSeed[i];let x=s[0]+Math.sin(t*.7+s[3])*1.8+t*.6,z=s[2]+Math.cos(t*.5+s[3])*1.4,y=14-((s[1]+t*(snow?1.1:.7))%14);
    x=((x-cx)%50+75)%50-25+cx;z=((z-cz)%50+75)%50-25+cz;petPos[i*3]=x;petPos[i*3+1]=cy+y-3;petPos[i*3+2]=z;}petGeo.attributes.position.needsUpdate=true;}
function updateSparks(t,cx,cy,cz,color){if(mode==='ride'&&todNow()==='zalazak')color=0xfff27a;sparkMat.color.setHex(color);updatePetals(t,cx,cy,cz);
  for(let i=0;i<SPARK_N;i++){const s=sparkSeed[i];let x=s[0]+Math.sin(t*.3+s[3])*1.5,z=s[2]+Math.cos(t*.25+s[3])*1.5,y=(s[1]+t*.25)%8;
    x=((x-cx)%40+60)%40-20+cx;z=((z-cz)%40+60)%40-20+cz;sparkPos[i*3]=x;sparkPos[i*3+1]=cy+y-1;sparkPos[i*3+2]=z;}
  sparkGeo.attributes.position.needsUpdate=true;}

/* ---------- save data ---------- */
const BODY=[{n:'Bijela',c:0xfbf7ff},{n:'Roza',c:0xffc2dc},{n:'Ljubičasta',c:0xdcc8ff},{n:'Plava',c:0xc4e6ff},{n:'Mentol',c:0xc8f2dd},{n:'Zlatna',c:0xffe7a6}];
const MANE=[{n:'Duga',c:[0xff6b6b,0xffa94d,0xffe066,0x7ed957,0x5ec8ff,0xb08cff]},{n:'Roza',c:[0xff6fa5,0xff9ec7]},{n:'Ljubičasta',c:[0x9d4edd,0xc77dff]},
  {n:'Zlatna',c:[0xffc93c,0xffe08a]},{n:'Plava',c:[0x3a86ff,0x8ecae6]},{n:'Srebrna',c:[0xcfd8e3,0xffffff]}];
const NAMES=['Iskrica','Duga','Zvjezdica','Mjesečina','Bombončić','Leptirica'];
const DECOR=[
  {id:'bow',n:'Roza mašna',cost:0},{id:'flowers',n:'Cvjetni vijenac',cost:30},{id:'star',n:'Zvijezda na rogu',cost:60},
  {id:'saddle',n:'Sedlo sa srcima',cost:90},{id:'wings',n:'Krila',cost:140},{id:'hooves',n:'Sjajna kopita',cost:200},
  {id:'necklace',n:'Ogrlica sa srcem',cost:120},{id:'crown',n:'Kruna',cost:250},{id:'startrail',n:'Zvjezdani trag',cost:300},{id:'glitter',n:'Svjetlucanje',cost:320},{id:'hearttrail',n:'Trag od srca',cost:350},{id:'rainbowhorn',n:'Dugin rog',cost:400}];
const RACE_PRIZE=['necklace','crown','startrail','glitter','hearttrail','rainbowhorn','wings','hooves'];
const HSTYLES=[{id:'rep',n:'Rep'},{id:'repici',n:'Repići'},{id:'pundja',n:'Punđa'},{id:'duga',n:'Duga kosa'},{id:'pletenica',n:'Pletenica'},{id:'kratka',n:'Kratka'}];
const HCOLS=[{n:'Svijetlosmeđa',c:[0xc9a26b,0xe6c590]},{n:'Smeđa',c:[0x7a4a2a,0x9a6238]},{n:'Plava',c:[0xf3d27a,0xffe9a8]},{n:'Crna',c:[0x2b1d1a,0x4a3530]},{n:'Riđa',c:[0xd9662e,0xf08a4b]},{n:'Roza',c:[0xff8fc8,0xffc2e0]},{n:'Ljubičasta',c:[0xa58cff,0xcdbcff]}];
const OUTFITS=[{id:'trenirka',n:'Trenirka'},{id:'haljina',n:'Haljina'},{id:'balerina',n:'Balerina'},{id:'jahacica',n:'Jahačica'},{id:'princeza',n:'Princeza'}];
const OCOLS=[{n:'Roza',c:0xff6fa5},{n:'Ljubičasta',c:0xb08cff},{n:'Plava',c:0x5ec8ff},{n:'Mentol',c:0x6fd6a0},{n:'Žuta',c:0xffd166},{n:'Crvena',c:0xff5a5a},{n:'Bijela',c:0xffffff}];
const HATS=[{id:'',n:'Ništa'},{id:'kruna',n:'Kruna'},{id:'masna',n:'Mašna'},{id:'cvijet',n:'Cvijet'},{id:'rog',n:'Rog'},{id:'sesir',n:'Šešir'},{id:'kaciga',n:'Kaciga'}];
function lookOpts(){const L=save.look||{};const h=HCOLS[L.hc||0]||HCOLS[0];
  return {style:(HSTYLES[L.hs||0]||HSTYLES[0]).id,hair:h.c[0],hair2:h.c[1],outfit:(OUTFITS[L.out||0]||OUTFITS[0]).id,shirt:(OCOLS[L.oc||0]||OCOLS[0]).c,hat:(HATS[L.hat||0]||HATS[0]).id,glasses:!!L.gl};}
const SAVE_KEY='leonin-jednorog-v2';
let hadSave=false;
function loadSave(){const d={body:0,mane:0,name:0,gems:0,owned:['bow'],wear:{bow:true},maxWorld:0,made:false,look:{hs:0,hc:0,out:0,oc:0,hat:0,gl:0}};
  try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s){hadSave=true;return Object.assign(d,s);}}catch(e){}return d;}
let save=loadSave();
function store(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(e){}}

if(!save.trophies)save.trophies={};save.hearts={feed:true,brush:true,pet:true};

/* ---------- people ---------- */
function makeLeona(o={}){
  const g=new THREE.Group();
  const C=new THREE.Color(),tint=(c,k)=>C.setHex(c).lerp(new THREE.Color(k>0?0xffffff:0x2b1b3d),Math.abs(k)).getHex();
  const HAIR=o.hair||0xc9a26b,HAIR2=o.hair2||0xe6c590,SKIN=0xf7d4ba,OUT=o.outfit||'trenirka',HS=o.style||(o.short?'kratka':'rep');
  const MAIN=o.shirt||0xff6fa5,LIGHT=tint(MAIN,.55),DARK=tint(MAIN,-.18),ACC=o.acc||(MAIN===0xffffff?0xff6fa5:MAIN);
  let LEG=o.legs||0x6c5ba8,LOW=null,SHOE=o.shoe||0xff8fab,SLEEVE=MAIN,FORE=MAIN,SHOULDER=MAIN;
  if(OUT==='haljina'){LEG=0xfdf6ff;SHOE=DARK;FORE=SKIN;}
  else if(OUT==='balerina'){LEG=0xffe3ee;SHOE=LIGHT;SLEEVE=SKIN;FORE=SKIN;SHOULDER=SKIN;}
  else if(OUT==='jahacica'){LEG=0xf7f2e6;LOW=0x3a2a3a;SHOE=0x2b1f2b;}
  else if(OUT==='princeza'){LEG=LIGHT;SHOE=0xffd166;SHOULDER=LIGHT;FORE=SKIN;}
  const hips=new THREE.Group();hips.position.y=.56;g.add(hips);
  const legs=[];
  for(const sx of [-.12,.12]){
    const hip=new THREE.Group();hip.position.set(sx,0,0);hips.add(hip);
    cyl(0,-.13,0,.09,.27,LEG,hip);sph(0,-.27,0,.085,.085,.085,LOW||LEG,hip);
    const knee=new THREE.Group();knee.position.y=-.27;hip.add(knee);
    cyl(0,-.12,0,LOW?.088:.08,.25,LOW||LEG,knee);box(0,-.26,.05,.17,.1,.28,SHOE,knee);box(0,-.31,.05,.18,.03,.29,OUT==='jahacica'?0x1a121a:0xffffff,knee);
    legs.push({hip,knee});
  }
  const torso=new THREE.Group();hips.add(torso);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.24,OUT==='trenirka'||OUT==='jahacica'?.31:.27,.56,18),mat(MAIN));body.position.y=.27;torso.add(body);
  let skirt=null;
  if(OUT==='trenirka'){box(0,.29,.265,.15,.42,.05,o.zip||LIGHT,torso);
    const hood=new THREE.Mesh(new THREE.TorusGeometry(.2,.06,8,18),mat(o.hood||DARK));hood.rotation.x=Math.PI/2;hood.position.set(0,.55,-.04);torso.add(hood);}
  else if(OUT==='haljina'){skirt=new THREE.Group();hips.add(skirt);put(new THREE.CylinderGeometry(.27,.5,.4,24),MAIN,0,-.14,0,1,1,1,skirt);put(new THREE.CylinderGeometry(.5,.51,.05,24),LIGHT,0,-.33,0,1,1,1,skirt);
    const belt=cyl(0,.05,0,.272,.07,LIGHT,torso);sph(.0,.06,.27,.07,.05,.04,LIGHT,torso);
    const col=new THREE.Mesh(new THREE.TorusGeometry(.13,.035,6,16),mat(0xffffff));col.rotation.x=Math.PI/2;col.position.y=.55;torso.add(col);
    for(let k=0;k<3;k++)sph(0,.38-k*.1,.245,.025,.025,.02,0xffffff,torso);}
  else if(OUT==='balerina'){skirt=new THREE.Group();hips.add(skirt);
    for(let k=0;k<3;k++){const t=put(new THREE.CylinderGeometry(.62-k*.08,.66-k*.08,.05,28),k%2?LIGHT:tint(MAIN,.3),0,-.02+k*.04,0,1,1,1,skirt);}
    for(const sx of [-.13,.13])box(sx,.48,.07,.05,.18,.04,MAIN,torso);
    const gm=sph(0,.42,.235,.05,.05,.03,0xfff3b0,torso);}
  else if(OUT==='jahacica'){for(let k=0;k<3;k++)sph(0,.4-k*.12,.27,.03,.03,.02,0xffd166,torso);
    const col=new THREE.Mesh(new THREE.TorusGeometry(.15,.045,6,16),mat(0xffffff));col.rotation.x=Math.PI/2;col.position.y=.55;torso.add(col);
    box(0,.03,0,.56,.06,.5,0x5a3a22,torso);box(0,.03,.27,.08,.07,.02,0xffd166,torso);}
  else if(OUT==='princeza'){skirt=new THREE.Group();hips.add(skirt);put(new THREE.CylinderGeometry(.27,.62,.6,26),MAIN,0,-.24,0,1,1,1,skirt);
    const hem=new THREE.Mesh(new THREE.TorusGeometry(.6,.04,6,30),mat(LIGHT));hem.rotation.x=Math.PI/2;hem.position.y=-.53;skirt.add(hem);
    for(let k=0;k<7;k++){const a=k/7*6.283;sph(Math.sin(a)*.47,-.32,Math.cos(a)*.47,.05,.05,.05,0xfff3b0,skirt);}
    cyl(0,.05,0,.272,.06,0xffd166,torso);const nk=new THREE.Mesh(new THREE.TorusGeometry(.14,.02,6,16),mat(0xffd166));nk.rotation.x=Math.PI/2;nk.position.y=.54;torso.add(nk);
    sph(0,.46,.2,.045,.045,.03,0xff4f9a,torso);}
  const arms=[];
  for(const sx of [-.31,.31]){
    const sh=new THREE.Group();sh.position.set(sx,.47,0);torso.add(sh);
    if(OUT==='princeza'||OUT==='haljina')sph(0,-.02,0,.13,.12,.13,SHOULDER,sh);else sph(0,0,0,.09,.09,.09,SHOULDER,sh);
    cyl(0,-.11,0,.08,.23,SLEEVE,sh);
    const el=new THREE.Group();el.position.y=-.22;sh.add(el);
    sph(0,0,0,.075,.075,.075,FORE===SKIN?SKIN:SLEEVE,el);cyl(0,-.1,0,.07,.21,FORE,el);sph(0,-.24,0,.085,.085,.085,SKIN,el);
    arms.push({sh,el});
  }
  const head=new THREE.Group();head.position.y=.82;torso.add(head);
  sph(0,0,0,.32,.32,.32,SKIN,head);sph(0,.04,-.06,.34,.34,.32,HAIR,head);sph(0,.22,.05,.31,.14,.27,HAIR,head);
  const pony=new THREE.Group();pony.position.set(0,.24,-.3);head.add(pony);
  const sides=(len=.13)=>{for(const sx of [-.3,.3])sph(sx,-.1,-.02,.1,len,.1,HAIR,head);};
  const tie=(x,y,z,p)=>{const t=new THREE.Mesh(new THREE.TorusGeometry(.06,.025,6,12),mat(ACC));t.position.set(x,y,z);t.rotation.x=Math.PI/2;p.add(t);};
  if(HS==='rep'){sph(0,.4,-.02,.15,.13,.15,HAIR,head);sph(.11,.36,.01,.11,.1,.11,HAIR,head);sph(-.09,.38,.03,.1,.09,.1,HAIR2,head);sides();
    sph(0,-.08,-.06,.13,.14,.13,HAIR,pony);sph(0,-.22,-.1,.1,.11,.1,HAIR,pony);sph(0,-.12,-.1,.05,.06,.04,HAIR2,pony);}
  else if(HS==='repici'){sides(.11);pony.position.set(0,.14,-.06);
    for(const sx of [-1,1]){const p=new THREE.Group();p.position.set(sx*.33,0,-.04);pony.add(p);tie(0,0,0,p);
      sph(sx*.07,-.1,0,.11,.13,.11,HAIR,p);sph(sx*.1,-.25,0,.09,.11,.09,HAIR,p);sph(sx*.06,-.12,.04,.04,.06,.03,HAIR2,p);}}
  else if(HS==='pundja'){sides(.11);const b=sph(0,.36,-.16,.19,.17,.19,HAIR,head);sph(.05,.42,-.1,.07,.05,.06,HAIR2,head);
    const t=new THREE.Mesh(new THREE.TorusGeometry(.15,.03,6,16),mat(ACC));t.position.set(0,.27,-.13);t.rotation.x=Math.PI/2-.5;head.add(t);}
  else if(HS==='duga'){sph(.1,.36,.02,.12,.09,.12,HAIR,head);for(const sx of [-.29,.29])sph(sx,-.24,-.03,.1,.3,.11,HAIR,head);
    sph(0,-.42,.1,.32,.46,.15,HAIR,pony);sph(.08,-.35,.0,.08,.3,.05,HAIR2,pony);}
  else if(HS==='pletenica'){sides();tie(0,-.02,-.02,pony);
    for(let k=0;k<6;k++){const r=.105-k*.008;sph((k%2?.025:-.025),-.1-k*.12,-.04-k*.012,r,r*1.1,r,k%2?HAIR2:HAIR,pony);}
    tie(0,-.82,-.1,pony);sph(0,-.92,-.11,.06,.08,.06,HAIR,pony);}
  else {for(const sx of [-.27,.27])sph(sx,-.06,-.05,.1,.15,.12,HAIR,head);}
  const hat=o.hat||'';
  if(hat==='kruna'){const k=new THREE.Group();k.position.set(0,.31,.03);k.rotation.x=-.3;head.add(k);const r=new THREE.Mesh(new THREE.TorusGeometry(.19,.03,6,24),mat(0xffd166));r.rotation.x=Math.PI/2;k.add(r);
    for(let i=0;i<5;i++){const a=(i-2)*.55;const c=cone(Math.sin(a)*.19,.08,Math.cos(a)*.19,.035,.14,0xffd166,k);sph(Math.sin(a)*.19,.17,Math.cos(a)*.19,.025,.025,.025,[0xff4f9a,0x5ec8ff,0xff4f9a,0x5ec8ff,0xff4f9a][i],k);}
    sph(0,.06,.2,.045,.045,.03,0xff4f9a,k);}
  else if(hat==='masna'){const b=new THREE.Group();b.position.set(.17,.3,.02);b.rotation.set(-.3,0,-.4);head.add(b);for(const sx of [-1,1])sph(sx*.1,0,0,.11,.08,.05,0xff4f9a,b);sph(0,0,.01,.045,.045,.045,0xff8fc8,b);}
  else if(hat==='cvijet'){const f=new THREE.Group();f.position.set(.25,.22,.12);f.rotation.set(0,.9,0);head.add(f);for(let i=0;i<5;i++){const a=i/5*6.283;sph(Math.cos(a)*.07,Math.sin(a)*.07,0,.055,.055,.03,i%2?0xffffff:0xffb3d9,f);}sph(0,0,.02,.04,.04,.03,0xffd166,f);}
  else if(hat==='rog'){const band=new THREE.Mesh(new THREE.TorusGeometry(.33,.03,6,20,Math.PI),mat(0xff8fc8));band.position.set(0,.02,.02);band.rotation.y=Math.PI/2;head.add(band);
    const h=cone(0,.47,.08,.06,.26,0xffd166,head);h.rotation.x=.25;for(const sx of [-1,1]){const e=cone(sx*.17,.4,0,.06,.14,0xffffff,head);e.rotation.z=-sx*.4;}glow(head,0,.5,.08,.5,0xfff3b0,true,.6);}
  else if(hat==='sesir'){const s=new THREE.Group();s.position.set(0,.3,-.02);s.rotation.x=-.12;head.add(s);put(G.cyl,0xf2d8a8,0,0,0,.52,.03,.52,s);put(G.cyl,0xf2d8a8,0,.1,0,.27,.2,.27,s);put(G.cyl,ACC,0,.04,0,.275,.06,.275,s);
    sph(.22,.07,.12,.06,.06,.04,0xffffff,s);sph(.22,.07,.15,.025,.025,.02,0xffd166,s);}
  else if(hat==='kaciga'){put(new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2),0x2b2d55,0,.06,-.03,.37,.37,.37,head);const v=put(new THREE.CylinderGeometry(.2,.2,.03,16,1,false,-Math.PI/2,Math.PI),0x1d1f3d,0,.08,.2,1,1,1,head);sph(0,.43,-.03,.04,.03,.04,ACC,head);}
  if(o.glasses){for(const sx of [-.11,.11]){const r=new THREE.Mesh(new THREE.TorusGeometry(.07,.014,6,14),mat(0x2b1b3d));r.position.set(sx,.04,.31);head.add(r);}box(0,.05,.31,.08,.015,.015,0x2b1b3d,head);}
  const eyes=[];const IRIS=o.iris||0x6b4226;
  for(const sx of [-.11,.11]){const e=new THREE.Group();e.position.set(sx,.035,.29);head.add(e);
    sph(0,0,0,.062,.074,.03,0xffffff,e);sph(0,-.008,.02,.048,.058,.02,IRIS,e);sph(0,-.008,.033,.027,.033,.012,0x1b1020,e);
    sph(sx>0?.016:-.008,.022,.043,.014,.016,.008,0xffffff,e);sph(sx>0?-.014:.016,-.026,.042,.007,.007,.005,0xffffff,e);
    for(let k=0;k<3;k++){const l=box((sx>0?1:-1)*(.03+k*.02),.066-k*.008,.02,.014,.035,.01,0x2b1b3d,e);l.rotation.z=(sx>0?-1:1)*(.5+k*.35);}
    eyes.push(e);
    const br=new THREE.Mesh(new THREE.TorusGeometry(.055,.011,6,12,Math.PI*.8),mat(HAIR===0xffffff?0x8a6a4a:new THREE.Color(HAIR).multiplyScalar(.75).getHex()));br.position.set(sx,.1,.29);br.rotation.z=Math.PI*.1;head.add(br);}
  sph(0,-.025,.318,.022,.017,.015,0xf0b49a,head);
  for(const sx of [-.18,.18])sph(sx,-.06,.26,.06,.035,.03,0xffa3b8,head);
  const mouth=new THREE.Mesh(new THREE.TorusGeometry(.06,.016,6,12,Math.PI),mat(0xb3544e));mouth.position.set(0,-.08,.305);mouth.rotation.z=Math.PI;head.add(mouth);
  g.userData={hips,torso,head,legs,arms,pony,eyes,skirt};
  return g;
}
function makeZara(){
  const g=new THREE.Group();
  const WH=0xfbfaf7,TAN=0xb8743a,TAN2=0x8a5328;
  const body=new THREE.Group();body.position.y=.48;g.add(body);
  sph(0,0,0,.26,.24,.42,WH,body);sph(0,.21,-.1,.17,.07,.2,TAN,body);
  const legs=[];
  for(const [x,z] of [[-.13,.24],[.13,.24],[-.13,-.24],[.13,-.24]]){const l=new THREE.Group();l.position.set(x,-.06,z);body.add(l);cyl(0,-.18,0,.06,.36,WH,l);sph(0,-.36,.02,.07,.05,.08,WH,l);legs.push(l);}
  const col=new THREE.Mesh(new THREE.TorusGeometry(.17,.035,6,18),mat(0xff6fa5));col.position.set(0,.16,.32);col.rotation.x=Math.PI/2-.4;body.add(col);
  const head=new THREE.Group();head.position.set(0,.3,.4);body.add(head);
  sph(0,0,0,.21,.2,.21,WH,head);sph(0,-.06,.18,.12,.1,.14,WH,head);sph(0,-.03,.31,.045,.04,.04,0x222222,head);sph(.09,.06,.12,.11,.1,.08,TAN,head);
  for(const sx of [-.08,.08])sph(sx,.06,.185,.03,.035,.02,0x1d3557,head);
  const tongue=sph(0,-.13,.24,.04,.02,.06,0xff8fab,head);
  const ears=[];for(const sx of [-1,1]){const ep=new THREE.Group();ep.position.set(sx*.15,.13,-.03);head.add(ep);const e=sph(0,-.04,0,.08,.05,.11,TAN2,ep);e.rotation.z=sx*.7;ears.push(ep);}
  sph(-.05,.21,-.02,.07,.05,.04,0xff6fa5,head);sph(.05,.21,-.02,.07,.05,.04,0xff6fa5,head);
  const tail=new THREE.Group();tail.position.set(0,.18,-.4);body.add(tail);cyl(0,.15,0,.04,.3,WH,tail);sph(0,.31,0,.05,.05,.05,TAN,tail);tail.rotation.x=-.5;
  g.userData={body,legs,head,ears,tail,tongue};
  return g;
}


/* ---------- unicorn rigs from the animated horse ---------- */
// Builds a cute unicorn from the CC0 Quaternius horse (gltf scene + animations).
// Everything decorative is attached to bones so it moves with the real animations.
function buildUnicornFromHorse(gltf,opts){
  const glowSprite=c=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:opts.glowTex,color:c,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending}));sp.scale.set(2.6,2.6,2.6);sp.position.set(0,.9,-.2);if(!opts.glowTex)sp.visible=false;return sp;};
  const root=THREE.SkeletonUtils.clone(gltf.scene);
  root.updateMatrixWorld(true);
  const bones={};root.traverse(o=>{if(o.isBone)bones[o.name]=o;});
  const toon=opts.toon;
  const body=new THREE.Color(opts.body),light=body.clone().lerp(new THREE.Color(0xffffff),.5),dark=body.clone().multiplyScalar(.9);
  const tm=(c,sk=true)=>new THREE.MeshToonMaterial({color:c,gradientMap:toon,skinning:sk});
  const nM=opts.mane.length;const mane=[];for(let i=0;i<6;i++)mane.push(opts.mane[i%nM]);
  const hairMat=new THREE.MeshToonMaterial({color:0xffffff,gradientMap:toon,skinning:true});
  hairMat.onBeforeCompile=sh=>{sh.uniforms.mc={value:mane.map(c=>new THREE.Color(c))};sh.uniforms.uGl=GLU;sh.uniforms.uTime=windU;
    sh.vertexShader='varying float vH;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvH=position.y*1.6+position.z*1.0;');
    sh.fragmentShader='varying float vH;uniform vec3 mc[6];uniform float uGl;uniform float uTime;\n'+sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );',
      'float f=fract(vH*.8);int i=int(floor(f*'+nM+'.0));vec3 hc=mc[0];for(int k=0;k<6;k++){if(k==i)hc=mc[k];}vec4 diffuseColor=vec4(hc,opacity);')
      .replace('#include <dithering_fragment>','float hrim=1.0-abs(dot(normalize(normal),normalize(vViewPosition)));float wv=.5+.5*sin(vH*7.-uTime*2.6);gl_FragColor.rgb=mix(gl_FragColor.rgb,gl_FragColor.rgb*.55+hc*.62+vec3(1.)*(pow(wv,6.)*.22+pow(hrim,2.)*.3),uGl);\n#include <dithering_fragment>');};
  const wear=opts.wear||{};
  const pearl=m=>{m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <dithering_fragment>','float rim=1.0-abs(dot(normalize(normal),normalize(vViewPosition)));gl_FragColor.rgb+=pow(rim,2.2)*mix(vec3(.45,.65,1.0),vec3(1.0,.55,.9),clamp(normal.y*.5+.5,0.,1.))*(.35+.3*uGl);vec3 hv=normalize(normalize(vViewPosition)+vec3(.35,.8,.45));gl_FragColor.rgb+=vec3(1.,.97,.92)*pow(max(dot(normalize(normal),hv),0.),26.)*.3*uGl;\n#include <dithering_fragment>').replace('void main() {','uniform float uGl;\nvoid main() {');sh.uniforms.uGl=GLU;};return m;};
  const MAP={Main:pearl(tm(body)),Main_Dark:pearl(tm(dark)),Main_Light:pearl(tm(light)),Hooves:tm(wear.hooves?0xffb3e0:0xf2c14e),
    Hair:hairMat,Muzzle:tm(0xffd9e6),Eye_White:tm(0xffffff),Eye_Black:tm(0x2b1b3d)};
  root.traverse(o=>{if(o.isMesh){o.material=MAP[o.material.name]||o.material;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});

  const mat=c=>new THREE.MeshToonMaterial({color:c,gradientMap:toon});
  const tmpQ=new THREE.Quaternion(),tmpV=new THREE.Vector3();
  function attach(boneName,wp,obj,euler){
    const b=bones[boneName];b.updateWorldMatrix(true,false);
    obj.position.copy(b.worldToLocal(tmpV.set(wp[0],wp[1],wp[2])));
    b.getWorldQuaternion(tmpQ);const want=new THREE.Quaternion().setFromEuler(new THREE.Euler(...(euler||[0,0,0])));
    obj.quaternion.copy(tmpQ.clone().invert().multiply(want));
    const s=new THREE.Vector3();b.getWorldScale(s);obj.scale.divide(s);
    b.add(obj);obj.traverse(q=>{if(q.isMesh){q.castShadow=true;}});return obj;
  }
  const ball=(r,c,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,18,14),mat(c));m.scale.set(sx,sy,sz);return m;};
  const bonePos=n=>{const p=new THREE.Vector3();bones[n].getWorldPosition(p);return p;};
  const nearest=(p,list)=>{let best=list[0],bd=1e9;for(const n of list){if(!bones[n])continue;const d=bonePos(n).distanceTo(p);if(d<bd){bd=d;best=n;}}return best;};

  const P=opts.parts;const flutter=[],eyes=[];
  if(P)for(const sx of [-1,1]){const g=P('u_eye',{iris:opts.iris});g.scale.setScalar(.52);attach('Head',[sx*.3,4.21,2.96],g,[0,sx*.25,0]);eyes.push({o:g,s:g.scale.clone()});}
  else for(const sx of [-1,1]){const g=new THREE.Group();
    const w=ball(.15,0xffffff,.45,1,1);g.add(w);const pupil=ball(.105,0x2b1b3d,.5,1.05,.95);pupil.position.set(sx*.03,-.01,.02);g.add(pupil);
    const hl=ball(.035,0xffffff);hl.position.set(sx*.07,.05,.06);g.add(hl);
    for(let k=0;k<3;k++){const l=new THREE.Mesh(new THREE.BoxGeometry(.02,.1,.025),mat(0x2b1b3d));l.position.set(sx*.02,.15,.02-k*.05);l.rotation.x=-.5+k*.4;l.rotation.z=sx*.3;g.add(l);}
    attach('Head',[sx*.31,4.2,2.96],g,[0,sx*.25,0]);}
  const horn=new THREE.Group();
  if(P){horn.add(P('u_horn',{}));}
  else{const hc=new THREE.Mesh(new THREE.ConeGeometry(.11,.95,18),mat(0xffd166));hc.position.y=.47;horn.add(hc);
  for(let i=0;i<5;i++){const t=new THREE.Mesh(new THREE.TorusGeometry(.1-.018*i,.018,6,16),mat(0xfff0b8));t.rotation.x=Math.PI/2;t.position.y=.1+i*.16;horn.add(t);}}
  if(wear.star){const s=new THREE.Mesh(opts.starGeo,mat(0xfff3b0));s.scale.setScalar(.2);s.position.set(0,1.0,-.05);horn.add(s);}
  attach('Head',[0,4.5,2.93],horn,[.6,0,0]);
  horn.scale.multiply(new THREE.Vector3(1.05,1.32,1.05));
  if(P){for(const sx of [-1,1])for(const [bn,x,y,z,sc,rot] of [['Torso3',.66,2.75,1.15,.5,.2],['Torso3',.66,2.42,1.38,.3,.7],['Torso2',.68,2.6,.82,.22,1.1],['Back',.66,3.0,-1.05,.46,.5],['Back',.68,2.7,-1.3,.28,.1],['Back',.64,3.22,-1.42,.2,.9]]){
    const st=P('u_star');st.scale.setScalar(sc);attach(bn,[sx*x,y,z],st,[0,sx*Math.PI/2,rot]);st.traverse(q=>{if(q.isMesh){q.material=new THREE.MeshBasicMaterial({color:0xffd75e,transparent:true,opacity:.95,side:THREE.DoubleSide});q.castShadow=false;q.userData.noOutline=true;}});}}
  const GM=glamOn();
  const crest=[[0,4.62,2.42],[0,4.45,2.2],[0,4.22,1.98],[0,3.98,1.76],[0,3.74,1.52],[0,3.5,1.28],[0,3.28,1.04]];
  const NB=['Head','Neck3','Neck2','Neck1','Torso3'];
  if(P){crest.forEach((p,i)=>{for(const sx of [-1,1]){const l=P('u_lock',{mane:mane[(i+(sx>0?1:0))%6]});l.scale.setScalar((1.05-i*.05)*(GM?1.1:1));
      const v=new THREE.Vector3(p[0]+sx*.13,p[1]+.12,p[2]-.02);attach(nearest(v,NB),[v.x,v.y,v.z],l,[0,sx*.2,sx*(.42+i*.03)]);flutter.push({o:l,q0:l.quaternion.clone(),ph:i*.7+(sx>0?.3:0),k:'m',sx});
      if(sx>0||i%2===0){const L=P('u_lock2',{mane:mane[(i+(sx>0?3:4))%6]});L.scale.setScalar((1.08-i*.07)*(GM?(sx>0?1.35:1.1):1));const w=new THREE.Vector3(p[0]+sx*.2,p[1]+.05,p[2]+.02);attach(nearest(w,NB),[w.x,w.y,w.z],L,[.12,sx*.15,sx*(.22+i*.02)]);flutter.push({o:L,q0:L.quaternion.clone(),ph:i*.6+(sx>0?.9:0),k:'m',sx});}}});
    {const L=P('u_lock2',{mane:mane[1]});L.scale.setScalar(.5);attach('Head',[.1,4.72,2.66],L,[-.75,0,.45]);flutter.push({o:L,q0:L.quaternion.clone(),ph:2.2,k:'f',sx:1});}
    for(const [x,c,rz] of [[0,0,0],[-.13,1,-.35],[.13,2,.35]]){const l=P('u_lock',{mane:mane[c]});l.scale.setScalar(GM?.6:.48);attach('Head',[x,4.7,2.72],l,[-1.1,0,rz]);flutter.push({o:l,q0:l.quaternion.clone(),ph:c*1.3,k:'f',sx:Math.sign(rz)});}}
  else{crest.forEach((p,i)=>{for(const sx of [-1,1]){const r=.27-i*.012;const b=ball(r,mane[(i+(sx>0?1:0))%6],.75,1,1.1);
    const v=new THREE.Vector3(p[0]+sx*.16,p[1],p[2]-.04);attach(nearest(v,NB),[v.x,v.y,v.z],b);}});
  for(const [x,y,z,c] of [[0,4.62,2.75,0],[-.12,4.55,2.85,1],[.12,4.55,2.85,2]])attach('Head',[x,y,z],ball(.17,mane[c],1,.9,1));}
  if(GM){const BC=new THREE.Color(mane[nM>1?1:0]).lerp(new THREE.Color(0xffffff),.25).getHex(),bm=mat(BC),gm=mat(0xffd166);const Y=new THREE.Vector3(0,1,0);
    const strap=(a,b,r=.022)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),6),bm);const e=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(Y,d.clone().normalize()));attach('Head',[(A.x+B.x)/2,(A.y+B.y)/2,(A.z+B.z)/2],m,[e.x,e.y,e.z]);};
    const BR=window.__br||{n:[0,3.72,3.22],r:.2,t:1.0,c:[.19,3.8,3.16],e:[.25,4.42,2.72],f:[.2,4.44,3.0]};
    const nb=new THREE.Mesh(new THREE.TorusGeometry(BR.r,.024,6,24),bm);nb.scale.set(1,1.15,1);attach('Head',BR.n,nb,[BR.t,0,0]);
    for(const sx of [-1,1]){strap([sx*BR.c[0],BR.c[1],BR.c[2]],[sx*BR.e[0],BR.e[1],BR.e[2]]);const st=new THREE.Mesh(opts.starGeo,gm);st.scale.setScalar(.055);attach('Head',[sx*(BR.c[0]+.03),BR.c[1],BR.c[2]],st,[0,sx*Math.PI/2,0]);}
    strap([-BR.f[0],BR.f[1],BR.f[2]],[BR.f[0],BR.f[1],BR.f[2]]);for(const sx of [-1,1])strap([sx*BR.f[0],BR.f[1],BR.f[2]],[sx*BR.e[0],BR.e[1],BR.e[2]]);}
  const tails=Object.keys(bones).filter(n=>/^Tail\d$/.test(n)).sort();
  if(P&&tails[0]){const p=bonePos(tails[0]);[[-.22,0],[0,1],[.22,2],[-.12,3],[.12,4],[0,5],[-.3,2],[.3,4]].forEach(([rz,k],j)=>{const l=P('u_tlock2',{mane:mane[k%6]});l.scale.setScalar((j<3?1.0:j<6?.92:.8)*(GM?1.2:1));
      attach(tails[0],[p.x+rz*.3,p.y+.05,p.z-.05],l,[j<3?.22:j<6?.12:.32,0,rz*.7]);flutter.push({o:l,q0:l.quaternion.clone(),ph:j*.9,k:'t',sx:Math.sign(rz)});});}
  else tails.forEach((n,i)=>{const p=bonePos(n);for(const [ox,oz,k] of [[.13,0,0],[-.13,0,1],[0,-.12,2]]){
    attach(n,[p.x+ox,p.y,p.z+oz],ball(.25-.018*i,mane[(i+k)%6],1,1.1,1));}});
  if(wear.bow&&tails[0]){const p=bonePos(tails[0]);const g=new THREE.Group();
    for(const sx of [-1,1]){const w=ball(.16,0xff6fa5,1.2,.75,.5);w.position.x=sx*.17;g.add(w);}g.add(ball(.08,0xff8fbd));attach(tails[0],[p.x,p.y+.12,p.z+.1],g);}
  if(wear.flowers){for(let i=0;i<7;i++){const a=i/7*Math.PI*2;attach('Head',[Math.cos(a)*.26,4.56+Math.sin(a)*.04,2.82+Math.sin(a)*.2],ball(.08,[0xff6fa5,0xffe066,0xffffff][i%3]));}}
  const seat=new THREE.Group();attach('Torso2',[0,3.2,.05],seat);
  if(GM){const sc0=window.__sd||[0,3.12,.05];const hs_={};const sat=c=>{new THREE.Color(c).getHSL(hs_);return hs_.s*(1-Math.abs(hs_.l-.55));};const ms=opts.mane.slice().sort((p,q)=>sat(q)-sat(p));const c1=new THREE.Color(sat(ms[0])>.3?ms[0]:0xff4f9a).multiplyScalar(.82).getHex(),c2=new THREE.Color(sat(ms[1]||0)>.3?ms[1]:0x6f7cff).multiplyScalar(.85).getHex();
    const K=window.__sk||1.9;const cl=ball(.5*K,c2,1.05,.16,1.35);attach('Torso2',[sc0[0],sc0[1]-.12,sc0[2]],cl);const sd=ball(.36*K,c1,1.05,.3,1.3);attach('Torso2',sc0,sd);
    const pm=ball(.12*K,0xffd166,1.6,1,.8);attach('Torso2',[sc0[0],sc0[1]+.1*K,sc0[2]+.42*K],pm);const cn=ball(.1*K,0xffd166,1.8,1.2,.7);attach('Torso2',[sc0[0],sc0[1]+.06*K,sc0[2]-.44*K],cn);
    for(const sx of [-1,1]){const st=new THREE.Mesh(opts.starGeo,mat(0xffd166));st.scale.setScalar(.09*K);attach('Torso2',[sx*.62*K,sc0[1]-.2*K,sc0[2]],st,[0,sx*Math.PI/2,0]);}}
  if(wear.necklace){const g=new THREE.Group();const t=new THREE.Mesh(new THREE.TorusGeometry(.52,.05,8,36),mat(0xffd166));g.add(t);
    if(opts.heartGeo){const h=new THREE.Mesh(opts.heartGeo,mat(0xff4f9a));h.scale.setScalar(.2);h.position.set(0,-.55,.04);g.add(h);}
    for(let i=0;i<9;i++){const a=-Math.PI/2+(i-4)*.32;const b=ball(.05,[0xff6fa5,0xffffff,0x8ecae6][i%3]);b.position.set(Math.cos(a)*.5,Math.sin(a)*.5,.03);g.add(b);}
    attach('Neck1',[0,2.98,1.62],g,[-.95,0,0]);}
  if(wear.crown){const g=new THREE.Group();const base=new THREE.Mesh(new THREE.CylinderGeometry(.24,.26,.12,20,1,true),new THREE.MeshToonMaterial({color:0xffd166,gradientMap:toon,side:THREE.DoubleSide}));g.add(base);
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const c=new THREE.Mesh(new THREE.ConeGeometry(.06,.2,8),mat(0xffd166));c.position.set(Math.cos(a)*.24,.15,Math.sin(a)*.24);g.add(c);
      const j=ball(.04,[0xff4f9a,0x5ec8ff,0x7ed957][i%3]);j.position.set(Math.cos(a)*.255,0,Math.sin(a)*.255);g.add(j);}
    attach('Head',[0,4.6,2.84],g,[.35,0,0]);}
  if(wear.rainbowhorn){horn.traverse(q=>{if(q.isMesh&&q.name!=='hpearl'){const m=new THREE.MeshToonMaterial({color:0xffffff,gradientMap:toon});m.onBeforeCompile=sh=>{sh.uniforms.rc={value:[0xff6b6b,0xffa94d,0xffe066,0x7ed957,0x5ec8ff,0xb08cff].map(c=>new THREE.Color(c))};
      sh.vertexShader='varying float vY;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvY=position.y+position.z;');
      sh.fragmentShader='varying float vY;uniform vec3 rc[6];\n'+sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );','int i=int(floor(fract(vY*2.2)*6.0));vec3 hc=rc[0];for(int k=0;k<6;k++){if(k==i)hc=rc[k];}vec4 diffuseColor=vec4(hc,opacity);');};q.material=m;}});}
  let glit=null;if(wear.glitter&&opts.glowTex){const N=46,pp=new Float32Array(N*3);for(let i=0;i<N;i++){const a=Math.random()*6.283,u=Math.random()*2-1,r=Math.sqrt(1-u*u);pp[i*3]=Math.cos(a)*r*.75;pp[i*3+1]=u*.75;pp[i*3+2]=Math.sin(a)*r*1.6;}
    const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.BufferAttribute(pp,3));glit=new THREE.Points(gg,new THREE.PointsMaterial({map:opts.glowTex,color:0xfff3b0,size:.28,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glit.frustumCulled=false;
    attach('Torso2',[0,2.85,.1],glit);}
  if(wear.saddle){const s=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,24),mat(0xff6fa5));s.scale.set(.62,.08,.75);
    const g=new THREE.Group();g.add(s);const r=new THREE.Mesh(new THREE.BoxGeometry(.7,.14,.12),mat(0xffd166));r.position.set(0,.08,-.45);g.add(r);
    if(opts.heartGeo)for(const sx of [-1,1]){const h=new THREE.Mesh(opts.heartGeo,mat(0xffd6e8));h.scale.setScalar(.14);h.position.set(sx*.6,-.25,0);h.rotation.y=sx*Math.PI/2;g.add(h);}
    attach('Torso2',[0,3.12,.05],g);}
  else{const s=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,24),mat(0xb9a6ff));s.scale.set(.6,.06,.7);attach('Torso2',[0,3.1,.05],s);}
  const wings=[];
  if(wear.wings){
    const featherGeo=new THREE.SphereGeometry(1,14,10);featherGeo.translate(0,1,0);
    const fm=(c)=>new THREE.MeshToonMaterial({color:c,gradientMap:toon});
    for(const sx of [-1,1]){const root=new THREE.Group();const g=new THREE.Group();root.add(g);
      // long primary feathers fanning up and back like an angel wing
      const rows=[{n:9,len:1.25,w:.16,r0:.15,c:0xffffff},{n:8,len:.9,w:.18,r0:.12,c:0xfffaf0},{n:7,len:.6,w:.2,r0:.08,c:0xfff3dc}];
      rows.forEach((row,ri)=>{for(let i=0;i<row.n;i++){const t=i/(row.n-1);
        const f=new THREE.Mesh(featherGeo,fm(row.c));f.scale.set(row.w,row.len*(.75+.5*Math.sin(t*Math.PI*.85+.3)),.05);
        const ang=-.15-t*1.25;f.rotation.z=sx*ang;f.position.set(sx*(row.r0+t*1.1),t*.45-ri*.12,-ri*.05-t*.15);f.rotation.y=sx*(-.25);g.add(f);}});
      const arm=new THREE.Mesh(featherGeo,fm(0xffffff));arm.scale.set(.22,.75,.18);arm.rotation.z=sx*-1.1;arm.position.set(sx*.1,0,0);g.add(arm);
      g.rotation.set(-.35,0,sx*.35);
      root.add(glowSprite(0xfff3c4));
      attach('Torso3',[sx*.42,3.55,.6],root);wings.push({g:root,s:sx});}}
  return {root,bones,seat,horn,wings,flutter,eyes,glit};
}

let HORSE=null;const SC=.55;

/* ---------- Leona as a real rigged 3D model (leona.glb from Blender) ---------- */
let LEONA_G=null;
const LTOON=(()=>{const t=new THREE.DataTexture(new Uint8Array([125,172,212,232]),4,1,THREE.LuminanceFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;})();
const HAIR_PREFIX=['rep_','repici_','pundja_','duga_','pletenica_'];
function makeLeonaModel(o={}){
  const root=THREE.SkeletonUtils.clone(LEONA_G.scene);const g=new THREE.Group();g.add(root);root.updateMatrixWorld(true);
  const C=new THREE.Color(),tint=(c,k)=>C.setHex(c).lerp(new THREE.Color(k>0?0xffffff:0x2b1b3d),Math.abs(k)).getHex();
  const OUT=o.outfit||'trenirka',HS=o.style||(o.short?'kratka':'rep'),HAT=o.hat||'';
  const MAIN=o.shirt||0xff6fa5,LIGHT=tint(MAIN,.55),DARK=tint(MAIN,-.18),ACC=o.acc||(MAIN===0xffffff?0xff6fa5:MAIN),SKIN=0xf3c6a6,HAIR=o.hair||0xc9a26b;
  const col={skin:SKIN,top:MAIN,sleeve:MAIN,fore:MAIN,pants:o.legs||0x6c5ba8,lowleg:o.legs||0x6c5ba8,shoe:o.shoe||0xff8fab,hair:HAIR,hair2:o.hair2||0xe6c590,acc:ACC,dark:o.hood||DARK,light:o.zip||LIGHT,
    brow:new THREE.Color(HAIR).multiplyScalar(.72).getHex(),gown:MAIN,tutu:tint(MAIN,.3),iris:o.iris||0x6b4226};
  if(OUT==='haljina'){col.pants=col.lowleg=0xfdf6ff;col.shoe=DARK;col.fore=SKIN;}
  else if(OUT==='balerina'){col.sleeve=col.fore=SKIN;col.pants=col.lowleg=0xffe3ee;col.shoe=LIGHT;}
  else if(OUT==='jahacica'){col.pants=0xf7f2e6;col.lowleg=0x3a2a3a;col.shoe=0x2b1f2b;}
  else if(OUT==='princeza'){col.pants=col.lowleg=LIGHT;col.shoe=0xffd166;col.fore=SKIN;}
  const mats={};const getM=(m,skin)=>{const k=m.name+(skin?'|s':'');if(mats[k])return mats[k];const c=col[m.name]!==undefined?col[m.name]:m.color.clone().convertLinearToSRGB().getHex();
    return mats[k]=new THREE.MeshToonMaterial({color:new THREE.Color(c),gradientMap:LTOON,skinning:!!skin});};
  const want=n=>{if(n.startsWith('out_'))return n.startsWith('out_'+OUT+'_');if(n.startsWith('hat_'))return !!HAT&&n.startsWith('hat_'+HAT+'_');if(n.startsWith('glasses_'))return !!o.glasses;
    for(const p of HAIR_PREFIX)if(n.startsWith(p))return p===HS+'_';if(n.startsWith('bangs'))return HAT!=='kaciga';return true;};
  root.traverse(q=>{if(q.name&&!want(q.name))q.visible=false;if(q.isMesh){q.material=getM(q.material,q.isSkinnedMesh);q.castShadow=true;q.frustumCulled=false;}});
  const B={};root.traverse(q=>{if(q.isBone)B[q.name]=q;});const N={};root.traverse(q=>{if(q.name)N[q.name]=q;});
  const rootInv=new THREE.Quaternion();root.getWorldQuaternion(rootInv);rootInv.invert();
  const map=[];const prox=()=>new THREE.Object3D();
  const bind=(proxy,bn)=>{const b=B[bn];if(!b)return proxy;const P=new THREE.Quaternion();b.parent.getWorldQuaternion(P);P.premultiply(rootInv);
    map.push({proxy,b,P,Pi:P.clone().invert(),R:b.quaternion.clone()});return proxy;};
  const U={hips:prox(),torso:bind(prox(),'torso'),head:bind(prox(),'head'),pony:bind(prox(),'pony'),
    legs:['n','p'].map(s=>({hip:bind(prox(),'thigh_'+s),knee:bind(prox(),'shin_'+s)})),arms:['n','p'].map(s=>({sh:bind(prox(),'upper_'+s),el:bind(prox(),'fore_'+s)})),
    eyes:[N.eye_n,N.eye_p].filter(Boolean),skirt:null};
  const skirts=[];root.traverse(q=>{if(q.visible&&/^out_(haljina_skirt|balerina_tutu|princeza_gown|princeza_hem)/.test(q.name))skirts.push({q,s:q.scale.clone()});});
  if(skirts.length)U.skirt=prox();
  const tq=new THREE.Quaternion();
  U.sync=()=>{for(const m of map){tq.setFromEuler(m.proxy.rotation);m.b.quaternion.copy(m.Pi).multiply(tq).multiply(m.P).multiply(m.R);}
    if(U.skirt)for(const k of skirts){k.q.scale.set(k.s.x*U.skirt.scale.x,k.s.y*U.skirt.scale.y,k.s.z*U.skirt.scale.z);}};
  g.userData=U;U.sync();return g;}
let ZARA_G=null,ENV_G=null;const ENVM={};
/* clone a named node from env.glb with toon materials; options recolour named materials */
function envPart(name,opt={}){const src=ENV_G.scene.getObjectByName(name);if(!src)return new THREE.Group();const o=src.clone(true);o.position.set(0,0,0);o.rotation.set(0,0,0);o.scale.set(1,1,1);
  o.traverse(q=>{if(!q.isMesh)return;const mn=q.material.name;let c=q.material.color.clone().convertLinearToSRGB().getHex();
    if(mn==='mane'&&opt.mane!==undefined)c=opt.mane;if(mn==='iris'&&opt.iris!==undefined)c=opt.iris;if(mn==='wall'&&opt.wall!==undefined)c=opt.wall;
    if(mn==='roof'&&opt.roof!==undefined)c=opt.roof;if(mn==='roof2'&&opt.roof!==undefined)c=new THREE.Color(opt.roof).multiplyScalar(.85).getHex();
    const k=mn+'|'+c;q.material=ENVM[k]||(ENVM[k]=new THREE.MeshToonMaterial({color:c,gradientMap:LTOON}));q.castShadow=true;q.receiveShadow=true;});return o;}
function swapZaraModel(){const root=THREE.SkeletonUtils.clone(ZARA_G.scene);const N={};root.traverse(q=>{if(q.name)N[q.name]=q;if(q.isMesh){q.material=new THREE.MeshToonMaterial({color:q.material.color.clone().convertLinearToSRGB(),gradientMap:LTOON});q.castShadow=true;}});
  if(!N.body||!N.head)return;while(zara.children.length)zara.remove(zara.children[0]);zara.add(root);N.tail.rotation.x=-.5;
  zara.userData={body:N.body,legs:[N.leg0,N.leg1,N.leg2,N.leg3],head:N.head,ears:[N.ear_n,N.ear_p],tail:N.tail,tongue:N.tongue};
  if(typeof carryBone!=='undefined')N.head.add(carryBone);addOutline(zara);}
function makeLeonaAny(o){try{if(LEONA_G)return makeLeonaModel(o);}catch(e){console.warn(e);}return makeLeona(o);}
function syncLeonas(){for(const c of [C1,typeof C2!=='undefined'?C2:null]){const L=c&&c.leona;if(L&&L.userData.sync)L.userData.sync();}}
const _fq=new THREE.Quaternion(),_fe=new THREE.Euler();
function animateRigExtras(rig){if(!rig||!rig.flutter)return;const now=performance.now()/1000,dt=Math.min(.05,now-(rig._t||now));rig._t=now;
  const amp=rig.cur==='Gallop'?1:rig.cur==='Walk'?.45:.18,spd=rig.cur==='Gallop'?11:rig.cur==='Walk'?6:2.2;rig._a=(rig._a||amp)+(amp-(rig._a||amp))*Math.min(1,dt*3);const A=rig._a,t=now*spd+rig.ph;
  for(const f of rig.flutter){if(f.k==='m'){_fe.set(Math.sin(t+f.ph)*.12*A,0,f.sx*(Math.sin(t*1.1+f.ph)*.18*A+.12*A));}
    else if(f.k==='f'){_fe.set(-Math.abs(Math.sin(t+f.ph))*.25*A,0,Math.sin(t*.9+f.ph)*.12*A);}
    else{_fe.set(-.55*A*(rig.cur==='Gallop'?1:0)+Math.sin(t*.8+f.ph)*.22*A,0,Math.sin(t*1.2+f.ph)*.3*A+f.sx*.08);}
    f.o.quaternion.copy(f.q0).multiply(_fq.setFromEuler(_fe));}
  rig.blink-=dt;const b=rig.blink<0?Math.max(.08,Math.abs(rig.blink+.07)/.07):1;if(rig.blink<-.14)rig.blink=2+Math.random()*3.5;
  for(const e of rig.eyes)e.o.scale.set(e.s.x,e.s.y*b,e.s.z);
  if(rig.gls)for(const q of rig.gls){q.s.visible=GLU.value>0;q.s.material.opacity=q.o*(.8+.2*Math.sin(now*3+rig.ph));q.s.scale.setScalar(q.k*(1+.06*Math.sin(now*2.2+rig.ph)));}
  if(rig.glit){rig.glit.material.opacity=.55+.45*Math.sin(now*5+rig.ph);rig.glit.rotation.y=now*.4;}}
function makeRig(body,mane,wear,scale=SC){
  const u=buildUnicornFromHorse(HORSE,{body,mane,wear,toon:TOON,starGeo,heartGeo,glowTex,parts:ENV_G?envPart:null});addOutline(u.root);
  const wrap=new THREE.Group();wrap.add(u.root);u.root.scale.setScalar(scale);
  const mixer=new THREE.AnimationMixer(u.root);const acts={};for(const c of HORSE.animations)acts[c.name]=mixer.clipAction(c);
  const gls=[];if(glowTex&&u.horn){const mc=new THREE.Color(mane[0]||0xffffff).lerp(new THREE.Color(0xffffff),.35);
    const hs=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xfff2c0,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending}));hs.position.set(0,.9,0);hs.scale.setScalar(.7);u.horn.add(hs);gls.push({s:hs,o:.5,k:.7});
    const au=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:mc,transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending}));au.position.set(0,1.5,0);au.scale.setScalar(5.2);wrap.add(au);gls.push({s:au,o:.12,k:5.2*scale/SC});}
  const rig={wrap,mixer,acts,cur:null,gls,seat:u.seat,wings:u.wings,bones:u.bones,horn:u.horn,scale,once:null,flutter:u.flutter||[],eyes:u.eyes||[],glit:u.glit||null,blink:1+Math.random()*3,ph:Math.random()*6};{const mu=mixer.update.bind(mixer);mixer.update=d=>{const r=mu(d);animateRigExtras(rig);return r;};}play(rig,'Idle');return rig;
}
function play(rig,name,ts=1,fade=.25,once=false){
  const a=rig.acts[name];if(!a)return;
  if(rig.cur===name){a.setEffectiveTimeScale(ts);return;}
  a.reset();a.setEffectiveTimeScale(ts);a.setEffectiveWeight(1);
  if(once){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;rig.once=name;}else{a.setLoop(THREE.LoopRepeat,Infinity);rig.once=null;}
  a.fadeIn(fade).play();if(rig.cur&&rig.acts[rig.cur])rig.acts[rig.cur].fadeOut(fade);rig.cur=name;
}

/* ---------- noise ---------- */
function hash2(x,z){const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s);}
function vnoise(x,z){const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf);
  const a=hash2(xi,zi),b=hash2(xi+1,zi),c=hash2(xi,zi+1),d=hash2(xi+1,zi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,z){return vnoise(x,z)*.55+vnoise(x*2.1+5,z*2.1+3)*.3+vnoise(x*4.3+9,z*4.3+1)*.15;}
const ss=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function segDist(px,pz,ax,az,bx,bz){const vx=bx-ax,vz=bz-az,wx=px-ax,wz=pz-az,l=vx*vx+vz*vz;let t=l?(wx*vx+wz*vz)/l:0;t=Math.max(0,Math.min(1,t));const dx=px-(ax+vx*t),dz=pz-(az+vz*t);return Math.hypot(dx,dz);}
function polyDist(px,pz,pts,loop){let d=1e9;const n=pts.length;for(let i=0;i<n-(loop?0:1);i++){const a=pts[i],b=pts[(i+1)%n];d=Math.min(d,segDist(px,pz,a[0],a[1],b[0],b[1]));}return d;}
function smoothPath(pts,loop,per=6){const out=[],n=pts.length;const P=i=>pts[loop?((i%n)+n)%n:Math.max(0,Math.min(n-1,i))];
  for(let i=0;i<(loop?n:n-1);i++){const p0=P(i-1),p1=P(i),p2=P(i+1),p3=P(i+2);
    for(let k=0;k<per;k++){const t=k/per,t2=t*t,t3=t2*t;const f=(a,b,c,d)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
      out.push([f(p0[0],p1[0],p2[0],p3[0]),f(p0[1],p1[1],p2[1],p3[1])]);}}
  if(!loop)out.push(pts[n-1]);return out;}

/* ---------- world state ---------- */
let bones=[],S=[],gems=[],rings=[],springs=[],sweepers=[],movers=[],flies=[],foals=[],boosts=[],arches=[],castle=null,start={x:0,z:0,face:0},th=null,levelIdx=0,WD=null;
let rng=Math.random;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function inside(s,x,z,m){if(s.t==='box')return x>=s.x0-m&&x<=s.x1+m&&z>=s.z0-m&&z<=s.z1+m;const dx=x-s.x,dz=z-s.z;return dx*dx+dz*dz<=(s.r+m)*(s.r+m);}
let gSolid=null;
function terrainAt(x,z){if(!WD||!WD.H)return -1e9;const h=WD.H(x,z);return WD.waterY!==null&&h<WD.waterY-.55?WD.waterY-.55:h;}
function topAt(x,z){let b=terrainAt(x,z);for(const s of S){if(s.tall)continue;if(inside(s,x,z,0)&&s.top>b)b=s.top;}return b;}
function groundAt(x,z,feet){let b=terrainAt(x,z);gSolid=null;if(b>feet+.6)b=b;for(const s of S){if(s.tall)continue;if(inside(s,x,z,s.one?.5:.15)&&s.top<=feet+.65&&s.top>b){b=s.top;gSolid=s;}}return b;}
const RAIN=[0xff6b6b,0xffa94d,0xffe066,0x7ed957,0x5ec8ff,0xb08cff];
const GEMC=[0xff6fa5,0x8ecae6,0xc77dff,0xffd166,0x7ed9c4];

/* procedural low-poly trees and rocks (instanced) */
function blobGeo(r,detail,seed,flatY=1){const g=new THREE.IcosahedronGeometry(r,detail);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const k=1+(hash2(x*3+seed,z*3+y*2)-.5)*.28;p.setXYZ(i,x*k,y*k*flatY,z*k);}
  g.computeVertexNormals();return g;}
function puffGeo(r,seed,flatY=1,amp=.16){const g=new THREE.SphereGeometry(r,22,16);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const n=vnoise(x*1.7+seed,z*1.7+y*1.3)*.6+vnoise(x*3.3+seed*2,y*3.1+z)*.4;const k=1+(n-.5)*amp*2;p.setXYZ(i,x*k,y*k*flatY,z*k);}
  g.computeVertexNormals();return g;}
const TREEG=GFXON?{
  trunk:(()=>{const g=new THREE.CylinderGeometry(.18,.34,2.1,10);g.translate(0,1,0);return g;})(),
  canopy:(()=>{const g=puffGeo(1.5,1);g.translate(0,3,0);return g;})(),
  canopy2:(()=>{const g=puffGeo(1.05,4);g.translate(.85,2.55,.45);return g;})(),
  canopy3:(()=>{const g=puffGeo(.9,7);g.translate(-.7,3.6,-.3);return g;})(),
  pine:(()=>{const a=new THREE.ConeGeometry(1.5,2.2,16);a.translate(0,2.2,0);return a;})(),
  pine2:(()=>{const a=new THREE.ConeGeometry(1.1,1.9,16);a.translate(0,3.3,0);return a;})(),
  pine3:(()=>{const a=new THREE.ConeGeometry(.7,1.5,16);a.translate(0,4.3,0);return a;})(),
  rock:puffGeo(1,7,.6,.22)
}:{
  trunk:(()=>{const g=new THREE.CylinderGeometry(.2,.32,2,7);g.translate(0,1,0);return g;})(),
  canopy:(()=>{const g=blobGeo(1.5,1,1);g.translate(0,3,0);return g;})(),
  canopy2:(()=>{const g=blobGeo(1,1,4);g.translate(.8,2.6,.4);return g;})(),
  pine:(()=>{const a=new THREE.ConeGeometry(1.5,2.2,8);a.translate(0,2.2,0);return a;})(),
  pine2:(()=>{const a=new THREE.ConeGeometry(1.1,1.9,8);a.translate(0,3.3,0);return a;})(),
  pine3:(()=>{const a=new THREE.ConeGeometry(.7,1.5,8);a.translate(0,4.3,0);return a;})(),
  rock:blobGeo(1,1,7,.6)
};
const FLATM={};const flatMat=c=>FLATM[c]||(FLATM[c]=GFXON?new THREE.MeshLambertMaterial({color:c}):new THREE.MeshPhongMaterial({color:c,flatShading:true,shininess:0,specular:0x000000}));
function instanced(geo,material,list,cast=true){
  const im=new THREE.InstancedMesh(geo,material,list.length),d=new THREE.Object3D(),col=new THREE.Color();
  list.forEach((t,i)=>{d.position.set(t.x,t.y,t.z);d.rotation.set(0,t.ry||0,0);d.scale.setScalar(t.s);d.updateMatrix();im.setMatrixAt(i,d.matrix);if(t.c!==undefined){col.setHex(t.c);im.setColorAt(i,col);}});
  im.castShadow=cast;im.receiveShadow=true;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;world.add(im);return im;}
let _canM=null;function canopyMat(){if(_canM)return _canM;const m=new THREE.MeshLambertMaterial({color:0xffffff});
  m.onBeforeCompile=sh=>{sh.uniforms.uTime=windU;sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ix=instanceMatrix[3][0],iz=instanceMatrix[3][2];float hk=max(0.,position.y-1.8);transformed.x+=sin(uTime*1.3+ix*.21+iz*.13)*.07*hk;transformed.z+=cos(uTime*1.1+iz*.19)*.05*hk;\n#endif');};
  return _canM=m;}
let _shTex=null;function shadowTex(){if(_shTex)return _shTex;const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(40,20,60,.42)');gr.addColorStop(.6,'rgba(40,20,60,.18)');gr.addColorStop(1,'rgba(40,20,60,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);return _shTex=new THREE.CanvasTexture(c);}
function contactShadows(list,k=2.4){if(!GFXON||!list.length)return;const geo=new THREE.PlaneGeometry(1,1);geo.rotateX(-Math.PI/2);
  const m=new THREE.MeshBasicMaterial({map:shadowTex(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});const im=instanced(geo,m,list.map(t=>({x:t.x,y:t.y+.14,z:t.z,s:t.s*k,ry:0})),false);im.receiveShadow=false;im.renderOrder=1;}
/* ---------- fluffy 3D trees: leaf-card canopies + branchy trunks ---------- */
function mergeG(list){let n=0;for(const g of list)n+=g.attributes.position.count;const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2),C=new Float32Array(n*3);let o=0;
  for(const g0 of list){const g=g0.index?g0.toNonIndexed():g0;const p=g.attributes.position,nn=g.attributes.normal,uv=g.attributes.uv,c=g.attributes.color;
    for(let i=0;i<p.count;i++){P.set([p.getX(i),p.getY(i),p.getZ(i)],(o+i)*3);N.set([nn.getX(i),nn.getY(i),nn.getZ(i)],(o+i)*3);if(uv)U.set([uv.getX(i),uv.getY(i)],(o+i)*2);C.set(c?[c.getX(i),c.getY(i),c.getZ(i)]:[1,1,1],(o+i)*3);}o+=p.count;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));g.setAttribute('uv',new THREE.BufferAttribute(U,2));g.setAttribute('color',new THREE.BufferAttribute(C,3));return g;}
function tint(g,v){g=g.index?g.toNonIndexed():g;const n=g.attributes.position.count,c=new Float32Array(n*3);for(let i=0;i<n;i++){const k=typeof v==='function'?v(g.attributes.position,i):v;c[i*3]=k;c[i*3+1]=k;c[i*3+2]=k;}g.setAttribute('color',new THREE.BufferAttribute(c,3));return g;}
let _leafT=null;function leafTex(kind){const key=kind||'leaf';_leafT=_leafT||{};if(_leafT[key])return _leafT[key];const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const r=mulberry(kind==='pine'?77:33);
  if(kind==='pine'){x.lineCap='round';for(let k=0;k<3;k++){const bx=40+k*24;x.strokeStyle='rgb(150,150,150)';x.lineWidth=3;x.beginPath();x.moveTo(bx,124);x.lineTo(64,8);x.stroke();
      for(let i=0;i<26;i++){const t=i/26,px=bx+(64-bx)*t,py=124-116*t,l=(1-t)*26+6;const v=170+Math.floor(r()*85);x.strokeStyle=`rgb(${v},${v},${v})`;x.lineWidth=2.2;
        x.beginPath();x.moveTo(px,py);x.lineTo(px-l,py+l*.35);x.stroke();x.beginPath();x.moveTo(px,py);x.lineTo(px+l,py+l*.35);x.stroke();}}}
  else{for(let i=0;i<34;i++){const a=r()*6.283,d=Math.sqrt(r())*40,px=64+Math.cos(a)*d,py=64+Math.sin(a)*d,v=205+Math.floor(r()*50);
      x.save();x.translate(px,py);x.rotate(r()*6.283);x.fillStyle=`rgb(${v},${v},${v})`;x.beginPath();x.ellipse(0,0,15,8,0,0,6.283);x.fill();
      x.strokeStyle=`rgba(255,255,255,.35)`;x.lineWidth=1.2;x.beginPath();x.moveTo(-12,0);x.lineTo(12,0);x.stroke();x.restore();}}
  const t=new THREE.CanvasTexture(c);t.anisotropy=4;return _leafT[key]=t;}
function leafCards(cx,cy,cz,R,n,seed,size,flat=.85){const r=mulberry(seed),P=[],N=[],U=[],C=[];const up=new THREE.Vector3(0,1,0),v=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),q=new THREE.Quaternion();
  for(let i=0;i<n;i++){let dy=r()*2-1;dy=dy<-.5?dy*.6:dy;const ph=r()*6.283,rr=Math.sqrt(1-dy*dy);v.set(Math.cos(ph)*rr,dy,Math.sin(ph)*rr);
    const d=R*(.62+Math.sqrt(r())*.4),px=cx+v.x*d,py=cy+v.y*d*flat,pz=cz+v.z*d;const s=size*(.8+r()*.45);
    a.crossVectors(v,Math.abs(v.y)>.9?new THREE.Vector3(1,0,0):up).normalize();b.crossVectors(v,a).normalize();q.setFromAxisAngle(v,r()*6.283);a.applyQuaternion(q);b.applyQuaternion(q);
    const corners=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]];const sh=.9+r()*.25;
    for(const [u,w] of corners){P.push(px+(a.x*u+b.x*w)*s*.5,py+(a.y*u+b.y*w)*s*.5,pz+(a.z*u+b.z*w)*s*.5);
      const nx=px+(a.x*u+b.x*w)*s*.5-cx,ny=(py+(a.y*u+b.y*w)*s*.5-cy)/flat,nz=pz+(a.z*u+b.z*w)*s*.5-cz,l=Math.hypot(nx,ny,nz)||1;N.push(nx/l,ny/l,nz/l);U.push(u*.5+.5,w*.5+.5);
      const k=Math.min(1.15,sh*(.9+.25*Math.max(0,(ny/l)*.5+.5)));C.push(k,k,k);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));return g;}
function branchyTrunk(seed){const r=mulberry(seed),parts=[];const t=new THREE.CylinderGeometry(.16,.36,2.5,10,3);t.translate(0,1.25,0);
  const p=t.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setX(i,p.getX(i)+Math.sin(y*1.3+seed)*.06);}t.computeVertexNormals();parts.push(tint(t,1));
  for(let i=0;i<3;i++){const b=new THREE.CylinderGeometry(.05,.11,1.3,6);b.translate(0,.65,0);const m=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(.9+r()*.3,i*2.1+r(),0,'YXZ'));b.applyMatrix4(m);b.translate(0,1.9+r()*.5,0);parts.push(tint(b,1));}
  const root=new THREE.ConeGeometry(.55,.5,10);root.translate(0,.2,0);parts.push(tint(root,.9));return mergeG(parts);}
const FTREE=GFXON?(()=>{const LOBES=[[0,3.05,0,1.55,LOWQ?110:160],[.95,2.6,.5,1.1,LOWQ?60:85],[-.8,3.6,-.35,.95,LOWQ?50:72],[-.55,2.55,.75,.9,LOWQ?42:60]];
  const core=mergeG(LOBES.map(([x,y,z,R],i)=>{const g=puffGeo(R*.7,i*3+1,.9);g.translate(x,y,z);return tint(g,(pp,k)=>.5+.25*Math.max(0,(pp.getY(k)-y)/R));}));
  const cards=mergeG(LOBES.map(([x,y,z,R,n],i)=>leafCards(x,y,z,R,n,11+i*7,R*.66)));
  const pc=[],pcore=[];[[2.0,1.75,1.5],[3.05,1.35,1.25],[4.0,1.0,1.0],[4.85,.65,.8],[5.5,.35,.55]].forEach(([y,R,h],i)=>{const c=new THREE.ConeGeometry(R*.8,h*1.2,14);c.translate(0,y,0);pcore.push(tint(c,(pp,k)=>.55+.15*((pp.getY(k)-y)/h+.5)));
    const r=mulberry(500+i),n=LOWQ?14:20;for(let k=0;k<n;k++){const ang=k/n*6.283+r()*.3,len=R*1.05,w=R*.75;const g=new THREE.PlaneGeometry(w,len);g.translate(0,len/2,0);
      g.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI/2+.55+r()*.2));g.applyMatrix4(new THREE.Matrix4().makeRotationY(-ang+Math.PI/2));g.translate(0,y+h*.35,0);
      const pn=g.attributes.normal;for(let j=0;j<pn.count;j++){const vx=g.attributes.position.getX(j),vz=g.attributes.position.getZ(j),l=Math.hypot(vx,vz)||1;pn.setXYZ(j,vx/l*.6,.8,vz/l*.6);}pc.push(tint(g,.85+r()*.25));}});
  return {trunk:branchyTrunk(3),core,cards,pcore:mergeG(pcore),pcards:mergeG(pc)};})():null;
const FTM={};function ftMat(kind,cards){const k=kind+(cards?'c':'k');if(FTM[k])return FTM[k];
  const m=new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true,side:cards?THREE.DoubleSide:THREE.FrontSide,map:cards?leafTex(kind==='pine'?'pine':''):null,alphaTest:cards?.5:0});
  m.onBeforeCompile=sh=>{sh.uniforms.uTime=windU;sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ix=instanceMatrix[3][0],iz=instanceMatrix[3][2];float hk=max(0.,position.y-1.6);float gs=sin(uTime*1.1+ix*.05)*.5+.8;transformed.x+=sin(uTime*1.3+ix*.21+iz*.13)*.06*hk*gs;transformed.z+=cos(uTime*1.1+iz*.19)*.045*hk*gs;'+(cards?'transformed+=normal*sin(uTime*4.2+position.x*3.1+position.y*2.3+ix)*.035;':'')+'\n#endif').replace('#include <project_vertex>','#include <project_vertex>\nvec4 tw=modelMatrix*instanceMatrix*vec4(transformed,1.0);vTW=tw.xyz;');sh.vertexShader='varying vec3 vTW;\n'+sh.vertexShader;
    sh.fragmentShader='varying vec3 vTW;\n'+sh.fragmentShader.replace('void main() {','void main() {\nfloat cd=distance(vTW,cameraPosition);float dth=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);if(cd<7.5&&dth>smoothstep(3.5,7.5,cd))discard;');};
  return FTM[k]=m;}
function leafDepth(kind){const k='d'+kind;if(FTM[k])return FTM[k];return FTM[k]=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:leafTex(kind==='pine'?'pine':''),alphaTest:.5,side:THREE.DoubleSide});}
let FTCARDS=[];
function plantFluffy(list,kind){const F=FTREE;const trunkC=kind==='pine'?0x7a5238:0x9c6b4f;
  instanced(F.trunk,ftMat('trunk',false),list.map(t=>Object.assign({},t,{c:trunkC})));
  if(kind==='pine'){instanced(F.pcore,ftMat('pine',false),list);const im=instanced(F.pcards,ftMat('pine',true),list);im.customDepthMaterial=leafDepth('pine');FTCARDS.push(im);
    if(th&&th.snow){const sn=list.map(t=>Object.assign({},t,{y:t.y+.06*t.s,s:t.s*1.02,c:0xffffff}));const s2=instanced(F.pcards,ftMat('pine',true),sn,false);s2.scale&&0;}}
  else{instanced(F.core,ftMat('round',false),list);const im=FTCARDS[FTCARDS.push(instanced(F.cards,ftMat('round',true),list.map(t=>Object.assign({},t,{c:new THREE.Color(t.c).offsetHSL(0,.02,.03).getHex()}))))-1];im.customDepthMaterial=leafDepth('round');}
  contactShadows(list,2.8);for(const t of list)S.push({t:'cyl',x:t.x,z:t.z,r:.5*t.s,top:t.y+60,bottom:t.y-2,tall:true});}
function plantTrees(list,kind,leaf){
  if(!list.length)return;
  if(FTREE){plantFluffy(list,kind);return;}
  instanced(TREEG.trunk,flatMat(0x9c6b4f),list);
  if(kind==='pine'){const m=flatMat(0xffffff);[TREEG.pine,TREEG.pine2,TREEG.pine3].forEach(g=>instanced(g,m,list.map(t=>Object.assign({},t,{c:t.c}))));
    if(th&&th.snow){instanced(TREEG.pine3,m,list.map(t=>Object.assign({},t,{y:t.y+.08*t.s,s:t.s*1.04,c:0xffffff})),false);instanced(TREEG.pine2,m,list.map(t=>({x:t.x,y:t.y+.55*t.s,z:t.z,s:t.s*.7,ry:t.ry,c:0xf4f9ff})),false);}}
  else{const m=GFXON?canopyMat():flatMat(0xffffff);instanced(TREEG.canopy,m,list);instanced(TREEG.canopy2,m,list.map(t=>Object.assign({},t,{c:new THREE.Color(t.c).offsetHSL(0,0,.06).getHex()})));if(TREEG.canopy3)instanced(TREEG.canopy3,m,list.map(t=>Object.assign({},t,{c:new THREE.Color(t.c).offsetHSL(.01,.02,.1).getHex()})));}
  contactShadows(list);
  for(const t of list)S.push({t:'cyl',x:t.x,z:t.z,r:.5*t.s,top:t.y+60,bottom:t.y-2,tall:true});
}

/* building blocks */
function drawPlat(parent,x,z,w,d,top,style){
  if(style==='cloud'){box(x,top-.3,z,w,.45,d,0xffffff,parent);for(let i=0;i<5;i++)sph(x+(i%2?.3:-.3)*w,top-.3,z+(i-2)*d*.2,w*.35,.35,d*.3,0xffffff,parent);box(x,top-.04,z,w*.9,.08,d*.9,0xfff0f8,parent);}
  else if(style==='rock'){put(G.sph,0xb6a9c9,x,top-.45,z,w*.62,.55,d*.62,parent);box(x,top-.06,z,w*.85,.12,d*.85,0xd2c8e0,parent);}
  else if(style==='cookie'){const r=Math.min(w,d)*.62;put(G.cyl,0xd9a05b,x,top-.25,z,r,.5,r,parent);put(G.cyl,0xe8b878,x,top-.01,z,r*.92,.04,r*.92,parent);
    for(let i=0;i<9;i++){const a=i*2.4,q=Math.sqrt((i+.5)/9)*r*.8;sph(x+Math.cos(a)*q,top+.02,z+Math.sin(a)*q,.28,.12,.28,0x5a3220,parent);}}
  else if(style==='block'){const cs=[0xff5a5a,0x5ec8ff,0xffd166,0x7ed957];box(x,top-.6,z,w,1.2,d,cs[Math.floor(Math.abs(x*3+z))%4],parent);for(let i=0;i<4;i++)for(let k=0;k<2;k++)cyl(x-w*.3+i*w*.2,top+.08,z-d*.2+k*d*.4,.32,.18,0xffffff,parent);}
  else{box(x,top-.25,z,w,.5,d,0x9c6b4f,parent);box(x,top-.02,z,w-.2,.06,d-.2,0xc99a6e,parent);}
}
function face(p,x,y,z,s=1,ry=0){const f=new THREE.Group();f.position.set(x,y,z);f.rotation.y=ry;f.scale.setScalar(s);p.add(f);
  for(const sx of [-.28,.28]){sph(sx,0,0,.11,.14,.06,0x2b1b3d,f);sph(sx+.03,.05,.04,.04,.04,.02,0xffffff,f);sph(sx*1.6,-.16,-.02,.1,.06,.03,0xff8fb3,f);}
  const m=new THREE.Mesh(new THREE.TorusGeometry(.12,.03,6,12,Math.PI),mat(0x2b1b3d));m.position.set(0,-.14,0);m.rotation.z=Math.PI;f.add(m);return f;}
const api={
  pier(x1,z1,x2,z2){const len=Math.hypot(x2-x1,z2-z1),ang=Math.atan2(x2-x1,z2-z1),n=Math.ceil(len/1.2);const y=WD.waterY+.6;
    const g=new THREE.Group();g.position.set((x1+x2)/2,y,(z1+z2)/2);g.rotation.y=ang;world.add(g);box(0,0,0,3,.22,len,0xb07945,g);
    for(let i=0;i<n;i++)box(0,.115,-len/2+.6+i*1.2,3,.01,.05,0x7a4f2e,g);for(const sx of [-1.4,1.4])for(let i=0;i<=n;i+=2)cyl(sx,-.7,-len/2+i*1.2,.12,1.6,0x5c3a20,g);castAll(g);
    for(let i=0;i<=n;i++){const t=i/n;S.push({t:'cyl',x:x1+(x2-x1)*t,z:z1+(z2-z1)*t,r:1.6,top:y+.11,bottom:y-.5,one:true});}},
  boat(x,z){const g=new THREE.Group();world.add(g);sph(0,0,0,1.1,.42,2.4,0xffffff,g);sph(0,.15,0,.9,.25,2,0x3a86ff,g);cyl(0,1.5,0,.06,3,0x8d6e63,g);
    const sail=new THREE.Mesh(new THREE.ConeGeometry(1.2,2.4,3),mat(0xffe3ef));sail.scale.set(.05,1,.8);sail.position.set(0,1.7,-.3);g.add(sail);castAll(g);
    flies.push({g,x,z,ph:rng()*6,r:8+rng()*8,swan:true,boat:true});},
  snowman(x,z,ry){const y=topAt(x,z);const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;world.add(g);
    sph(0,.8,0,.85,.8,.85,0xffffff,g);sph(0,1.95,0,.6,.58,.6,0xffffff,g);sph(0,2.85,0,.42,.42,.42,0xffffff,g);
    const n=cone(0,2.85,.5,.08,.4,0xff8a3d,g);n.rotation.x=Math.PI/2;for(const sx of [-.14,.14])sph(sx,2.98,.36,.05,.05,.04,0x2b1b3d,g);
    for(let i=0;i<3;i++)sph(0,1.75+i*.2,.58,.05,.05,.04,0x2b1b3d,g);const sc=new THREE.Mesh(new THREE.TorusGeometry(.42,.1,8,16),mat(0xff6fa5));sc.rotation.x=Math.PI/2;sc.position.y=2.45;g.add(sc);
    cyl(0,3.25,0,.32,.08,0x4a2c6b,g);cyl(0,3.5,0,.22,.45,0x4a2c6b,g);castAll(g);S.push({t:'cyl',x,z,r:.9,top:y+3,bottom:y-2,deco:true});},
  igloo(x,z,ry){const y=topAt(x,z);const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;world.add(g);
    put(new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2),0xf4f9ff,0,0,0,3,2.4,3,g);const d=put(new THREE.CylinderGeometry(1,1,1.6,16,1,false,0,Math.PI),0xe6f0ff,0,0,2.7,.9,1,.9,g);d.rotation.x=Math.PI/2;d.position.y=0;
    box(0,.55,3.4,1.2,1.1,.05,0x6b8fb5,g);castAll(g);S.push({t:'cyl',x,z,r:3.1,top:y+2.4,bottom:y-2,deco:true});},
  palm(x,z,s=1){const y=topAt(x,z);const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rng()*6;world.add(g);let px=0,py=0;
    for(let i=0;i<7;i++){const seg=cyl(px,py+.45*s,0,(.28-.025*i)*s,.95*s,i%2?0xb98a5a:0xa77a4c,g);px+=.12*s*i*.4;py+=.9*s;seg.rotation.z=-.05*i;}
    for(let i=0;i<7;i++){const a=i/7*6.283,l=new THREE.Group();l.position.set(px,py,0);l.rotation.y=a;g.add(l);const f=sph(1.4*s,-.35*s,0,1.5*s,.12*s,.45*s,i%2?0x3fae5a:0x4fc46a,l);f.rotation.z=-.35;}
    for(let i=0;i<3;i++)sph(px+Math.cos(i*2)*.3,py-.4,Math.sin(i*2)*.3,.22,.22,.22,0x8a5a3b,g);castAll(g);S.push({t:'cyl',x,z,r:.5*s,top:60,bottom:y-2,tall:true});},
  umbrella(x,z,c){const y=topAt(x,z);S.push({t:'cyl',x,z,r:1.1,top:y+3,bottom:y-2,deco:true});cyl(x,y+1.3,z,.06,2.6,0xffffff);const u=put(new THREE.ConeGeometry(1.8,.7,12),c,x,y+2.7,z,1,1,1);castAll(u);
    box(x+1.4,y+.12,z,1.1,.12,2,0xffffff);},
  shell(x,z){const y=topAt(x,z);const c=[0xffb3c6,0xfff0d0,0xffd6a5][Math.floor(rng()*3)];const sh=put(new THREE.SphereGeometry(1,10,6,0,Math.PI*2,0,Math.PI/2),c,x,y,z,.3,.18,.3);sh.rotation.y=rng()*6;},
  starfish(x,z){const y=topAt(x,z);const m=put(starGeo,0xff8a5c,x,y+.05,z,.35,.35,.35);m.rotation.x=-Math.PI/2;},
  lighthouse(x,z){const y=topAt(x,z);const g=new THREE.Group();g.position.set(x,y,z);world.add(g);
    for(let i=0;i<5;i++)put(new THREE.CylinderGeometry(1.6-i*.18,1.75-i*.18,2,20),i%2?0xe63946:0xffffff,0,1+i*2,0,1,1,1,g);
    cyl(0,10.6,0,1,1.2,0xfff3b0,g);cone(0,11.8,0,1.2,1.2,0xe63946,g);glow(g,0,10.6,0,6,0xfff0b8,true,.7);castAll(g);S.push({t:'cyl',x,z,r:1.8,top:y+10,bottom:y-2,deco:true});},
  plat(x,z,w,d,top,style){const gnd=terrainAt(x,z),low=gnd>-1e8&&top-gnd<5.8;style=style||'cloud';
    S.push(low?{t:'box',x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,top,bottom:gnd-2}:{t:'box',x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,top,bottom:top-.5,one:true});drawPlat(world,x,z,w,d,top,style);
    if(low){const h=top-.4-gnd,r=Math.min(w,d)*(style==='cookie'?.5:.38),c={cookie:0xc98a4b,cloud:0xffffff,rock:0xa999c2,wood:0x8a5a3c,block:0x5ec8ff}[style]||0xffffff;
      if(h>.1){put(G.cyl,c,x,gnd+h/2,z,r,h+.2,r);if(style==='cookie')for(let y=gnd+.6;y<top-.6;y+=.9)put(G.cyl,0xe8b878,x,y,z,r*1.06,.12,r*1.06);}}},
  island(x,z,r,top){S.push({t:'cyl',x,z,r,top,bottom:-30});
    put(G.cyl,th.grass,x,top-.12,z,r,.24,r);put(new THREE.CylinderGeometry(r,r*.85,1,28),th.dirt,x,top-.6,z,1,.8,1);
    const c=cone(x,top-1-r*.6,z,r*.85,r*1.2,th.rock);c.rotation.x=Math.PI;
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2+r;sph(x+Math.cos(a)*r*.9,top-1.2,z+Math.sin(a)*r*.9,1.3,.8,1.3,0xffffff);}},
  gem(x,y,z){const gc=GEMC[gems.length%GEMC.length];const m=th&&th.candy?(()=>{const q=new THREE.Group();q.position.set(x,y,z);world.add(q);const cc=[0xff4f9a,0x5ec8ff,0xffd166,0x7ed957,0xc77dff][gems.length%5];sph(0,0,0,.3,.24,.24,cc,q);
      for(const sx of [-1,1]){const k=cone(sx*.38,0,0,.17,.24,cc,q);k.rotation.z=sx*Math.PI/2;}sph(0,.06,.18,.08,.05,.05,0xffffff,q);return q;})():th&&th.toys?put(G.box,[0xff5a5a,0x5ec8ff,0xffd166,0x7ed957,0xc77dff][gems.length%5],x,y,z,.42,.42,.42):th&&th.hearts?put(heartGeo,[0xff4f9a,0xff8fc8,0xc77dff,0xff6b8a][gems.length%4],x,y,z,.36,.36,.36):put(G.gem,gc,x,y,z,.3,.42,.3);glow(m,0,0,0,4,gc,true,.6);gems.push({m,x,y,z,c:gc,got:false,ph:rng()*6});},
  ring(x,z,r,n){for(let i=0;i<n;i++){const a=i/n*Math.PI*2,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;api.gem(px,topAt(px,pz)+1.1,pz);}},
  star(x,y,z,ry=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;world.add(g);
    const t=new THREE.Mesh(new THREE.TorusGeometry(1.5,.15,8,30),mat(0xffd166));g.add(t);
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const s=new THREE.Mesh(starGeo,mat(0xfff3b0));s.scale.setScalar(.2);s.position.set(Math.cos(a)*1.5,Math.sin(a)*1.5,-.05);g.add(s);}
    glow(g,0,0,0,4,0xffe08a,true,.45);rings.push({g,x,y,z,ry,got:false});},
  spring(x,z){const y=topAt(x,z);const g=new THREE.Group();g.position.set(x,y,z);world.add(g);
    cyl(0,.1,0,1.5,.2,0xb08cff,g);const coil=cyl(0,.24,0,.55,.24,0xfff0b8,g);const top=new THREE.Group();top.position.y=.36;g.add(top);
    for(let i=0;i<6;i++){const s=cyl(0,i*.012,0,1,.06,RAIN[i],top);s.scale.set(1.6-i*.22,.06,1.6-i*.22);}
    for(let i=0;i<8;i++){const a=i/8*6.283;cyl(Math.cos(a)*1.35,.2,Math.sin(a)*1.35,.07,.3,0xfff0b8,g);}
    S.push({t:'cyl',x,z,r:1.6,top:y+.4,bottom:y,spring:true});springs.push({x,z,y:y+.4,g,coil,top,t:0});castAll(g);},
  rainbow(x1,z1,x2,z2,base,H=3,w=3.4,base2){if(base2===undefined)base2=base;const len=Math.hypot(x2-x1,z2-z1),n=Math.max(6,Math.round(len/.5)),ang=Math.atan2(x2-x1,z2-z1);
    const br={x1,z1,x2,z2,ang,len,w};
    for(let i=0;i<n;i++){const t=(i+.5)/n,xc=x1+(x2-x1)*t,zc=z1+(z2-z1)*t,top=base+(base2-base)*t+H*Math.sin(Math.PI*t)+.05,step=len/n;
      S.push({t:'cyl',x:xc,z:zc,r:w/2,top,bottom:top-.4,one:true,bridge:br});
      const g=new THREE.Group();g.position.set(xc,top-.12,zc);g.rotation.y=ang;world.add(g);
      for(let k=0;k<6;k++)box(-w/2+w/6*(k+.5),0,0,w/6+.01,.24,step+.05,RAIN[k],g);}},
  flowerPatch(x,z,n,rad){const list=[];for(let i=0;i<n;i++){const a=rng()*6.3,r=Math.sqrt(rng())*rad,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;const y=topAt(px,pz);
      if(WD.waterY!==null&&y<=WD.waterY)continue;list.push({x:px,y:y+.32,z:pz,s:.07+rng()*.05,c:[0xff6fa5,0xffe066,0xffffff,0xb08cff,0x8ecae6,0xff9e5e][Math.floor(rng()*6)]});}
    if(list.length){instanced(G.sph,flatMat(0xffffff),list,false);instanced((()=>{const g=new THREE.CylinderGeometry(.18,.18,4.2,4);g.translate(0,-2.1,0);return g;})(),flatMat(0x4caf50),list.map(t=>({x:t.x,y:t.y,z:t.z,s:.07})),false);}},
  rock(x,z,s,c){const y=topAt(x,z);instanced(TREEG.rock,flatMat(c||th.rock),[{x,y:y+.1,z,s,ry:rng()*6}]);S.push({t:'cyl',x,z,r:s*.85,top:y+s*.55,bottom:y-2,deco:true});},
  lantern(x,z){const y=topAt(x,z);S.push({t:'cyl',x,z,r:.35,top:y+3.3,bottom:y-2,deco:true});cyl(x,y+1.4,z,.07,2.8,0x6b4f8f);put(G.sph,basic(0xffe9a8),x,y+2.85,z,.25,.3,.25);cone(x,y+3.2,z,.3,.25,0x6b4f8f);glow(world,x,y+2.85,z,3,0xffd98a);},
  glowflower(x,z){const y=topAt(x,z);cyl(x,y+.35,z,.035,.7,0x2f6b4f);const gc=[0x9ef0ff,0xffb3f0,0xfff3a0][Math.floor(rng()*3)];put(G.sph,basic(gc),x,y+.75,z,.18,.22,.18);glow(world,x,y+.75,z,1.5,gc);},
  fence(pts){for(let i=0;i<pts.length-1;i++){const [x1,z1]=pts[i],[x2,z2]=pts[i+1];const n=Math.max(1,Math.round(Math.hypot(x2-x1,z2-z1)/3));
    for(let k=0;k<=n;k++){const t=k/n,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;cyl(x,topAt(x,z)+.55,z,.08,1.1,0xffffff);}
    {const m=Math.max(1,Math.round(Math.hypot(x2-x1,z2-z1)/.9));for(let k=0;k<=m;k++){const t=k/m,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t,yy=topAt(x,z);S.push({t:'cyl',x,z,r:.45,top:yy+1.15,bottom:yy-2,deco:true});}}
    const len=Math.hypot(x2-x1,z2-z1),ang=Math.atan2(x2-x1,z2-z1),ym=topAt((x1+x2)/2,(z1+z2)/2);
    for(const hy of [.55,.9]){const b=box((x1+x2)/2,ym+hy,(z1+z2)/2,.06,.08,len,0xffd6e8);b.rotation.y=ang;}}},
  cottage(x,z,rot,wall,roof){const y=topAt(x,z);const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;world.add(g);
    if(ENV_G){g.add(envPart('cottage',{wall,roof}));castAll(g);S.push({t:'cyl',x,z,r:2,top:y+2.4,bottom:y-2,deco:true});return;}
    box(0,1.2,0,3.2,2.4,2.8,wall,g);const r=put(G.cone4,roof,0,3.2,0,2.6,1.6,2.6,g);r.rotation.y=Math.PI/4;box(0,.8,1.41,.8,1.6,.06,0x9c6b4f,g);
    for(const sx of [-1,1])box(sx*1,1.5,1.42,.6,.6,.05,0xa5d8ff,g);box(1,3.5,-.5,.4,1,.4,0xc99a6e,g);
    castAll(g);S.push({t:'cyl',x,z,r:2,top:y+2.4,bottom:y-2,deco:true});},
  swan(x,z){const g=new THREE.Group();world.add(g);sph(0,0,0,.4,.26,.6,0xffffff,g);const n=cyl(0,.42,.42,.07,.7,0xffffff,g);n.rotation.x=-.3;
    sph(0,.78,.54,.13,.13,.16,0xffffff,g);cone(0,.76,.72,.05,.15,0xffa94d,g).rotation.x=Math.PI/2;
    flies.push({g,x,z,ph:rng()*6,r:3+rng()*3,swan:true});},
  butterfly(x,z){const g=new THREE.Group();world.add(g);const c=[0xff6fa5,0xffd166,0x8ecae6,0xc77dff][Math.floor(rng()*4)];
    const wm=new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide});
    const w1=new THREE.Mesh(new THREE.CircleGeometry(.22,10),wm),w2=w1.clone();w1.position.x=-.2;w2.position.x=.2;
    const l=new THREE.Group();l.add(w1);const r=new THREE.Group();r.add(w2);g.add(l);g.add(r);sph(0,0,0,.04,.04,.18,0x4a2c6b,g);
    flies.push({g,x,z,y:topAt(x,z)+1.2,ph:rng()*6,r:2+rng()*3,bf:true,l,r2:r});},
  firefly(x,y,z){const m=put(G.sph,basic(0xfff3a0),x,y,z,.07,.07,.07);glow(m,0,0,0,8,0xfff3a0);flies.push({g:m,x,y,z,ph:rng()*6,r:.8});},
  sweeper(x0,z0,x1,z1,speed=5){const y=topAt((x0+x1)/2,(z0+z1)/2),g=new THREE.Group();world.add(g);const roll=new THREE.Group();g.add(roll);const r=1.15;
    for(const [a,b,c,s] of [[0,0,0,1.1],[.7,-.15,.25,.8],[-.7,-.15,-.1,.8],[0,.3,-.55,.7],[0,-.1,.6,.7]])sph(a,b,c,s,s*.85,s,0xffffff,roll);
    for(const sx of [-.3,.3])sph(sx,.12,1.02,.1,.14,.06,0x4a2c6b,roll);sph(0,-.18,1.04,.14,.06,.05,0xff8fbd,roll);
    const len=Math.hypot(x1-x0,z1-z0)/2;sweepers.push({g,roll,mx:(x0+x1)/2,mz:(z0+z1)/2,dx:(x1-x0)/2/len,dz:(z1-z0)/2/len,amp:len,w:speed/len,ph:rng()*6,y,r,x:(x0+x1)/2,z:(z0+z1)/2,vx:0,vz:0});castAll(g);},
  foal(x,z,body,mane){const rig=makeRig(body,mane,{},.3);const y=topAt(x,z);rig.wrap.position.set(x,y,z);rig.wrap.rotation.y=rng()*6;world.add(rig.wrap);
    const beacon=new THREE.Group();world.add(beacon);beacon.position.set(x,y,z);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.5,.9,30,16,1,true),new THREE.MeshBasicMaterial({color:0xffe6fb,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));beam.position.y=15;beacon.add(beam);
    const h=new THREE.Mesh(heartGeo,basic(0xff6fa5));h.scale.setScalar(.35);h.position.y=2.4;beacon.add(h);glow(beacon,0,2.4,0,2.4,0xff9ec7);
    foals.push({rig,x,z,y,found:false,home:false,beacon,heart:h,face:0,ph:rng()*6});},
  castle(x,z,rot=Math.PI){const y=topAt(x,z);const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;world.add(g);
    if(ENV_G){const m=envPart('castle');g.add(m);const st=new THREE.Mesh(starGeo,mat(0xffd166));st.scale.setScalar(.7);st.position.set(0,12.3,-.6);g.add(st);glow(g,0,12.3,-.6,5,0xffe08a);
      const hp=ENV_G.scene.getObjectByName('heartpos');const hrt=new THREE.Mesh(heartGeo,mat(0xff6fa5));hrt.scale.setScalar(.6);hrt.position.set(0,4.3,3.45);g.add(hrt);
      for(const [tx,tz] of [[-4,-3.2],[4,-3.2],[-4,3.2],[4,3.2]])glow(g,tx,11.1,tz,1.2,0xffe08a,true,.6);
      castAll(g);const fx=Math.sin(rot),fz=Math.cos(rot);S.push({t:'cyl',x,z,r:5,top:y+5,bottom:y-3,deco:true});castle={x,z,y,door:{x:x+fx*5.6,z:z+fz*5.6},star:st};return;}
    box(0,2.5,0,8,5,6.5,0xfff4fb,g);for(let i=0;i<9;i++)box(-3.6+i*.9,5.3,3.2,.5,.6,.3,0xfff4fb,g);
    for(const [tx,tz] of [[-4,-3.2],[4,-3.2],[-4,3.2],[4,3.2]]){cyl(tx,3.8,tz,1.25,7.6,0xf3e6ff,g);cone(tx,8.9,tz,1.55,2.8,0xff8fc8,g);
      box(tx,10.6,tz,.06,1.1,.06,0x8d6e63,g);box(tx+.4,10.8,tz,.7,.45,.04,RAIN[(tx>0?2:0)+(tz>0?1:0)],g);}
    cyl(0,6.6,-1,1.7,3.2,0xf3e6ff,g);cone(0,9.4,-1,2.1,3,0xff8fc8,g);const st=new THREE.Mesh(starGeo,mat(0xffd166));st.scale.setScalar(.65);st.position.set(0,11.4,-1);g.add(st);glow(g,0,11.4,-1,5,0xffe08a);
    box(0,1.5,3.27,2.2,3,.12,0xb98ae6,g);const arch=cyl(0,3,3.27,1.1,.12,0xb98ae6,g);arch.rotation.x=Math.PI/2;
    for(const sx of [-2.4,2.4])box(sx,3.2,3.28,.9,1.1,.06,0xa5d8ff,g);
    const hrt=new THREE.Mesh(heartGeo,mat(0xff6fa5));hrt.scale.setScalar(.55);hrt.position.set(0,4.3,3.4);g.add(hrt);castAll(g);
    const fx=Math.sin(rot),fz=Math.cos(rot);
    S.push({t:'cyl',x,z,r:5,top:y+5,bottom:y-3,deco:true});castle={x,z,y,door:{x:x+fx*5.6,z:z+fz*5.6},star:st};},
  arch(x,z,ry,idx){const g=new THREE.Group();g.position.set(x,topAt(x,z),z);g.rotation.y=ry;world.add(g);
    RAIN.forEach((c,i)=>{const t=new THREE.Mesh(new THREE.TorusGeometry(5.2-i*.32,.17,8,40,Math.PI),mat(c));g.add(t);});
    for(const sx of [-1,1])sph(sx*4.4,.2,0,1,.6,1,0xffffff,g);castAll(g);arches.push({g,x,z,ry,idx});},
  bone(x,z,y){if(y===undefined)y=topAt(x,z);const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rng()*6;world.add(g);
    put(new THREE.SphereGeometry(1,14,8,0,Math.PI*2,0,Math.PI/2),th.dirt||0x9c6b4f,0,0,0,.75,.22,.6,g);
    const b=new THREE.Group();b.position.set(0,.16,0);b.rotation.set(0,0,.25);g.add(b);const c=cyl(0,0,0,.075,.62,0xfff6e6,b);c.rotation.z=Math.PI/2;
    for(const [sx,sz] of [[-.32,-.07],[-.32,.07],[.32,-.07],[.32,.07]])sph(sx,0,sz,.1,.1,.1,0xfff6e6,b);castAll(g);
    const gl=glow(g,0,.4,0,2.2,0xfff3b0,true,.9);gl.visible=false;bones.push({g,b,x,z,y,got:false,gl,hinted:false});},
  mushroom(x,z,s=1){const y=topAt(x,z);S.push({t:'cyl',x,z,r:.45*s,top:y+.8*s,bottom:y-2,deco:true});const gc=[0x9ef0ff,0xffa3f0,0xc9a3ff,0xfff3a0][Math.floor(rng()*4)];const g=new THREE.Group();g.position.set(x,y,z);world.add(g);
    cyl(0,.3*s,0,.12*s,.6*s,0xf4f0ff,g);put(new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),basic(gc),0,.55*s,0,.42*s,.32*s,.42*s,g);
    for(let i=0;i<4;i++){const a=i*1.7;put(G.sph,basic(0xffffff),Math.cos(a)*.24*s,.72*s,Math.sin(a)*.24*s,.06*s,.04*s,.06*s,g);}glow(g,0,.7*s,0,2.4*s,gc,true,.8);},
  stone(x,z){const y=topAt(x,z);const g=new THREE.Group();g.position.set(x,y+.04,z);world.add(g);const m=new THREE.MeshBasicMaterial({color:0x5a5f9a});
    const st=new THREE.Mesh(starGeo,m);st.scale.setScalar(.38);st.rotation.x=-Math.PI/2;g.add(st);const gl=glow(g,0,.3,0,1.7,0xfff3b0,true,1);gl.visible=false;
    WD.stones.push({x,z,y,m,gl,lit:false});},
  mostic(x1,z1,x2,z2,H=1.8,w=3.6,cols){const C=cols||[0xffe3f3,0xf7c6e6,0xffffff,0xff8fc8,0xff4f9a];const len=Math.hypot(x2-x1,z2-z1),n=Math.max(8,Math.round(len/.5)),ang=Math.atan2(x2-x1,z2-z1),br={x1,z1,x2,z2,ang,len,w};
    const b1=Math.max(0,topAt(x1,z1)),b2=Math.max(0,topAt(x2,z2));
    for(let i=0;i<n;i++){const t=(i+.5)/n,xc=x1+(x2-x1)*t,zc=z1+(z2-z1)*t,top=b1+(b2-b1)*t+H*Math.sin(Math.PI*t)+.05,step=len/n;
      S.push({t:'cyl',x:xc,z:zc,r:w/2,top,bottom:top-.4,one:true,bridge:br});
      const gp=new THREE.Group();gp.position.set(xc,top-.12,zc);gp.rotation.y=ang;world.add(gp);
      box(0,0,0,w,.22,step+.04,i%2?C[0]:C[1],gp);
      for(const sx of [-1,1]){box(sx*(w/2-.08),.85,0,.1,.08,step+.06,C[2],gp);
        if(i%4===0){cyl(sx*(w/2-.08),.45,0,.07,.9,C[2],gp);const h=new THREE.Mesh(heartGeo,mat(i%8?C[3]:C[4]));h.scale.setScalar(.16);h.position.set(sx*(w/2-.08),1.02,0);gp.add(h);}}}
    const mid=[(x1+x2)/2,(z1+z2)/2];glow(world,mid[0],Math.max(b1,b2)+H+1.4,mid[1],3,0xffb3e6,true,.5);},
  heartLamp(x,z){const y=topAt(x,z);S.push({t:'cyl',x,z,r:.35,top:y+3,bottom:y-2,deco:true});cyl(x,y+1.3,z,.06,2.6,0xf3e6ff);const h=new THREE.Mesh(heartGeo,basic(0xff9ed2));h.scale.setScalar(.3);h.position.set(x,y+2.75,z);world.add(h);glow(world,x,y+2.8,z,3,0xff9ed2);WD.spin.push({m:h,s:1.2,ph:rng()*6});},
  floatHeart(x,y,z){const c=[0xff4f9a,0xff8fc8,0xd2a8ff,0xffb3e6][Math.floor(rng()*4)];const h=new THREE.Mesh(heartGeo,basic(c));h.scale.setScalar(.3+rng()*.3);world.add(h);glow(h,0,0,.15,5,c,true,.7);
    flies.push({g:h,x,y,z,ph:rng()*6,r:.6+rng()*.8,spin:true});},
  crystal(x,z,s=1){const y=topAt(x,z);const c=[0x9ef0ff,0xffb3f0,0xd2a8ff][Math.floor(rng()*3)];const gp=new THREE.Group();gp.position.set(x,y,z);gp.rotation.y=rng()*6;world.add(gp);
    for(let i=0;i<4;i++){const m=put(G.cone4,basic(c,{transparent:true,opacity:.85}),(i?Math.cos(i*2.1)*.5:0)*s,(i?.6:1)*s,(i?Math.sin(i*2.1)*.5:0)*s,(i?.25:.4)*s,(i?1.2:2)*s,(i?.25:.4)*s,gp);m.rotation.z=i?Math.cos(i*2.1)*.35:0;m.rotation.x=i?Math.sin(i*2.1)*.35:0;}
    glow(gp,0,1*s,0,3.5*s,c,true,.6);S.push({t:'cyl',x,z,r:.7*s,top:y+2*s,bottom:y-2,deco:true});},
  bigRainbowHeart(x,z,ry,R=17){const y=topAt(x,z);const gp=new THREE.Group();gp.position.set(x,y-1,z);gp.rotation.y=ry;world.add(gp);for(const sx of [-1,1])S.push({t:'cyl',x:x+Math.cos(ry)*sx*(R-1.5),z:z-Math.sin(ry)*sx*(R-1.5),r:2.2,top:y+1.4,bottom:y-2,deco:true});
    RAIN.forEach((c,i)=>{const t=new THREE.Mesh(new THREE.TorusGeometry(R-i*.7,.38,10,64,Math.PI),basic(c));gp.add(t);});
    for(const sx of [-1,1])for(let k=0;k<4;k++)sph(sx*(R-1.7)+(k-1.5)*.9,.3+k%2*.4,(k%2-.5)*1.2,1.5,1,1.5,0xffffff,gp);
    const hg=new THREE.Group();hg.position.set(0,R+3.2,0);gp.add(hg);const h=new THREE.Mesh(heartGeo,basic(0xff3d8b));h.scale.setScalar(3.4);h.position.z=-.5;hg.add(h);
    const h2=new THREE.Mesh(heartGeo,basic(0xff9ed2));h2.scale.setScalar(2.3);h2.position.set(0,.35,.6);hg.add(h2);glow(hg,0,0,0,22,0xff8fc8,false,.75);
    for(let i=0;i<10;i++){const a=i/10*6.283;const st=new THREE.Mesh(starGeo,basic(0xfff3b0));st.scale.setScalar(.6);st.position.set(Math.cos(a)*5.5,Math.sin(a)*5.5,0);hg.add(st);}
    WD.spin.push({m:hg,s:0,pulse:true,ph:0});castAll(gp);},
  lollipop(x,z,s=1){const y=topAt(x,z);const gp=new THREE.Group();gp.position.set(x,y,z);gp.rotation.y=rng()*6;world.add(gp);cyl(0,1.8*s,0,.1*s,3.6*s,0xffffff,gp);
    const cs=[[0xff4f9a,0xffffff],[0x5ec8ff,0xffffff],[0xffd166,0xff6b6b],[0x7ed957,0xffffff],[0xc77dff,0xffb3e6]][Math.floor(rng()*5)];
    const d=new THREE.Group();d.position.y=4.4*s;gp.add(d);put(G.cyl,cs[0],0,0,0,1.25*s,.3*s,1.25*s,d).rotation.x=Math.PI/2;
    for(let k=0;k<4;k++){const t=new THREE.Mesh(new THREE.TorusGeometry((.25+k*.27)*s,.07*s,6,24),mat(cs[1]));t.position.z=.16*s;d.add(t);const t2=t.clone();t2.position.z=-.16*s;d.add(t2);}
    if(rng()<.4)face(d,0,0,.2*s,s*.9);castAll(gp);S.push({t:'cyl',x,z,r:.4*s,top:y+60,bottom:y-2,tall:true});},
  candyCane(x,z,s=1){const y=topAt(x,z);const gp=new THREE.Group();gp.position.set(x,y,z);gp.rotation.y=rng()*6;world.add(gp);
    for(let k=0;k<10;k++)cyl(0,(k+.5)*.35*s,0,.18*s,.36*s,k%2?0xffffff:0xff3b5c,gp);
    for(let k=0;k<8;k++){const a=k/7*Math.PI;const q=sph(.55*s-Math.cos(a)*.55*s,3.5*s+Math.sin(a)*.55*s,0,.19*s,.19*s,.19*s,k%2?0xffffff:0xff3b5c,gp);}castAll(gp);S.push({t:'cyl',x,z,r:.35*s,top:y+60,bottom:y-2,tall:true});},
  cupcake(x,z,ry){const y=topAt(x,z);const gp=new THREE.Group();gp.position.set(x,y,z);gp.rotation.y=ry;world.add(gp);const lc=[0x8ecae6,0xffd166,0xc9a3ff,0x9be08a][Math.floor(rng()*4)];
    put(new THREE.CylinderGeometry(2.4,1.9,2.4,16),lc,0,1.2,0,1,1,1,gp);for(let k=0;k<16;k++){const a=k/16*6.283;const b=box(Math.sin(a)*2.17,1.2,Math.cos(a)*2.17,.12,2.4,.3,0xffffff,gp);b.rotation.y=a;b.rotation.x=Math.cos(a)*.18;b.rotation.z=-Math.sin(a)*.18;}
    const fc=[0xffb3d9,0xfff0f8,0xc98a5a][Math.floor(rng()*3)];sph(0,2.9,0,2.7,1.1,2.7,fc,gp);sph(0,3.8,0,1.9,.9,1.9,fc,gp);sph(0,4.5,0,1.1,.7,1.1,fc,gp);sph(0,5.4,0,.45,.45,.45,0xff2d55,gp);
    for(let k=0;k<26;k++){const a=rng()*6.283,e=rng();const b=box(Math.cos(a)*(2.3-e*1.4),3.2+e*1.4,Math.sin(a)*(2.3-e*1.4),.08,.08,.28,RAIN[k%6],gp);b.rotation.set(rng()*3,rng()*3,0);}
    box(0,.8,2.12,1,1.6,.1,0xb07945,gp);face(gp,0,1.9,2.25,1.1);castAll(gp);S.push({t:'cyl',x,z,r:2.6,top:y+3,bottom:y-2,deco:true});},
  donut(x,z,ry,s=1,through=false){const y=topAt(x,z);const gp=new THREE.Group();gp.position.set(x,through?y+.55*s-.1:y+1.65*s,z);gp.rotation.y=ry;world.add(gp);
    put(new THREE.TorusGeometry(1.1*s,.55*s,12,28),0xd9a05b,0,0,0,1,1,1,gp);const ic=[0xff8fc8,0x7a4428,0xfff0f8,0xc9a3ff][Math.floor(rng()*4)];const ir=put(new THREE.TorusGeometry(1.1*s,.5*s,10,28),ic,0,0,.14*s,1,1,.75,gp);
    for(let k=0;k<20;k++){const a=k/20*6.283,q=1.1*s+(rng()-.5)*.5*s;const b=box(Math.cos(a)*q,Math.sin(a)*q,.5*s,.06,.06,.22*s,RAIN[k%6],gp);b.rotation.set(0,0,rng()*3);}
    face(gp,0,1.12*s,.56*s,.8*s);castAll(gp);for(const sx of [-1,1])S.push({t:'cyl',x:x+Math.cos(ry)*1.1*s*sx,z:z-Math.sin(ry)*1.1*s*sx,r:.6*s,top:y+3*s,bottom:y-2,deco:true});if(!through)S.push({t:'cyl',x,z,r:.75*s,top:y+3*s,bottom:y-2,deco:true});},
  iceCream(x,z,s=1){const y=topAt(x,z);const gp=new THREE.Group();gp.position.set(x,y,z);world.add(gp);const c=cone(0,1.4*s,0,.9*s,2.8*s,0xe3a95a,gp);c.rotation.x=Math.PI;
    const sc=[0xff9ec7,0xfff0d0,0x7a4428,0x9ef0c8,0xc9a3ff];for(let k=0;k<3;k++)sph(0,(3.1+k*.95)*s,0,(.95-k*.12)*s,(.85-k*.1)*s,(.95-k*.12)*s,sc[Math.floor(rng()*5)],gp);sph(0,5.4*s,0,.25*s,.25*s,.25*s,0xff2d55,gp);
    if(rng()<.5)face(gp,0,3.2*s,.93*s,.9*s);castAll(gp);S.push({t:'cyl',x,z,r:.9*s,top:y+5*s,bottom:y-2,deco:true});},
  gummy(x,z,c){const y=topAt(x,z);const m=basic(c||[0xff4f6e,0x7ed957,0xffd166,0x5ec8ff,0xff9e3d][Math.floor(rng()*5)],{transparent:true,opacity:.85});const gp=new THREE.Group();gp.position.set(x,y,z);gp.rotation.y=rng()*6;world.add(gp);
    put(G.sph,m,0,.9,0,.65,.8,.55,gp);put(G.sph,m,0,1.95,0,.5,.45,.45,gp);for(const sx of [-1,1]){put(G.sph,m,sx*.38,2.32,0,.17,.17,.12,gp);put(G.sph,m,sx*.62,1.1,.15,.2,.35,.2,gp);put(G.sph,m,sx*.32,.3,.15,.24,.3,.26,gp);}
    face(gp,0,1.95,.42,.55);flies.push({g:gp,hop:true,y,ph:rng()*6});S.push({t:'cyl',x,z,r:.7,top:y+2.4,bottom:y-2,deco:true});},
  marshmallow(x,z){const gp=new THREE.Group();world.add(gp);const c=[0xffffff,0xffd6e8,0xd6f0ff][Math.floor(rng()*3)];put(G.cyl,c,0,.3,0,.6,.9,.6,gp);face(gp,0,.4,.61,.5);flies.push({g:gp,x,z,ph:rng()*6,r:3+rng()*4,swan:true});},
  ginger(x,z,ry){const y=topAt(x,z);const gp=new THREE.Group();gp.position.set(x,y,z);gp.rotation.y=ry;world.add(gp);box(0,1.5,0,4,3,3.4,0xb5763c,gp);
    const r=put(new THREE.CylinderGeometry(0,1,1,4,1),0xff9ec7,0,4,0,3.3,2.2,2.9,gp);r.rotation.y=Math.PI/4;for(let k=0;k<4;k++)box(0,3+k*.01,0,4.1+k*.0,.12,3.5,0xffffff,gp);
    box(0,1,1.72,1,2,.08,0xff4f9a,gp);for(const sx of [-1.3,1.3]){box(sx,1.9,1.72,.8,.8,.08,0xffe9a8,gp);box(sx,1.9,1.75,.85,.08,.04,0xffffff,gp);}
    for(let k=0;k<7;k++)sph(-1.8+k*.6,2.9,1.72,.13,.13,.08,RAIN[k%6],gp);castAll(gp);S.push({t:'cyl',x,z,r:2.6,top:y+3,bottom:y-2,deco:true});},
  toyBlock(x,z,s,c,ry=0){const y=topAt(x,z);const b=box(x,y+s/2,z,s,s,s,c);b.rotation.y=ry;castAll(b);for(const fz of [-1,1]){const st=new THREE.Mesh(starGeo,basic(0xffffff));st.scale.setScalar(s*.25);st.position.set(x+Math.sin(ry)*fz*s*.51,y+s*.5,z+Math.cos(ry)*fz*s*.51);st.rotation.y=ry;world.add(st);}
    S.push({t:'cyl',x,z,r:s*.62,top:y+s,bottom:y-2,deco:true});},
  beachBall(x,z,s=1.2){const y=topAt(x,z);const gp=new THREE.Group();gp.position.set(x,y+s,z);world.add(gp);
    [0xff5a5a,0xffffff,0x5ec8ff,0xffffff,0xffd166,0xffffff].forEach((c,i)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(s,16,12,i*Math.PI/3,Math.PI/3),mat(c));gp.add(m);});
    flies.push({g:gp,ball:true,x,y:y+s,z,ph:rng()*6,s});S.push({t:'cyl',x,z,r:s,top:y+2*s,bottom:y-2,deco:true});},
  duck(x,z){const gp=new THREE.Group();world.add(gp);sph(0,0,0,.55,.42,.7,0xffd93d,gp);sph(0,.62,.35,.38,.36,.36,0xffd93d,gp);const bk=sph(0,.55,.74,.16,.07,.2,0xff8a3d,gp);
    for(const sx of [-.15,.15])sph(sx,.72,.66,.06,.07,.04,0x2b1b3d,gp);sph(0,.25,-.62,.2,.25,.18,0xffd93d,gp);flies.push({g:gp,x,z,ph:rng()*6,r:3+rng()*5,swan:true});},
  teddy(x,z,ry,s=1.6){const y=topAt(x,z);const gp=new THREE.Group();gp.position.set(x,y,z);gp.rotation.y=ry;gp.scale.setScalar(s);world.add(gp);const B=0xb07945,L=0xe8c9a0;
    sph(0,.8,0,.75,.8,.65,B,gp);sph(0,.8,.35,.45,.5,.35,L,gp);sph(0,1.95,0,.55,.5,.5,B,gp);sph(0,1.85,.42,.22,.17,.15,L,gp);sph(0,1.92,.56,.07,.06,.05,0x2b1b3d,gp);
    for(const sx of [-1,1]){sph(sx*.42,2.35,0,.19,.19,.12,B,gp);sph(sx*.7,1.1,.2,.22,.42,.22,B,gp);sph(sx*.42,.2,.3,.26,.24,.4,B,gp);sph(sx*.18,2.05,.45,.05,.06,.04,0x2b1b3d,gp);}
    const bw=new THREE.Group();bw.position.set(0,1.5,.5);gp.add(bw);for(const sx of [-1,1])sph(sx*.14,0,0,.16,.1,.06,0xff4f9a,bw);castAll(gp);S.push({t:'cyl',x,z,r:1.1*s,top:y+2.5*s,bottom:y-2,deco:true});},
  top(x,z){const y=topAt(x,z);const gp=new THREE.Group();gp.position.set(x,y,z);world.add(gp);const c=[0xff5a5a,0x5ec8ff,0xc77dff][Math.floor(rng()*3)];
    const a=cone(0,.9,0,1,1.2,c,gp);a.rotation.x=Math.PI;cone(0,1.75,0,1,.5,0xffffff,gp);cyl(0,2.3,0,.08,.7,0xffd166,gp);flies.push({g:gp,spinTop:true,ph:rng()*6});castAll(gp);S.push({t:'cyl',x,z,r:1,top:y+2,bottom:y-2,deco:true});},
  train(cx,cz,R){const y=Math.max(0,topAt(cx+R,cz));const track=new THREE.Mesh(new THREE.TorusGeometry(R,.12,6,80),mat(0x8d6e63));track.rotation.x=Math.PI/2;track.position.set(cx,y+.06,cz);world.add(track);
    const t2=track.clone();t2.geometry=new THREE.TorusGeometry(R+1.1,.12,6,80);world.add(t2);
    const cars=[];const cs=[0xff5a5a,0x5ec8ff,0xffd166,0x7ed957,0xc77dff];for(let k=0;k<5;k++){const gp=new THREE.Group();world.add(gp);
      if(!k){box(0,.9,0,1.5,1.2,2.6,0xff5a5a,gp);box(0,1.9,-.6,1.5,.9,1.2,0x3a86ff,gp);cyl(0,1.9,.8,.28,.9,0x2b1b3d,gp);face(gp,0,1,1.32,.9);}
      else{box(0,.9,0,1.4,1.1,2.3,cs[k],gp);sph(0,1.6,0,.45,.45,.45,[0xffffff,0xff9ec7,0x9ef0ff,0xfff3b0][k%4],gp);}
      for(const sx of [-.8,.8])for(const sz of [-.7,.7]){const w=cyl(sx,.35,sz,.33,.15,0x2b1b3d,gp);w.rotation.z=Math.PI/2;}castAll(gp);cars.push(gp);}
    flies.push({train:true,cars,cx,cz,R:R+.55,y,ph:0});},
  boost(x,z,ry){const y=topAt(x,z);const g=new THREE.Group();g.position.set(x,y+.06,z);g.rotation.y=ry;world.add(g);
    for(let k=0;k<3;k++){const c=new THREE.Mesh(new THREE.ConeGeometry(.9,1,3),basic(RAIN[k*2],{transparent:true,opacity:.9}));c.rotation.x=Math.PI/2;c.scale.set(1,1,.05);c.position.z=-1+k*1;g.add(c);}
    boosts.push({x,z,g});}
};

/* ---------- world definitions ---------- */
const THEMES=[
  {name:'Livada akademije',sky:0xa8dcff,fog:[140,330],grass:0x7fd46a,path:0xf2d8a8,dirt:0xb07c5a,rock:0xb6a9c9,mount:0xc9b8ff,water:0x6cc5f0,plat:'cloud',leaf:[0xffb3d1,0xffc9de,0xffffff],
   msg:'Pronađi 3 mala jednoroga i dojaši do akademije!',spark:0xfff0f8},
  {name:'Dugina dolina',sky:0x9fd5ff,fog:[140,330],grass:0x74cc6e,path:0xf2d8a8,dirt:0xa8775a,rock:0xa38fb8,mount:0xb7c8ff,water:0x5ec0ee,plat:'rock',leaf:[0x8edb7a,0xa6e88f,0xffe066],
   msg:'Prijeđi rijeku preko duginih mostova!',spark:0xfffbe6},
  {name:'Oblačni otoci',sky:0xffd6ec,fog:[110,300],grass:0xb9f0c0,dirt:0xc6a3d8,rock:0xc9b3e6,mount:0xffffff,water:null,plat:'cloud',leaf:[0xffb3d1,0xffffff,0xffe066],
   msg:'Skači s otoka na otok preko duga!',spark:0xffffff},
  {name:'Šuma vila',sky:0x6b5aa6,fog:[70,220],grass:0x5f9e7a,path:0x9a8bc0,dirt:0x6b4f5a,rock:0x8a7aa6,mount:0x4a3f7a,water:0x3a5f9a,plat:'wood',leaf:[0x3f8f6a,0x4aa078,0x9ef0ff],
   msg:'Svjetleće cvijeće i krijesnice!',spark:0xbfe9ff,night:true},
  {name:'Snježna zemlja',sky:0xb9dcff,fog:[120,320],grass:0xeef5ff,path:0xc9dcf0,dirt:0xb8c6d8,rock:0xa9b8cc,mount:0xe6eeff,water:null,plat:'cloud',leaf:[0x2f6b55,0x3b7d63],
   msg:'Snijeg i led! Kliži po zaleđenom jezeru.',spark:0xffffff,snow:true},
  {name:'Sunčana plaža',sky:0x7fd0ff,fog:[140,340],grass:0x86cf68,path:0xf2dfae,dirt:0xd9b77a,rock:0xc9b08a,mount:0x9fc8e8,water:0x2fb4e0,plat:'wood',leaf:[0x3fae5a,0x56c46e],
   msg:'More, pijesak i školjke! Pronađi male jednoroge.',spark:0xfffbe6},
  {name:'Zvjezdana noć',sky:0x2a2468,fog:[80,250],grass:0x2c5460,path:0x6f74b8,dirt:0x3a3050,rock:0x6a6a9a,mount:0x2a2660,water:0x23448a,plat:'cloud',leaf:[0x2f6a78,0x3b7d8a,0x9ef0ff],
   msg:'Rog svijetli u mraku! Upali zvjezdane kamenčiće na stazi.',spark:0xd8d0ff,night:true,dark:true},
  {name:'Svijet Iskrice',sky:0x3a1f78,fog:[90,270],grass:0x7a62c8,path:0xa877c4,dirt:0x4a3070,rock:0x9a86d0,mount:0x4a2a8a,water:0x7a6af0,plat:'cloud',leaf:[0xff9ed2,0xd2a8ff,0x9ef0ff],
   msg:'Svijet Iskrice! Popni se po dugi do velikog srca i skupljaj srca!',spark:0xffd6f5,night:true,dark:true,sparkle:true,hearts:true,special:true},
  {name:'Svijet slatkiša',sky:0xffc9ea,fog:[130,320],grass:0x7fd9a2,path:0xffd59a,dirt:0xc98a5a,rock:0xffc2dc,mount:0xffa8d6,water:0x7a4428,plat:'cookie',leaf:[0xff8fc8,0xffd166,0x9ef0ff],
   msg:'Svijet slatkiša! Čokoladna rijeka, lizalice i krafne. Skupljaj bombone!',spark:0xfff0f8,candy:true,special:true},
  {name:'Svijet igračaka',sky:0x9ed8ff,fog:[140,330],grass:0x8fd86e,path:0xffe9b8,dirt:0xb07c5a,rock:0xb6a9c9,mount:0xa8c8ff,water:0x5ec0ee,plat:'block',leaf:[0x6fd06a,0x8fe07a,0xffe066],
   msg:'Svijet igračaka! Kocke, lopte, patkice i vlakić. Pronađi male jednoroge!',spark:0xfffbe6,toys:true,special:true}
];
const FOALC=[[0xffc2dc,[0xff6fa5,0xffffff]],[0xc4e6ff,[0x3a86ff,0x8ecae6]],[0xffe7a6,[0xffc93c,0xff9ec7]],[0xdcc8ff,[0x9d4edd,0xffffff]],[0xc8f2dd,[0x7ed957,0xffe066]]];

/* terrain worlds: height function + content */
function makeTerrainWorld(def){
  const path=smoothPath(def.path,!!def.loop,6);WD.path=path;WD.loop=!!def.loop;
  const R=def.R,cx=def.cx||0,cz=def.cz||0;
  WD.H=(x,z)=>{let h=def.base+(fbm(x*def.f,z*def.f)-.5)*2*def.amp;
    const dp=polyDist(x,z,path,!!def.loop);h=def.base+(h-def.base)*(.18+.82*ss(3,12,dp));
    for(const f of def.flats||[]){const d=Math.hypot(x-f[0],z-f[1]);const w=1-ss(f[2]*.6,f[2],d);h=h+(f[3]-h)*w;}
    if(def.river){const d=polyDist(x,z,def.river,false);h=h+(-1.6-h)*(1-ss(3,7,d));}
    if(def.extraH)h=def.extraH(x,z,h);
    const r=Math.hypot(x-cx,z-cz);if(r>R-14)h+=Math.min(9,Math.pow(r-(R-14),2)*.04)+Math.max(0,r-R-6)*.25;
    return h;};
  WD.R=R;WD.cx=cx;WD.cz=cz;
  const size=2*R+60,seg=LOWQ?150:200;
  const g=new THREE.PlaneGeometry(size,size,seg,seg);g.rotateX(-Math.PI/2);g.translate(cx,0,cz);
  const p=g.attributes.position,cols=new Float32Array(p.count*3),c=new THREE.Color(),G1=new THREE.Color(th.grass).multiplyScalar(GFXON&&!th.snow?.87:1),G2=new THREE.Color(th.grass).offsetHSL(.03,.04,.07).multiplyScalar(GFXON&&!th.snow?.89:1),PC=new THREE.Color(th.path),SA=new THREE.Color(0xf3e3b5),RK=new THREE.Color(th.rock);
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=WD.H(x,z);p.setY(i,h);
    c.copy(G1).lerp(G2,vnoise(x*.08,z*.08));const dp=polyDist(x,z,path,!!def.loop);if(th.path&&dp<2.6)c.lerp(PC,1-ss(1.8,2.6,dp));
    if(WD.waterY!==null&&h<WD.waterY+.35)c.lerp(SA,1-ss(WD.waterY-.2,WD.waterY+.35,h));
    if(def.paint)def.paint(x,z,h,c);
    const r=Math.hypot(x-cx,z-cz);if(r>R-4)c.lerp(G2,ss(R-4,R+8,r)*.6);
    cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;}
  g.setAttribute('color',new THREE.BufferAttribute(cols,3));g.computeVertexNormals();
  const tm=new THREE.MeshLambertMaterial({vertexColors:true});if(GFXON){const dt=detailTex();dt.repeat.set(size/7,size/7);tm.map=dt;}const mesh=new THREE.Mesh(g,tm);mesh.receiveShadow=true;world.add(mesh);
  if(WD.waterY!==null)world.add(waterPlane(th.water,WD.waterY,cx,cz,size));
}
function pathPoint(t){const P=WD.path,n=P.length-1;const f=Math.max(0,Math.min(.9999,t))*n,i=Math.floor(f),k=f-i;const a=P[i],b=P[Math.min(n,i+1)];return [a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,Math.atan2(b[0]-a[0],b[1]-a[1])];}
function freeSpot(minPath,tries=200){for(let i=0;i<tries;i++){const a=rng()*6.3,r=Math.sqrt(rng())*(WD.R-20),x=WD.cx+Math.cos(a)*r,z=WD.cz+Math.sin(a)*r;
    if(polyDist(x,z,WD.path,WD.loop)<minPath)continue;if(WD.waterY!==null&&WD.H(x,z)<WD.waterY+.2)continue;if(WD.noTree&&WD.noTree(x,z))continue;if(S.some(s=>(s.tall||s.deco)&&inside(s,x,z,2.5)))continue;
    if(castle&&Math.hypot(x-castle.x,z-castle.z)<10)continue;if(Math.hypot(x-start.x,z-start.z)<14)continue;return [x,z];}return null;}
function scatterTrees(n,kind,minPath=5){const list=[];for(let i=0;i<n;i++){const s=freeSpot(minPath,40);if(!s)continue;const y=WD.H(s[0],s[1]);
  list.push({x:s[0],y:y-.1,z:s[1],s:.8+rng()*.7,ry:rng()*6,c:th.leaf[Math.floor(rng()*2)]});S.push({t:'cyl',x:s[0],z:s[1],r:1.2,top:-999,bottom:-999,tall:true,tmp:true});}
  S=S.filter(s=>!s.tmp);plantTrees(list,kind);}
function gemsAlongPath(n){for(let i=0;i<n;i++){const t=.03+i/n*.92,p=pathPoint(t),side=(i%6<3?1:-1)*(i%3===1?1.8:0);
  const x=p[0]+Math.cos(p[2])*side,z=p[1]-Math.sin(p[2])*side;api.gem(x,topAt(x,z)+1.1,z);}}
function fillGems(target){let n=0;while(gems.length<target&&n<4000){n++;const s=freeSpot(6,5);if(!s)continue;
  const k=Math.min(5,target-gems.length);if(k>=4&&rng()<.7){api.ring(s[0],s[1],1.8,k);}else{api.gem(s[0],topAt(s[0],s[1])+1.1,s[1]);}}
  while(gems.length>target){const it=gems.pop();world.remove(it.m);}}
function placeBones(n=5){let tries=0;while(bones.length<n&&tries<600){tries++;let x,z,y;
    if(WD.H){const sp=freeSpot(9,30);if(!sp)continue;[x,z]=sp;y=topAt(x,z);if(Math.hypot(x-start.x,z-start.z)<25)continue;}
    else{const I=WD.isl[1+Math.floor(rng()*(WD.isl.length-1))];const a=rng()*6.3,d=(.35+rng()*.4)*I[2];x=I[0]+Math.cos(a)*d;z=I[1]+Math.sin(a)*d;y=I[3];if(WD.links.some(l=>segDist(x,z,l[0],l[1],l[2],l[3])<3))continue;}
    if(bones.some(b=>Math.hypot(b.x-x,b.z-z)<(WD.H?32:14)))continue;if(castle&&Math.hypot(x-castle.x,z-castle.z)<9)continue;api.bone(x,z,y);}}
function placeFoals(){for(let i=0;i<3;i++){const s=freeSpot(16)||freeSpot(8);if(!s)continue;const fc=FOALC[(i+levelIdx)%FOALC.length];api.foal(s[0],s[1],fc[0],fc[1]);}}

const LEVELS=[
  ()=>{ // Livada akademije
    WD.waterY=-.6;
    const def={R:128,base:0,amp:2.4,f:.035,path:[[0,-70],[-8,-48],[10,-25],[-6,0],[12,24],[-4,48],[2,66]],
      flats:[[0,-70,10,0],[2,72,14,0],[-38,10,13,-2.2],[40,-30,9,-2.2]]};
    makeTerrainWorld(def);start={x:0,z:-70,face:0};
    api.castle(2,74,Math.PI);
    api.spring(-60,-40);api.plat(-66,-34,8,8,6.5);api.ring(-66,-34,2,6);api.star(-63,9,-37,.8);api.spring(64,30);api.plat(70,36,8,8,6.5);api.ring(70,36,2,6);
    for(const [x,z] of [[-70,40],[70,-60],[-50,-80],[56,74]])api.ring(x,z,2.4,6);
    api.rainbow(-26,10,-50,10,0,3.2);
    api.spring(22,-8);api.plat(30,-8,8,8,6.5);api.ring(30,-8,2,6);api.star(26,8.2,-8,Math.PI/2);
    api.spring(-22,40);api.plat(-30,46,8,8,6.5);api.ring(-30,46,2,6);
    api.plat(-14,-30,5,5,1.6);api.plat(-19,-24,5,5,2.8);api.plat(-24,-18,5,5,4);api.ring(-24,-18,1.4,4);api.star(-21,5.8,-21,.8);
    gemsAlongPath(34);
    for(const t of [.18,.42,.66])api.star(...(()=>{const p=pathPoint(t);return [p[0],topAt(p[0],p[1])+2.6,p[1],p[2]];})());
    for(const t of [.3,.55,.8]){const p=pathPoint(t),nx=Math.cos(p[2]),nz=-Math.sin(p[2]);api.sweeper(p[0]-nx*9,p[1]-nz*9,p[0]+nx*9,p[1]+nz*9,4+t*3);}
    api.fence([[-30,-62],[-18,-56],[-12,-44]]);api.fence([[18,-60],[24,-46],[20,-34]]);
    for(const [x,z,r] of [[-30,-40,0],[28,40,2],[45,10,4]])api.cottage(x,z,r,[0xfff1d6,0xfde8e0,0xffe9f3][Math.floor(rng()*3)],0xff8fc8);
    for(let i=0;i<4;i++)api.swan(-38+Math.cos(i)*4,10+Math.sin(i)*4);api.swan(40,-30);
    scatterTrees(LOWQ?110:190,'round',6);
    for(let i=0;i<24;i++){const s=freeSpot(5,20);if(s)api.flowerPatch(s[0],s[1],LOWQ?40:70,5);}
    for(let i=0;i<10;i++){const s=freeSpot(5,20);if(s)api.rock(s[0],s[1],.8+rng()*1.2);}
    for(let i=0;i<40;i++){const s=freeSpot(3,20);if(s)api.butterfly(s[0],s[1]);}
    placeFoals();fillGems(100);
  },
  ()=>{ // Dugina dolina
    WD.waterY=-.6;
    const river=smoothPath([[-110,-20],[-60,-8],[-20,-24],[20,-6],[60,-26],[110,-10]],false,6);
    const def={R:128,base:0,amp:3,f:.03,path:[[0,-72],[12,-52],[-4,-38],[-10,-16],[8,10],[-12,34],[4,56],[0,70]],river,
      flats:[[0,-72,10,0],[0,74,14,0],[44,40,12,-2]]};
    makeTerrainWorld(def);start={x:0,z:-72,face:0};
    api.castle(0,76,Math.PI);
    api.spring(-64,20);api.plat(-70,26,8,8,6.5,'rock');api.ring(-70,26,2,6);api.spring(66,-60);api.plat(72,-54,8,8,6.5,'rock');api.ring(72,-54,2,6);
    for(const [x,z] of [[-72,-70],[70,50],[-60,80]])api.ring(x,z,2.4,6);
    api.rainbow(-8,-30,-11,-6,0,3.4);
    api.rainbow(44,-36,52,-10,0,3.4);api.star(48,5.2,-23,.3);
    api.plat(-38,-24,2.8,2.8,.4,'rock');api.plat(-38,-19,2.8,2.8,.8,'rock');api.plat(-38,-14,2.8,2.8,.4,'rock');
    api.spring(20,30);api.plat(26,36,8,8,6.5,'cloud');api.ring(26,36,2,6);api.star(23,9.5,33,.8);
    api.spring(-30,48);api.plat(-36,54,8,8,6.5,'cloud');api.ring(-36,54,2,6);
    gemsAlongPath(34);
    for(const t of [.15,.5,.78])api.star(...(()=>{const p=pathPoint(t);return [p[0],topAt(p[0],p[1])+2.6,p[1],p[2]];})());
    for(const t of [.25,.62,.88]){const p=pathPoint(t),nx=Math.cos(p[2]),nz=-Math.sin(p[2]);api.sweeper(p[0]-nx*9,p[1]-nz*9,p[0]+nx*9,p[1]+nz*9,4.5+t*3);}
    for(let i=0;i<6;i++){const p=river[Math.floor(rng()*river.length)];api.swan(p[0],p[1]);}
    for(const [x,z,r] of [[30,-50,1],[-34,20,3],[46,40,4.5]])api.cottage(x,z,r,0xfff1d6,0xff8a5c);
    scatterTrees(LOWQ?100:170,'round',6);scatterTrees(LOWQ?30:55,'pine',8);
    for(let i=0;i<24;i++){const s=freeSpot(5,20);if(s)api.flowerPatch(s[0],s[1],LOWQ?40:70,5);}
    for(let i=0;i<10;i++){const s=freeSpot(5,20);if(s)api.rock(s[0],s[1],.8+rng()*1.2);}
    for(let i=0;i<40;i++){const s=freeSpot(3,20);if(s)api.butterfly(s[0],s[1]);}
    placeFoals();fillGems(100);
  },
  ()=>{ // Oblačni otoci
    WD.waterY=null;WD.H=null;WD.R=135;WD.cx=0;WD.cz=0;
    const isl=[[0,-60,10,0],[22,-42,7,1],[-18,-32,8,.5],[4,-14,9,1.5],[30,-6,7,2.5],[-28,0,8,1],[-6,18,10,2],[24,26,8,3],[-26,34,7,2.5],[4,48,9,3.5],[-14,66,8,4],[16,70,7,4.5],[0,90,13,4],[-44,-14,8,.5],[50,12,8,3],[-42,70,8,4.5]];
    WD.path=smoothPath([[0,-60],[4,-14],[-6,18],[4,48],[0,90]],false,6);WD.loop=false;
    WD.isl=isl;for(const [x,z,r,t] of isl)api.island(x,z,r,t);
    WD.links=[];const link=(a,b)=>{const A=isl[a],B=isl[b];WD.links.push([A[0],A[1],B[0],B[1]]);const dx=B[0]-A[0],dz=B[1]-A[1],d=Math.hypot(dx,dz);const ux=dx/d,uz=dz/d;
      api.rainbow(A[0]+ux*(A[2]-1.6),A[1]+uz*(A[2]-1.6),B[0]-ux*(B[2]-1.6),B[1]-uz*(B[2]-1.6),A[3],1.8+d*.03,4.8,B[3]);};
    [[0,1],[0,2],[1,4],[2,3],[2,5],[3,6],[4,7],[5,8],[6,9],[7,9],[8,10],[9,11],[10,12],[11,12],[2,13],[5,13],[4,14],[7,14],[8,15],[10,15]].forEach(l=>link(...l));
    start={x:0,z:-60,face:0};api.castle(0,94,Math.PI);
    api.spring(-6,18);api.plat(-6,26,8,8,8,'cloud');api.ring(-6,26,2,6);api.star(-6,11,22,0);
    api.spring(24,26);api.plat(30,32,7,7,8,'cloud');api.ring(30,32,1.5,5);
    for(const [x,z,r,t] of isl){if(r>=8)api.ring(x,z,r*.55,6);}
    for(const [x,z,r,t] of isl){for(let k=0;k<Math.floor(r/4)+2;k++){const a=rng()*6.3,d=(.4+rng()*.4)*r;const px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;if(WD.links.some(l=>segDist(px,pz,l[0],l[1],l[2],l[3])<3.5)||Math.hypot(px,pz+60)<5)continue;
      const tl=[{x:px,y:t-.1,z:pz,s:.7+rng()*.4,ry:rng()*6,c:th.leaf[Math.floor(rng()*2)]}];plantTrees(tl,'round');}
      api.flowerPatch(x,z,LOWQ?25:45,r*.8);}
    for(const k of [6,9]){const I=isl[k];api.sweeper(I[0]-I[2]+3,I[1]-2,I[0]+I[2]-3,I[1]-2,3);}
    for(const [x,z,r,t] of isl.slice(1,11))if(rng()<.5)api.star(x,t+2.6,z,rng()*3);
    for(let i=0;i<16;i++){const I=isl[Math.floor(rng()*isl.length)];api.butterfly(I[0]+(rng()-.5)*I[2],I[1]+(rng()-.5)*I[2]);}
    const fi=[3,8,11];fi.forEach((k,i)=>{const I=isl[k];const fc=FOALC[(i+2)%FOALC.length];api.foal(I[0]+I[2]*.4,I[1],fc[0],fc[1]);});
    let n=0;while(gems.length<100&&n<3000){n++;const I=isl[Math.floor(rng()*isl.length)],a=rng()*6.3,d=Math.sqrt(rng())*(I[2]-1.2),x=I[0]+Math.cos(a)*d,z=I[1]+Math.sin(a)*d;
      if(gems.some(g=>Math.hypot(g.x-x,g.z-z)<1.8))continue;if(castle&&Math.hypot(x-castle.x,z-castle.z)<7)continue;api.gem(x,I[3]+1.1,z);}
  },
  ()=>{ // Šuma vila
    WD.waterY=-.6;
    const def={R:122,base:0,amp:2.2,f:.04,path:[[0,-66],[-12,-44],[6,-22],[-8,2],[10,26],[-6,48],[0,64]],flats:[[0,-66,10,0],[0,70,14,0],[30,-10,9,-2],[-34,30,8,-2]]};
    makeTerrainWorld(def);start={x:0,z:-66,face:0};api.castle(0,72,Math.PI);
    for(let i=0;i<20;i++){const p=pathPoint(i/20),nx=Math.cos(p[2]),nz=-Math.sin(p[2]),sd=i%2?1:-1;api.lantern(p[0]+nx*3.4*sd,p[1]+nz*3.4*sd);}
    api.spring(14,-34);api.plat(20,-28,8,8,6.5,'wood');api.ring(20,-28,2,6);api.star(17,9.5,-31,.8);
    api.spring(-22,18);api.plat(-28,24,8,8,6.5,'wood');api.ring(-28,24,2,6);
    gemsAlongPath(34);
    for(const t of [.2,.45,.75])api.star(...(()=>{const p=pathPoint(t);return [p[0],topAt(p[0],p[1])+2.6,p[1],p[2]];})());
    for(const t of [.3,.6,.85]){const p=pathPoint(t),nx=Math.cos(p[2]),nz=-Math.sin(p[2]);api.sweeper(p[0]-nx*9,p[1]-nz*9,p[0]+nx*9,p[1]+nz*9,4.5+t*3);}
    scatterTrees(LOWQ?140:250,'pine',5);scatterTrees(LOWQ?30:50,'round',6);
    for(let i=0;i<85;i++){const s=freeSpot(3,20);if(s)api.glowflower(s[0],s[1]);}
    for(let i=0;i<110;i++){const s=freeSpot(1,10);if(s)api.firefly(s[0],topAt(s[0],s[1])+1+rng()*4,s[1]);}
    for(let i=0;i<10;i++){const s=freeSpot(5,20);if(s)api.rock(s[0],s[1],.8+rng()*1.2);}
    placeFoals();fillGems(100);
  },
  ()=>{ // Snježna zemlja
    WD.waterY=null;
    const lake=[20,0,30];
    const def={R:128,base:0,amp:3.2,f:.03,path:[[0,-96],[-14,-70],[6,-46],[-12,-18],[-30,10],[-14,40],[8,66],[0,92]],flats:[[0,-96,10,0],[0,98,14,0],[lake[0],lake[1],lake[2],-.2]],
      paint:(x,z,h,c)=>{const d=Math.hypot(x-lake[0],z-lake[1]);if(d<lake[2]-3)c.lerp(new THREE.Color(0xbfe4ff),1-ss(lake[2]-9,lake[2]-3,d));}};
    makeTerrainWorld(def);start={x:0,z:-96,face:0};api.castle(0,100,Math.PI);
    WD.ice=lake;
    for(let i=0;i<6;i++){const a=i/6*6.283;api.snowman(lake[0]+Math.cos(a)*(lake[2]+3),lake[1]+Math.sin(a)*(lake[2]+3),-a-Math.PI/2);}
    for(const [x,z,r] of [[-50,-40,1],[-60,30,2.2],[60,-60,4],[50,64,3.6]])api.igloo(x,z,r);
    for(const [x,z] of [[-40,-70],[44,-34],[-56,60],[60,80],[-70,-10]])api.snowman(x,z,rng()*6);
    api.spring(-34,-40);api.plat(-40,-34,8,8,6.5,'cloud');api.ring(-40,-34,2,6);api.star(-37,9,-37,.8);
    api.spring(40,40);api.plat(46,46,8,8,6.5,'cloud');api.ring(46,46,2,6);
    api.ring(lake[0],lake[1],8,10);api.ring(lake[0],lake[1],16,14);for(const a of [0,2.1,4.2])api.star(lake[0]+Math.cos(a)*12,2.6,lake[1]+Math.sin(a)*12,a);
    gemsAlongPath(30);
    for(const t of [.2,.5,.8]){const p=pathPoint(t),nx=Math.cos(p[2]),nz=-Math.sin(p[2]);api.sweeper(p[0]-nx*9,p[1]-nz*9,p[0]+nx*9,p[1]+nz*9,4.5+t*3);}
    scatterTrees(LOWQ?130:230,'pine',6);
    for(let i=0;i<12;i++){const s=freeSpot(5,20);if(s)api.rock(s[0],s[1],.8+rng()*1.2,0xc9d6e6);}
    placeFoals();fillGems(100);
  },
  ()=>{ // Sunčana plaža
    WD.waterY=-.6;
    const shore=x=>18+Math.sin(x*.05)*6;
    const def={R:128,base:.2,amp:1.8,f:.03,path:[-96,-70,-40,-14,14,40,70,96].map((z,i)=>[shore(z)-15+(i%2?3:-3),z]),flats:[[shore(-96)-18,-96,10,.2],[shore(100)-16,100,14,.2]],
      extraH:(x,z,h)=>{const d=x-shore(z);return h-ss(-6,30,d)*5.5;},
      paint:(x,z,h,c)=>{const d=x-shore(z);c.lerp(new THREE.Color(0xf6e2b0),ss(-26,-12,d));}};
    makeTerrainWorld(def);WD.noTree=(x,z)=>x>shore(z)-26;start={x:WD.path[0][0],z:-96,face:0};api.castle(shore(104)-16,104,Math.PI);
    api.lighthouse(60,-30);
    for(let i=0;i<34;i++){const z=-110+i*6.5,x=shore(z)-8-rng()*12;if(polyDist(x,z,WD.path,false)>6)api.palm(x,z,.9+rng()*.4);}
    for(let i=0;i<10;i++){const z=-80+i*18,x=shore(z)-5-rng()*3;if(polyDist(x,z,WD.path,false)>4)api.umbrella(x,z,[0xff6fa5,0xffd166,0x4cc9f0,0xc77dff][i%4]);}
    for(let i=0;i<80;i++){const z=-115+rng()*230,x=shore(z)-2-rng()*14;if(rng()<.6)api.shell(x,z);else api.starfish(x,z);}
    for(const [x,z] of [[20,-60],[30,10],[24,60]]){api.pier(x-6,z,x+18,z);}
    api.plat(46,-60,6,6,1,'wood');api.plat(52,-54,6,6,2.2,'wood');api.ring(52,-54,2,5);api.star(40,2,10,Math.PI/2);api.star(44,2,60,Math.PI/2);
    for(let i=0;i<4;i++)api.boat(45+rng()*30,-80+rng()*160);
    for(let i=0;i<6;i++)api.swan(30+rng()*20,-90+rng()*180);
    api.spring(-80,-20);api.plat(-86,-14,8,8,6.5,'wood');api.ring(-86,-14,2,6);api.star(-83,9,-17,.8);
    gemsAlongPath(30);
    for(let i=0;i<18;i++){const z=-100+i*11,x=shore(z)-4;api.gem(x,topAt(x,z)+1.1,z);}
    for(const t of [.25,.55,.85]){const p=pathPoint(t),nx=Math.cos(p[2]),nz=-Math.sin(p[2]);api.sweeper(p[0]-nx*9,p[1]-nz*9,p[0]+nx*9,p[1]+nz*9,4.5+t*3);}
    scatterTrees(LOWQ?70:120,'round',6);
    for(let i=0;i<20;i++){const s=freeSpot(5,20);if(s&&s[0]<shore(s[1])-20)api.flowerPatch(s[0],s[1],LOWQ?40:60,5);}
    for(let i=0;i<30;i++){const s=freeSpot(3,20);if(s)api.butterfly(s[0],s[1]);}
    placeFoals();fillGems(100);
  },
  ()=>{ // Zvjezdana noć
    WD.waterY=-.6;WD.stones=[];
    const def={R:126,base:0,amp:2.6,f:.035,path:[[0,-92],[-16,-66],[4,-40],[18,-14],[0,12],[-20,38],[-6,64],[0,90]],
      flats:[[0,-92,10,0],[0,96,14,0],[40,30,15,-2.2],[-44,-30,10,-2.2]]};
    makeTerrainWorld(def);start={x:0,z:-92,face:0};api.castle(0,98,Math.PI);
    for(let i=0;i<46;i++){const p=pathPoint(.02+i/46*.94);api.stone(p[0],p[1]);}
    api.spring(-30,-56);api.plat(-36,-50,8,8,6.5);api.ring(-36,-50,2,6);api.star(-33,9,-53,.8);
    api.spring(34,-40);api.plat(40,-34,8,8,6.5);api.ring(40,-34,2,6);
    api.spring(-40,60);api.plat(-46,66,8,8,6.5);api.ring(-46,66,2,6);api.star(-43,9,63,.8);
    for(const [x,z] of [[-70,10],[70,-70],[60,74],[-60,-84]])api.ring(x,z,2.4,6);
    api.ring(40,30,6,10);for(let i=0;i<5;i++)api.swan(40+Math.cos(i)*7,30+Math.sin(i)*7);
    gemsAlongPath(30);
    for(const t of [.2,.48,.76])api.star(...(()=>{const p=pathPoint(t);return [p[0],topAt(p[0],p[1])+2.6,p[1],p[2]];})());
    for(const t of [.3,.58,.86]){const p=pathPoint(t),nx=Math.cos(p[2]),nz=-Math.sin(p[2]);api.sweeper(p[0]-nx*9,p[1]-nz*9,p[0]+nx*9,p[1]+nz*9,4.5+t*3);}
    scatterTrees(LOWQ?80:140,'round',6);scatterTrees(LOWQ?60:100,'pine',6);
    for(let i=0;i<(LOWQ?50:80);i++){const s=freeSpot(3,20);if(s)api.mushroom(s[0],s[1],.8+rng()*1.4);}
    for(let i=0;i<40;i++){const s=freeSpot(3,20);if(s)api.glowflower(s[0],s[1]);}
    for(let i=0;i<(LOWQ?100:160);i++){const s=freeSpot(1,10);if(s)api.firefly(s[0],topAt(s[0],s[1])+1+rng()*5,s[1]);}
    placeFoals();fillGems(100);
  },
  ()=>{ // Svijet Iskrice
    WD.waterY=-.6;WD.stones=[];WD.spin=[];
    const river=smoothPath([[-130,-26],[-70,-16],[-20,-30],[30,-18],[80,-30],[130,-22]],false,6);
    const def={R:126,base:0,amp:2.4,f:.035,river,path:[[0,-92],[-14,-68],[6,-46],[-2,-22],[-16,4],[2,30],[-8,58],[0,90]],
      flats:[[0,-92,10,0],[0,96,14,0],[42,40,15,-2.2],[-40,58,8,0]],
      paint:(x,z,h,c)=>{const v=vnoise(x*.05+3,z*.05);if(v>.72)c.lerp(new THREE.Color(0xff9ed8),(v-.72)*1.6);}};
    makeTerrainWorld(def);start={x:0,z:-92,face:0};api.castle(0,98,Math.PI);
    // little bridges where the path crosses the river, plus two more along it
    {let inW=false,ws=0;for(let t=0;t<=1;t+=.002){const p=pathPoint(t);const w=WD.H(p[0],p[1])<WD.waterY+.3;if(w&&!inW){inW=true;ws=t;}
      if(!w&&inW){inW=false;const a=pathPoint(Math.max(0,ws-.012)),b=pathPoint(Math.min(1,t+.012));api.mostic(a[0],a[1],b[0],b[1]);}}}
    for(const x of [-62,54]){let bz=0,bd=1e9;for(const q of river)if(Math.abs(q[0]-x)<bd){bd=Math.abs(q[0]-x);bz=q[1];}api.mostic(x,bz-9,x,bz+9);}
    // the big rainbow with the big heart, over the path
    {const p=pathPoint(.62);api.bigRainbowHeart(p[0],p[1],p[2]);}
    // a rainbow to climb up to the heart cloud
    {const top=12;api.rainbow(-22,40,-38,58,topAt(-22,40),3,3.6,top);api.plat(-40,62,11,11,top,'cloud');api.ring(-40,62,3.2,8);api.star(-40,top+3.2,62,.8);
      const hg=new THREE.Group();hg.position.set(-40,top+6.5,66);world.add(hg);const h=new THREE.Mesh(heartGeo,basic(0xff4f9a));h.scale.setScalar(2);hg.add(h);glow(hg,0,0,.2,12,0xff8fc8,true,.7);WD.spin.push({m:hg,s:.8,ph:0});}
    api.spring(30,-56);api.plat(36,-50,8,8,6.5);api.ring(36,-50,2,6);api.star(33,9,-53,.8);
    api.spring(-36,-50);api.plat(-42,-44,8,8,6.5);api.ring(-42,-44,2,6);
    for(const [x,z] of [[-72,0],[70,-72],[64,72],[-66,-84]])api.ring(x,z,2.4,6);
    api.ring(42,40,7,10);for(let i=0;i<6;i++)api.swan(42+Math.cos(i)*8,40+Math.sin(i)*8);
    for(let i=0;i<40;i++){const p=pathPoint(.02+i/40*.94);api.stone(p[0],p[1]);}
    for(let i=0;i<16;i++){const p=pathPoint(.04+i/16*.9),nx=Math.cos(p[2]),nz=-Math.sin(p[2]),sd=i%2?1:-1;api.heartLamp(p[0]+nx*3.6*sd,p[1]+nz*3.6*sd);}
    gemsAlongPath(30);
    for(const t of [.22,.45,.8])api.star(...(()=>{const p=pathPoint(t);return [p[0],topAt(p[0],p[1])+2.6,p[1],p[2]];})());
    for(const t of [.32,.7,.9]){const p=pathPoint(t),nx=Math.cos(p[2]),nz=-Math.sin(p[2]);api.sweeper(p[0]-nx*9,p[1]-nz*9,p[0]+nx*9,p[1]+nz*9,4.2+t*3);}
    scatterTrees(LOWQ?110:190,'round',6);
    for(let i=0;i<(LOWQ?14:24);i++){const s=freeSpot(6,20);if(s)api.crystal(s[0],s[1],.8+rng()*1);}
    for(let i=0;i<(LOWQ?40:70);i++){const s=freeSpot(3,20);if(s)api.mushroom(s[0],s[1],.8+rng()*1.3);}
    for(let i=0;i<50;i++){const s=freeSpot(3,20);if(s)api.glowflower(s[0],s[1]);}
    for(let i=0;i<20;i++){const s=freeSpot(5,20);if(s)api.flowerPatch(s[0],s[1],LOWQ?30:50,4);}
    for(let i=0;i<(LOWQ?45:80);i++){const s=freeSpot(2,10);if(s)api.floatHeart(s[0],topAt(s[0],s[1])+5.2+rng()*5,s[1]);}
    for(let i=0;i<(LOWQ?70:120);i++){const s=freeSpot(1,10);if(s)api.firefly(s[0],topAt(s[0],s[1])+1+rng()*5,s[1]);}
    for(let i=0;i<20;i++){const s=freeSpot(3,20);if(s)api.butterfly(s[0],s[1]);}
    placeFoals();fillGems(100);
  },
  ()=>{ // Svijet slatkiša
    WD.waterY=-.6;
    const river=smoothPath([[-130,10],[-70,22],[-20,6],[30,20],[80,4],[130,14]],false,6);
    const def={R:126,base:0,amp:2.2,f:.035,river,path:[[0,-92],[14,-66],[-6,-40],[10,-14],[-8,12],[8,38],[-6,64],[0,90]],
      flats:[[0,-92,10,0],[0,96,14,0],[-50,-40,12,0],[46,-50,12,0]],
      paint:(x,z,h,c)=>{const v=vnoise(x*.04+7,z*.04);if(v>.68)c.lerp(new THREE.Color(0xffc2e0),(v-.68)*2);}};
    makeTerrainWorld(def);start={x:0,z:-92,face:0};api.castle(0,98,Math.PI);
    {let inW=false,ws=0;for(let t=0;t<=1;t+=.002){const p=pathPoint(t);const w=WD.H(p[0],p[1])<WD.waterY+.3;if(w&&!inW){inW=true;ws=t;}
      if(!w&&inW){inW=false;const a=pathPoint(Math.max(0,ws-.012)),b=pathPoint(Math.min(1,t+.012));api.mostic(a[0],a[1],b[0],b[1],1.8,3.6,[0xf2c27a,0xe3a95a,0xffffff,0xff3b5c,0xff8fc8]);}}}
    for(const x of [-64,58]){let bz=0,bd=1e9;for(const q of river)if(Math.abs(q[0]-x)<bd){bd=Math.abs(q[0]-x);bz=q[1];}api.mostic(x,bz-9,x,bz+9,1.8,3.6,[0xf2c27a,0xe3a95a,0xffffff,0xff3b5c,0xff8fc8]);}
    for(let i=0;i<10;i++){const p=river[Math.floor(rng()*river.length)];if(Math.abs(p[0])<115)api.marshmallow(p[0],p[1]);}
    for(const t of [.2,.5,.78]){const p=pathPoint(t),nx=Math.cos(p[2]),nz=-Math.sin(p[2]);api.donut(p[0]+nx*7,p[1]+nz*7,p[2]+Math.PI/2,1.4);}
    {const p=pathPoint(.35);api.donut(p[0],p[1],p[2],3.6,true);}
    for(let i=0;i<22;i++){const p=pathPoint(.03+i/22*.92),nx=Math.cos(p[2]),nz=-Math.sin(p[2]),sd=i%2?1:-1;api.candyCane(p[0]+nx*4*sd,p[1]+nz*4*sd,.7);}
    for(const [x,z,r] of [[-50,-40,.8],[46,-50,-.6],[-36,50,2],[52,58,3.6],[-70,-74,.4]])api.cupcake(x,z,r);
    api.ginger(-30,-6,1.2);api.ginger(36,-20,-1.4);
    api.spring(24,-36);api.plat(30,-30,8,8,6.5,'cookie');api.ring(30,-30,2,6);api.star(27,9.5,-33,.8);
    api.spring(-24,30);api.plat(-30,36,8,8,6.5,'cookie');api.ring(-30,36,2,6);
    api.plat(-14,-62,5,5,1.6,'cookie');api.plat(-19,-56,5,5,2.8,'cookie');api.plat(-24,-50,5,5,4,'cookie');api.ring(-24,-50,1.4,4);
    for(const [x,z] of [[-72,40],[72,-70],[66,76],[-80,-10]])api.ring(x,z,2.4,6);
    gemsAlongPath(32);
    for(const t of [.15,.45,.7])api.star(...(()=>{const p=pathPoint(t);return [p[0],topAt(p[0],p[1])+2.6,p[1],p[2]];})());
    for(const t of [.28,.6,.88]){const p=pathPoint(t),nx=Math.cos(p[2]),nz=-Math.sin(p[2]);api.sweeper(p[0]-nx*9,p[1]-nz*9,p[0]+nx*9,p[1]+nz*9,4.3+t*3);}
    for(let i=0;i<(LOWQ?55:90);i++){const s=freeSpot(6,20);if(s)api.lollipop(s[0],s[1],.7+rng()*.7);}
    for(let i=0;i<(LOWQ?18:30);i++){const s=freeSpot(6,20);if(s)api.candyCane(s[0],s[1],.9+rng()*.6);}
    for(let i=0;i<(LOWQ?14:22);i++){const s=freeSpot(6,20);if(s)api.iceCream(s[0],s[1],.8+rng()*.6);}
    for(let i=0;i<(LOWQ?10:16);i++){const s=freeSpot(5,20);if(s)api.gummy(s[0],s[1]);}
    scatterTrees(LOWQ?40:70,'round',7);
    for(let i=0;i<24;i++){const s=freeSpot(5,20);if(s)api.flowerPatch(s[0],s[1],LOWQ?40:70,5);}
    for(let i=0;i<30;i++){const s=freeSpot(3,20);if(s)api.butterfly(s[0],s[1]);}
    placeFoals();fillGems(100);
  },
  ()=>{ // Svijet igračaka
    WD.waterY=-1.3;
    const def={R:126,base:0,amp:2,f:.035,path:[[0,-92],[-16,-64],[6,-38],[-10,-12],[12,14],[-6,40],[8,66],[0,90]],
      flats:[[0,-92,10,0],[0,96,14,0],[44,-6,15,-2.2],[-48,20,24,0],[-40,-60,12,0]]};
    makeTerrainWorld(def);start={x:0,z:-92,face:0};api.castle(0,98,Math.PI);
    WD.noTree=(x,z)=>Math.hypot(x+48,z-20)<23;api.train(-48,20,17);
    for(let i=0;i<8;i++)api.duck(44+Math.cos(i)*8,-6+Math.sin(i)*8);api.ring(44,-6,7,10);
    const BC=[0xff5a5a,0x5ec8ff,0xffd166,0x7ed957,0xc77dff,0xff9e3d];
    // block towers to climb
    for(const [x,z] of [[-40,-60],[34,40]]){for(let k=0;k<4;k++){const h=1.5+k*1.6;api.plat(x+k*2.2,z+k*2.2,4,4,h,'block');}api.ring(x+6.6,z+6.6,1.4,4);api.star(x+6.6,9.6,z+6.6,.8);}
    api.spring(20,-60);api.plat(26,-54,8,8,6.5,'block');api.ring(26,-54,2,6);
    api.spring(-24,60);api.plat(-30,66,8,8,6.5,'block');api.ring(-30,66,2,6);api.star(-27,9.5,63,.8);
    for(let i=0;i<14;i++){const p=pathPoint(.04+i/14*.9),nx=Math.cos(p[2]),nz=-Math.sin(p[2]),sd=i%2?1:-1;api.toyBlock(p[0]+nx*5*sd,p[1]+nz*5*sd,1.6,BC[i%6],p[2]);}
    for(let i=0;i<(LOWQ?20:34);i++){const s=freeSpot(6,20);if(!s)continue;const c=BC[i%6];api.toyBlock(s[0],s[1],2+rng()*1.5,c,rng()*3);}
    for(let i=0;i<(LOWQ?10:16);i++){const s=freeSpot(6,20);if(s)api.beachBall(s[0],s[1],1+rng()*.8);}
    for(let i=0;i<(LOWQ?6:9);i++){const s=freeSpot(8,20);if(s)api.teddy(s[0],s[1],rng()*6,1.4+rng()*.6);}
    for(let i=0;i<(LOWQ?8:12);i++){const s=freeSpot(6,20);if(s)api.top(s[0],s[1]);}
    api.rainbow(-12,-24,-12,0,0,3.6,3.6);
    gemsAlongPath(32);
    for(const t of [.2,.5,.78])api.star(...(()=>{const p=pathPoint(t);return [p[0],topAt(p[0],p[1])+2.6,p[1],p[2]];})());
    for(const t of [.3,.62,.86]){const p=pathPoint(t),nx=Math.cos(p[2]),nz=-Math.sin(p[2]);api.sweeper(p[0]-nx*9,p[1]-nz*9,p[0]+nx*9,p[1]+nz*9,4.5+t*3);}
    scatterTrees(LOWQ?60:100,'round',7);
    for(let i=0;i<20;i++){const s=freeSpot(5,20);if(s)api.flowerPatch(s[0],s[1],LOWQ?40:60,5);}
    for(let i=0;i<30;i++){const s=freeSpot(3,20);if(s)api.butterfly(s[0],s[1]);}
    placeFoals();fillGems(100);
  }
];

/* race tracks (an option from the stable) */
const RACES=[
  {name:'Livadska utrka',theme:0,pts:[[0,-108],[22,-92],[40,-66],[24,-40],[-8,-30],[-38,-14],[-50,14],[-30,40],[6,48],[38,58],[46,86],[18,104],[0,112]],
   river:[[-140,0],[-80,-8],[-40,4],[0,-6],[50,10],[140,0]],theme2:'meadow'},
  {name:'Dugina utrka',theme:1,pts:[[0,-108],[-26,-90],[-44,-60],[-20,-36],[18,-34],[46,-14],[40,16],[8,26],[-30,30],[-48,58],[-22,84],[16,92],[0,112]],
   river:[[-140,-48],[-60,-52],[0,-44],[60,-54],[140,-46]],river2:[[-140,64],[-60,70],[0,62],[60,72],[140,66]]},
  {name:'Šumska utrka',theme:3,pts:[[0,-108],[30,-96],[48,-70],[30,-44],[0,-46],[-30,-30],[-46,0],[-24,22],[12,14],[42,30],[44,62],[16,82],[-10,96],[0,112]],
   river:[[-140,40],[-70,46],[0,38],[70,48],[140,42]]},
  {name:'Kružna livada (2 kruga)',theme:0,laps:2,pts:[[0,-70],[40,-60],[66,-28],[62,14],[40,48],[4,62],[-36,54],[-62,24],[-66,-18],[-40,-56]],
   river:[[-140,-10],[-80,-4],[0,-12],[80,-2],[140,-8]]},
  {name:'Snježna utrka',theme:4,pts:[[0,-108],[-30,-92],[-46,-62],[-18,-40],[22,-44],[48,-20],[30,10],[-10,8],[-42,30],[-30,62],[8,70],[40,88],[0,112]]},
  {name:'Slatki krug (2 kruga)',theme:8,laps:2,pts:[[0,-80],[50,-70],[72,-30],[44,0],[72,36],[46,70],[0,80],[-46,70],[-72,36],[-44,0],[-72,-30],[-50,-70]]},
  {name:'Utrka uz more',theme:5,pts:[[0,-108],[26,-86],[18,-56],[-14,-40],[-34,-10],[-20,22],[14,30],[34,58],[14,86],[0,112]],
   river:[[-140,-70],[-70,-74],[0,-66],[70,-76],[140,-68]]},
  {name:'Zvjezdani krug (2 kruga)',theme:6,laps:2,pts:[[0,-75],[55,-55],[75,0],[55,55],[0,75],[-55,55],[-75,0],[-55,-55]],
   river:[[-140,10],[-70,4],[0,14],[70,6],[140,12]]}
];
const raceOpen=i=>i===0||i>=3||save.maxWorld>=i*1+(i===2?1:0);
const RIVALS=[{n:'Munja',body:0xc4e6ff,mane:[0x3a86ff,0xcfd8e3],skill:.9,lane:-3.2},{n:'Ljubica',body:0xdcc8ff,mane:[0x9d4edd,0xc77dff],skill:.95,lane:1},{n:'Zlatica',body:0xffe7a6,mane:[0xffc93c,0xff9ec7],skill:.99,lane:-1.1}];
function buildRace(ri){
  const R=RACES[ri];WD.waterY=-.6;
  const rivs=[R.river,R.river2].filter(Boolean).map(r=>smoothPath(r,false,6));
  const LAPS=R.laps||1;const def={R:132,base:0,amp:3.2,f:.028,path:R.pts,loop:LAPS>1,flats:LAPS>1?[[R.pts[0][0],R.pts[0][1],12,0],[0,116,16,0]]:[[0,-108,12,0],[0,116,16,0]]};
  if(rivs.length){def.river=rivs[0];}
  makeTerrainWorld(def);
  if(LAPS>1){const lp=WD.path;let full=[];for(let k=0;k<LAPS;k++)full=full.concat(lp);full.push(lp[0]);WD.path=full;WD.loop=false;}
  WD.laps=LAPS;
  if(rivs[1]){const H0=WD.H;WD.H=(x,z)=>{const h=H0(x,z);const d=polyDist(x,z,rivs[1],false);return h+(-1.6-h)*(1-ss(3,7,d));};
    // rebuild terrain mesh heights for the second river
    world.children.forEach(m=>{if(m.isMesh&&m.geometry.type==='PlaneGeometry'&&m.material.vertexColors){const p=m.geometry.attributes.position,c=m.geometry.attributes.color;
      for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=WD.H(x,z);p.setY(i,h);if(h<WD.waterY+.35){const k=1-ss(WD.waterY-.2,WD.waterY+.35,h);c.setXYZ(i,c.getX(i)+(0.95-c.getX(i))*k,c.getY(i)+(0.89-c.getY(i))*k,c.getZ(i)+(0.71-c.getZ(i))*k);}}
      p.needsUpdate=true;c.needsUpdate=true;m.geometry.computeVertexNormals();}});}
  const P=WD.path,L=[0];for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];L.push(L[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
  WD.trackLen=L[L.length-1];WD.cum=L;
  const at=s=>{s=Math.max(0,Math.min(WD.trackLen-.01,s));let i=0;while(i<P.length-2&&L[i+1]<s)i++;const a=P[i],b=P[i+1],seg=L[i+1]-L[i],k=seg?(s-L[i])/seg:0;
    return {x:a[0]+(b[0]-a[0])*k,z:a[1]+(b[1]-a[1])*k,ry:Math.atan2(b[0]-a[0],b[1]-a[1])};};
  WD.at=at;const TL=WD.trackLen;const LL=TL/LAPS;WD.lapLen=LL;
  // rainbow bridges where the track crosses water
  WD.bridges=[];let inW=false,ws=0;
  for(let s=0;s<=LL;s+=1){const p=at(s);const w=WD.H(p.x,p.z)<WD.waterY+.15;
    if(w&&!inW){inW=true;ws=s;}if(!w&&inW){inW=false;const a=at(Math.max(0,ws-4)),b=at(Math.min(TL,s+4));api.rainbow(a.x,a.z,b.x,b.z,0,2.6,7);WD.bridges.push([ws-4,s+4]);}}
  // gates: the last one is the finish line
  if(LAPS>1){const nG=5;for(let i=1;i<=nG;i++){const sg=i===nG?LL-8:LL*i/(nG+.4);const p=at(sg);api.arch(p.x,p.z,p.ry,i-1);arches[arches.length-1].s=sg;}
    const first=arches.slice();for(let k=1;k<LAPS;k++)first.forEach(a=>arches.push(Object.assign({},a,{s:a.s+LL*k,dup:true})));WD.gpl=first.length;}
  else{const nG=7;for(let i=1;i<=nG;i++){const sg=i===nG?TL-8:TL*i/(nG+.6);const p=at(sg);api.arch(p.x,p.z,p.ry,i-1);arches[arches.length-1].s=sg;}}
  const fin=arches[arches.length-1];fin.g.scale.setScalar(1.25);
  {const p=at(TL-8);const bnr=new THREE.Group();bnr.position.set(p.x,topAt(p.x,p.z)+7.2,p.z);bnr.rotation.y=p.ry;world.add(bnr);
    for(let k=0;k<12;k++)box(-3.3+k*.6,0,0,.6,1,.12,k%2?0xffffff:0x4a2c6b,bnr);for(let k=0;k<12;k++)box(-3.3+k*.6,-1,0,.6,1,.12,k%2?0x4a2c6b:0xffffff,bnr);}
  // boosts, hurdles, crossing clouds, gems along the way
  const occupied=s=>WD.bridges.some(b=>s>b[0]-6&&s<b[1]+6)||arches.some(a=>Math.abs(a.s-s)<8);
  WD.hurdles=[];
  const feat=[];for(let s=30;s<LL-30;s+=LL/(LAPS>1?12:18))feat.push(s);
  feat.forEach((s,i)=>{if(occupied(s))return;const p=at(s),nx=Math.cos(p.ry),nz=-Math.sin(p.ry);
    const kind=['boost','hurdle','cloud','boost','hurdle','gems'][i%6];
    if(kind==='boost')api.boost(p.x,p.z,p.ry);
    else if(kind==='hurdle'){const y=topAt(p.x,p.z);WD.hurdles.push(s);
      for(let k=-4;k<=4;k++){const x=p.x+nx*k*1,z=p.z+nz*k*1;const yy=topAt(x,z);S.push({t:'cyl',x,z,r:.55,top:yy+1,bottom:yy-1});
        sph(x,yy+.55,z,.6,.55,.6,0x5fbf6a);sph(x,yy+.95,z,.13,.13,.13,[0xff6fa5,0xffe066,0xffffff][(k+4)%3]);}}
    else if(kind==='cloud')api.sweeper(p.x-nx*8,p.z-nz*8,p.x+nx*8,p.z+nz*8,4.5);
    else for(let k=0;k<6;k++){const q=at(s+k*1.6),x=q.x+Math.cos(q.ry)*Math.sin(k)*1.5,z=q.z-Math.sin(q.ry)*Math.sin(k)*1.5;api.gem(x,topAt(x,z)+1.2,z);}});
  for(let s=20;s<LL-20;s+=9){const p=at(s),x=p.x+Math.cos(p.ry)*(s%18<9?2:-2),z=p.z-Math.sin(p.ry)*(s%18<9?2:-2);if(!gems.some(g=>Math.hypot(g.x-x,g.z-z)<4))api.gem(x,topAt(x,z)+1.2,z);}
  WD.s0=LAPS>1?16:0;const s0=at(WD.s0);start={x:s0.x,z:s0.z,face:s0.ry};
  api.castle(0,124,Math.PI);
  // track edges and scenery
  const NIGHT=!!THEMES[R.theme].night,PINE=R.theme===3||R.theme===4;
  for(let s=4;s<LL;s+=6){const p=at(s),nx=Math.cos(p.ry),nz=-Math.sin(p.ry);if(WD.bridges.some(b=>s>b[0]&&s<b[1]))continue;for(const sd of [-1,1]){
    const x=p.x+nx*9*sd,z=p.z+nz*9*sd;if(NIGHT){if(s%12<6)api.lantern(x,z);}else if(R.theme===8){if(s%18<6)api.lollipop(x,z,.6);}else if(R.theme===4){if(s%18<6)api.snowman&&s%36<6?api.snowman(x,z,p.ry):0;}else if(s%12<6)api.flowerPatch(x,z,8,1);}}
  raceFence(LL);
  scatterTrees(LOWQ?90:150,PINE?'pine':'round',13);
  if(PINE)scatterTrees(LOWQ?20:30,R.theme===4?'pine':'round',9);else scatterTrees(LOWQ?15:25,'pine',9);
  if(R.theme===8)for(let i=0;i<(LOWQ?30:50);i++){const q=freeSpot(6,20);if(q)api.lollipop(q[0],q[1],.7+rng()*.6);}
  if(!NIGHT&&R.theme!==4)for(let i=0;i<16;i++){const s=freeSpot(7,20);if(s)api.flowerPatch(s[0],s[1],LOWQ?40:60,5);}
  else for(let i=0;i<60;i++){const s=freeSpot(3,10);if(s)api.firefly(s[0],topAt(s[0],s[1])+1+rng()*4,s[1]);}
  for(let i=0;i<24;i++){const s=freeSpot(4,20);if(s)api.butterfly(s[0],s[1]);}
  for(let i=0;i<6;i++){const s=freeSpot(12,30);if(s)api.cottage(s[0],s[1],rng()*6,0xfff1d6,0xff8fc8);}
  for(const rv of rivs)for(let i=0;i<4;i++){const p=rv[Math.floor(rng()*rv.length)];if(Math.abs(p[0])<110)api.swan(p[0],p[1]);}
  // cheering unicorns at the start and at the finish
  const cheer=(s,n)=>{const p=at(s);for(let i=0;i<n;i++){const nx=Math.cos(p.ry),nz=-Math.sin(p.ry),sd=i%2?1:-1,x=p.x+nx*(9+(i>>1)*2.5)*sd+Math.sin(p.ry)*((i>>1)-1)*3,z=p.z+nz*(9+(i>>1)*2.5)*sd+Math.cos(p.ry)*((i>>1)-1)*3;
    const fc=FOALC[i%FOALC.length];const rg=makeRig(fc[0],fc[1],{},.3);rg.wrap.position.set(x,topAt(x,z),z);rg.wrap.rotation.y=Math.atan2(p.x-x,p.z-z);world.add(rg.wrap);flies.push({rig:rg,spect:true});}};
  cheer(WD.s0+2,4);if(LAPS<2)cheer(TL-10,6);
}

function gardenDeco(){if(!glamOn()||!WD.H||!th||th.snow||levelIdx===2)return;const r=mulberry(700+levelIdx*13);
  const bodies=[],balls=[],cyp=[];const nB=PERF<1?18:LOWQ?30:46;
  const FL=th.night?[0x7a8cff,0xc08cff,0xff8fd0]:[0x6f8cff,0x8fa8ff,0xff8fc8,0xd99cff,0xffb3d9,0xffffff];
  for(let i=0;i<nB;i++){const s=freeSpot(4.5,30);if(!s)continue;const y=topAt(s[0],s[1]),k=.9+r()*.7;bodies.push([s[0],y+.7*k,s[1],1.5*k,1.05*k,1.4*k,new THREE.Color(th.night?0x2f5a44:0x3f8a48).offsetHSL((r()-.5)*.03,0,(r()-.5)*.06)]);
    const fc=FL[Math.floor(r()*FL.length)];for(let j=0;j<12;j++){const a=j/12*Math.PI*2*2.3+r(),e=.1+r()*.95;balls.push([s[0]+Math.cos(a)*Math.cos(e)*1.3*k,y+.7*k+Math.sin(e)*1.0*k,s[1]+Math.sin(a)*Math.cos(e)*1.25*k,.5*k,new THREE.Color(fc).offsetHSL(0,0,(r()-.5)*.08)]);}}
  const nC=PERF<1?6:12;for(let i=0;i<nC;i++){const s=freeSpot(6,30);if(!s)continue;const y=topAt(s[0],s[1]),h=4+r()*3;cyp.push([s[0],y+h*.5,s[1],h]);}
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),V=new THREE.Vector3(),Sv=new THREE.Vector3();const wm=()=>new THREE.MeshToonMaterial({color:0xffffff,gradientMap:TOON});
  if(bodies.length){const im=new THREE.InstancedMesh(new THREE.SphereGeometry(1,14,10),wm(),bodies.length);bodies.forEach((b,i)=>{m4.compose(V.set(b[0],b[1],b[2]),q.identity(),Sv.set(b[3],b[4],b[5]));im.setMatrixAt(i,m4);im.setColorAt(i,b[6]);});im.castShadow=true;im.receiveShadow=true;world.add(im);}
  if(balls.length){const im=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),wm(),balls.length);balls.forEach((b,i)=>{m4.compose(V.set(b[0],b[1],b[2]),q.setFromEuler(new THREE.Euler(i,i*2,0)),Sv.setScalar(b[3]));im.setMatrixAt(i,m4);im.setColorAt(i,b[4]);});world.add(im);}
  if(cyp.length){const im=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,12),wm(),cyp.length);const c=new THREE.Color(0x2f6b3a);cyp.forEach((b,i)=>{m4.compose(V.set(b[0],b[1],b[2]),q.identity(),Sv.set(1.1,b[3]*.55,1.1));im.setMatrixAt(i,m4);im.setColorAt(i,c);});im.castShadow=true;world.add(im);}}
function scenery(){
  fxTune(th.night?(th.sparkle?.28:th.dark?.45:.35):0,th.night?(th.sparkle?.99:th.dark?.95:.965):.985,th.night?.3:.25);
  const sd=skyDome(th.sky);world.add(sd.mesh);scene.background=sd.horizon;scene.fog=new THREE.Fog(levelIdx===2?new THREE.Color(0xffe3f1):sd.horizon,th.fog[0],th.fog[1]);if(todNow()==='jutro'){scene.fog.near=th.fog[0]*.55;scene.fog.far=th.fog[1]*.8;scene.fog.color.set(0xfde8e4);}else if(todNow()==='zalazak')scene.fog.color.set(0xf7b9a6);
  rimL.intensity=GFXON?(th.night?.18:.26):0;hemi.intensity=th.sparkle?.62:th.dark?.3:th.night?.55:.75;sun.intensity=th.sparkle?.45:th.dark?.3:th.night?.4:.7;sun.color.setHex(th.sparkle?0xffc8f0:th.dark?0xb8c4ff:0xffffff);WD.shoot=null;
  {const td=todNow();const sp=SUNSPOT().normalize();if(td==='dan')SUNOFF.set(30,60,-22);else SUNOFF.copy(sp).multiplyScalar(70);
    hemi.color.setHex(0xffffff);hemi.groundColor.setHex(0xb48ad8);
    if(th.snow&&td==='dan'){hemi.intensity=.58;sun.intensity=.62;hemi.groundColor.setHex(0x8f9ad8);}
    if(td==='zalazak'){sun.color.setHex(0xffa66b);sun.intensity=.85;hemi.intensity=.55;hemi.color.setHex(0xffd2c0);hemi.groundColor.setHex(0x7a5aa8);rimL.color.setHex(0xff9ec8);rimL.intensity=.45;}
    else if(td==='jutro'){sun.color.setHex(0xffe2c4);sun.intensity=.92;hemi.intensity=.8;hemi.color.setHex(0xfff0ea);hemi.groundColor.setHex(0xa898d8);}
}
  if(levelIdx===2){const c=put(new THREE.PlaneGeometry(900,900),basic(0xffffff,{fog:true}),0,-14,40,1,1,1);c.rotation.x=-Math.PI/2;
    const r=mulberry(5);for(let i=0;i<50;i++)sph(-120+r()*240,-12,-80+r()*240,5+r()*6,1.8+r()*1.5,5+r()*6,0xffffff);}
  const r=mulberry(9);
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2,d=250+r()*40,h=26+r()*30;const m=put(G.cone,th.mount,Math.cos(a)*d,h/2-8,(WD.cz||0)+Math.sin(a)*d,45+r()*25,h,45+r()*25);m.material=basic(th.mount,{fog:false});if(!th.night)put(G.cone,basic(0xffffff,{fog:false}),Math.cos(a)*d,h-8-h*.12,(WD.cz||0)+Math.sin(a)*d,(45)*.3,h*.25,45*.3);}
  if(GFXON&&levelIdx!==2&&WD.H){const hm=new THREE.MeshLambertMaterial({color:new THREE.Color(th.grass).offsetHSL(.01,-.05,th.night?-.05:-.08)});const hm2=new THREE.MeshLambertMaterial({color:new THREE.Color(th.grass).offsetHSL(.02,-.08,th.night?-.02:-.02)});
    for(let i=0;i<34;i++){const a=i/34*Math.PI*2+r()*.1,d=(WD.R||128)+38+r()*40,s=24+r()*22;put(G.sph,i%2?hm:hm2,(WD.cx||0)+Math.cos(a)*d,-4-r()*4,(WD.cz||0)+Math.sin(a)*d,s*1.6,s*.45,s);}}
  const cm=basic(0xffffff,{fog:false});
  if(!th.night)for(let i=0;i<14;i++){const a=r()*Math.PI*2,d=130+r()*90,x=Math.cos(a)*d,z=Math.sin(a)*d,y=50+r()*20;
    {const cc=th.candy?[0xffc2e0,0xd6e8ff,0xfff0f8][i%3]:0xffffff;if(GFXON){if(!WD.clouds){WD.clouds=new THREE.Group();world.add(WD.clouds);}const cg=new THREE.Group();cg.position.set(x,y,z);cg.lookAt(0,y,0);WD.clouds.add(cg);const m=new THREE.MeshToonMaterial({color:cc,gradientMap:TOON,emissive:new THREE.Color(cc).multiplyScalar(.55),fog:false});
      for(const [ox,oy,oz,s] of [[0,1.5,0,8],[7,0,1,6.5],[-7,-.2,1,6.2],[3.5,3.6,-1,5.5],[-3.5,3,0,5.2],[11,-1.5,0,4.2],[-11,-1.6,0,4]])put(G.sph,m,ox,oy,oz,s,s*.72,s*.75,cg);}
    else for(const [ox,oy,s] of [[0,0,8],[7,2,6],[-7,.5,6]])put(G.sph,th.candy?basic(cc,{fog:false}):cm,x+ox,y+oy,z,s,s*.55,s*.8);}}
  if(th.night){const NS=th.sparkle?1500:th.dark?700:200,sp=new Float32Array(NS*3);for(let i=0;i<NS;i++){const a=r()*Math.PI*2,e=.08+r()*1.4,d=420;sp[i*3]=Math.cos(a)*Math.cos(e)*d;sp[i*3+1]=Math.sin(e)*d;sp[i*3+2]=Math.sin(a)*Math.cos(e)*d;}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));const stars=new THREE.Points(sg,new THREE.PointsMaterial({map:glowTex,color:0xffffff,size:th.dark?16:11,sizeAttenuation:true,transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));stars.frustumCulled=false;world.add(stars);
    if(th.dark){put(G.sph,basic(0xfff8dc,{fog:false}),-40,110,320,15,15,15);glow(world,-40,110,318,120,0xc8c0ff,false,.7);
      const sps=[];for(let i=0;i<8;i++){const q=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:i?0xd8e4ff:0xffffff,transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));q.visible=false;world.add(q);sps.push(q);}WD.shoot={sps,t:-2};}
    if(!th.dark){put(G.sph,basic(0xfff6d0,{fog:false}),-90,140,300,14,14,14);glow(world,-90,140,299,90,0xd8d0ff,false,.7);}
    if(th.sparkle){const N2=600,p2=new Float32Array(N2*3);for(let i=0;i<N2;i++){const a=r()*Math.PI*2,e=.05+r()*1.3,d=400;p2[i*3]=Math.cos(a)*Math.cos(e)*d;p2[i*3+1]=Math.sin(e)*d;p2[i*3+2]=Math.sin(a)*Math.cos(e)*d;}
      const g2=new THREE.BufferGeometry();g2.setAttribute('position',new THREE.BufferAttribute(p2,3));const s2=new THREE.Points(g2,new THREE.PointsMaterial({map:glowTex,color:0xffa8e0,size:20,sizeAttenuation:true,transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));s2.frustumCulled=false;world.add(s2);
      const rb=new THREE.Group();rb.position.set(-40,-8,-330);world.add(rb);RAIN.forEach((c,i)=>{const t=new THREE.Mesh(new THREE.TorusGeometry(110-i*4,2.6,6,48,Math.PI),basic(c,{fog:false,transparent:true,opacity:.55}));rb.add(t);});
      for(let i=0;i<14;i++){const a=r()*6.283,d=200+r()*80;const h=new THREE.Mesh(heartGeo,basic(0xff8fc8,{fog:false,transparent:true,opacity:.6}));h.scale.setScalar(4+r()*5);h.position.set(Math.cos(a)*d,60+r()*90,Math.sin(a)*d);h.lookAt(0,h.position.y,0);world.add(h);}}}
  else{const sp=SUNSPOT(),td=todNow();put(G.sph,basic(td==='zalazak'?0xffa060:td==='jutro'?0xfff0c8:0xffe066,{fog:false}),sp.x,sp.y,sp.z,td==='dan'?13:17,td==='dan'?13:17,td==='dan'?13:17);glow(world,sp.x,sp.y-1,sp.z-1,td==='dan'?90:150,td==='zalazak'?0xffb070:0xfff2b0,false);
    const rb=new THREE.Group();rb.position.set(60,-8,330);world.add(rb);RAIN.forEach((c,i)=>{const t=new THREE.Mesh(new THREE.TorusGeometry(100-i*4,2.2,6,48,Math.PI),basic(c,{fog:false,transparent:true,opacity:.5}));rb.add(t);});}
}

/* ---------- little animals: bunnies, birds, ducks ---------- */
function makeBunny(c){const g=new THREE.Group(),b=new THREE.Group();g.add(b);sph(0,.32,0,.3,.26,.36,c,b);sph(0,.58,.28,.2,.19,.2,c,b);
  for(const sx of [-1,1]){const e=sph(sx*.08,.88,.24,.055,.2,.04,c,b);e.rotation.z=sx*.18;sph(sx*.08,.88,.27,.03,.14,.02,0xffb3c6,b);sph(sx*.09,.62,.45,.035,.04,.02,0x2b1b3d,b);sph(sx*.14,.52,.4,.04,.025,.02,0xffb3c6,b);}
  sph(0,.56,.47,.03,.025,.025,0xff8fab,b);sph(0,.38,-.36,.1,.1,.1,0xffffff,b);for(const sx of [-1,1])sph(sx*.14,.08,.12,.07,.06,.12,c,b);castAll(g);addOutline(g);return {g,b};}
function makeBird(c){const g=new THREE.Group();sph(0,0,0,.14,.12,.26,c,g);sph(0,.06,.2,.1,.1,.1,c,g);const bk=cone(0,.05,.33,.035,.1,0xffb347,g);bk.rotation.x=Math.PI/2;
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.12,0,0,-.12,.5,0,-.05],3));wg.computeVertexNormals();const wm=new THREE.MeshLambertMaterial({color:new THREE.Color(c).offsetHSL(0,0,.08),side:THREE.DoubleSide});
  const l=new THREE.Mesh(wg,wm),r=new THREE.Mesh(wg,wm);r.scale.x=-1;g.add(l);g.add(r);return {g,l,r};}
function makeDuck(s,c){const g=new THREE.Group();sph(0,.12,0,.3,.22,.42,c,g);sph(0,.42,.26,.17,.17,.17,c,g);const bk=sph(0,.38,.44,.1,.04,.1,0xff9f43,g);sph(.07,.47,.38,.03,.03,.02,0x2b1b3d,g);sph(-.07,.47,.38,.03,.03,.02,0x2b1b3d,g);
  const tl=cone(0,.24,-.42,.1,.2,c,g);tl.rotation.x=-1.1;g.scale.setScalar(s);castAll(g);return g;}
function spawnCritters(){WD.crit=[];if(!GFXON||!th||th.night||!WD.H)return;const C=WD.crit;
  const nb=th.snow?4:7;for(let i=0;i<nb;i++){const sp=freeSpot(5,30);if(!sp)continue;const k=makeBunny(th.snow?0xffffff:[0xffffff,0xe8d5c4,0xd9c2b0][i%3]);k.g.position.set(sp[0],topAt(sp[0],sp[1]),sp[1]);world.add(k.g);
    C.push({t:'bunny',k,x:sp[0],z:sp[1],hx:sp[0],hz:sp[1],tx:sp[0],tz:sp[1],h:0,wait:rng()*2,ry:rng()*6});}
  for(let f=0;f<2;f++){const cx=WD.cx+(rng()-.5)*120,cz=WD.cz+(rng()-.5)*120,col=[0x7ec8e3,0xff9fb2,0xffd166][f%3];for(let i=0;i<5;i++){const b=makeBird(col);world.add(b.g);C.push({t:'bird',b,cx,cz,r:18+f*6,y:16+f*4,off:i,ph:rng()*6});}}
  if(WD.waterY!==null){let n=0;for(let tries=0;tries<300&&n<3;tries++){const x=WD.cx+(rng()-.5)*2*(WD.R-20),z=WD.cz+(rng()-.5)*2*(WD.R-20);if(WD.H(x,z)>WD.waterY-.5)continue;
      if([[2,0],[-2,0],[0,2],[0,-2]].some(([a,b])=>WD.H(x+a,z+b)>WD.waterY-.25))continue;const fam=[];for(let i=0;i<4;i++){const d=makeDuck(i?.45:.85,i?0xffe066:0xffffff);world.add(d);fam.push(d);}
      C.push({t:'duck',fam,x,z,ph:rng()*6,r:1.2+rng()*.8});n++;}}}
function updateCritters(dt){if(!WD||!WD.crit)return;for(const c of WD.crit){
  if(c.t==='bunny'){const d=Math.hypot(P.x-c.x,P.z-c.z);if(c.h<=0){c.wait-=dt;if(d<6&&c.wait>.15)c.wait=.1;
      if(c.wait<=0){let a;if(d<7){a=Math.atan2(c.x-P.x,c.z-P.z)+(Math.random()-.5)*.6;}else{a=Math.atan2(c.hx-c.x,c.hz-c.z)+(Math.random()-.5)*2.4;if(Math.hypot(c.hx-c.x,c.hz-c.z)<4)a=Math.random()*6.28;}
        const L=d<7?1.6:.9;c.tx=c.x+Math.sin(a)*L;c.tz=c.z+Math.cos(a)*L;c.sx=c.x;c.sz=c.z;c.ry=a;c.h=1;c.hd=d<7?.32:.42;c.wait=d<7?.05:.4+Math.random()*1.8;}}
    else{c.h-=dt/c.hd;const k=1-Math.max(0,c.h);c.x=c.sx+(c.tx-c.sx)*k;c.z=c.sz+(c.tz-c.sz)*k;if(c.h<=0)c.h=0;}
    const y=topAt(c.x,c.z);c.k.g.position.set(c.x,y+Math.sin(Math.min(1,1-c.h)*Math.PI)*(c.h>0?.45:0),c.z);c.k.g.rotation.y+=(((c.ry-c.k.g.rotation.y+Math.PI*3)%(Math.PI*2))-Math.PI)*Math.min(1,dt*10);
    c.k.b.scale.set(1,c.h>0?1.08:1+Math.sin(time*3+c.hx)*.02,1);}
  else if(c.t==='bird'){const a=time*.35+c.ph*.0+c.off*.18,r=c.r+(c.off%2?1.2:-1.2)*Math.ceil(c.off/2)*.6;const x=c.cx+Math.cos(a)*r,z=c.cz+Math.sin(a)*r,y=c.y+Math.sin(time*1.3+c.off)*.6+c.off*.15;
    c.b.g.position.set(x,y,z);c.b.g.rotation.y=-a;const f=Math.sin(time*14+c.off*1.7)*.8;c.b.l.rotation.z=f;c.b.r.rotation.z=-f;}
  else if(c.t==='duck'){c.fam.forEach((d,i)=>{const a=time*.25+c.ph-i*.32,x=c.x+Math.cos(a)*c.r,z=c.z+Math.sin(a)*c.r;d.position.set(x,WD.waterY-.05+Math.sin(time*2.4+i)*.03,z);d.rotation.y=-a;d.rotation.z=Math.sin(time*2+i)*.06;});}}}
function finishWorld(){
  try{gardenDeco();}catch(e){console.warn(e);}
  world.traverse(o=>{if(o.isMesh&&!(o.material&&o.material.isMeshBasicMaterial))o.receiveShadow=true;});
  const R=WD.R||100,cx=WD.cx||0,cz=WD.cz||0;
  const gTop=(x,z)=>{let b=null;if(WD.H){const h=WD.H(x,z);if(WD.waterY!==null&&h<WD.waterY+.1)return null;if(WD.noTree&&WD.noTree(x+3,z))return null;if(Math.hypot(x-cx,z-cz)>R-8)return null;
      if(th.path&&polyDist(x,z,WD.path,WD.loop)<2.4)return null;b=h;}
    for(const s of S){if(s.one||s.tall||s.deco||s.spring||s.mover)continue;if(inside(s,x,z,-.4)&&(b===null||s.top>b))b=s.top;}
    if(b===null)return null;for(const s of S){if((s.deco||s.spring)&&inside(s,x,z,.3))return null;}return b;};
  world.add(grassField(LOWQ?8000:22000,th.grass,{x0:cx-R,x1:cx+R,z0:cz-R,z1:cz+R},gTop));
  lushInit(gTop,th.grass);spawnCritters();
}

/* ---------- actors ---------- */
let rig=null,rebuildRigSoon=false;let leona=makeLeona(lookOpts());const zara=makeZara();scene.add(leona);scene.add(zara);castAll(leona);castAll(zara);addOutline(leona);addOutline(zara);
function blob(){const m=new THREE.Mesh(G.circ,basic(0x4a2c6b,{transparent:true,opacity:.1,depthWrite:false}));m.rotation.x=-Math.PI/2;scene.add(m);return m;}
let uShadow=blob();const dShadow=blob();
function makeArrow(col){const a=new THREE.Group();scene.add(a);const c=new THREE.Mesh(G.cone,basic(col,{transparent:true,opacity:.9}));c.scale.set(.5,1,.16);c.rotation.x=Math.PI/2;c.position.z=2.6;a.add(c);a.visible=false;return a;}
let arrow=makeArrow(0xffd166);
const hornLight=new THREE.PointLight(0xffe6c0,0,20,1.6);scene.add(hornLight);
const hornGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xfff3c4,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));hornGlow.visible=false;scene.add(hornGlow);
const _hv=new THREE.Vector3();
function updateHorn(rg){const on=!!(th&&th.night&&mode==='ride');hornGlow.visible=on;hornLight.intensity=on?(th.sparkle?.35:th.dark?1.2:.8):0;if(!on||!rg.horn)return;
  rg.horn.localToWorld(_hv.set(0,.9,0));hornLight.position.copy(_hv);hornLight.position.y+=.6;hornGlow.position.copy(_hv);const k=.9+Math.sin(time*5)*.15;hornGlow.scale.set(k,k,k);}
function rebuildRig(){if(rig){rig.wrap.parent&&rig.wrap.parent.remove(rig.wrap);}rig=makeRig(BODY[save.body].c,MANE[save.mane].c,save.wear);scene.add(rig.wrap);if(mode==='ride')mountLeona();}
function mountLeona(){rig.seat.add(leona);leona.position.set(0,-.62/SC,-.1/SC);leona.rotation.set(0,0,0);leona.scale.setScalar(.95/SC);}
function dismountLeona(){scene.add(leona);leona.scale.setScalar(1);}

/* ---------- sound ---------- */
let ac=null,muted=false;
function audioInit(){try{if(!ac)ac=new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}catch(e){}}
function tone(f1,f2,dur,type,vol,delay=0){if(!ac||muted)return;const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();
  o.type=type;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g).connect(ac.destination);o.start(t);o.stop(t+dur+.03);}
const SFX={
  jump:()=>tone(330,700,.15,'triangle',.06),magic:()=>[880,1175,1568].forEach((f,i)=>tone(f,f*1.02,.12,'sine',.07,i*.05)),
  gem:()=>{tone(1320,1320,.07,'triangle',.08);tone(1760,1760,.12,'triangle',.08,.06);},
  ring:()=>[784,988,1175,1568,1976].forEach((f,i)=>tone(f,f,.14,'sine',.08,i*.06)),
  boing:()=>tone(180,900,.32,'sine',.13),bonk:()=>tone(260,170,.18,'triangle',.08),oops:()=>tone(700,250,.4,'sine',.08),
  neigh:()=>{for(let i=0;i<5;i++)tone(900-i*60,860-i*60,.07,'triangle',.06,i*.06);},
  crunch:()=>{for(let i=0;i<3;i++)tone(200,120,.06,'square',.03,i*.12);},
  brush:()=>tone(1500,2600,.25,'sine',.04),
  heart:()=>[659,784,988].forEach((f,i)=>tone(f,f,.16,'sine',.08,i*.08)),
  win:()=>[523,659,784,1047,1319].forEach((f,i)=>tone(f,f,.22,'triangle',.1,i*.12)),
  click:()=>tone(660,880,.06,'triangle',.05)};
const sfx=n=>{try{SFX[n]();}catch(e){}};

/* ---------- Croatian voice: reads the on-screen texts aloud ---------- */
const VOICE_KEY='leonin-jednorog-glas';let voiceOn=true;try{voiceOn=localStorage.getItem(VOICE_KEY)!=='0';}catch(e){}
const TTS=window.speechSynthesis||null;let hrVoice=null,voiceWarned=false;
function pickVoice(){if(!TTS)return;const vs=TTS.getVoices();if(!vs.length)return;
  const sc=v=>{const l=(v.lang||'').toLowerCase().replace('_','-'),n=v.name.toLowerCase();let s=0;
    if(l.startsWith('hr'))s=100;else if(l.startsWith('bs'))s=60;else if(l.startsWith('sr')&&(l.includes('latn')||n.includes('latin')))s=50;else return 0;
    if(n.includes('natural'))s+=20;if(n.includes('online'))s+=8;if(n.includes('google'))s+=10;if(/gabrijela|lana|female|žensk/.test(n))s+=5;return s;};
  let best=null,bs=0;for(const v of vs){const k=sc(v);if(k>bs){bs=k;best=v;}}hrVoice=best;}
if(TTS){pickVoice();try{TTS.addEventListener('voiceschanged',pickVoice);}catch(e){TTS.onvoiceschanged=pickVoice;}}
function speakText(t){return t.replace(/[\u{1F300}-\u{1FAFF}☀-➿️♥]/gu,'').replace(/(\d+)\s*\/\s*(\d+)/g,'$1 od $2').replace(/\+(\d+)/g,'plus $1').replace(/\bA:\s*/g,'Pritisni A, ').replace(/·/g,',').replace(/\s+/g,' ').trim();}
let lastSaid='',lastSaidT=0;
function say(t,interrupt){if(!voiceOn||!TTS||muted)return;t=speakText(String(t||''));if(!t)return;const now=performance.now();if(t===lastSaid&&now-lastSaidT<5000)return;lastSaid=t;lastSaidT=now;
  if(!hrVoice&&!voiceWarned){pickVoice();if(!hrVoice&&TTS.getVoices().length){voiceWarned=true;setTimeout(()=>toast('Nema hrvatskog glasa u ovom pregledniku. Otvori igru u Edgeu.'),300);}}
  try{const u=new SpeechSynthesisUtterance(t);u.lang=hrVoice?hrVoice.lang:'hr-HR';if(hrVoice)try{u.voice=hrVoice;}catch(e){}u.rate=.95;u.pitch=1.12;u.volume=1;
    clearTimeout(say.t);if(interrupt&&(TTS.speaking||TTS.pending)){TTS.cancel();say.t=setTimeout(()=>{try{TTS.resume();TTS.speak(u);}catch(e){}},120);}else{TTS.resume();TTS.speak(u);}}catch(e){}}
function sayLabel(el){const t=el.getAttribute('aria-label')||el.textContent;say(t,true);}
function toggleVoice(){voiceOn=!voiceOn;try{localStorage.setItem(VOICE_KEY,voiceOn?'1':'0');}catch(e){}if(!voiceOn&&TTS)TTS.cancel();updVoiceBtns();if(voiceOn)say('Glas je uključen.',true);}
function updVoiceBtns(){document.querySelectorAll('.voiceBtn').forEach(b=>{b.textContent=voiceOn?'🔊':'🔇';b.setAttribute('aria-label',voiceOn?'Glas uključen':'Glas isključen');});}
document.querySelectorAll('.voiceBtn').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();audioInit();toggleVoice();}));updVoiceBtns();
/* read out messages whenever their text changes */
for(const id of ['stMsg','feedMsg','brushMsg','decMsg','wMsg','resTitle','resMsg','toast','pickTitle']){const el=$(id);if(!el)continue;
  new MutationObserver(()=>{const t=el.textContent;if(t&&el.offsetParent!==null||id==='toast')say(t,id==='toast'||id==='resTitle');}).observe(el,{childList:true,characterData:true,subtree:true});}
/* mouse: read button labels on hover */
let hoverT=null;document.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const b=e.target.closest&&e.target.closest('.btn');if(!b||b.classList.contains('voiceBtn'))return;clearTimeout(hoverT);hoverT=setTimeout(()=>sayLabel(b),250);});
document.addEventListener('pointerout',e=>{if(e.pointerType==='mouse')clearTimeout(hoverT);});
SFX.whinny=()=>{for(let i=0;i<6;i++)tone(1000-i*70,950-i*70,.07,'triangle',.06,i*.055);};
SFX.found=()=>[523,784,1047,1319].forEach((f,i)=>tone(f,f,.16,'sine',.09,i*.08));
SFX.boost=()=>tone(300,1400,.4,'sawtooth',.05);
SFX.beep=()=>tone(660,660,.15,'square',.06);SFX.go=()=>tone(990,990,.35,'square',.07);
SFX.splash=()=>{tone(700,90,.3,'sine',.07);};
SFX.bark=()=>{tone(720,380,.08,'square',.045);tone(680,340,.1,'square',.045,.13);};
const barkBubble=(()=>{const c=document.createElement('canvas');c.width=128;c.height=64;const g=c.getContext('2d');g.fillStyle='#fff';g.strokeStyle='#4a2c6b';g.lineWidth=5;
  g.beginPath();g.roundRect?g.roundRect(6,6,116,44,20):g.rect(6,6,116,44);g.fill();g.stroke();g.beginPath();g.moveTo(40,48);g.lineTo(34,62);g.lineTo(56,48);g.fill();
  g.fillStyle='#4a2c6b';g.font='800 30px "Baloo 2",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('Vau!',64,29);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false}));sp.scale.set(2.2,1.1,1);sp.position.set(.3,1.9,0);sp.renderOrder=5;sp.visible=false;zara.add(sp);return sp;})();
const carryBone=(()=>{const b=new THREE.Group();const c=cyl(0,0,0,.05,.42,0xfff6e6,b);c.rotation.z=Math.PI/2;for(const [sx,sz] of [[-.22,-.05],[-.22,.05],[.22,-.05],[.22,.05]])sph(sx,0,sz,.07,.07,.07,0xfff6e6,b);
  b.position.set(0,-.1,.3);b.visible=false;zara.userData.head.add(b);return b;})();

/* ---------- input ---------- */
const keys={};
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Enter','NumpadEnter','ShiftRight','Numpad0'].includes(e.code)&&(mode==='ride'||mode==='fly'))e.preventDefault();
  keys[e.code]=true;audioInit();if(e.code==='KeyM')muted=!muted;if(e.code==='KeyV')toggleVoice();});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
const touch={x:0,y:0,j:false};
const joy=$('joy'),knob=$('knob');let joyId=null;
function joyMove(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2;let dx=(e.clientX-cx)/R,dy=(e.clientY-cy)/R;const d=Math.hypot(dx,dy);if(d>1){dx/=d;dy/=d;}
  touch.x=dx;touch.y=-dy;knob.style.transform=`translate(${dx*R*.6}px,${dy*R*.6}px)`;}
joy.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();joyId=e.pointerId;try{joy.setPointerCapture(e.pointerId);}catch(_){}joyMove(e);});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e);});
const joyEnd=e=>{if(e.pointerId!==joyId)return;joyId=null;touch.x=touch.y=0;knob.style.transform='';};
['pointerup','pointercancel','lostpointercapture'].forEach(ev=>joy.addEventListener(ev,joyEnd));
const bA=$('btnA');
bA.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();touch.j=true;bA.classList.add('on');try{bA.setPointerCapture(e.pointerId);}catch(_){}});
['pointerup','pointercancel','lostpointercapture'].forEach(ev=>bA.addEventListener(ev,()=>{touch.j=false;bA.classList.remove('on');}));
bA.addEventListener('contextmenu',e=>e.preventDefault());
let prev={j:false,a:false,ph:false,l:false,r:false,u:false,d:false,b:false},padOn=false,usedPad=false;
function readInput(){
  let ix=0,iy=0;
  if(keys.ArrowLeft||keys.KeyA)ix-=1;if(keys.ArrowRight||keys.KeyD)ix+=1;if(keys.ArrowUp||keys.KeyW)iy+=1;if(keys.ArrowDown||keys.KeyS)iy-=1;
  ix+=touch.x;iy+=touch.y;
  let j=!!(keys.Space||touch.j),a=!!(keys.Enter||keys.Space),b=!!keys.Escape,ph=!!keys.KeyP;
  let pads=[];try{pads=navigator.getGamepads?navigator.getGamepads():[];}catch(e){}
  padOn=false;
  for(const gp of pads){if(!gp)continue;padOn=true;const bt=i=>!!(gp.buttons[i]&&gp.buttons[i].pressed),ax=i=>{const v=gp.axes[i]||0;return Math.abs(v)<.3?0:Math.sign(v)*(Math.abs(v)-.3)/.7;};
    ix+=ax(0);iy-=ax(1);if(bt(14))ix-=1;if(bt(15))ix+=1;if(bt(12))iy+=1;if(bt(13))iy-=1;
    if(bt(7)&&iy<.5)iy=Math.max(iy,gp.buttons[7].value||1);
    if(bt(0)||bt(2)||bt(3))j=true;if(bt(0)||bt(9))a=true;if(bt(1))b=true;if(bt(4)||bt(5))ph=true;
    if(gp.buttons.some(x=>x&&x.pressed))usedPad=true;}
  const m=Math.hypot(ix,iy);if(m>1){ix/=m;iy/=m;}
  const cur={j,a,b,ph,l:ix<-.55,r:ix>.55,u:iy>.55,d:iy<-.55};
  const e={};for(const k in cur)e[k]=cur[k]&&!prev[k];prev=cur;
  if(e.j||e.a)audioInit();
  return{ix,iy,j,jp:e.j,ap:e.a,bp:e.b,php:e.ph,nav:{l:e.l,r:e.r,u:e.u,d:e.d}};
}

/* ---------- menus & focus ---------- */
let mode='loading',focusEl=null;
function focusables(){return [...document.querySelectorAll('.screen.on .btn:not([disabled])')].filter(e=>e.offsetParent!==null&&!e.closest('.touch'));}
function setFocus(el){document.querySelectorAll('.btn.focus').forEach(e=>e.classList.remove('focus'));focusEl=el;if(el&&(usedPad||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight)){el.classList.add('focus');sayLabel(el);}}
function nav(dx,dy){const list=focusables();if(!list.length)return;if(!focusEl||!list.includes(focusEl)){setFocus(list[0]);return;}
  const r=focusEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let best=null,bs=1e9;
  for(const e of list){if(e===focusEl)continue;const q=e.getBoundingClientRect(),x=q.left+q.width/2-cx,y=q.top+q.height/2-cy;
    const pr=dx?x*dx:y*dy;if(pr<=4)continue;const sc=pr+(dx?Math.abs(y):Math.abs(x))*2.2;if(sc<bs){bs=sc;best=e;}}
  if(best){setFocus(best);sfx('click');}}
function showScreen(id){viewShift=['sCreate','sDecor','sWorlds','sDuo','sDress'].includes(id);applyView();
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id));focusEl=null;
  requestAnimationFrame(()=>{const l=focusables();const pref=l.find(e=>(e.classList.contains('go')||e.classList.contains('gold'))&&!e.disabled)||l[0];setFocus(pref);});}
function banner(t,s,h,show=true,up=false){if(show&&(t||s))say([t,s,h].filter(Boolean).join('. '),true);$('banner').classList.toggle('up',up);$('bnT').textContent=t;$('bnS').textContent=s;$('bnH').textContent=h||'';$('bnH').hidden=!h;$('banner').style.opacity=show?1:0;}

/* create */
function buildCreate(){
  const mk=(row,items,cls,get,set,label)=>{const el=$(row);el.innerHTML='';items.forEach((it,i)=>{const b=document.createElement('button');b.type='button';b.className='btn '+cls;
    if(cls==='sw'){b.style.background=label(it);b.setAttribute('aria-label',it.n);}else b.textContent=it;
    b.classList.toggle('sel',get()===i);b.onclick=()=>{set(i);sfx('click');[...el.children].forEach((x,k)=>x.classList.toggle('sel',k===i));rebuildRig();placeStableActors();if(row==='rowName')sfx('whinny');};el.appendChild(b);});};
  const hex=c=>'#'+c.toString(16).padStart(6,'0');
  mk('rowBody',BODY,'sw',()=>save.body,i=>save.body=i,it=>hex(it.c));
  mk('rowMane',MANE,'sw',()=>save.mane,i=>save.mane=i,it=>it.c.length>2?`conic-gradient(${it.c.map(hex).join(',')},${hex(it.c[0])})`:`linear-gradient(135deg,${hex(it.c[0])} 50%,${hex(it.c[1])} 50%)`);
  mk('rowName',NAMES,'namebtn',()=>save.name,i=>save.name=i);
}
$('bCreateDone').onclick=()=>{save.made=true;store();sfx('whinny');enterStable();};

/* stable */
let anim=null,trophyGroup=null;

let _plankT=null;function plankTex(){if(_plankT)return _plankT;const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,256,256);const r=mulberry(4);
  for(let i=0;i<8;i++){const v=236+Math.floor(r()*19);x.fillStyle=`rgb(${v},${v-2},${v-4})`;x.fillRect(i*32,0,32,256);x.fillStyle='rgba(120,80,90,.28)';x.fillRect(i*32,0,2,256);
    for(let k=0;k<6;k++){x.strokeStyle='rgba(150,110,110,.12)';x.lineWidth=1;x.beginPath();const ox=i*32+6+r()*20;x.moveTo(ox,0);x.bezierCurveTo(ox+4,90,ox-4,170,ox+2,256);x.stroke();}
    x.fillStyle='rgba(120,80,90,.35)';x.beginPath();x.arc(i*32+16,20+r()*10,1.6,0,6.3);x.fill();x.beginPath();x.arc(i*32+16,236-r()*10,1.6,0,6.3);x.fill();}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return _plankT=t;}
let STB=null;
function prettyStable(){if(!GFXON){STB=null;return;}const pt=plankTex();
  const wallM=(c,rx,ry)=>{const t=pt.clone();t.needsUpdate=true;t.repeat.set(rx,ry);return new THREE.MeshLambertMaterial({color:c,map:t});};
  world.traverse(o=>{if(!o.isMesh||o.geometry!==G.box)return;const sx=o.scale.x,sy=o.scale.y,sz=o.scale.z;
    if(sy>8&&sx>20)o.material=wallM(0xffd6e8,5,1);else if(sy>8&&sz>13)o.material=wallM(0xffe3ef,3.5,1);else if(sx>20&&sz>15&&sy<.3){const t=pt.clone();t.needsUpdate=true;t.repeat.set(6,3);t.rotation=Math.PI/2;o.material=new THREE.MeshLambertMaterial({color:0xdcb28c,map:t});}});
  // window with a sunbeam
  const wg=new THREE.Group();wg.position.set(-5.5,4.7,-6.82);world.children.forEach(o=>{if(o.geometry===heartGeo&&o.position.x<0&&Math.abs(o.position.z+6.82)<.05)o.visible=false;});world.add(wg);box(0,0,0,2.6,2.2,.12,0x8a5a3c,wg);box(0,0,.05,2.2,1.8,.05,0xcdeeff,wg);box(0,0,.1,.12,1.9,.06,0x8a5a3c,wg);box(0,0,.1,2.3,.12,.06,0x8a5a3c,wg);box(0,-1.2,.2,2.9,.18,.5,0x8a5a3c,wg);
  for(let i=0;i<3;i++){const f=new THREE.Group();f.position.set(-.8+i*.8,-1.05,.25);wg.add(f);sph(0,.12,0,.18,.15,.18,[0xff6fa5,0xffd166,0xc77dff][i],f);cyl(0,-.05,0,.14,.22,0xe07a5f,f);}
  glow(wg,0,0,.3,4,0xfff4cf,false,.5);
  const beamM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{uT:windU},
    vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform float uT;varying vec2 vU;void main(){float e=smoothstep(0.,.25,vU.x)*smoothstep(1.,.75,vU.x);float l=mix(.1,1.,vU.y);float fl=.85+.15*sin(uT*.7+vU.x*6.);gl_FragColor=vec4(vec3(1.,.93,.75)*e*l*fl*.32,1.);}'});
  const bg=new THREE.CylinderGeometry(1.15,2.2,9,4,1,true);bg.rotateY(Math.PI/4);const beam=new THREE.Mesh(bg,beamM);beam.position.set(-3.7,2.6,-3.4);beam.rotation.set(-.55,0,.35);beam.renderOrder=3;world.add(beam);
  const pool=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({map:glowTex,color:0xffe9b0,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}));pool.rotation.x=-Math.PI/2;pool.scale.set(2.6,1.8,1);pool.position.set(-1.9,.03,-.6);world.add(pool);
  // floating dust motes in the beam
  const N=90,pp=new Float32Array(N*3),seed=[];for(let i=0;i<N;i++)seed.push([Math.random(),Math.random(),Math.random(),Math.random()*6]);
  const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(pp,3));const dots=new THREE.Points(dg,new THREE.PointsMaterial({map:glowTex,color:0xfff3c4,size:.11,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.9}));dots.frustumCulled=false;world.add(dots);
  // lanterns
  const lan=[];for(const x of [-3,3]){const g=new THREE.Group();g.position.set(x,6.6,-2.5);world.add(g);cyl(0,.75,0,.02,1.2,0x6b4a3a,g);box(0,0,0,.5,.6,.5,0xffe7a3,g);cyl(0,.38,0,.32,.12,0x8a5a3c,g);cyl(0,-.36,0,.3,.1,0x8a5a3c,g);
    g.children.forEach(c=>{if(c.material&&c.material.color&&c.material.color.getHex()===0xffe7a3)c.material=new THREE.MeshBasicMaterial({color:0xfff0b8});});const gl=glow(g,0,0,0,2.4,0xffd98a,false,.7);lan.push({g,gl,ph:x});}
  const pl=new THREE.PointLight(0xffc98a,.45,14,2);pl.position.set(0,6,-2.5);world.add(pl);
  // bunting
  const bt=new THREE.Group();world.add(bt);const tri=new THREE.BufferGeometry();tri.setAttribute('position',new THREE.Float32BufferAttribute([-.28,0,0,.28,0,0,0,-.55,0],3));tri.computeVertexNormals();
  for(let i=0;i<21;i++){const t=i/20,x=-10+t*20,y=7.55-Math.sin(t*Math.PI)*.7;const m=new THREE.Mesh(tri,new THREE.MeshLambertMaterial({color:RAIN[i%6],side:THREE.DoubleSide}));m.position.set(x,y,-6.55);m.rotation.z=Math.cos(t*Math.PI)*.25;bt.add(m);}
  STB={dots,seed,pp,dg,lan};}
function animateStableFx(t){if(!STB||mode==='ride')return;const {seed,pp,dg}=STB;for(let i=0;i<seed.length;i++){const s=seed[i];const k=(s[1]+t*.03*(.5+s[2]))%1;
    const y=6.2-k*6,x=-5.8+k*2.6+(s[0]-.5)*2.2+Math.sin(t*.5+s[3])*.25,z=-6+k*3.2+(s[2]-.5)*1.6;pp[i*3]=x;pp[i*3+1]=y+Math.sin(t*.8+s[3])*.15;pp[i*3+2]=z;}dg.attributes.position.needsUpdate=true;
  for(const l of STB.lan){l.g.rotation.z=Math.sin(t*1.2+l.ph)*.05;l.gl.material.opacity=.6+Math.sin(t*3+l.ph)*.08;}}
let STBTW=null;
function buildStable(){STBTW=null;if(glamOn())fxTune(.1,.975,.5);else fxTune(0,.985,.25);
  clearWorld();th=null;WD={H:null,waterY:null};
  scene.background=new THREE.Color(0xffe9f3);scene.fog=null;hemi.intensity=1;sun.intensity=.7;sun.color.setHex(0xffffff);
  box(0,-.1,0,22,.2,16,0xdcb28c);for(let i=0;i<11;i++)box(-10+i*2,.005,0,.06,.01,16,0xc49a74);
  box(0,4,-7,22,8.2,.3,0xffd6e8);box(-11,4,0,.3,8.2,14,0xffe3ef);box(11,4,0,.3,8.2,14,0xffe3ef);
  for(const x of [-8,-3,3,8])box(x,4,-6.8,.4,8,.3,0xc99a6e);box(0,7.9,-6.8,22,.4,.4,0xc99a6e);
  const win=new THREE.Mesh(starGeo,basic(0xbfe6ff));win.scale.setScalar(1.4);win.position.set(0,5,-6.84);world.add(win);
  for(const [x,y] of [[-5.5,6],[5.5,6],[-5.5,3.2],[5.5,3.2]]){const h=new THREE.Mesh(heartGeo,mat(x>0?0xffb3d1:0xff6fa5));h.scale.setScalar(.45);h.position.set(x,y,-6.82);world.add(h);}
  for(let i=0;i<9;i++)sph(-8.4+(i%3)*.9,.45+Math.floor(i/3)*.38,-5+(i%2)*.5,1,.65,.9,0xf2d16b);
  box(6.4,.55,-4.8,3.4,1.1,1.3,0xc99a6e);box(6.4,1.08,-4.8,3,.05,1,0x8ecae6);
  for(let i=0;i<5;i++)put(G.sph,0xe63946,5.2+i*.55,.35,-3.8,.24,.24,.24);
  box(-5,.5,3.2,2,1,1.5,0xffb3d1);sph(-5,1.05,3.2,.95,.25,.7,0xffd6e8);
  if(glamOn()){
    for(let i=0;i<26;i++){const m=new THREE.Sprite(glowMat([0xfff3b0,0xffc6e6,0xcfeaff][i%3],false,.7));m.position.set(-9+Math.random()*18,.6+Math.random()*6,-6+Math.random()*9);m.scale.setScalar(.14+Math.random()*.16);m.userData.tw=Math.random()*6;m.userData.y0=m.position.y;world.add(m);(STBTW=STBTW||[]).push(m);}}
  // trophy shelf
  box(-9.5,2.6,-5,2.6,.15,1,0xc99a6e);box(-9.5,1.3,-5,.15,2.6,.8,0xc99a6e);
  trophyGroup=new THREE.Group();world.add(trophyGroup);
  box(-9.5,3.6,-5,2.6,.15,1,0xc99a6e);box(-9.5,4.6,-5,2.6,.15,1,0xc99a6e);
  RACES.forEach((r,i)=>{const p=save.trophies[i];if(!p)return;const c=p===1?0xffd166:p===2?0xdfe6ee:0xe3a46b;const g=new THREE.Group();g.position.set(-10.4+(i%3)*.9,2.68+Math.floor(i/3)*1,-5);trophyGroup.add(g);
    cyl(0,.05,0,.18,.1,c,g);cyl(0,.2,0,.05,.25,c,g);const cup=put(new THREE.CylinderGeometry(.24,.12,.32,16),c,0,.48,0,1,1,1,g);glow(g,0,.5,0,1.2,0xfff0b8,false,.5);});
  prettyStable();
  world.traverse(o=>{if(o.isMesh)o.receiveShadow=true;});castAll(world);
  rebuildRig();placeStableActors();
}
function placeStableActors(){
  if(!rig)return;rig.wrap.position.set(0,0,0);rig.wrap.rotation.y=-.6;
  if(leona.parent!==scene)dismountLeona();leona.position.set(3.2,0,1.6);leona.rotation.y=-1.8;
  zara.position.set(-5,1.1,3.2);zara.rotation.y=.9;
}
function heartsCount(){const h=save.hearts;return (h.feed?1:0)+(h.brush?1:0)+(h.pet?1:0);}
function updateHearts(){const n=heartsCount();
  $('hearts').innerHTML=[0,1,2].map(i=>HEART(i<n)).join('');
  $('bFeed').classList.toggle('done',save.hearts.feed);$('bBrush').classList.toggle('done',save.hearts.brush);$('bPet').classList.toggle('done',save.hearts.pet);
  const ok=n>=3;$('bRide').disabled=!ok;$('bRaces').disabled=false;
  $('stMsg').textContent=ok?`${NAMES[save.name]} se veseli! Jašimo ili se utrkujemo?`:'Skupi 3 srca za jahanje. Utrke možeš odmah!';
  $('bRide').textContent=`Jaši! (Svijet ${Math.min(save.maxWorld,THEMES.length-1)+1})`;return ok;}
function enterStable(){endDuo();mode='stable';buildStable();$('stName').textContent=NAMES[save.name];$('stGems').textContent=save.gems;updateHearts();showScreen('sStable');banner('','','',false);}
function care(kind){
  if(anim)return;sfx('click');
  const headW=()=>{const p=new THREE.Vector3();rig.bones.Head.getWorldPosition(p);return p;};
  if(kind==='feed'){play(rig,'Eating',1);const ap=new THREE.Group();scene.add(ap);sph(0,0,0,.22,.21,.22,0xe63946,ap);cyl(0,.22,0,.025,.12,0x6d4c41,ap);
    const from=new THREE.Vector3(2.8,1.2,1.4);anim={t:0,dur:3,kind,update(t){const k=Math.min(1,t/.9);const h=headW();ap.position.lerpVectors(from,h.clone().add(new THREE.Vector3(0,-.2,0)),k);ap.position.y+=Math.sin(k*Math.PI)*.6;
      if(k>=1){ap.visible=false;if(!this.c){this.c=1;sfx('crunch');}}},end(){scene.remove(ap);}};}
  else if(kind==='brush'){play(rig,'Idle_2',1);const br=new THREE.Group();scene.add(br);box(0,0,0,.14,.07,.6,0xff6fa5,br);box(0,-.07,.1,.16,.09,.34,0xfff0b8,br);
    anim={t:0,dur:2.6,kind,update(t){const nb=['Neck3','Neck2','Neck1','Torso3','Torso2'];const i=Math.floor(((Math.sin(t*4)+1)/2)*(nb.length-1));const p=new THREE.Vector3();rig.bones[nb[i]].getWorldPosition(p);
      br.position.copy(p).add(new THREE.Vector3(.5,.35,.2));br.rotation.z=Math.sin(t*10)*.3;if(Math.random()<.35)burst(p.x+.3,p.y+.4,p.z,[0xfff3b0,0xffffff,0xffb3d1],2,1.6);if(Math.random()<.04)sfx('brush');},end(){scene.remove(br);}};}
  else{play(rig,'Idle_Headlow',1);anim={t:0,dur:2.6,kind,update(t){const L=leona.userData;L.arms[1].sh.rotation.x=-1.9+Math.sin(t*8)*.2;L.arms[1].el.rotation.x=-.3;
      if(Math.random()<.08){const h=headW();floatHeart(h.x+(Math.random()-.5),h.y+.4,h.z);}},end(){}};sfx('whinny');}
}
function floatHeart(x,y,z){const h=new THREE.Mesh(heartGeo,mat(0xff6fa5));h.scale.setScalar(.18);h.position.set(x,y,z);scene.add(h);parts.push({m:h,vx:0,vy:1.2,vz:0,life:1.4,float:true});}
function finishCare(kind){play(rig,'Idle');
  if(!save.hearts[kind]){save.hearts[kind]=true;store();sfx('heart');const p=new THREE.Vector3();rig.bones.Head.getWorldPosition(p);for(let i=0;i<5;i++)floatHeart(p.x+(Math.random()-.5),p.y+.3,p.z);}
  updateHearts();if(heartsCount()>=3)setFocus($('bRide'));}
function tire(){const k=['feed','brush','pet'];save.hearts[k[Math.floor(Math.random()*3)]]=false;store();}
$('bFeed').onclick=()=>openFeed();$('bBrush').onclick=()=>openBrush();$('bPet').onclick=()=>care('pet');
/* photo album */
const PHOTO_KEY='leonin-jednorog-foto';let photos=[];try{photos=JSON.parse(localStorage.getItem(PHOTO_KEY)||'[]');}catch(e){photos=[];}
function storePhotos(){for(let k=0;k<40;k++){try{localStorage.setItem(PHOTO_KEY,JSON.stringify(photos));return true;}catch(e){if(photos.length<=1)return false;photos.shift();}}return false;}
let photoReq=false;
function photoLabel(){const d=new Date(),ds=`${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}.`;
  if(mode==='ride'&&isRace)return `${RACES[race.ri].name} · ${ds}`;if(mode==='ride')return `Svijet ${levelIdx+1}: ${th.name} · ${ds}`;return `U štali · ${ds}`;}
function capturePhoto(){const src=renderer.domElement,W=src.width,H=src.height,ow=Math.min(720,W),oh=Math.round(ow*H/W),pad=16,strip=54;
  const c=document.createElement('canvas');c.width=ow+pad*2;c.height=oh+pad+strip;const g=c.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(src,pad,pad,ow,oh);
  g.fillStyle='#ffd6e8';g.fillRect(0,oh+pad,c.width,strip);g.fillStyle='#4a2c6b';g.font='800 22px "Baloo 2","Trebuchet MS",sans-serif';g.textBaseline='middle';
  const who=`Leona i ${NAMES[save.name]}`;g.fillText(who,pad+30,oh+pad+strip/2);g.font='600 17px "Baloo 2","Trebuchet MS",sans-serif';g.textAlign='right';g.fillText(photoLabel(),c.width-pad,oh+pad+strip/2);
  g.textAlign='left';g.fillStyle='#ff6fa5';g.font='22px sans-serif';g.fillText('♥',pad+4,oh+pad+strip/2);
  let url;try{url=c.toDataURL('image/jpeg',.8);}catch(e){return;}
  photos.push({d:url,t:photoLabel()});const ok=storePhotos();
  const f=$('flash');f.style.transition='none';f.style.opacity=1;requestAnimationFrame(()=>{f.style.transition='opacity .6s';f.style.opacity=0;});
  tone(1900,700,.05,'square',.05);tone(1300,500,.08,'square',.04,.07);
  toast(ok?`Slikano! (${photos.length} u albumu)`:'Album je pun.');}
let toastT=null;function toast(t){const e=$('toast');e.textContent=t;e.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>e.style.opacity=0,1600);}
$('bPhoto').onclick=()=>{audioInit();photoReq=true;};$('bPhotoS').onclick=()=>{audioInit();photoReq=true;};
function openAlbum(){sfx('click');mode='album';const el=$('thumbs');el.innerHTML='';
  if(!photos.length)el.innerHTML='<div class="msg" style="grid-column:1/-1">Album je prazan. Pritisni 📷 dok jašeš ili u štali!</div>';
  photos.slice().reverse().forEach((p,ri)=>{const i=photos.length-1-ri;const b=document.createElement('button');b.type='button';b.className='btn thumb';b.innerHTML=`<img alt="" src="${p.d}">`;b.onclick=()=>openPhoto(i);el.appendChild(b);});
  showScreen('sAlbum');}
let photoIdx=0;
function openPhoto(i){sfx('click');mode='photo';photoIdx=i;$('bigPhoto').src=photos[i].d;$('photoCap').textContent=photos[i].t;const a=$('bSavePhoto');let framed=true;try{framed=window.top!==window;}catch(e){}a.hidden=framed;a.href=photos[i].d;a.download=`leona-jednorog-${i+1}.jpg`;showScreen('sPhoto');}
$('bAlbum').onclick=openAlbum;$('bAlbumBack').onclick=()=>{sfx('click');mode='stable';showScreen('sStable');};
$('bPhotoBack').onclick=openAlbum;$('bDelPhoto').onclick=()=>{photos.splice(photoIdx,1);storePhotos();sfx('bonk');openAlbum();};
/* feeding mini game */
const FOODS=[{id:'apple',n:'Jabuka',e:'🍎'},{id:'carrot',n:'Mrkva',e:'🥕'},{id:'straw',n:'Jagoda',e:'🍓'},{id:'melon',n:'Lubenica',e:'🍉'},{id:'candy',n:'Bombon',e:'🍬'},{id:'clover',n:'Djetelina',e:'🍀'}];
function foodModel(id){const g=new THREE.Group();
  if(id==='apple'){sph(0,0,0,.22,.21,.22,0xe63946,g);cyl(0,.22,0,.025,.12,0x6d4c41,g);sph(.07,.27,0,.07,.025,.04,0x4caf50,g);}
  else if(id==='carrot'){const c=cone(0,0,0,.09,.5,0xff8a3d,g);c.rotation.x=Math.PI;for(const a of [-.4,0,.4]){const l=cone(Math.sin(a)*.05,.3,0,.03,.2,0x4caf50,g);l.rotation.z=a;}}
  else if(id==='straw'){const c=put(new THREE.SphereGeometry(1,14,10),0xff3b5c,0,0,0,.16,.2,.16,g);for(let i=0;i<5;i++){const l=cone(Math.cos(i*1.26)*.07,.18,Math.sin(i*1.26)*.07,.04,.09,0x4caf50,g);l.rotation.z=Math.cos(i*1.26)*1.2;}}
  else if(id==='melon'){const w=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.12,16,1,false,0,Math.PI*.6),mat(0xff4d6d));w.rotation.x=Math.PI/2;g.add(w);const r=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.125,16,1,true,0,Math.PI*.6),mat(0x3fa535));r.rotation.x=Math.PI/2;g.add(r);
    for(let i=0;i<3;i++)sph(Math.cos(.35+i*.5)*.17,0,Math.sin(.35+i*.5)*.17,.02,.03,.02,0x2b1b3d,w);}
  else if(id==='candy'){sph(0,0,0,.14,.14,.14,0xff6fa5,g);for(const sx of [-1,1]){const c=cone(sx*.2,0,0,.09,.14,0xffd6e8,g);c.rotation.z=sx*Math.PI/2;}}
  else{for(let i=0;i<3;i++)sph(Math.cos(i*2.1)*.09,0,Math.sin(i*2.1)*.09,.1,.04,.1,0x4caf50,g);cyl(0,-.12,0,.02,.22,0x2e7d32,g);}
  castAll(g);return g;}
let feedN=0,favFood='apple';
function openFeed(){if(anim)return;sfx('click');mode='feed';feedN=0;favFood=FOODS[Math.floor(Math.random()*FOODS.length)].id;
  const el=$('foodBtns');el.innerHTML='';FOODS.forEach(f=>{const b=document.createElement('button');b.type='button';b.className='btn food';b.innerHTML=`<span class="emo">${f.e}</span>${f.n}`;b.onclick=()=>giveFood(f.id);el.appendChild(b);});
  $('feedMsg').textContent=`Što će ${NAMES[save.name]} jesti? (0 / 3)`;showScreen('sFeed');}
function giveFood(id){if(anim)return;sfx('click');play(rig,'Eating',1);const ap=foodModel(id);scene.add(ap);const fav=id===favFood;
  const headW=()=>{const p=new THREE.Vector3();rig.bones.Head.getWorldPosition(p);return p;};const from=new THREE.Vector3(2.6,1.3,1.4);
  anim={t:0,dur:2.4,kind:'feedOne',update(t){const k=Math.min(1,t/.8);const h=headW();ap.position.lerpVectors(from,h.clone().add(new THREE.Vector3(0,-.25,.1)),k);ap.position.y+=Math.sin(k*Math.PI)*.7;ap.rotation.y=t*5;
      if(k>=1&&!this.c){this.c=1;ap.visible=false;sfx('crunch');burst(h.x,h.y-.2,h.z,fav?[0xff6fa5,0xffd166,0xffffff]:[0xffffff,0xfff3b0],fav?16:6,2.5);if(fav){setTimeout(()=>sfx('whinny'),300);for(let i=0;i<4;i++)floatHeart(h.x+(Math.random()-.5),h.y+.3,h.z);}}},
    end(){scene.remove(ap);feedN++;const done=feedN>=3;
      $('feedMsg').textContent=fav?`Mmm! ${FOODS.find(f=>f.id===id).n} joj je najdraža hrana! (${Math.min(feedN,3)} / 3)`:`Njam! (${Math.min(feedN,3)} / 3)`+(done?'':' Daj joj još nešto.');
      if(done&&!save.hearts.feed){finishCare('feed');$('feedMsg').textContent=`${NAMES[save.name]} je sita i sretna! Dobila si srce.`;}}};}
$('bFeedDone').onclick=()=>{sfx('click');enterStableUI();};
function enterStableUI(){mode='stable';anim&&anim.end&&anim.end();anim=null;brushTool.visible=false;play(rig,'Idle');showScreen('sStable');updateHearts();}
/* brushing mini game */
const brushTool=new THREE.Group();{box(.32,.02,0,.62,.1,.12,0xff6fa5,brushTool);sph(.64,.02,0,.08,.08,.08,0xff6fa5,brushTool);box(-.12,0,0,.42,.14,.24,0xfff0b8,brushTool);for(let i=0;i<6;i++)for(let k=0;k<3;k++)box(-.3+i*.07,-.12,-.07+k*.07,.03,.12,.03,0xffffff,brushTool);brushTool.visible=false;scene.add(brushTool);}
const BRUSH_BONES=['Head','Neck3','Neck2','Neck1','Torso3','Torso2','Torso','Back','Tail1','Tail2','Tail3','Tail4'];
const brush={x:0,y:0,px:null,py:null,prog:0,done:false,pad:false};
function openBrush(){if(anim)return;sfx('click');mode='brush';brush.prog=0;brush.done=false;brush.x=innerWidth*.5;brush.y=innerHeight*.45;brush.px=null;play(rig,'Idle_2',.6);
  $('brushBar').style.width='0%';$('brushMsg').textContent=padOn?'Pomiči palicu i drži A za češljanje! (B: natrag)':'Prstom ili mišem češljaj grivu i leđa!';showScreen('sBrush');}
renderer.domElement.addEventListener('pointermove',e=>{if(mode!=='brush')return;brush.x=e.clientX;brush.y=e.clientY;brush.pad=false;});
renderer.domElement.addEventListener('pointerdown',e=>{if(mode!=='brush')return;brush.x=e.clientX;brush.y=e.clientY;brush.px=null;brush.pad=false;});
const _ray=new THREE.Raycaster(),_v2=new THREE.Vector2(),_bp=new THREE.Vector3(),_cp=new THREE.Vector3();
function updateBrush(dt,inp){
  if(Math.abs(inp.ix)>.05||Math.abs(inp.iy)>.05){brush.x=Math.max(0,Math.min(innerWidth,brush.x+inp.ix*520*dt));brush.y=Math.max(0,Math.min(innerHeight,brush.y-inp.iy*520*dt));brush.pad=true;}
  const moved=brush.px===null?0:Math.hypot(brush.x-brush.px,brush.y-brush.py);brush.px=brush.x;brush.py=brush.y;
  _v2.set(brush.x/innerWidth*2-1,-(brush.y/innerHeight)*2+1);_ray.setFromCamera(_v2,camera);
  const pts=[];for(let i=0;i<BRUSH_BONES.length;i++){const b=rig.bones[BRUSH_BONES[i]];if(!b)continue;b.getWorldPosition(_bp);pts.push(_bp.clone());if(i>0&&i<8){const q=pts[pts.length-2];if(q)pts.push(q.clone().lerp(_bp,.5));}}
  let best=null,bd=1e9;for(const q of pts){const d=_ray.ray.distanceSqToPoint(q);if(d<bd){bd=d;best=q;}}
  const on=best&&Math.sqrt(bd)<.75;
  if(best){_ray.ray.closestPointToPoint(best,_cp);brushTool.position.copy(_cp).addScaledVector(_ray.ray.direction,-.35);}
  brushTool.visible=true;brushTool.quaternion.copy(camera.quaternion);brushTool.rotateZ(-.35+Math.sin(time*14)*(moved>2?.2:0));
  const rub=(moved>2||(brush.pad&&inp.j&&(Math.abs(inp.ix)+Math.abs(inp.iy)>.05||true)))&&on;
  if(rub&&!brush.done){brush.prog=Math.min(1,brush.prog+(brush.pad?dt*.15:Math.min(moved,30)*.00028));$('brushBar').style.width=(brush.prog*100).toFixed(0)+'%';
    if(Math.random()<.5)trail(brushTool.position.x,brushTool.position.y,brushTool.position.z,[0xfff3b0,0xffffff,0xffb3d1,0xc9b3ff]);if(Math.random()<.05)sfx('brush');
    if(brush.prog>=1){brush.done=true;sfx('heart');const h=new THREE.Vector3();rig.bones.Neck2.getWorldPosition(h);burst(h.x,h.y+.4,h.z,RAIN,40,4);play(rig,'Idle_Headlow',1);setTimeout(()=>{if(mode==='brush')play(rig,'Idle_2',.6);},1800);
      $('brushMsg').textContent=`${NAMES[save.name]} se sjaji kao duga! Dobila si srce.`;if(!save.hearts.brush){save.hearts.brush=true;store();}updateHearts();}}}
$('bBrushDone').onclick=()=>{sfx('click');enterStableUI();};
$('bRecolor').onclick=()=>{mode='create';buildCreate();showScreen('sCreate');};
$('bRide').onclick=()=>startRide(Math.min(save.maxWorld,THEMES.length-1));
function buildCards(){const el=$('cards');el.innerHTML='';
  DECOR.forEach(d=>{const b=document.createElement('button');b.type='button';b.className='btn card';const own=save.owned.includes(d.id),wear=!!save.wear[d.id];
    b.classList.toggle('wear',wear);b.innerHTML=`<span>${d.n}</span><small>${own?(wear?'Nosi ✓':'Imaš'):GEM_SVG+' '+d.cost}</small>`;
    b.onclick=()=>{if(own){save.wear[d.id]=!wear;$('decMsg').textContent='';sfx('click');}
      else if(save.gems>=d.cost){save.gems-=d.cost;save.owned.push(d.id);save.wear[d.id]=true;$('decMsg').textContent=`Kupljeno: ${d.n}!`;sfx('heart');}
      else{$('decMsg').textContent=`Treba još ${d.cost-save.gems} dragulja. Idi jahati ili na utrku!`;sfx('bonk');return;}
      store();rebuildRig();placeStableActors();$('stGems').textContent=save.gems;const keep=d.id;buildCards();
      const nb=[...$('cards').children][DECOR.findIndex(x=>x.id===keep)];setFocus(nb);};
    el.appendChild(b);});}
$('bDecor').onclick=()=>{sfx('click');mode='decor';buildCards();$('decMsg').textContent=`Imaš ${save.gems} dragulja.`;showScreen('sDecor');};
$('bDecorDone').onclick=()=>{mode='stable';showScreen('sStable');$('stGems').textContent=save.gems;};
/* Leonin ormar */
function rebuildLeona(){const old=C1.leona;const par=old.parent;const nl=makeLeonaAny(lookOpts());castAll(nl);addOutline(nl);nl.position.copy(old.position);nl.rotation.copy(old.rotation);nl.scale.copy(old.scale);nl.visible=old.visible;
  if(par){par.remove(old);par.add(nl);}C1.leona=nl;if(leona===old)leona=nl;}
function buildDress(){const L=save.look;const hex=c=>'#'+c.toString(16).padStart(6,'0');
  const mk=(row,items,key,sw)=>{const el=$(row);el.innerHTML='';items.forEach((it,i)=>{const b=document.createElement('button');b.type='button';b.className='btn '+(sw?'sw':'namebtn');
    if(sw){const c=Array.isArray(it.c)?it.c:[it.c];b.style.background=c.length>1?`linear-gradient(135deg,${hex(c[0])} 55%,${hex(c[1])} 55%)`:hex(c[0]);b.setAttribute('aria-label',it.n);if(c[0]===0xffffff)b.style.borderColor='#e4d6f0';}else b.textContent=it.n;
    b.classList.toggle('sel',(L[key]||0)===i);b.onclick=()=>{L[key]=i;store();sfx('click');say(it.n,true);[...el.children].forEach((x,k)=>x.classList.toggle('sel',k===i));rebuildLeona();sparkLeona();};el.appendChild(b);});};
  mk('rowHs',HSTYLES,'hs');mk('rowHc',HCOLS,'hc',true);mk('rowOut',OUTFITS,'out');mk('rowOc',OCOLS,'oc',true);mk('rowHat',HATS,'hat');
  $('bGlasses').classList.toggle('sel',!!L.gl);}
function sparkLeona(){const p=leona.position;burst(p.x,p.y+1.9,p.z,[0xffb3d1,0xfff3b0,0xc9b3ff],5,1.6);}
$('bGlasses').onclick=()=>{save.look.gl=save.look.gl?0:1;store();sfx('click');say(save.look.gl?'Naočale':'Bez naočala',true);rebuildLeona();buildDress();};
$('bLuck').onclick=()=>{const L=save.look,R=n=>Math.floor(Math.random()*n);L.hs=R(HSTYLES.length);L.hc=R(HCOLS.length);L.out=R(OUTFITS.length);L.oc=R(OCOLS.length);L.hat=R(HATS.length);
  store();sfx('heart');say(`${OUTFITS[L.out].n} i ${HSTYLES[L.hs].n.toLowerCase()}!`,true);rebuildLeona();sparkLeona();buildDress();};
$('bDress').onclick=()=>{sfx('click');mode='dress';if(!save.look)save.look={hs:0,hc:0,out:0,oc:0,hat:0,gl:0};buildDress();placeStableActors();say('Leonin ormar. Odaberi frizuru i odjeću!',true);showScreen('sDress');};
$('bDressDone').onclick=()=>{sfx('click');mode='stable';placeStableActors();showScreen('sStable');say('Baš si lijepa, Leona!',true);};
function openPicker(kind){mode='worlds';const el=$('worldBtns');el.innerHTML='';$('pickTitle').textContent=kind==='race'?'Koja utrka?':'Kamo jašemo?';
  const list=kind==='race'?RACES:THEMES;
  list.forEach((t,i)=>{const b=document.createElement('button');b.type='button';
    const open=kind==='race'?raceOpen(i):(i<=save.maxWorld||!!t.special);
    const tr=(kind==='race'&&save.trophies[i]?` (${save.trophies[i]}. mjesto)`:'')+(kind==='race'&&RACE_PRIZE[i]&&!save.owned.includes(RACE_PRIZE[i])?' 🎁':'');
    b.className='btn'+(open&&((kind==='race'&&i===0)||(kind!=='race'&&i===Math.min(save.maxWorld,THEMES.length-1)))?' go':'');
    b.textContent=`${i+1}. ${t.name}`+(open?tr:' (zaključano)');b.disabled=!open;
    b.onclick=()=>{if(kind!=='race'&&!updateHearts()){$('wMsg').textContent='Prvo skupi 3 srca u štali.';sfx('bonk');return;}kind==='race'?startRace(i):startRide(i);};el.appendChild(b);});
  $('wMsg').textContent=kind==='race'?'Novu utrku otključaš kad prođeš novi svijet.':'';showScreen('sWorlds');}
$('bWorlds').onclick=()=>openPicker('world');
$('bRaces').onclick=()=>openPicker('race');
$('bWorldsBack').onclick=()=>{mode='stable';showScreen('sStable');};
function todLabel(){const t=TODS.find(q=>q[0]===(save.tod||'dan'))||TODS[0];$('bTod').textContent=t[1];$('bTod').hidden=!GFXON;}
$('bTod').onclick=()=>{const i=TODS.findIndex(q=>q[0]===(save.tod||'dan'));save.tod=TODS[(i+1)%TODS.length][0];store();todLabel();sfx('click');};todLabel();

/* ---------- riding & racing ---------- */
let P={x:0,y:0,z:0,vx:0,vz:0,vy:0,on:true,face:0,coy:0,buf:0,bonk:0,blink:0,dbl:false,land:0,safe:{x:0,y:0,z:0},ground:null,boost:0,inWater:false};
const dog={x:0,y:0,z:0,face:0,anim:0};const P1=P;
let camYaw=0,camPos=new THREE.Vector3(0,3,-8),camLook=new THREE.Vector3(),parts=[],rideState='play',stateT=0,time=0,ridesGems=0,isRace=false,race=null;
function clearWorld(){LUSH=null;STB=null;FTCARDS=[];LUSHU.on.value=0;scene.remove(world);world=new THREE.Group();scene.add(world);skyMesh=null;
  S=[];bones=[];gems=[];rings=[];springs=[];sweepers=[];movers=[];flies=[];foals=[];boosts=[];arches=[];castle=null;for(const p of parts)scene.remove(p.m);parts=[];}
function setupPlayer(){
  rebuildRig();mountLeona();
  P.x=start.x;P.z=start.z;P.y=topAt(start.x,start.z);P.vx=P.vz=P.vy=0;P.face=start.face||0;P.on=true;P.safe={x:P.x,y:P.y,z:P.z};P.blink=0;P.bonk=0;P.boost=0;
  dog.x=P.x-2;dog.z=P.z-2;dog.y=P.y;camYaw=P.face;camPos.set(P.x-Math.sin(P.face)*12,P.y+6,P.z-Math.cos(P.face)*12);camLook.set(P.x,P.y+1.5,P.z);
}
function startRide(i){
  endDuo();P1.done=false;mode='ride';isRace=false;race=null;levelIdx=i;th=THEMES[i];clearWorld();rng=mulberry(500+i*41);WD={waterY:null,H:null};
  LEVELS[i]();placeBones(5);scenery();finishWorld();setupPlayer();dog.dig=null;dog.carry=0;
  ridesGems=0;rideState='play';stateT=0;
  $('pGems').hidden=false;$('pFoals').hidden=false;$('pBones').hidden=false;$('pRace').hidden=true;$('rPlace').hidden=true;
  $('rWorld').textContent=`Svijet ${i+1}: ${th.name}`;updRideHud();showScreen('ride');
  banner(`Svijet ${i+1}`,th.name,save.wear.wings?'Drži A u zraku i leti!':th.msg);sfx('whinny');
}
function startRace(ri,duoRace){
  endDuo();P1.done=false;const R=RACES[ri];mode='ride';isRace=true;levelIdx=R.theme;th=THEMES[R.theme];clearWorld();rng=mulberry(900+ri*17);WD={waterY:null,H:null};
  buildRace(ri);scenery();finishWorld();setupPlayer();
  const s0=WD.at(WD.s0||0),nx=Math.cos(s0.ry),nz=-Math.sin(s0.ry);
  P.x=s0.x+nx*3.2;P.z=s0.z+nz*3.2;P.y=topAt(P.x,P.z);
  const rivals=duoRace?[]:RIVALS.map((r,k)=>{const rg=makeRig(r.body,r.mane,{bow:true});world.add(rg.wrap);return Object.assign({rig:rg,s:WD.s0||0,v:0,lap:0,done:false,time:0,y:0,x:0,z:0,face:s0.ry},r);});
  race={ri,rivals,cp:0,t:0,count:3.5,finished:false,order:[],progress:WD.s0||0,pS:WD.s0||0};
  ridesGems=0;rideState='count';stateT=0;
  $('pGems').hidden=true;$('pFoals').hidden=true;$('pBones').hidden=true;$('pRace').hidden=false;$('rPlace').hidden=false;
  $('rWorld').textContent=R.name;$('rLap').textContent=`Vrata 0 / ${arches.length}`;showScreen('ride');banner('3','Pripremi se!','');sfx('beep');
}
/* ---------- two players, split screen ---------- */
const P2STYLE=[{n:'Tata',rider:{hair:0x5a3a22,hair2:0x7a5232,shirt:0x3a86ff,hood:0x2f6fd6,zip:0xdbe8ff,legs:0x2b3a67,shoe:0x8ecae6,short:true},body:0xc4e6ff,mane:[0x3a86ff,0x8ecae6]},
  {n:'Mama',rider:{hair:0x3b2416,hair2:0x5a3a22,shirt:0xb08cff,hood:0x9d6ef0,zip:0xf0e6ff,legs:0x4a2c6b,shoe:0xc9b3ff},body:0xdcc8ff,mane:[0x9d4edd,0xffffff]},
  {n:'Prijateljica',rider:{hair:0x8a4b2a,hair2:0xb06a3a,shirt:0x7ed957,hood:0x5fbf3a,zip:0xeaffdf,legs:0x2f7a5a,shoe:0xffe066},body:0xc8f2dd,mane:[0x7ed957,0xffe066]}];
let p2style=0,CTX=null;const KEYS_TXT=$('keysTxt').textContent;const DUOKEY='leonin-jednorog-p2';try{p2style=+(localStorage.getItem(DUOKEY)||0)||0;}catch(e){}
const leona2Cache={};
function newP(){return {x:0,y:0,z:0,vx:0,vz:0,vy:0,on:true,face:0,coy:0,buf:0,bonk:0,blink:0,dbl:false,land:0,safe:{x:0,y:0,z:0},ground:null,boost:0,inWater:false};}
const C1={P:P1,camera:camera1,camPos,camLook,camYaw:0,uShadow,arrow,leona,rig:null,name:'Leona'};
const C2={P:newP(),camera:camera2,camPos:new THREE.Vector3(),camLook:new THREE.Vector3(),camYaw:0,uShadow:blob(),arrow:makeArrow(0x8ecae6),leona:null,rig:null,name:'Tata'};
C2.uShadow.visible=false;
function useCtx(c){P=c.P;camera=c.camera;camPos=c.camPos;camLook=c.camLook;camYaw=c.camYaw;uShadow=c.uShadow;arrow=c.arrow;leona=c.leona;rig=c.rig;CTX=c;}
function keepCtx(){if(!CTX)return;CTX.camYaw=camYaw;CTX.rig=rig;}
function duoView(){const W=innerWidth,H=innerHeight,land=W>=H*.9;
  for(const c of [camera1,camera2]){c.clearViewOffset();c.aspect=land?(W/2)/H:W/(H/2);c.fov=land?62:52;c.updateProjectionMatrix();}
  const h=$('duoHud');h.className=land?'land':'port';}
function setupDuo(){duo=true;keepCtx();
  const st=P2STYLE[p2style];C2.name=st.n;C1.rig=rig;
  if(!leona2Cache[p2style]){const L=makeLeonaAny(st.rider);castAll(L);addOutline(L);leona2Cache[p2style]=L;}
  if(C2.leona&&C2.leona.parent)C2.leona.parent.remove(C2.leona);C2.leona=leona2Cache[p2style];
  const r2=makeRig(st.body,st.mane,{bow:true,wings:save.wear.wings,flowers:true});scene.add(r2.wrap);C2.rig=r2;C2.P=newP();C2.P.wear={wings:save.wear.wings};
  P1.done=false;P1.wear=null;
  useCtx(C2);mountLeona();useCtx(C1);
  C2.uShadow.visible=true;$('keysTxt').textContent='Leona: W A S D + razmak · '+st.n+': strelice + Enter · ili dva kontrolera';$('duoN1').textContent='Leona';$('duoN2').textContent=st.n;$('duoHud').hidden=false;
  $('pFoals').hidden=true;$('pBones').hidden=true;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,Math.min(1.25,PRMAX())));renderer.setSize(innerWidth,innerHeight);duoView();}
function placeP2(x,z,face){const Q=C2.P;Object.assign(Q,newP());Q.wear={wings:save.wear.wings};Q.x=x;Q.z=z;Q.y=topAt(x,z);Q.face=face;Q.safe={x:Q.x,y:Q.y,z:Q.z};
  C2.camYaw=face;C2.camPos.set(x-Math.sin(face)*12,Q.y+6,z-Math.cos(face)*12);C2.camLook.set(x,Q.y+1.5,z);}
function endDuo(){if(!duo)return;duo=false;keepCtx();useCtx(C1);
  if(C2.rig){C2.rig.wrap.parent&&C2.rig.wrap.parent.remove(C2.rig.wrap);C2.rig=null;}C2.uShadow.visible=false;C2.arrow.visible=false;$('duoHud').hidden=true;$('keysTxt').textContent=KEYS_TXT;
  renderer.setScissorTest(false);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,PRMAX()));renderer.setSize(innerWidth,innerHeight);applyView();}
function startDuoRide(i){startRide(i);setupDuo();const f=P1.face,nx=Math.cos(f),nz=-Math.sin(f);placeP2(P1.x+nx*3,P1.z+nz*3,f);P1.x-=nx*1;P1.z-=nz*1;
  $('rWorld').textContent=`${th.name} · za dvoje`;banner(`Svijet ${i+1}`,th.name,'Jašite zajedno do dvorca!');duoHud();}
function startDuoRace(ri){startRace(ri,true);setupDuo();const s0=WD.at(WD.s0||0),nx=Math.cos(s0.ry),nz=-Math.sin(s0.ry);
  P1.x=s0.x+nx*2.6;P1.z=s0.z+nz*2.6;P1.y=topAt(P1.x,P1.z);placeP2(s0.x-nx*2.6,s0.z-nz*2.6,s0.ry);
  for(const c of [C1,C2]){c.P.cp=0;c.P.progress=WD.s0||0;c.P.done=false;}race.duo=true;$('rPlace').hidden=true;$('pRace').hidden=true;duoHud();}
function duoHud(){const nA=arches.length;
  for(const [k,c] of [[1,C1],[2,C2]]){const el=$('duoS'+k);if(isRace)el.textContent=c.P.done?`${c.P.place}. mjesto!`:`Vrata ${c.P.cp||0} / ${nA}`;else el.textContent='';}}
/* separate controls for each player */
const dprev=[{},{}];
function readDuo(){let pads=[];try{pads=[...(navigator.getGamepads?navigator.getGamepads():[])].filter(Boolean);}catch(e){}
  const out=[];
  for(let k=0;k<2;k++){let ix=0,iy=0,j=false;
    if(k===0){if(keys.KeyA)ix-=1;if(keys.KeyD)ix+=1;if(keys.KeyW)iy+=1;if(keys.KeyS)iy-=1;j=!!(keys.Space||keys.ShiftLeft);ix+=touch.x;iy+=touch.y;j=j||touch.j;}
    else{if(keys.ArrowLeft)ix-=1;if(keys.ArrowRight)ix+=1;if(keys.ArrowUp)iy+=1;if(keys.ArrowDown)iy-=1;j=!!(keys.Enter||keys.ShiftRight||keys.Numpad0||keys.ControlRight);}
    const gp=pads[k];if(gp){const bt=i=>!!(gp.buttons[i]&&gp.buttons[i].pressed),ax=i=>{const v=gp.axes[i]||0;return Math.abs(v)<.3?0:Math.sign(v)*(Math.abs(v)-.3)/.7;};
      ix+=ax(0);iy-=ax(1);if(bt(14))ix-=1;if(bt(15))ix+=1;if(bt(12))iy+=1;if(bt(13))iy-=1;if(bt(7)&&iy<.5)iy=Math.max(iy,gp.buttons[7].value||1);if(bt(0)||bt(2)||bt(3))j=true;}
    const m=Math.hypot(ix,iy);if(m>1){ix/=m;iy/=m;}
    const jp=j&&!dprev[k].j;dprev[k]={j};out.push({ix,iy,j,jp,ap:jp,bp:false,nav:{}});}
  return out;}
function updateDuoRace(dt){const nA=arches.length;
  P.fprog=trackProgress(P.x,P.z,P.fprog||0);fenceClamp(P,P.fprog);
  if(!P.done&&P.cp<nA){const na=arches[P.cp];const ax=Math.sin(na.ry),az=Math.cos(na.ry),dx=P.x-na.x,dz=P.z-na.z;
    if(Math.hypot(dx,dz)<7&&dx*ax+dz*az>-4.5){P.cp++;sfx('gem');burst(na.x,topAt(na.x,na.z)+4,na.z,RAIN,12,4);
      if(P.cp>=nA){P.done=true;race.order.push(CTX);P.place=race.order.length;sfx(P.place===1?'win':'found');burst(P.x,P.y+3,P.z,RAIN,50,7);
        banner(P.place===1?`${CTX.name} pobjeđuje!`:`${CTX.name} je u cilju!`,P.place===1?'Prvo mjesto!':'Bravo!','',true,true);setTimeout(()=>{if(rideState==='play')banner('','','',false);},1600);
        if(race.order.length>=2){rideState='finish';stateT=0;}else race.firstT=race.t;}}}
  if(!P.done&&P.cp<nA){const nxt=arches[P.cp];arrow.visible=true;arrow.position.set(P.x,P.y+.15,P.z);arrow.rotation.y=Math.atan2(nxt.x-P.x,nxt.z-P.z);}else arrow.visible=false;}
function showDuoResults(){mode='results';const ord=race.order.slice();for(const c of [C1,C2])if(!ord.includes(c))ord.push(c);
  const col=c=>c===C1?BODY[save.body].c:P2STYLE[p2style].body;const hex=c=>'#'+c.toString(16).padStart(6,'0');
  const w=ord[0];$('resTitle').textContent=`${w.name} pobjeđuje!`;save.gems+=30;store();
  $('resList').innerHTML=ord.map((c,i)=>`<div class="res${c===C1?' me':''}"><b>${i+1}.</b><span class="dot" style="background:${hex(col(c))}"></span>${c===C1?`Leona i ${NAMES[save.name]}`:c.name}</div>`).join('');
  $('resMsg').innerHTML='Nagrada za utrku: 30 dragulja';endDuo();showScreen('sResults');banner('','','',false);}
function updateDuo(dt,inps){
  const counting=isRace&&rideState==='count';
  if(counting){const c=Math.min(3,Math.ceil(3.5-stateT));if(c!==race.lastC){race.lastC=c;if(c>0){banner(String(c),'Pripremi se!','');sfx('beep');}else{banner('KRENI!','','');sfx('go');}}
    if(stateT>=3.5){rideState='play';stateT=0;setTimeout(()=>{if(rideState==='play')banner('','','',false);},700);}}
  if(rideState==='play'&&!isRace&&stateT>2.8&&$('bnT').textContent.startsWith('Svijet'))banner('','','',false);
  if(rideState==='play'&&isRace){race.t+=dt;if(race.firstT!==undefined&&race.t-race.firstT>25&&race.order.length<2){rideState='finish';stateT=0;}}
  [C1,C2].forEach((c,k)=>{useCtx(c);const inp=inps[k];
    if(counting)updateRide(dt,inp,false);
    else if(rideState==='play'){updateRide(dt,P.done?NOINP:inp,!P.done);if(isRace)updateDuoRace(dt);
      else if(castle&&Math.hypot(P.x-castle.door.x,P.z-castle.door.z)<3.4){rideState='win';stateT=0;sfx('win');burst(P.x,P.y+3,P.z,RAIN,70,8);save.gems+=ridesGems;tire();store();
        const got=gems.filter(g=>g.got).length;banner(`Bravo, ${c===C1?'Leona':c.name}!`,`Skupili ste ${got} od ${gems.length} dragulja`,'',true,true);ridesGems=0;}}
    else updateRide(dt,NOINP,false);
    animateRide(dt);camRide(dt);keepCtx();});
  useCtx(C1);updateFoals(dt);animateWorld(dt);duoHud();
  if(rideState==='win'){if(stateT>1.2){$('bnH').hidden=false;$('bnH').textContent='A: natrag u štalu';if(inps[0].jp||inps[1].jp)enterStable();}}
  if(rideState==='finish'&&stateT>2.6)showDuoResults();
  followSun(P.x,P.y,P.z);updateSparks(time,P.x,P.y,P.z,th?th.spark:0xffffff);}
function renderDuo(){syncLeonas();fxUpdate();lushCenters.length=0;[C1,C2].forEach(c=>{useCtx(c);lushCenters.push([P.x,P.z]);});useCtx(C1);lushUpdate();const W=innerWidth,H=innerHeight,land=W>=H*.9;renderer.setScissorTest(true);
  [C1,C2].forEach((c,k)=>{useCtx(c);const v=land?[k*W/2,0,W/2,H]:[0,k?0:H/2,W,H/2];renderer.setViewport(...v);renderer.setScissor(...v);
    followSun(P.x,P.y,P.z);if(skyMesh)skyMesh.position.copy(camera.position);updateHorn(rig);renderer.render(scene,camera);});
  useCtx(C1);renderer.setScissorTest(false);renderer.setViewport(0,0,W,H);}
function openDuo(){sfx('click');mode='duo';
  const sr=$('p2Row');sr.innerHTML='';P2STYLE.forEach((st,i)=>{const b=document.createElement('button');b.type='button';b.className='btn namebtn'+(i===p2style?' sel':'');b.textContent=st.n;
    b.onclick=()=>{p2style=i;try{localStorage.setItem(DUOKEY,String(i));}catch(e){}sfx('click');[...sr.children].forEach((x,k)=>x.classList.toggle('sel',k===i));};sr.appendChild(b);});
  const el=$('duoBtns');el.innerHTML='';
  RACES.forEach((r,i)=>{const open=raceOpen(i);if(!open)return;const b=document.createElement('button');b.type='button';b.className='btn gold';b.textContent=`Utrka: ${r.name}`;b.onclick=()=>startDuoRace(i);el.appendChild(b);});
  THEMES.forEach((t,i)=>{if(i>Math.min(save.maxWorld,THEMES.length-1)&&!t.special)return;const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=`${i+1}. ${t.name}`;b.onclick=()=>startDuoRide(i);el.appendChild(b);});
  $('duoMsg').innerHTML=padOn?'Igrač 1: prvi kontroler · Igrač 2: drugi kontroler (ili strelice i Enter)':'Igrač 1: W A S D i razmak · Igrač 2: strelice i Enter<br>(ili dva kontrolera)';
  showScreen('sDuo');}
$('bDuo').onclick=openDuo;$('bDuoBack').onclick=()=>{sfx('click');mode='stable';showScreen('sStable');};
function updRideHud(){$('rGems').textContent=`${gems.filter(g=>g.got).length} / ${gems.length}`;$('rFoals').textContent=`${foals.filter(f=>f.found).length} / ${foals.length}`;$('rBones').textContent=`${bones.filter(b=>b.got).length} / ${bones.length}`;}
$('bHome').onclick=()=>{if(!isRace){save.gems+=ridesGems;ridesGems=0;}tire();store();enterStable();};
const R=.8;
function pushOut(p){for(const s of S){if(s.one)continue;if(p.y>=s.top-.45||p.y+2.2<=s.bottom)continue;
  if(s.t==='box'){const cx=Math.max(s.x0,Math.min(p.x,s.x1)),cz=Math.max(s.z0,Math.min(p.z,s.z1)),dx=p.x-cx,dz=p.z-cz,d=Math.hypot(dx,dz);
    if(d<R&&d>1e-5){const k=(R-d)/d;p.x+=dx*k;p.z+=dz*k;}else if(d<=1e-5){const l=p.x-s.x0,r=s.x1-p.x,f=p.z-s.z0,b=s.z1-p.z,m=Math.min(l,r,f,b);
      if(m===l)p.x=s.x0-R;else if(m===r)p.x=s.x1+R;else if(m===f)p.z=s.z0-R;else p.z=s.z1+R;}}
  else{const dx=p.x-s.x,dz=p.z-s.z,d=Math.hypot(dx,dz),rr=s.r+R;if(d<rr){if(d<1e-5)p.x+=rr;else{const k=(rr-d)/d;p.x+=dx*k;p.z+=dz*k;}}}}}
const SPKM={};function spkMat(c){return SPKM[c]||(SPKM[c]=new THREE.SpriteMaterial({map:glowTex,color:c,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));}
function burst(x,y,z,cols,n,spd=5){for(let i=0;i<n;i++){if(parts.length>260)break;const m=new THREE.Sprite(spkMat(cols[i%cols.length]));const sz=.35+Math.random()*.35;m.scale.set(sz,sz,sz);m.position.set(x,y,z);scene.add(m);
  const a=Math.random()*Math.PI*2,e=Math.random()*1.2;parts.push({m,sz,vx:Math.cos(a)*spd*Math.cos(e),vy:1.5+Math.random()*spd,vz:Math.sin(a)*spd*Math.cos(e),life:.8+Math.random()*.5,max:1.3});}}
function trail(x,y,z,cols,spd=1){if(parts.length>260)return;const m=new THREE.Sprite(spkMat(cols[Math.floor(Math.random()*cols.length)]));const sz=.25+Math.random()*.25;m.scale.set(sz,sz,sz);
  m.position.set(x+(Math.random()-.5)*.8,y+(Math.random()-.5)*.4,z+(Math.random()-.5)*.8);scene.add(m);parts.push({m,sz,vx:0,vy:-.3*spd,vz:0,life:.7,max:.7,float:true,sprite:true});}
/* ---------- magic effects: rainbow trail, dust, jump/landing rings, gem pops ---------- */
const FXT=(()=>{const mk=(f)=>{const c=document.createElement('canvas');c.width=c.height=64;f(c.getContext('2d'));return new THREE.CanvasTexture(c);};
  return {star:mk(x=>{const g=x.createRadialGradient(32,32,0,32,32,30);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);
      x.fillStyle='#fff';x.beginPath();for(let i=0;i<10;i++){const a=i/10*Math.PI*2-Math.PI/2,r=i%2?7:24;x.lineTo(32+Math.cos(a)*r,32+Math.sin(a)*r);}x.fill();}),
    ring:mk(x=>{x.strokeStyle='rgba(255,255,255,.95)';x.lineWidth=5;x.beginPath();x.arc(32,32,26,0,6.283);x.stroke();x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=10;x.beginPath();x.arc(32,32,24,0,6.283);x.stroke();}),
    heart:mk(x=>{x.fillStyle='#fff';x.beginPath();x.moveTo(32,54);x.bezierCurveTo(4,34,10,8,32,22);x.bezierCurveTo(54,8,60,34,32,54);x.fill();}),
    dust:mk(x=>{const g=x.createRadialGradient(32,32,0,32,32,30);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(.5,'rgba(255,255,255,.45)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);})};})();
let FXL=[];const FXM={};
function fxMat(tex,c,add){const k=tex+'|'+c+'|'+add;return FXM[k]||(FXM[k]=new THREE.SpriteMaterial({map:FXT[tex],color:c,transparent:true,depthWrite:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending}));}
function fxSpawn(tex,c,add,x,y,z,o){if(!GFXON||FXL.length>320)return;const m=new THREE.Sprite(fxMat(tex,c,add).clone());m.position.set(x,y,z);scene.add(m);
  FXL.push(Object.assign({m,t:0,life:.8,s0:.3,s1:.3,vx:0,vy:0,vz:0,g:0,a0:1,rot:0},o));}
function fxFlat(x,y,z,c,s1,life){if(!GFXON)return;const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:FXT.ring,color:c,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
  m.rotation.x=-Math.PI/2;m.position.set(x,y,z);scene.add(m);FXL.push({m,t:0,life,s0:.4,s1,vx:0,vy:0,vz:0,g:0,a0:.55,flat:true});}
function fxGem(x,y,z,c){fxSpawn('ring',0xffffff,true,x,y,z,{s0:.3,s1:2.4,life:.4,a0:.55});fxSpawn('ring',c,true,x,y,z,{s0:.2,s1:1.8,life:.5,a0:.7});
  for(let i=0;i<10;i++){const a=i/10*6.283;fxSpawn('star',i%2?0xffffff:c,true,x,y,z,{s0:.55,s1:.1,life:.7+Math.random()*.3,vx:Math.cos(a)*3.2,vy:2+Math.random()*2.5,vz:Math.sin(a)*3.2,g:6});}}
function fxJump(x,y,z,big){fxFlat(x,y+.08,z,big?0xffd6f0:0xfff3d0,big?3.4:2.2,.45);const n=big?14:8;for(let i=0;i<n;i++){const a=Math.random()*6.283;fxSpawn('star',RAIN[i%6],true,x+Math.cos(a)*.5,y+.3,z+Math.sin(a)*.5,{s0:.45,s1:.05,life:.6,vx:Math.cos(a)*2.5,vy:1.5+Math.random()*2,vz:Math.sin(a)*2.5,g:5});}}
function fxSplash(x,y,z,big){for(let i=0;i<(big?16:5);i++){const a=Math.random()*6.283,sp=big?3:1.6;fxSpawn('dust',i%3?0xe8f8ff:0xffffff,false,x+Math.cos(a)*.4,y+.2,z+Math.sin(a)*.4,{s0:.22,s1:.08,life:.6+Math.random()*.3,vx:Math.cos(a)*sp,vy:3+Math.random()*(big?4:2.5),vz:Math.sin(a)*sp,g:14,a0:.9});}}
function fxDust(x,y,z,c,big){for(let i=0;i<(big?7:1);i++){const a=Math.random()*6.283,sp=big?2.2:.5;fxSpawn('dust',c,false,x+(Math.random()-.5)*.5,y+.2,z+(Math.random()-.5)*.5,{s0:big?.5:.35,s1:big?1.8:1.3,life:big?.7:.6,vx:Math.cos(a)*sp,vy:.5+Math.random()*.4,vz:Math.sin(a)*sp,a0:big?.55:.45});}}
let fxLast=0;function fxUpdate(){const now=performance.now(),dt=Math.min(.05,(now-(fxLast||now))/1000);fxLast=now;
  for(const f of FXL){f.t+=dt;const k=Math.min(1,f.t/f.life);f.vy-=f.g*dt;f.m.position.x+=f.vx*dt;f.m.position.y+=f.vy*dt;f.m.position.z+=f.vz*dt;f.vx*=1-dt*1.5;f.vz*=1-dt*1.5;
    const s=f.s0+(f.s1-f.s0)*(1-Math.pow(1-k,2));f.m.scale.set(s,s,s);f.m.material.opacity=f.a0*(1-k*k);if(f.m.material.rotation!==undefined&&!f.flat)f.m.material.rotation+=dt*2;if(k>=1){scene.remove(f.m);f.m.material.dispose();if(f.flat)f.m.geometry.dispose();}}
  FXL=FXL.filter(f=>f.t<f.life);
  for(const r of RIBBONS)if(!r.used)r.mesh.visible=false;for(const r of RIBBONS)r.used=false;}
/* rainbow ribbon trail behind the unicorn */
const RIBBONS=[];const RB_N=40;
function ribbonFor(p){if(p._rb)return p._rb;const bands=6,vpc=bands*2,pos=new Float32Array(RB_N*vpc*3),col=new Float32Array(RB_N*vpc*4),idx=[];const C=new THREE.Color();
  for(let i=0;i<RB_N;i++)for(let b=0;b<bands;b++){C.setHex(RAIN[b]);for(let e=0;e<2;e++){const v=i*vpc+b*2+e;col[v*4]=C.r;col[v*4+1]=C.g;col[v*4+2]=C.b;col[v*4+3]=1;}}
  for(let i=0;i<RB_N-1;i++)for(let b=0;b<bands;b++){const a=i*vpc+b*2,c=(i+1)*vpc+b*2;idx.push(a,c,a+1,a+1,c,c+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('col',new THREE.BufferAttribute(col,4));g.setIndex(idx);
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{op:{value:0}},vertexShader:'attribute vec4 col;varying vec4 vC;void main(){vC=col;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform float op;varying vec4 vC;void main(){gl_FragColor=vec4(vC.rgb*1.05+.05,vC.a*op*.8);}'});
  const mesh=new THREE.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=2;scene.add(mesh);const r={mesh,hist:[],op:0,used:false};RIBBONS.push(r);return p._rb=r;}
function updateRibbon(p,dt,on){if(!GFXON)return;const r=ribbonFor(p);r.used=true;r.mesh.visible=true;r.op+=((on?1:0)-r.op)*Math.min(1,dt*(on?3:2));
  const bx=p.x-Math.sin(p.face)*1.2,bz=p.z-Math.cos(p.face)*1.2,by=p.y+.85;const h=r.hist;h.unshift([bx,by,bz]);if(h.length>RB_N)h.length=RB_N;while(h.length<RB_N)h.push(h[h.length-1]);
  const pos=r.mesh.geometry.attributes.position,col=r.mesh.geometry.attributes.col,bw=.11;
  for(let i=0;i<RB_N;i++){const q=h[i],q2=h[Math.min(RB_N-1,i+1)],q0=h[Math.max(0,i-1)];let dx=q0[0]-q2[0],dz=q0[2]-q2[2];const l=Math.hypot(dx,dz);if(l<1e-4){dx=Math.sin(p.face);dz=Math.cos(p.face);}else{dx/=l;dz/=l;}
    const nx=dz,nz=-dx,fade=1-i/(RB_N-1),w=bw*(.6+.4*fade),wob=Math.sin(i*.35-time*6)*.06*(1-fade);
    for(let b=0;b<6;b++)for(let e=0;e<2;e++){const v=i*12+b*2+e,o=(2.5-b-e+.5)*w;pos.setXYZ(v,q[0]+nx*o,q[1]+wob+Math.abs(o)*.25,q[2]+nz*o);col.setW(v,fade*fade*(i<2?i/2:1));}}
  pos.needsUpdate=true;col.needsUpdate=true;r.mesh.material.uniforms.op.value=r.op;}
function updateSweepers(dt){for(const s of sweepers){const o=s.amp*Math.sin(time*s.w+s.ph),nx=s.mx+s.dx*o,nz=s.mz+s.dz*o;s.vx=(nx-s.x)/Math.max(dt,1e-4);s.vz=(nz-s.z)/Math.max(dt,1e-4);
  s.x=nx;s.z=nz;s.g.position.set(nx,topAt(nx,nz)+s.r+Math.sin(time*2+s.ph)*.15,nz);s.roll.rotation.y=Math.atan2(s.vx,s.vz);}}
function updateRide(dt,inp,canMove){
  if(P.bonk>0)P.bonk-=dt;if(P.blink>0)P.blink-=dt;if(P.boost>0)P.boost-=dt;
  let turn=inp.ix,fwd=inp.iy;if(P.bonk>0||!canMove){turn=0;fwd=0;}
  turn=Math.sign(turn)*Math.pow(Math.abs(turn),1.7);
  P.turnV=(P.turnV||0)+(turn*1.65-(P.turnV||0))*Math.min(1,dt*7);P.face-=P.turnV*dt;
  if(P.on&&P.ground&&P.ground.bridge){const b=P.ground.bridge;let a=b.ang,d=a-P.face;d=Math.atan2(Math.sin(d),Math.cos(d));if(Math.abs(d)>Math.PI/2){a+=Math.PI;d=Math.atan2(Math.sin(a-P.face),Math.cos(a-P.face));}
    if(Math.abs(turn)<.5)P.face+=d*Math.min(1,dt*3);
    const ux=Math.sin(b.ang),uz=Math.cos(b.ang),rx=P.x-b.x1,rz=P.z-b.z1,along=rx*ux+rz*uz,cx=b.x1+ux*along,cz=b.z1+uz*along;P.x+=(cx-P.x)*Math.min(1,dt*2.5);P.z+=(cz-P.z)*Math.min(1,dt*2.5);}
  const sp=(isRace?12.5:11.5)*(P.boost>0?1.45:1)*(P.inWater?.7:1);let v=fwd>=0?Math.max(fwd,Math.abs(turn)*.45)*sp:fwd*4;
  if(P.boost>0)v=Math.max(v,sp*.85);
  P.onIce=!!(WD.ice&&P.on&&!P.ground&&Math.hypot(P.x-WD.ice[0],P.z-WD.ice[1])<WD.ice[2]-3);
  if(P.onIce&&Math.hypot(P.vx,P.vz)>4&&Math.random()<.3)trail(P.x,P.y+.2,P.z,[0xffffff,0xd8f0ff]);
  if(GFXON&&P.on&&Math.hypot(P.vx,P.vz)>6&&Math.random()<.22)trail(P.x-Math.sin(P.face)*.9,P.y+.2,P.z-Math.cos(P.face)*.9,[0xfff3b0,0xffffff,0xffb3d1,0xc9b3ff]);
  const k=Math.min(1,dt*(P.onIce?1.3:P.on?6:5));
  if(P.bonk<=0&&!(P.aim&&!P.on)){P.vx+=(Math.sin(P.face)*v-P.vx)*k;P.vz+=(Math.cos(P.face)*v-P.vz)*k;}
  P.x+=P.vx*dt;P.z+=P.vz*dt;pushOut(P);
  if(WD.H){const r=Math.hypot(P.x-WD.cx,P.z-WD.cz),lim=WD.R-10;if(r>lim){P.x=WD.cx+(P.x-WD.cx)/r*lim;P.z=WD.cz+(P.z-WD.cz)/r*lim;}}
  else{const r=Math.hypot(P.x,P.z-15);if(r>WD.R){P.x*=WD.R/r;}}
  P.coy=P.on?.12:P.coy-dt;P.buf=inp.jp?.15:P.buf-dt;
  if(canMove&&P.buf>0&&P.coy>0){P.vy=14.5;P.on=false;P.coy=0;P.buf=0;P.dbl=true;sfx('jump');fxJump(P.x,P.y,P.z,false);fxDust(P.x,P.y,P.z,0xf3e3c8,true);play(rig,'Gallop_Jump',1.3,.15,true);}
  else if(canMove&&inp.jp&&!P.on&&P.dbl){P.vy=14;P.dbl=false;P.buf=0;sfx('magic');fxJump(P.x,P.y+.4,P.z,true);burst(P.x,P.y+.6,P.z,RAIN,16,3);}
  if(P.on)P.aim=null;
  let g=26;if(P.vy>0&&!inp.j&&!P.aim&&!P.flying)g=46;
  const wings=!!(P.wear||save.wear).wings&&canMove;
  P.flying=wings&&inp.j&&!P.on&&!P.aim&&!(P.dbl&&P.vy>8);
  if(P.flying){const above=P.y-Math.max(terrainAt(P.x,P.z),WD.waterY!==null?WD.waterY:-1e9);const tv=above<18?6.5:0;P.vy+=(tv-P.vy)*Math.min(1,dt*3)+g*dt;if(Math.random()<.5)trail(P.x-Math.sin(P.face)*1.2,P.y+1.4,P.z-Math.cos(P.face)*1.2,[0xffffff,0xffe7f3,0xfff3b0]);}
  const glide=canMove&&inp.j&&!P.dbl&&P.vy<0&&!P.on&&!P.flying;P.glide=glide||(wings&&!P.on&&!inp.j&&P.vy<0);
  const prevY=P.y;P.vy=Math.max(P.glide?(glide?-3.2:-5):-30,P.vy-g*dt);if(glide&&Math.random()<.4)trail(P.x,P.y+1,P.z,RAIN);P.y+=P.vy*dt;
  const gr=groundAt(P.x,P.z,Math.max(prevY,P.y)),gs=gSolid,wasOn=P.on,fall=P.vy;
  P.on=false;if(P.vy<=0&&P.y<=gr){P.y=gr;P.vy=0;P.on=true;P.ground=gs;P.dbl=false;if(!wasOn&&fall<-7){P.land=Math.min(1,-fall/22);fxDust(P.x,P.y,P.z,0xf3e3c8,true);fxFlat(P.x,P.y+.08,P.z,0xfff3d0,2,.35);}}
  else if(P.on===false&&wasOn&&P.vy<=0&&P.y-gr<.6&&P.y>gr){P.y=gr;P.vy=0;P.on=true;}
  const wasWater=P.inWater;P.inWater=WD.waterY!==null&&WD.H&&P.on&&WD.H(P.x,P.z)<WD.waterY-.1&&!gs;
  if(P.inWater&&Math.hypot(P.vx,P.vz)>2&&Math.random()<.35)burst(P.x+(Math.random()-.5),WD.waterY+.1,P.z+(Math.random()-.5),[0xbfe9ff,0x8fd3ff],1,1.6);
  if(P.inWater&&!wasWater){sfx('splash');fxSplash(P.x,WD.waterY,P.z,true);}
  if(P.inWater){P._rip=(P._rip||0)-dt;const mv=Math.hypot(P.vx,P.vz);if(P._rip<=0){P._rip=mv>3?.16:.6;fxFlat(P.x-Math.sin(P.face)*.6,WD.waterY+.06,P.z-Math.cos(P.face)*.6,0xdff4ff,mv>3?3.2:2.2,1.1);if(mv>3)fxSplash(P.x+Math.sin(P.face)*.9,WD.waterY,P.z+Math.cos(P.face)*.9,false);}}
  if(P.on){for(const s of springs)if(Math.hypot(P.x-s.x,P.z-s.z)<1.9&&Math.abs(P.y-s.y)<.35){P.vy=24;P.on=false;P.dbl=true;s.t=.35;sfx('boing');P.aim=S.filter(q=>q.one&&q.t==='box'&&!q.mover&&Math.hypot((q.x0+q.x1)/2-s.x,(q.z0+q.z1)/2-s.z)<16).sort((a,b)=>Math.hypot((a.x0+a.x1)/2-s.x,(a.z0+a.z1)/2-s.z)-Math.hypot((b.x0+b.x1)/2-s.x,(b.z0+b.z1)/2-s.z))[0]||null;if(P.aim){const tx=(P.aim.x0+P.aim.x1)/2,tz=(P.aim.z0+P.aim.z1)/2,h=P.aim.top-P.y,gg=26,disc=24*24-2*gg*h;const t=disc>0?(24+Math.sqrt(disc))/gg:1.6;P.vx=(tx-P.x)/t;P.vz=(tz-P.z)/t;P.face=Math.atan2(tx-P.x,tz-P.z);}play(rig,'Gallop_Jump',1,.15,true);}
    let ok=!gs||!gs.one;for(const [ox,oz] of [[1,0],[-1,0],[0,1],[0,-1]])if(Math.abs(groundAt(P.x+ox,P.z+oz,P.y)-P.y)>.4)ok=false;
    if(ok)P.safe={x:P.x,y:P.y,z:P.z};}
  if(P.y<-12){sfx('oops');P.x=P.safe.x;P.y=P.safe.y+.05;P.z=P.safe.z;P.vx=P.vz=P.vy=0;P.blink=1.2;if(P===P1){dog.x=P.x-1;dog.z=P.z-1;dog.y=P.y;}}
  for(const w of sweepers){const d=Math.hypot(P.x-w.x,P.z-w.z);
    if(d<w.r+R&&P.y<w.g.position.y+w.r-.3&&P.bonk<=0&&!(P.ground&&P.ground.bridge)){const n=d>.01?1/d:1;P.vx=(P.x-w.x)*n*8;P.vz=(P.z-w.z)*n*8;P.vy=7;P.on=false;P.bonk=.45;P.blink=.6;sfx('bonk');}}
  for(const it of gems){if(it.got)continue;if(Math.hypot(it.x-P.x,it.z-P.z)<1.5&&Math.abs(it.y-(P.y+1.4))<1.7){it.got=true;world.remove(it.m);ridesGems++;sfx('gem');P.cheer=1;fxGem(it.x,it.y,it.z,it.c||0xff8fc8);burst(it.x,it.y,it.z,[0xffffff,GEMC[0],GEMC[1]],6,3);updRideHud();}}
  const cy=P.y+1.8;
  for(const r of rings){if(r.got)continue;const dx=P.x-r.x,dz=P.z-r.z,ax=Math.sin(r.ry),az=Math.cos(r.ry);const along=dx*ax+dz*az,side=dx*az-dz*ax;
    if(Math.abs(along)<1.2&&Math.hypot(side,cy-r.y)<1.7){r.got=true;ridesGems+=5;sfx('ring');P.cheer=1.6;fxGem(r.x,r.y,r.z,0xffd166);fxGem(r.x,r.y,r.z,0xff8fc8);burst(r.x,r.y,r.z,[0xffd166,0xfff3b0,0xffffff],24,5);world.remove(r.g);
      banner('+5','Zvjezdani prsten!','',true,true);setTimeout(()=>{if(rideState==='play')banner('','','',false);},900);}}
  for(const b of boosts){if(Math.hypot(P.x-b.x,P.z-b.z)<2.2&&P.boost<=0.3){P.boost=1.6;sfx('boost');burst(P.x,P.y+.5,P.z,RAIN,14,4);}}
  for(const f of foals){if(f.found)continue;if(Math.hypot(P.x-f.x,P.z-f.z)<3){f.found=true;world.remove(f.beacon);sfx('found');burst(f.x,f.y+1.5,f.z,[0xff6fa5,0xffd166,0xffffff],30,5);
    const n=foals.filter(q=>q.found).length;banner(`${n} / ${foals.length}`,n<foals.length?'Pronašla si malog jednoroga!':'Svi mali jednorozi su s tobom!','',true,true);
    setTimeout(()=>{if(rideState==='play')banner('','','',false);},1500);updRideHud();}}
}
function updateFoals(dt){
  let k=0;
  for(const f of foals){const R2=f.rig;R2.mixer.update(dt);
    if(!f.found){f.heart.rotation.y+=dt*2;f.heart.position.y=2.4+Math.sin(time*2+f.ph)*.2;
      if(f.rig.cur!=='Idle'&&f.rig.cur!=='Eating')play(R2,'Idle');if(Math.random()<.003)play(R2,R2.cur==='Idle'?'Eating':'Idle');continue;}
    k++;const back=[0,.6,3.2,3.4][k]||4,side=[0,3,4.6,-4.4][k]||3;const tx=P.x-Math.sin(P.face)*back+Math.cos(P.face)*side,tz=P.z-Math.cos(P.face)*back-Math.sin(P.face)*side;
    const dx=tx-f.x,dz=tz-f.z,d=Math.hypot(dx,dz);if(d>25){f.x=tx;f.z=tz;}
    const v=Math.min(d*3,16);if(d>.1){f.x+=dx/d*v*dt;f.z+=dz/d*v*dt;}
    const ty=groundAt(f.x,f.z,f.y+1.2);f.y+=((ty>-8?ty:(P.on?P.y:f.y))-f.y)*Math.min(1,dt*8);
    if(d>.6){const a=Math.atan2(dx,dz);let df=a-f.face;df=Math.atan2(Math.sin(df),Math.cos(df));f.face+=df*Math.min(1,dt*7);}
    f.rig.wrap.position.set(f.x,f.y,f.z);f.rig.wrap.rotation.y=f.face;
    play(R2,v>5?'Gallop':v>.8?'Walk':'Idle',v>5?v/11:Math.max(.6,v/3));}
}

/* race logic */
function trackProgress(x,z,hint){const P2=WD.path,L=WD.cum,n=P2.length;let best=hint,bd=1e9;
  for(let i=0;i<n-1;i++){const a=P2[i],b=P2[i+1];const vx=b[0]-a[0],vz=b[1]-a[1],l=vx*vx+vz*vz;let t=l?((x-a[0])*vx+(z-a[1])*vz)/l:0;t=Math.max(0,Math.min(1,t));
    const d=Math.hypot(x-(a[0]+vx*t),z-(a[1]+vz*t));const s=L[i]+(L[i+1]-L[i])*t;const pen=Math.abs(s-hint)>45?60:0;
    if(d+pen<bd){bd=d+pen;best=s;}}return best;}
const FENCE_W=6.8;
function raceFence(LL){const posts=[],rails=[];const step=2.6;
  for(const sd of [-1,1]){let prev=null;
    for(let s=0;s<=LL+.01;s+=step){const p=WD.at(Math.min(s,LL-.01)),nx=Math.cos(p.ry),nz=-Math.sin(p.ry);const onB=WD.bridges.some(b=>s>b[0]-2&&s<b[1]+2);
      if(onB){prev=null;continue;}const x=p.x+nx*FENCE_W*sd,z=p.z+nz*FENCE_W*sd,y=topAt(x,z);posts.push([x,y,z]);
      if(prev){const dx=x-prev[0],dz=z-prev[2],len=Math.hypot(dx,dz);if(len<step*2.2)rails.push([(x+prev[0])/2,(y+prev[1])/2,(z+prev[2])/2,len,Math.atan2(dx,dz),y-prev[1]]);}prev=[x,y,z];}}
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
  const pm=new THREE.InstancedMesh(new THREE.CylinderGeometry(.11,.13,1.25,8),mat(0xffffff),posts.length);posts.forEach((p,i)=>{m4.compose(new THREE.Vector3(p[0],p[1]+.6,p[2]),q.identity(),new THREE.Vector3(1,1,1));pm.setMatrixAt(i,m4);});
  pm.castShadow=true;world.add(pm);
  for(const [hy,c] of [[.55,0xffd6e8],[1.0,0xff9ec7]]){const rm=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat(c),rails.length);
    rails.forEach((r,i)=>{e.set(-Math.atan2(r[5],r[3]),r[4],0,'YXZ');q.setFromEuler(e);m4.compose(new THREE.Vector3(r[0],r[1]+hy,r[2]),q,new THREE.Vector3(.09,.11,r[3]+.15));rm.setMatrixAt(i,m4);});rm.castShadow=true;world.add(rm);}
  for(const p of posts)if(Math.random()<.12){sph(p[0],p[1]+1.3,p[2],.2,.2,.2,[0xff6fa5,0xffe066,0x9ef0ff][Math.floor(Math.random()*3)]);}}
function fenceClamp(Q,prog){const p=WD.at(prog),nx=Math.cos(p.ry),nz=-Math.sin(p.ry),d=(Q.x-p.x)*nx+(Q.z-p.z)*nz,lim=FENCE_W-.9;
  if(Math.abs(d)>lim){const over=d-Math.sign(d)*lim;Q.x-=nx*over;Q.z-=nz*over;const vn=Q.vx*nx+Q.vz*nz;if(Math.sign(vn)===Math.sign(d)){Q.vx-=nx*vn;Q.vz-=nz*vn;}}}
function updateRace(dt){
  const rc=race,TL=WD.trackLen;
  rc.progress=trackProgress(P.x,P.z,rc.progress);fenceClamp(P,rc.progress);
  const nA=arches.length;
  if(rc.cp<nA){const na=arches[rc.cp];const ax=Math.sin(na.ry),az=Math.cos(na.ry),dx=P.x-na.x,dz=P.z-na.z;
    if(Math.hypot(dx,dz)<7&&dx*ax+dz*az>-4.5){rc.cp++;sfx('gem');burst(na.x,topAt(na.x,na.z)+4,na.z,RAIN,12,4);$('rLap').textContent=`Vrata ${rc.cp} / ${nA}`;
      if(rc.cp>=nA&&!rc.finished){finishPlayer();}
      else if(WD.laps>1&&rc.cp===WD.gpl){banner('2. krug!','Još jedan krug do cilja!','',true,true);sfx('ring');setTimeout(()=>{if(rideState==='play')banner('','','',false);},1400);}
      else if(rc.cp===nA-1){banner('Još malo!','Cilj je ispred tebe!','',true,true);setTimeout(()=>{if(rideState==='play')banner('','','',false);},1300);}}}
  const pS=Math.min(rc.progress,rc.cp<nA?arches[rc.cp].s+2:TL);rc.pS=pS;
  for(const r of rc.rivals){
    if(!r.done){const diff=pS-r.s;let target=12.3*r.skill+Math.max(-2.4,Math.min(3,diff*.06));if(diff<-16)target-=1.8;
      if(WD.bridges.some(b=>r.s>b[0]&&r.s<b[1]))target*=.92;
      r.v+=(target-r.v)*Math.min(1,dt*1.5);r.s+=r.v*dt;if(r.s>=TL-8){r.done=true;r.finishT=rc.t;if(!rc.order.includes(r.n))rc.order.push(r.n);}}
    else{r.v=Math.max(0,r.v-dt*7);r.s=Math.min(TL-.1,r.s+r.v*dt);}
    const p=WD.at(r.s),q=WD.at(r.s+2),nx=Math.cos(p.ry),nz=-Math.sin(p.ry),lane=r.lane+Math.sin(rc.t*.5+r.skill*10)*.8;
    r.x=p.x+nx*lane;r.z=p.z+nz*lane;
    let hop=0;for(const h of WD.hurdles){const d=r.s-h;if(d>-4&&d<4)hop=Math.max(hop,Math.cos(d/4*Math.PI/2)*2.2);}
    r.y=topAt(r.x,r.z)+hop;r.face=Math.atan2(q.x-p.x,q.z-p.z);
    const dx=P.x-r.x,dz=P.z-r.z,d=Math.hypot(dx,dz);if(d<1.6&&d>.01&&Math.abs(P.y-r.y)<1.5){P.x+=dx/d*(1.6-d)*.6;P.z+=dz/d*(1.6-d)*.6;}
    r.rig.wrap.position.set(r.x,r.y,r.z);r.rig.wrap.rotation.y=r.face;play(r.rig,r.done&&r.v<1?'Idle_2':hop>.3?'Gallop_Jump':'Gallop',hop>.3?1.4:Math.max(.5,r.v/11));r.rig.mixer.update(dt);}
  if(!rc.finished){const ahead=rc.rivals.filter(r=>r.done||r.s>pS).length;$('rPlace').textContent=`${ahead+1}.`;}
  if(rc.cp<nA){const nxt=arches[rc.cp];arrow.visible=true;arrow.position.set(P.x,P.y+.15,P.z);arrow.rotation.y=Math.atan2(nxt.x-P.x,nxt.z-P.z);}else arrow.visible=false;
}
function finishPlayer(){const rc=race;rc.order.push('ME');rc.finished=true;rideState='finish';stateT=0;
  rc.order=rc.order.filter(n=>n!=='ME');const ahead=rc.rivals.filter(r=>r.done).length;rc.order.splice(ahead,0,'ME');const place=ahead+1;const reward=[50,30,20,10][place-1];save.gems+=reward;
  rc.prize=null;if(place===1){const pid=RACE_PRIZE[rc.ri];if(pid&&!save.owned.includes(pid)){save.owned.push(pid);save.wear[pid]=true;rc.prize=DECOR.find(d=>d.id===pid);rebuildRigSoon=true;}}
  if(!save.trophies[rc.ri]||place<save.trophies[rc.ri])save.trophies[rc.ri]=place;tire();store();
  sfx(place===1?'win':'found');burst(P.x,P.y+3,P.z,RAIN,70,8);rc.place=place;rc.reward=reward;
  banner(place===1?'Pobjeda!':`${place}. mjesto`,place===1?`${NAMES[save.name]} je najbrži jednorog!`:'Bravo, Leona!','',true,true);}
function showResults(){const rc=race;mode='results';
  const rest=rc.rivals.filter(r=>!rc.order.includes(r.n)).sort((a,b)=>b.s-a.s).map(r=>r.n);const order=rc.order.concat(rest);
  const col=n=>n==='ME'?BODY[save.body].c:RIVALS.find(r=>r.n===n).body;const hex=c=>'#'+c.toString(16).padStart(6,'0');
  $('resTitle').textContent=rc.place===1?'Pobjeda!':`${rc.place}. mjesto!`;
  $('resList').innerHTML=order.map((n,i)=>`<div class="res${n==='ME'?' me':''}"><b>${i+1}.</b><span class="dot" style="background:${hex(col(n))}"></span>${n==='ME'?`Leona i ${NAMES[save.name]}`:n}</div>`).join('');
  $('resMsg').innerHTML=`Nagrada: ${rc.reward} dragulja`+(rc.place<=3?' i pehar na polici u štali!':'')+(rc.prize?`<br>🎁 Posebna nagrada: <b>${rc.prize.n}</b>! Jednorog ju već nosi.`:(rc.place===1&&RACE_PRIZE[rc.ri]?'':(RACE_PRIZE[rc.ri]&&!save.owned.includes(RACE_PRIZE[rc.ri])?`<br>Pobijedi za posebnu nagradu: ${DECOR.find(d=>d.id===RACE_PRIZE[rc.ri]).n}!`:'')));if(rc.prize)say(`Bravo! Osvojila si nagradu: ${rc.prize.n}!`,true);showScreen('sResults');banner('','','',false);}
$('bRaceAgain').onclick=()=>race.duo?startDuoRace(race.ri):startRace(race.ri);
$('bResDone').onclick=()=>enterStable();

/* ---------- animation ---------- */
let blinkT=2;
function poseLeonaRiding(run,air){const U=leona.userData;
  U.legs.forEach((l,i)=>{const s=i?1:-1;l.hip.rotation.set(-1.35,0,s*.85);l.knee.rotation.x=1.45;});
  U.arms.forEach((a,i)=>{a.sh.rotation.x=-1.0+(air?-.6:0)+Math.sin(time*3+i)*.05;a.sh.rotation.z=(i?-1:1)*.15;a.el.rotation.x=-.6;});
  U.torso.rotation.x=.18+.14*run;U.torso.rotation.y=0;U.hips.position.y=.56;U.head.rotation.x=-.25*run-.05;U.head.rotation.y=0;
  U.pony.rotation.x=.3+Math.sin(time*12)*.3*run+(air?.5:0);if(U.skirt){U.skirt.scale.set(1.15,.55,1.15);U.skirt.position.y=.06;}}
function poseLeonaStanding(){const U=leona.userData;
  U.legs.forEach(l=>{l.hip.rotation.set(0,0,0);l.knee.rotation.x=.05;});
  if(!(anim&&anim.kind==='pet'))U.arms.forEach((a,i)=>{a.sh.rotation.x=Math.sin(time*1.6+i)*.06;a.sh.rotation.z=(i?1:-1)*.1;a.el.rotation.x=-.2;});
  U.torso.rotation.set(0,0,0);U.torso.scale.y=1+Math.sin(time*2.2)*.015;U.hips.position.y=.56;U.head.rotation.set(Math.sin(time*.9)*.05,0,Math.sin(time*1.3)*.06);
  U.pony.rotation.x=.15+Math.sin(time*3)*.06;if(U.skirt){U.skirt.scale.set(1,1,1);U.skirt.position.y=0;U.skirt.rotation.y=Math.sin(time*1.7)*.08;}}
function dogBones(dt,tx,tz){let x=tx,z=tz,sniff=false;dog.dig=null;
  if(!isRace&&rideState==='play'&&bones.length){let best=null,bd=24;for(const b of bones){if(b.got)continue;const d=Math.hypot(b.x-P.x,b.z-P.z);if(d<bd&&Math.abs(b.y-P.y)<7){bd=d;best=b;}}
    if(best){sniff=true;const ang=Math.atan2(P.x-best.x,P.z-best.z);x=best.x+Math.sin(ang)*.9;z=best.z+Math.cos(ang)*.9;
      if(!best.hinted){best.hinted=true;banner('Vau vau!','Zara je nešto nanjušila. Dojaši do nje!','',true,true);setTimeout(()=>{if(rideState==='play'&&$('bnT').textContent==='Vau vau!')banner('','','',false);},1800);}
      if(Math.hypot(dog.x-x,dog.z-z)<1.3){dog.dig=best;best.gl.visible=Math.sin(time*8)>-.3;dog.barkT=(dog.barkT||0)-dt;if(dog.barkT<=0){dog.barkT=1.3;sfx('bark');barkBubble.visible=true;dog.bubT=.6;}}}
    for(const b of bones){if(b.got||Math.hypot(P.x-b.x,P.z-b.z)>2.8||Math.abs(P.y-b.y)>3)continue;b.got=true;b.g.remove(b.b);b.gl.visible=false;ridesGems+=3;sfx('found');setTimeout(()=>sfx('bark'),250);
      burst(b.x,b.y+.6,b.z,[0xfff3b0,0xffffff,0xff6fa5],18,4);carryBone.visible=true;dog.carry=3.5;const n=bones.filter(q=>q.got).length;
      banner(`Kost ${n} / ${bones.length}`,n<bones.length?'Zara je presretna! +3 dragulja':'Sve kosti! Zara je najsretnija psica!','',true,true);setTimeout(()=>{if(rideState==='play')banner('','','',false);},1600);updRideHud();}}
  if(dog.bubT>0){dog.bubT-=dt;if(dog.bubT<=0)barkBubble.visible=false;}
  if(dog.carry>0){dog.carry-=dt;if(dog.carry<=0)carryBone.visible=false;}
  return {x,z,sniff};}
function animateDog(dt,tx,tz,ty,happy,sniff){
  const dx=tx-dog.x,dz=tz-dog.z,dd=Math.hypot(dx,dz);if(dd>(sniff?40:18)&&P.on){dog.x=tx;dog.z=tz;dog.y=ty;}
  const dsp=Math.min(dd*4,15);if(dd>.05){dog.x+=dx/dd*dsp*dt;dog.z+=dz/dd*dsp*dt;}
  const dgr=groundAt(dog.x,dog.z,dog.y+1.2);const yy=dgr>-1e8&&dgr>-8?dgr:(P.on?ty:dog.y);dog.y+=(yy-dog.y)*Math.min(1,dt*8);
  const a=dd>.3?Math.atan2(dx,dz):Math.atan2(P.x-dog.x,P.z-dog.z);let df=a-dog.face;df=Math.atan2(Math.sin(df),Math.cos(df));dog.face+=df*Math.min(1,dt*(dd>.3?8:3));
  const drun=Math.min(1,dsp/6);dog.anim+=dt*Math.max(drun,.05);
  zara.position.set(dog.x,dog.y+(happy?Math.abs(Math.sin(time*6+1))*.35:0),dog.z);zara.rotation.y=dog.face;
  const Z=zara.userData,dph=dog.anim*15;Z.legs.forEach((l,i)=>{l.rotation.x=Math.sin(dph+[0,.5,Math.PI,Math.PI+.5][i])*.85*drun;});
  Z.body.position.y=.48+Math.abs(Math.sin(dph))*.07*drun;Z.body.rotation.x=Math.sin(dph)*.12*drun;
  Z.head.rotation.z=Math.sin(time*.7)*.25*(1-drun);Z.ears.forEach((e,i)=>{e.rotation.x=Math.sin(dph+i)*.45*drun-.1;});
  Z.tail.rotation.z=Math.sin(time*(happy||dog.dig?24:16))*.6;Z.tongue.visible=drun>.3||happy;
  if(dog.dig&&drun<.3){Z.body.rotation.x=.35;Z.head.rotation.z=0;Z.legs[0].rotation.x=Math.sin(time*28)*.9-.4;Z.legs[1].rotation.x=Math.sin(time*28+Math.PI)*.9-.4;if(Math.random()<.25)burst(dog.x+Math.sin(dog.face)*.6,dog.y+.2,dog.z+Math.cos(dog.face)*.6,[0xc9a27a,0xe6c9a0],1,1.5);}
  dShadow.position.set(dog.x,dog.y+.03,dog.z);dShadow.scale.setScalar(.42);
}
function animateRide(dt){
  const happy=rideState==='win'||(rideState==='finish')||!!P.done;const sp=Math.hypot(P.vx,P.vz),run=Math.min(1,sp/11),air=!P.on;
  P.land=Math.max(0,P.land-dt*4);
  rig.wrap.position.set(P.x,P.y-P.land*.1,P.z);rig.wrap.rotation.y=P.face;rig.wrap.visible=!(P.blink>0&&Math.floor(P.blink*12)%2);
  if(!(rig.once&&rig.acts[rig.once].isRunning())){
    if(happy&&sp<1)play(rig,'Idle_2',1);else if(air)play(rig,'Gallop',.6);else if(sp>5)play(rig,'Gallop',Math.max(.7,sp/10));else if(sp>.6)play(rig,'Walk',Math.max(.6,sp/2.6));else play(rig,'Idle');}
  {const W=P.wear||save.wear;if(GFXON&&sp>3&&(W.startrail||W.hearttrail)&&Math.random()<.5){const hx=P.x-Math.sin(P.face)*1.3+(Math.random()-.5)*.6,hz=P.z-Math.cos(P.face)*1.3+(Math.random()-.5)*.6;
    if(W.startrail)fxSpawn('star',[0xfff3b0,0xffffff,0xffd166][Math.floor(Math.random()*3)],true,hx,P.y+.8+Math.random()*.8,hz,{s0:.45,s1:.05,life:.9,vy:.4,g:-.3});
    if(W.hearttrail)fxSpawn('heart',[0xff6fa5,0xff9ec7,0xffc2dc][Math.floor(Math.random()*3)],false,hx,P.y+.9+Math.random()*.8,hz,{s0:.38,s1:.08,life:1,vy:.7,g:-.4,a0:.95});}}
  updateRibbon(P,dt,mode==='ride'&&(sp>9.5||P.boost>0||P.flying||(air&&P.vy>4)));
  if(GFXON&&!air&&sp>6&&Math.random()<sp*.03){const onPath=WD&&WD.path&&th.path&&polyDist(P.x,P.z,WD.path,WD.loop)<2.6;const sand=WD&&WD.H&&WD.waterY!==null&&WD.H(P.x,P.z)<WD.waterY+.35;
    if(onPath||sand||!WD.H)fxDust(P.x-Math.sin(P.face)*.8+(Math.random()-.5)*.6,P.y,P.z-Math.cos(P.face)*.8,onPath?new THREE.Color(th.path).lerp(new THREE.Color(0xffffff),.3).getHex():sand?0xfff0cf:0xffffff,false);}
  rig.mixer.update(dt);updateHorn(rig);
  rig.wings.forEach(w=>{w.g.rotation.z=w.s*(P.flying?Math.sin(time*11)*.7+.2:air?Math.sin(time*6)*.25+.35:Math.sin(time*2)*.08-.15);});
  poseLeonaRiding(run,air);
  blinkT-=dt;const bl=blinkT<0?.12:1;if(blinkT<-.13)blinkT=2+Math.random()*3;leona.userData.eyes.forEach(e=>e.scale.y=happy?.35:bl);
  if(happy)leona.userData.arms.forEach((a,i)=>{a.sh.rotation.x=-2.7+Math.sin(time*9+i*2)*.3;a.el.rotation.x=-.2;});
  else if(P.cheer>0){P.cheer-=dt;const a=leona.userData.arms[1]||leona.userData.arms[0];const k=Math.min(1,P.cheer*3);a.sh.rotation.x=-2.6*k;a.sh.rotation.z=(Math.sin(time*16)*.35-.2)*k;a.el.rotation.x=-.3*k;leona.userData.eyes.forEach(e=>e.scale.y=.35);}
  const pg=groundAt(P.x,P.z,P.y+.1);uShadow.visible=pg>-1e8;uShadow.position.set(P.x,(pg>-1e8?pg:0)+.04,P.z);uShadow.scale.set(.9,1.5,1);uShadow.rotation.z=-P.face;
  uShadow.scale.multiplyScalar(Math.max(.3,1-(P.y-pg)*.06));
  const tx=P.x-Math.sin(P.face)*2.4-Math.cos(P.face)*1.8,tz=P.z-Math.cos(P.face)*2.4+Math.sin(P.face)*1.8;
  if(P===P1){const sn=dogBones(dt,tx,tz);
  animateDog(dt,sn.x,sn.z,P.y,happy||dog.carry>0,sn.sniff);zara.visible=rig.wrap.visible;dShadow.visible=zara.visible;}
  if(!isRace){if(castle&&!happy){const hx=castle.door.x-P.x,hz=castle.door.z-P.z;arrow.visible=Math.hypot(hx,hz)>12;arrow.position.set(P.x,P.y+.15,P.z);arrow.rotation.y=Math.atan2(hx,hz);}else arrow.visible=false;}
  else if(rideState!=='play')arrow.visible=false;
}
function animateWorld(dt){updateCritters(dt);
  for(const it of gems)if(!it.got){it.m.rotation.y+=dt*2;it.m.position.y=it.y+Math.sin(time*2.5+it.ph)*.15;}
  for(const r of rings)if(!r.got){r.g.children.forEach((c,i)=>{if(i&&c.isMesh)c.rotation.z+=dt*2;});r.g.rotation.z+=dt*.5;}
  for(const s of springs){if(s.t>0)s.t-=dt;const c=s.t>0?Math.sin((.35-s.t)/.35*Math.PI)*.15:0;s.top.position.y=.36-c;s.coil.scale.y=.24*(1-c*2);}
  for(const f of flies){
    if(f.hop){f.g.position.y=f.y+Math.abs(Math.sin(time*2.4+f.ph))*.6;f.g.rotation.z=Math.sin(time*2.4+f.ph)*.08;continue;}
    if(f.ball){f.g.position.y=f.y+Math.abs(Math.sin(time*2+f.ph))*1.5;f.g.rotation.x+=dt;continue;}
    if(f.spinTop){f.g.rotation.y+=dt*9;f.g.rotation.z=Math.sin(time*1.5+f.ph)*.12;continue;}
    if(f.train){f.cars.forEach((c,k)=>{const a=time*.18-k*.105;c.position.set(f.cx+Math.cos(a)*f.R,f.y,f.cz+Math.sin(a)*f.R);c.rotation.y=-a+Math.PI;if(!f.col)f.col=[];let q=f.col[k];if(!q){q=f.col[k]={t:'cyl',x:0,z:0,r:1.25,top:f.y+2.1,bottom:f.y-2,deco:true};S.push(q);}q.x=c.position.x;q.z=c.position.z;});continue;}
    if(f.spect){f.rig.mixer.update(dt);if(Math.random()<.004)play(f.rig,f.rig.cur==='Idle'?'Idle_2':'Idle');continue;}
    if(f.swan){const a=time*.2+f.ph;const x=f.x+Math.cos(a)*f.r,z=f.z+Math.sin(a)*f.r;f.g.position.set(x,(WD.waterY!==null?WD.waterY:0)+Math.sin(time*2+f.ph)*.03,z);f.g.rotation.y=-a;}
    else if(f.bf){const a=time*.6+f.ph;const x=f.x+Math.cos(a)*f.r,z=f.z+Math.sin(a*1.3)*f.r;f.g.position.set(x,f.y+Math.sin(time*2+f.ph)*.5,z);f.g.rotation.y=a+Math.PI/2;
      const fl=Math.sin(time*18+f.ph)*.9;f.l.rotation.z=fl;f.r2.rotation.z=-fl;}
    else{f.g.position.set(f.x+Math.sin(time*.8+f.ph)*f.r,f.y+Math.sin(time*1.3+f.ph*2)*.4,f.z+Math.cos(time*.7+f.ph)*f.r);if(f.spin)f.g.rotation.y=time*1.2+f.ph;}}
  if(WD&&WD.spin)for(const q of WD.spin){if(q.pulse){const k=1+Math.sin(time*3)*.06;q.m.scale.setScalar(k);q.m.rotation.z=Math.sin(time*.8)*.05;q.m.children.forEach((c,i)=>{if(i>2)c.rotation.z+=dt*1.5;});q.m.rotation.y=Math.sin(time*.5)*.25;}else q.m.rotation.y+=dt*q.s;}
  if(castle)castle.star.rotation.y+=dt;if(WD&&WD.clouds)WD.clouds.rotation.y+=dt*.006;
  if(mode==='ride'&&WD&&WD.stones){let lit=0;for(const st of WD.stones){if(st.lit){lit++;st.gl.material.opacity=.75+Math.sin(time*3+st.x)*.25;continue;}
      if(Math.hypot(P.x-st.x,P.z-st.z)<3.2&&Math.abs(P.y-st.y)<3){st.lit=true;lit++;st.m.color.setHex(0xfff3b0);st.gl.visible=true;st.gl.material=st.gl.material.clone();
        const n=WD.stones.filter(q=>q.lit).length;const f=520*Math.pow(2,(n%12)/12);tone(f,f,.18,'sine',.06);tone(f*1.5,f*1.5,.2,'sine',.04,.06);burst(st.x,st.y+.4,st.z,[0xfff3b0,0xffffff],5,2);
        if(n===WD.stones.length){ridesGems+=20;sfx('win');banner('+20','Upalila si sve zvjezdane kamenčiće!','',true,true);setTimeout(()=>{if(rideState==='play')banner('','','',false);},1800);}}}}
  if(WD&&WD.shoot){const sh=WD.shoot;sh.t+=dt;if(sh.t>0&&sh.t<1.3){if(!sh.on){sh.on=true;const a=Math.random()*6.3;sh.a=[Math.cos(a)*300,150+Math.random()*80,Math.sin(a)*300];sh.d=[-Math.sin(a)*240,-60,Math.cos(a)*240];}
      const k0=sh.t/1.3;sh.sps.forEach((q,i)=>{const k=Math.max(0,k0-i*.025);q.visible=true;q.position.set(sh.a[0]+sh.d[0]*k,sh.a[1]+sh.d[1]*k,sh.a[2]+sh.d[2]*k);const z=12-i*1.2;q.scale.set(z,z,z);q.material.opacity=Math.sin(k0*Math.PI)*(1-i/9);});}
    else if(sh.t>=1.3){sh.sps.forEach(q=>q.visible=false);sh.on=false;sh.t=-(3+Math.random()*5);}}
  for(const p of parts){p.life-=dt;if(!p.float)p.vy-=9*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;if(p.m.isSprite){const k=Math.max(0,p.life/(p.max||1));p.m.scale.setScalar(p.sz*(.4+.6*k));p.m.material.opacity=1;}else p.m.rotation.y+=dt*3;if(p.life<=0)scene.remove(p.m);}
  parts=parts.filter(p=>p.life>0);
}
function camRide(dt){
  let tp,tl;
  if(rideState==='play'||rideState==='count'){let d=P.face-camYaw;d=Math.atan2(Math.sin(d),Math.cos(d));camYaw+=d*Math.min(1,dt*2.6);
    const fx=Math.sin(camYaw),fz=Math.cos(camYaw);tp=new THREE.Vector3(P.x-fx*(camera.aspect<1?11.5:9.5),P.y+(camera.aspect<1?6:5),P.z-fz*(camera.aspect<1?11.5:9.5));tl=new THREE.Vector3(P.x+fx*4,P.y+2,P.z+fz*4);}
  else{tp=new THREE.Vector3(P.x+Math.sin(P.face)*8.5,P.y+3.4,P.z+Math.cos(P.face)*8.5);tl=new THREE.Vector3(P.x,P.y+2,P.z);}
  const k=Math.min(1,dt*5);camPos.lerp(tp,k);camLook.lerp(tl,k);
  const gh=WD.H?WD.H(camPos.x,camPos.z):-1e9;if(camPos.y<gh+1.2)camPos.y=gh+1.2;
  camera.position.copy(camPos);camera.lookAt(camLook);
}
function camStable(dt,orbit){
  if(mode==='dress'){const port=camera.aspect<1,a=-.23,lx=leona.position.x,lz=leona.position.z,d=port?4.6:3.4;const tp=new THREE.Vector3(lx+Math.sin(a)*d,port?1.7:1.45,lz+Math.cos(a)*d),tl=new THREE.Vector3(lx,port?.7:.85,lz);
    const k=Math.min(1,dt*3);camPos.lerp(tp,k);camLook.lerp(tl,k);camera.position.copy(camPos);camera.lookAt(camLook);return;}
  const close=mode==='create'||mode==='decor'||mode==='worlds';const port=camera.aspect<1;
  const tp=orbit?new THREE.Vector3(Math.sin(time*.2)*9,3.6,Math.cos(time*.2)*9):mode==='brush'?new THREE.Vector3(-.3,2.4,port?7.4:5.2):mode==='feed'?new THREE.Vector3(-.6,2.7,port?8:6.4):close?new THREE.Vector3(3.4,3,6.8):new THREE.Vector3(1.4,3.4,9.2);
  const tl=mode==='brush'?new THREE.Vector3(-.3,port?1.3:1.6,0):mode==='feed'?new THREE.Vector3(.5,port?.3:.7,.6):close?new THREE.Vector3(0,1.8,0):new THREE.Vector3(.3,1.8,0);
  if(window.__stOv){const o=window.__stOv;camera.position.set(o[0],o[1],o[2]);camera.lookAt(o[3],o[4],o[5]);return;}
  const k=Math.min(1,dt*3);camPos.lerp(tp,k);camLook.lerp(tl,k);camera.position.copy(camPos);camera.lookAt(camLook);
}

/* ---------- boot ---------- */
$('bStart').onclick=()=>{if(mode==='loading')return;audioInit();sfx('whinny');say(save.made?`Bok Leona! ${NAMES[save.name]} te čeka u štali.`:'Bok Leona! Napravi svog jednoroga.',true);if(save.made)enterStable();else{mode='create';buildCreate();buildStable();mode='create';showScreen('sCreate');}};
function boot(){
  const bin=Uint8Array.from(atob(window.HORSE_B64),c=>c.charCodeAt(0)).buffer;
  const go=()=>new THREE.GLTFLoader().parse(bin,'',g=>{HORSE=g;try{smoothHorse(glamOn());}catch(e){}buildStable();mode='title';camPos.set(9,4,9);$('loading').style.opacity=0;setTimeout(()=>$('loading').remove(),500);requestAnimationFrame(frame);},
    e=>{$('loading').textContent='Igra se nije učitala. Pokušaj ponovno otvoriti stranicu.';});
  if(window.LEONA_B64){const lb=Uint8Array.from(atob(window.LEONA_B64),c=>c.charCodeAt(0)).buffer;
    new THREE.GLTFLoader().parse(lb,'',g=>{LEONA_G=g;try{rebuildLeona();}catch(e){console.warn(e);}
      const goEnv=()=>{if(window.ENV_B64){const eb=Uint8Array.from(atob(window.ENV_B64),c=>c.charCodeAt(0)).buffer;new THREE.GLTFLoader().parse(eb,'',e=>{ENV_G=e;go();},e=>{console.warn(e);go();});}else go();};
      if(window.ZARA_B64){const zb=Uint8Array.from(atob(window.ZARA_B64),c=>c.charCodeAt(0)).buffer;new THREE.GLTFLoader().parse(zb,'',z=>{ZARA_G=z;try{swapZaraModel();}catch(e){console.warn(e);}goEnv();},e=>{console.warn(e);goEnv();});}else goEnv();},e=>{console.warn(e);go();});}else go();
}
let last=performance.now();
function frame(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;
  const inp=readInput();if(inp.php&&(mode==='ride'||mode==='stable'))photoReq=true;
  if(duo&&mode==='ride'){time+=dt;stateT+=dt;windU.value=time;updateSweepers(dt);updateDuo(dt,readDuo());if(duo)renderDuo();else draw();}
  else{update(dt,inp);draw();}if(photoReq){photoReq=false;capturePhoto();}requestAnimationFrame(frame);
}
const NOINP={ix:0,iy:0,j:false,jp:false,ap:false,bp:false,nav:{}};
function update(dt,inp){time+=dt;stateT+=dt;windU.value=time;
  if(mode==='fly'){updateFly(dt,inp);return;}
  if(mode==='cave'){updateCave(dt,inp);return;}
  if(mode!=='ride'){
    if(mode!=='brush'){if(inp.nav.l)nav(-1,0);if(inp.nav.r)nav(1,0);if(inp.nav.u)nav(0,-1);if(inp.nav.d)nav(0,1);}
    if((inp.ap&&mode!=='brush')||(inp.jp&&mode==='title')){if(mode==='title')$('bStart').click();else if(focusEl&&!focusEl.disabled)focusEl.click();}
    if(inp.bp){if(mode==='duo')$('bDuoBack').click();else if(mode==='album')$('bAlbumBack').click();else if(mode==='photo')$('bPhotoBack').click();else if(mode==='decor')$('bDecorDone').click();else if(mode==='dress')$('bDressDone').click();else if(mode==='worlds')$('bWorldsBack').click();else if(mode==='feed')$('bFeedDone').click();else if(mode==='brush')$('bBrushDone').click();}
    if(mode==='brush')updateBrush(dt,inp);
    $('titleHint').textContent=padOn?'Pritisni A za početak':matchMedia('(pointer:coarse)').matches?'Dodirni „Kreni!”':'Pritisni A ili Enter za početak';
    if(anim){anim.t+=dt;anim.update(anim.t);if(anim.t>=anim.dur){const a=anim;anim=null;a.end&&a.end();if(a.kind!=='feedOne'){finishCare(a.kind);}else play(rig,'Idle');}}
    if(rig){if(mode==='create'||mode==='decor')rig.wrap.rotation.y+=dt*.5;else{const ty=mode==='brush'?-1.45:mode==='feed'?.5:-.6;rig.wrap.rotation.y+=(ty-rig.wrap.rotation.y)*Math.min(1,dt*3);}rig.mixer.update(dt);}
    if(mode==='results')poseLeonaRiding(0,false);else poseLeonaStanding();
    if(mode==='dress')leona.rotation.y=-.23+Math.sin(time*.7)*.55;
    blinkT-=dt;const bl=blinkT<0?.12:1;if(blinkT<-.13)blinkT=2+Math.random()*3;leona.userData.eyes.forEach(e=>e.scale.y=bl);
    leona.visible=!(mode==='create'||mode==='decor'||mode==='brush');if(mode!=='brush')brushTool.visible=false;zara.visible=mode!=='results';
    const Z=zara.userData;Z.tail.rotation.z=Math.sin(time*9)*.5;Z.head.rotation.z=Math.sin(time*.7)*.25;Z.tongue.visible=false;Z.legs.forEach(l=>l.rotation.x=0);
    uShadow.visible=false;dShadow.visible=false;arrow.visible=false;
    if(mode==='results'&&race){for(const r of race.rivals){r.rig.mixer.update(dt);}camRide(dt);}else camStable(dt,mode==='title');
    animateWorld(dt);followSun(0,0,0);updateSparks(time,0,0,0,0xffe6f3);
  }else{
    updateSweepers(dt);
    if(isRace&&rideState==='count'){const c=Math.min(3,Math.ceil(3.5-stateT));if(c!==race.lastC){race.lastC=c;if(c>0){banner(String(c),'Pripremi se!','');sfx('beep');}else{banner('KRENI!','','');sfx('go');}}
      if(stateT>=3.5){rideState='play';stateT=0;setTimeout(()=>{if(rideState==='play')banner('','','',false);},700);}
      updateRide(dt,inp,false);updateRaceIdle(dt);}
    else if(rideState==='play'){if(!isRace&&stateT>2.8&&$('bnT').textContent.startsWith('Svijet'))banner('','','',false);
      updateRide(dt,inp,true);if(isRace){race.t+=dt;updateRace(dt);}
      if(glamOn()&&Math.hypot(P.vx,P.vz)>5&&Math.random()<dt*16){const mc=MANE[save.mane].c;burst(P.x-Math.sin(P.face)*1.7+(Math.random()-.5)*.6,P.y+1.2+Math.random()*.8,P.z-Math.cos(P.face)*1.7+(Math.random()-.5)*.6,[mc[Math.floor(Math.random()*mc.length)],0xffffff],1,.8);}
      if(!isRace&&castle&&Math.hypot(P.x-castle.door.x,P.z-castle.door.z)<3.4){
        rideState='win';stateT=0;sfx('win');P.vx=P.vz=0;P.face=Math.atan2(P.x-castle.x,P.z-castle.z);burst(P.x,P.y+3,P.z,RAIN,70,8);
        if(levelIdx===save.maxWorld&&save.maxWorld<THEMES.length-1)save.maxWorld++;save.gems+=ridesGems;tire();store();
        const got=gems.filter(g=>g.got).length,nf=foals.filter(f=>f.found).length;
        banner('Bravo, Leona!',`${got} od ${gems.length} dragulja · ${nf} od ${foals.length} malih jednoroga`+(ridesGems>got?` · +${ridesGems-got} iz prstenova`:''),'',true,true);ridesGems=0;}}
    else if(rideState==='win'){if(stateT>1.2)$('bnH').hidden=false,$('bnH').textContent='A: natrag u štalu';updateRide(dt,{ix:0,iy:0,j:false,jp:false},false);
      if(stateT>1.2&&(inp.ap||inp.jp))enterStable();}
    else if(rideState==='finish'){updateRide(dt,{ix:0,iy:0,j:false,jp:false},false);updateRace(dt);if(stateT>2.6)showResults();}
    if(mode==='ride'){updateFoals(dt);animateRide(dt);animateWorld(dt);camRide(dt);}
    followSun(P.x,P.y,P.z);if(skyMesh)skyMesh.position.copy(camera.position);updateSparks(time,P.x,P.y,P.z,th?th.spark:0xffffff);
  }
}
function updateRaceIdle(dt){for(const r of race.rivals){const p=WD.at(Math.max(0,r.s)),nx=Math.cos(p.ry),nz=-Math.sin(p.ry);r.x=p.x+nx*r.lane;r.z=p.z+nz*r.lane;r.y=topAt(r.x,r.z);r.face=p.ry;
  r.rig.wrap.position.set(r.x,r.y,r.z);r.rig.wrap.rotation.y=r.face;play(r.rig,'Idle');r.rig.mixer.update(dt);}}
/* ================= STRAŠKO – zmaj i zmajevi svjetovi ================= */
const DSKINS=[
  {id:'lava',n:'Lava',body:0x3b2433,belly:0xe9d9b5,ridge:[0xc0283a],wing:0xe8620c,edge:0x2b1a22,spike:0x161014,eye:0xff8a00,club:0xd62f3f},
  {id:'suma',n:'Šumski',body:0x2f5a3a,belly:0xeee6b8,ridge:[0x9ad94a],wing:0xffd23a,edge:0x1f3a25,spike:0x3a2a18,eye:0xffc400,club:0x7cc23a},
  {id:'led',n:'Ledeni',body:0x2f4f7a,belly:0xe6f4ff,ridge:[0x6fd3ff],wing:0x9fe6ff,edge:0x1d2f4f,spike:0xeaf7ff,eye:0x2fa8ff,club:0x6fd3ff},
  {id:'duga',n:'Dugin',body:0x5b3a8a,belly:0xfff1f8,ridge:[0xff5a5a,0xffa94d,0xffe066,0x7ed957,0x5ec8ff,0xb08cff],wing:0xff9ed2,edge:0x3a2460,spike:0xffffff,eye:0xff4fa0,club:0xffe066}];
const RIVAL_SKIN={body:0x4a4f5e,belly:0xd8dce6,ridge:[0x8a93a8],wing:0xa9b4c8,edge:0x2a2e38,spike:0x1c1f26,eye:0xffd23a,club:0x8a93a8};
const BABYC=[0,1,2,3,0];
function dSave(){if(!save.dragon)save.dragon={skin:0,unl:[0],island:false,race:false,babies:0,best:0};return save.dragon;}
function dmat(c,side){const k='d'+c+(side?'s':'');return MATS[k]||(MATS[k]=new THREE.MeshToonMaterial({color:c,gradientMap:TOON,side:side?THREE.DoubleSide:THREE.FrontSide}));}

/* ---------- model ---------- */
function mergeKids(grp){const by=new Map();grp.children.slice().forEach(o=>{if(!o.isMesh||o.isInstancedMesh)return;const k=o.material.uuid;if(!by.has(k))by.set(k,[]);by.get(k).push(o);});
  by.forEach(list=>{if(list.length<2)return;const P=[],N=[],I=[];let off=0;const nm=new THREE.Matrix3();
    list.forEach(o=>{o.updateMatrix();const g=o.geometry,p=g.attributes.position,n=g.attributes.normal;nm.getNormalMatrix(o.matrix);const v=new THREE.Vector3();
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrix);P.push(v.x,v.y,v.z);v.fromBufferAttribute(n,i).applyMatrix3(nm).normalize();N.push(v.x,v.y,v.z);}
      if(g.index){const ix=g.index.array;for(let i=0;i<ix.length;i++)I.push(ix[i]+off);}else for(let i=0;i<p.count;i++)I.push(i+off);off+=p.count;grp.remove(o);});
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setIndex(I);
    const m=new THREE.Mesh(g,list[0].material);m.castShadow=true;grp.add(m);});}
function makeDragon(sk,acc){
  const g=new THREE.Group(),b=new THREE.Group();g.add(b);
  const S=(x,y,z,rx,ry,rz,c,p)=>put(G.sph,dmat(c),x,y,z,rx,ry,rz,p||b);
  const Cn=(x,y,z,r,h,c,p,rx=0,rz=0,ry=0)=>{const m=put(G.cone,dmat(c),x,y,z,r,h,r,p||b);m.rotation.set(rx,ry,rz);return m;};
  const R=i=>sk.ridge[i%sk.ridge.length];
  // tijelo
  S(0,0,0,.78,.72,1.4,sk.body);const bd=new THREE.Color(sk.belly).multiplyScalar(.86).getHex();for(let i=0;i<8;i++){const z=1.02-i*.3,w=.6-Math.abs(i-2.5)*.045;S(0,-.3-Math.sin(i/7*Math.PI)*.06,z,w,.42,.2,i%2?sk.belly:bd);}S(0,-.02,.95,.56,.6,.5,sk.belly);
  for(let i=0;i<9;i++){const z=1.05-i*.27;S(0,.62-Math.abs(i-3)*.02,z,.2,.13,.16,R(i));Cn(0,.86,z,.08,.34-i*.012,sk.spike,b,-.35);}
  // vrat i glava
  for(let i=0;i<3;i++){S(0,.32+i*.24,1.2+i*.3,.46-i*.04,.44-i*.04,.42,sk.body);S(0,.12+i*.24,1.28+i*.3,.34,.3,.24,i%2?bd:sk.belly);Cn(0,.7+i*.25,1.18+i*.3,.07,.3,sk.spike,b,-.4);}
  const h=new THREE.Group();h.position.set(0,1.12,2.2);b.add(h);
  S(0,0,0,.5,.44,.56,sk.body,h);S(0,-.08,.52,.36,.27,.44,sk.body,h);S(0,.33,.12,.17,.1,.15,R(0),h);S(0,.3,-.1,.2,.11,.15,R(1),h);S(0,.2,-.3,.18,.1,.13,R(2),h);S(0,.15,.62,.18,.08,.22,R(0),h);
  const jaw=new THREE.Group();jaw.position.set(0,-.2,.12);h.add(jaw);S(0,-.06,.4,.3,.11,.4,sk.body,jaw);S(0,.02,.42,.25,.06,.34,0xb02035,jaw);
  for(let i=0;i<4;i++){const s=i<2?-1:1,k=i%2;Cn(s*(.12+k*.08),-.2,.78-k*.16,.035,.12,0xfffaf0,h,Math.PI);Cn(s*(.12+k*.08),.08,.72-k*.16,.03,.1,0xfffaf0,jaw);}
  for(const s of [-1,1]){S(s*.28,.12,.3,.2,.2,.15,0xffffff,h);S(s*.38,.11,.38,.13,.14,.07,sk.eye,h);S(s*.43,.11,.42,.07,.09,.03,0x14100f,h);S(s*.45,.17,.43,.035,.035,.015,0xffffff,h);S(s*.44,.06,.44,.018,.018,.01,0xffffff,h);
    {const br=S(s*.29,.36,.3,.16,.045,.12,sk.body,h);br.rotation.z=s*.3;}
    for(let k=0;k<3;k++){const fr=Cn(s*(.4+k*.03),-.04-k*.1,-.2-k*.03,.06,.24,R(k),h,-1.9,s*(-1.2-k*.15));fr.scale.z=.4;}
    S(s*.13,.0,.92,.04,.03,.03,0x14100f,h);
    {const hb=Cn(s*.22,.36,-.2,.11,.5,sk.spike,h,-2.25,s*-.22);const ht=Cn(s*.26,.52,-.62,.06,.42,sk.spike,h,-2.75,s*-.28);}Cn(s*.4,.2,-.15,.07,.55,sk.spike,h,-1.9,s*-.7);}
  Cn(0,.44,-.1,.08,.5,sk.spike,h,-1.9);
  // rep
  const tail=[];let par=b,z0=-1.3;
  for(let i=0;i<9;i++){const t=new THREE.Group();t.position.set(0,i===0?.05:0,i===0?z0:-.42);par.add(t);const r=.44-i*.035;S(0,0,0,r,r*.95,.32,sk.body,t);S(0,r*.75,0,r*.4,r*.3,.18,R(i+9),t);Cn(0,r+.1,0,.06,.26-i*.01,sk.spike,t,-.4);tail.push(t);par=t;}
  const club=new THREE.Group();club.position.set(0,0,-.42);par.add(club);S(0,0,0,.21,.21,.26,sk.club,club);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2+.5;Cn(Math.cos(a)*.21,Math.sin(a)*.21,-.04,.05,.3,sk.spike,club,0,a-Math.PI/2);}Cn(0,0,-.32,.06,.34,sk.spike,club,-Math.PI/2);
  // krila
  const wings=[];
  const shp=new THREE.Shape();const W=[[0,.45],[1.2,.95],[2.6,1.05],[3.5,.45],[2.9,-.45],[2.55,-.15],[2.1,-.95],[1.6,-.55],[1.05,-1.15],[.55,-.7],[0,-.6]];
  shp.moveTo(W[0][0],W[0][1]);W.slice(1).forEach(p=>shp.lineTo(p[0],p[1]));const wg=new THREE.ShapeGeometry(shp);
  const wgc=wg;const cw=new THREE.Color(sk.wing),cl=cw.clone().lerp(new THREE.Color(0xfff1a8),.4),ce=cw.clone().lerp(new THREE.Color(sk.edge),.6);
  const wmat=new THREE.MeshToonMaterial({color:0xffffff,gradientMap:TOON,side:THREE.DoubleSide});
  wmat.onBeforeCompile=sh=>{sh.uniforms.wL={value:cl};sh.uniforms.wM={value:cw};sh.uniforms.wE={value:ce};
    sh.vertexShader=sh.vertexShader.replace('void main() {','varying vec2 vWp;\nvoid main() {vWp=position.xy;');
    sh.fragmentShader=sh.fragmentShader.replace('void main() {','varying vec2 vWp;uniform vec3 wL,wM,wE;\nvoid main() {').replace('#include <color_fragment>','float wt=clamp(length(vec2(vWp.x/3.3,(vWp.y-.05)/1.15)),0.,1.);vec3 wc=mix(wL,wM,smoothstep(.0,.55,wt));wc=mix(wc,wE,smoothstep(.6,1.,wt)*.85);diffuseColor.rgb*=wc;');};
  for(const s of [-1,1]){const pv=new THREE.Group();pv.position.set(s*.55,.5,.35);b.add(pv);const wi=new THREE.Group();wi.scale.x=s;pv.add(wi);
    const rim=new THREE.Mesh(wg,dmat(sk.edge,true));rim.rotation.x=Math.PI/2;rim.scale.set(1.04,1.08,1);rim.position.y=-.015;wi.add(rim);
    const mem=new THREE.Mesh(wgc,wmat);mem.rotation.x=Math.PI/2;mem.scale.set(.96,.92,1);mem.position.set(.05,.01,0);wi.add(mem);
    const bone=(x1,z1,x2,z2,r)=>{const m=put(G.cyl,dmat(sk.edge),(x1+x2)/2,.03,(z1+z2)/2,r,Math.hypot(x2-x1,z2-z1),r,wi);m.rotation.set(0,-Math.atan2(z2-z1,x2-x1),Math.PI/2);return m;};
    bone(0,.45,2.6,1.05,.09);bone(2.6,1.05,3.5,.45,.06);for(const p of [[2.9,-.45],[2.1,-.95],[1.05,-1.15]])bone(2.6,1.05,p[0],p[1],.045);for(const p of [[2.55,-.15],[1.6,-.55],[.55,-.7]])bone(2.6,1.05,p[0],p[1],.018);
    for(let k=0;k<3;k++)Cn(2.6+k*.1,.05,1.1+k*.06,.04,.22,sk.spike,wi,0,0,0).rotation.set(-1.2,0,-.4);
    wings.push(pv);}
  // noge
  const legs=[];
  for(const s of [-1,1])for(const f of [1,0]){const L=new THREE.Group();L.position.set(s*(f?.45:.55),-.3,f?.75:-.65);b.add(L);
    S(0,-.15,0,f?.2:.3,f?.32:.42,f?.2:.32,sk.body,L);const sh=new THREE.Group();sh.position.set(0,f?-.42:-.55,.05);L.add(sh);S(0,-.12,0,.13,.25,.13,sk.body,sh);
    for(let k=-1;k<=1;k++)Cn(k*.08,-.38,.12,.035,.16,sk.spike,sh,Math.PI/2+.4);legs.push(L);}
  const seat=new THREE.Group();seat.position.set(0,.66,.55);b.add(seat);
  dragonAcc({b,head:h},sk,acc,club);
  const grps=[];g.traverse(o=>{if(o.isGroup)grps.push(o);});grps.forEach(mergeKids);g.traverse(o=>{if(o.isMesh){o.castShadow=true;}});
  return {g,b,head:h,jaw,wings,tail,legs,seat,flap:0};
}
function animDragon(D,t,dt,beat=1,bank=0,glide=0){D.flap+=dt*(4.2+beat*2.2);const f=Math.sin(D.flap);
  const amp=.55*(1-glide*.7);D.wings.forEach((w,i)=>{const s=i?1:-1;w.rotation.z=s*(f*amp+.12);w.rotation.x=Math.cos(D.flap)*.12;});
  D.b.position.y=-f*.12;D.b.rotation.z+=(bank-D.b.rotation.z)*Math.min(1,dt*4);
  D.tail.forEach((s,i)=>{s.rotation.y=Math.sin(t*2.2-i*.55)*.13;s.rotation.x=Math.sin(t*1.6-i*.4)*.05+.02;});
  D.head.rotation.x=Math.sin(t*1.3)*.06;D.jaw.rotation.x=.12+Math.max(0,Math.sin(t*.9))*.12;D.legs.forEach(l=>l.rotation.x=.9);}

/* ---------- stanje ---------- */
let FLY=null;
const FX_SPK=[0xffd23a,0xff8a1f,0xff5a2a,0xfff3b0];
function flyHud(items){const pills=document.querySelector('#ride .pills');pills.querySelectorAll('.dpill').forEach(e=>e.remove());['pGems','pFoals','pBones','pRace'].forEach(id=>$(id).hidden=true);$('rPlace').hidden=true;
  const out={};items.forEach(([k,ic])=>{const d=document.createElement('div');d.className='pill dpill';d.innerHTML=`<span style="font-size:20px">${ic}</span><span></span>`;pills.appendChild(d);out[k]=d.lastChild;});return out;}
function flyCommon(name){endDuo();clearWorld();mode='fly';isRace=false;race=null;rideState='play';stateT=0;
  if(rig)rig.wrap.visible=false;zara.visible=false;uShadow.visible=false;dShadow.visible=false;arrow.visible=false;
  const d=dSave();const D=makeDragon(DSKINS[d.skin]||DSKINS[0],wornAcc());world.add(D.g);CAVE=null;$('bHome').textContent='Špilja';
  D.seat.add(leona);leona.position.set(0,-.5,0);leona.rotation.set(0,0,0);leona.scale.setScalar(.82);leona.visible=true;
  $('rWorld').textContent=name;$('btnA').textContent='🔥';$('btnA').setAttribute('aria-label','Iskrice');
  $('keysTxt').textContent='Strelice: leti naprijed i okreći se · E ili Shift: gore · Q: dolje · Space: iskrice · M: zvuk · V: glas';document.querySelectorAll('.btnUD').forEach(b=>b.hidden=false);
  showScreen('ride');return D;}
function flyExit(){if(FLY){FLY.babies&&FLY.babies.forEach(b=>world.remove(b.D.g));if(FLY.arrow)scene.remove(FLY.arrow);}FLY=null;scene.add(leona);leona.scale.setScalar(1);leona.rotation.set(0,0,0);
  $('btnA').textContent='A';$('btnA').setAttribute('aria-label','Skoči');document.querySelectorAll('.btnUD').forEach(b=>b.hidden=true);UD.u=UD.d=false;document.querySelectorAll('#ride .dpill').forEach(e=>e.remove());if(BAKA&&BAKA.parent)BAKA.parent.remove(BAKA);if(rig)rig.wrap.visible=true;scene.fog=null;store();$('bHome').textContent='Štala';enterCave();}
function flyParts(dt){const L=(FLY||CAVE).sp;for(let i=L.length-1;i>=0;i--){const p=L[i];p.life-=dt;if(p.life<=0){world.remove(p.m);p.m.material.dispose();L.splice(i,1);continue;}
  p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;p.vy+=p.g*dt;const k=p.life/p.max;p.m.scale.setScalar(p.sz*(.4+k*.8));p.m.material.opacity=Math.min(1,k*1.6);}}
function flySpark(x,y,z,vx,vy,vz,c,sz=.6,life=.7,g=0){const SP=(FLY||CAVE).sp;if(SP.length>220)return;const m=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:c,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  m.position.set(x,y,z);m.scale.setScalar(sz);world.add(m);SP.push({m,vx,vy,vz,g,sz,life,max:life});}
function flyBurst(x,y,z,cols,n,spd=8){for(let i=0;i<n;i++){const a=Math.random()*6.28,e=(Math.random()-.3)*1.6;flySpark(x,y,z,Math.cos(a)*Math.cos(e)*spd,Math.sin(e)*spd,Math.sin(a)*Math.cos(e)*spd,cols[i%cols.length],.7+Math.random()*.6,.8+Math.random()*.6,-4);}}
function mouthPos(D){const v=new THREE.Vector3(0,-.1,1.0);D.head.localToWorld(v);return v;}
function flySky(base,fogN,fogF,horizon){th={name:'',sky:base,fog:[fogN,fogF],night:false,spark:0xffd23a};const sd=skyDome(base);world.add(sd.mesh);const hz=horizon?new THREE.Color(horizon):sd.horizon;scene.background=hz;scene.fog=new THREE.Fog(hz,fogN,fogF);
  hemi.intensity=.78;hemi.color.setHex(0xfff0e6);hemi.groundColor.setHex(0x8a5a7a);sun.intensity=.85;sun.color.setHex(0xffc89a);rimL.intensity=GFXON?.3:0;fxTune(.32,.9,.45);}
function babyFollow(dt){if(!FLY.babies)return;const H=FLY.hist;FLY.babies.forEach((bb,i)=>{const h=H[Math.min(H.length-1,8+i*7)];if(!h)return;const g=bb.D.g;g.position.x+=(h.x+Math.sin(time*2+i)*1.2-g.position.x)*Math.min(1,dt*4);
  g.position.y+=(h.y+Math.cos(time*1.7+i)*.8-g.position.y)*Math.min(1,dt*4);g.position.z+=(h.z-g.position.z)*Math.min(1,dt*4);g.rotation.y=h.yaw;animDragon(bb.D,time+i,dt,1.6,0,0);});}
function addBabies(n,center){FLY.babies=[];for(let i=0;i<n;i++){const D=makeDragon(DSKINS[BABYC[i]]);D.g.scale.setScalar(.36);D.g.position.copy(center||FLY.D.g.position);world.add(D.g);FLY.babies.push({D});}}

/* ---------- zajedničko letenje (slobodno) ---------- */
const UD={u:false,d:false};
(()=>{const mk=(id,k)=>{const b=$(id);if(!b)return;const on=e=>{e.preventDefault();audioInit();UD[k]=true;b.classList.add('on');try{b.setPointerCapture(e.pointerId);}catch(_){}};
  const off=()=>{UD[k]=false;b.classList.remove('on');};b.addEventListener('pointerdown',on);['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,off));b.addEventListener('contextmenu',e=>e.preventDefault());};
  mk('btnUp','u');mk('btnDn','d');})();
function flyUD(){let u=UD.u||keys.KeyE||keys.ShiftLeft||keys.ShiftRight||keys.PageUp,d=UD.d||keys.KeyQ||keys.ControlLeft||keys.PageDown;
  try{for(const gp of (navigator.getGamepads?navigator.getGamepads():[])){if(!gp)continue;if(gp.buttons[5]&&gp.buttons[5].pressed)u=true;if(gp.buttons[4]&&gp.buttons[4].pressed)d=true;}}catch(e){}
  return (u?1:0)-(d?1:0);}
function flySteer(dt,inp,F,maxUp=.7){F.turn+=(-inp.ix*1.35-F.turn)*Math.min(1,dt*5);F.yaw+=F.turn*dt;
  F.pitch+=(inp.iy*maxUp-F.pitch)*Math.min(1,dt*3);F.bank=F.turn*.55;}

/* ================= SVIJET A: ZMAJEV OTOK ================= */
function islandH(x,z){const d=Math.hypot(x,z);let h=-1;if(d<100)h=Math.max(h,7*Math.cos(Math.min(1,d/100)*Math.PI/2)**.6+(1-d/100)*3);
  if(d<52)h=Math.max(h,62*(1-d/52)**1.15-(d<9?(9-d)*1.6:0));return h;}
function startIsland(seek){const D=flyCommon(seek?'Izgubljeni zmajići':'Zmajev otok');const d=dSave();
  flySky(0xff9a7a,170,430,0xffb08a);WD={waterY:0,H:(x,z)=>islandH(x,z)};
  const F={x:0,y:34,z:-175,yaw:0,pitch:0,turn:0,bank:0,spd:16,v:0,vy:0,boost:0,bonk:0};
  FLY={kind:'island',D,F,sp:[],hist:[],rings:[],lant:[],eggs:[],isl:[],smoke:[],nextRing:0,breathT:0,eggsGot:0,done:d.island,hatched:false,dg:[],gemN:0};FLY.baka=bakaSetup(D);
  // more
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400,1,1),new THREE.MeshLambertMaterial({color:0x2f7f9a}));sea.rotation.x=-Math.PI/2;world.add(sea);
  const sea2=new THREE.Mesh(new THREE.RingGeometry(96,104,64),basic(0xbfe9f2,{transparent:true,opacity:.5}));sea2.rotation.x=-Math.PI/2;sea2.position.y=.05;world.add(sea2);
  // glavni otok i vulkan
  {const geo=new THREE.PlaneGeometry(220,220,110,110);geo.rotateX(-Math.PI/2);const p=geo.attributes.position,col=[];
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);let h=islandH(x,z)+vnoise(x*.08,z*.08)*1.6-.8;const dd=Math.hypot(x,z);if(dd>99)h=-3;p.setY(i,h);
      const c=new THREE.Color(h<1.2?0xe8cf98:dd<52&&h>9?(h>40?0x4a3230:0x5e3f38):0x5f9a48);if(dd<52&&h>9&&vnoise(x*.3,z*.3)>.62)c.setHex(0x6a4a40);col.push(c.r,c.g,c.b);}
    geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,new THREE.MeshToonMaterial({vertexColors:true,gradientMap:TOON}));m.receiveShadow=true;world.add(m);}
  // krater i lava
  const crater=new THREE.Mesh(new THREE.CircleGeometry(9,32),basic(0xff7a1a));crater.rotation.x=-Math.PI/2;crater.position.y=48;world.add(crater);
  glow(world,0,52,0,26,0xff8a3a,true,.8);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2+.3;const pts=[];for(let k=0;k<=14;k++){const r=9+k*3,w=Math.sin(k*.7+i)*2;const x=Math.cos(a)*r-Math.sin(a)*w,z=Math.sin(a)*r+Math.cos(a)*w;pts.push(new THREE.Vector3(x,islandH(x,z)+.35,z));}
    const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,.9,6,false),basic(0xff6a10));tube.scale.y=.5;tube.position.y=pts[0].y*.5;world.add(tube);
    for(let k=2;k<pts.length;k+=4)glow(world,pts[k].x,pts[k].y+.5,pts[k].z,6,0xff7a2a,true,.55);}
  // gnijezdo
  const nest={x:30,z:30};nest.y=islandH(30,30);const ng=new THREE.Group();ng.position.set(nest.x,nest.y,nest.z);world.add(ng);
  const tor=new THREE.Mesh(new THREE.TorusGeometry(3.2,1.1,10,24),dmat(0x8a5a32));tor.rotation.x=Math.PI/2;tor.position.y=.6;ng.add(tor);
  for(let i=0;i<14;i++){const s=put(G.cyl,dmat(0x6a4426),Math.cos(i)*3,1,Math.sin(i)*3,.12,4,.12,ng);s.rotation.set(Math.random(),i,Math.PI/2+Math.random()*.4);}
  sph(0,.3,0,2.6,.4,2.6,0xa8784a,ng);FLY.nest=nest;FLY.nestG=ng;
  // dekor: kristali i palme
  for(let i=0;i<26;i++){const a=Math.random()*6.28,r=55+Math.random()*40,x=Math.cos(a)*r,z=Math.sin(a)*r;const y=islandH(x,z);if(y<1.5)continue;
    if(i%2){const c=put(G.gem,dmat(0xb08cff),x,y+1.2,z,.7,1.6,.7);c.rotation.y=a;glow(world,x,y+1.4,z,3,0xd2a8ff,true,.5);}
    else{cyl(x,y+2.5,z,.25,5,0x8a6a4a);for(let k=0;k<5;k++){const l=sph(x+Math.cos(k*1.26)*1.2,y+5.1,z+Math.sin(k*1.26)*1.2,1.5,.2,.6,0x3f9a4a);l.rotation.y=-k*1.26;}}}
  // lebdeći otoci
  const N=12;for(let i=0;i<N;i++){const a=i/N*Math.PI*2+.2,r=i%2?78:130,x=Math.cos(a)*r,z=Math.sin(a)*r,y=22+((i*7)%5)*7,R=6+(i%3)*2;
    const gg=new THREE.Group();gg.position.set(x,y,z);world.add(gg);
    sph(0,0,0,R,R*.3,R,0x6fae4a,gg);sph(0,-.5,0,R*1.02,R*.25,R*1.02,0x8a6a54,gg);const cn=put(G.cone,dmat(0x6a4a44),0,-R*.75,0,R*.95,R*1.5,R*.95,gg);cn.rotation.x=Math.PI;
    for(let k=0;k<3;k++){const c=put(G.gem,dmat(0xff9ed2),Math.cos(k*2.1)*R*.6,-R*.9-k,Math.sin(k*2.1)*R*.6,.4,1,.4,gg);}
    if(i%3===0){cyl(R*.4,R*.3+1.5,-R*.3,.18,3,0x8a6a4a,gg);sph(R*.4,R*.3+3.6,-R*.3,1.4,1.6,1.4,0x4aa058,gg);}
    FLY.isl.push({x,y,z,R,g:gg});}
  // lampioni (8) na otocima
  [0,1,3,4,6,7,9,10].forEach(k=>{const I=FLY.isl[k];const gg=new THREE.Group();gg.position.set(I.x,I.y+I.R*.3,I.z);world.add(gg);cyl(0,1.4,0,.15,2.8,0x3a2a2a,gg);
    const lamp=box(0,3.2,0,1.1,1.3,1.1,0x553a3a,gg);const top=cone(0,4.1,0,.8,.6,0x2a1a1a,gg);
    const gl=glow(gg,0,3.2,0,8,0xffb347,true,.95);gl.visible=false;FLY.lant.push({x:I.x,y:I.y+I.R*.3+3.2,z:I.z,lamp,gl,on:false});});
  // jaja (5)
  const EC=[0xff6fa5,0x7ed957,0x5ec8ff,0xffd23a,0xb08cff];
  const eggSpots=[[2,FLY.isl[2]],[5,FLY.isl[5]],[8,FLY.isl[8]],[11,FLY.isl[11]],[-1,null]];
  eggSpots.forEach(([k,I],i)=>{let x,y,z;if(I){x=I.x+I.R*.3;z=I.z+I.R*.3;y=I.y+I.R*.3+.9;}else{x=-20;z=-30;y=islandH(-20,-30)+1;}
    const e=new THREE.Group();e.position.set(x,y,z);world.add(e);sph(0,0,0,.75,1,.75,EC[i],e);for(let s=0;s<5;s++)sph(Math.cos(s*1.3)*.6,Math.sin(s*2)*.5,Math.sin(s*1.3)*.6,.15,.15,.15,0xffffff,e);
    glow(e,0,0,0,4,EC[i],true,.6);FLY.eggs.push({x,y,z,g:e,c:EC[i],got:false});});
  // vatreni prstenovi (10)
  for(let i=0;i<10;i++){const a=-Math.PI/2+i/10*Math.PI*2*1.0,r=i%2?92:112,x=Math.cos(a)*r,z=Math.sin(a)*r,y=26+Math.sin(i*1.3)*12;
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=-a;world.add(g);
    const t=new THREE.Mesh(new THREE.TorusGeometry(7,.75,10,40),basic(0xff7a1a));g.add(t);const t2=new THREE.Mesh(new THREE.TorusGeometry(7,.32,8,40),basic(0xfff0a0));g.add(t2);
    const gl=glow(g,0,0,0,20,0xff9a3a,true,.5);FLY.rings.push({x,y,z,a,g,t,gl,got:false});}
  if(d.island){FLY.rings.forEach(r=>r.got=true);}
  // zmajići iz gnijezda
  if(d.babies>0)addBabies(d.babies,new THREE.Vector3(nest.x,nest.y+4,nest.z));
  FLY.arrow=makeArrow(0xffd23a);
  for(let i=0;i<10;i++){const a=FLY.rings[i],b=FLY.rings[(i+1)%10];dGem((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);dGem(a.x*.75+b.x*.25,a.y*.75+b.y*.25,a.z*.75+b.z*.25);}
  FLY.isl.forEach(I=>dGem(I.x-I.R*.4,I.y+I.R*.3+4,I.z-I.R*.4));
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;dGem(Math.cos(a)*62,34+Math.sin(i*2)*5,Math.sin(a)*62);}
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2+.3;dGem(Math.cos(a)*97,7,Math.sin(a)*97);}
  FLY.gemT=FLY.dg.length;
  FLY.hud=flyHud([['ring','🔥'],['lant','🏮'],['egg','🥚'],['gem','💎']]);flyIslandHud();flyGemHud();
  D.g.position.set(F.x,F.y,F.z);camPos.set(F.x,F.y+6,F.z-14);camLook.set(F.x,F.y,F.z);
  banner('Zmajev otok','Joystickom leti naprijed i okreći se, a tipkama ⬆ i ⬇ gore i dolje. Leti kroz prstenove, upali lampione i pronađi zmajeva jaja!',d.island?'Otok je već riješen – leti slobodno!':'');sfx('magic');if(seek)setupSeek();}
function flyIslandHud(){if(FLY.seek)return;const H=FLY.hud;H.ring.textContent=`${FLY.rings.filter(r=>r.got).length} / 10`;H.lant.textContent=`${FLY.lant.filter(l=>l.on).length} / 8`;H.egg.textContent=`${FLY.eggs.filter(e=>e.got).length} / 5`;}
function islandCollide(F){const gh=islandH(F.x,F.z);const lim=Math.max(gh,0)+2.2;if(F.y<lim){F.y=lim;F.pitch=Math.max(F.pitch,.35);if(gh>2&&F.bonk<=0){F.bonk=.5;sfx('bonk');}}
  for(const I of FLY.isl){const dx=F.x-I.x,dz=F.z-I.z,d=Math.hypot(dx,dz);if(d<I.R+2.2&&F.y<I.y+I.R*.3+2.4&&F.y>I.y-I.R*1.5){const up=F.y>I.y-1;
      if(up&&d<I.R*.9){F.y=I.y+I.R*.3+2.4;}else{const k=(I.R+2.2)/Math.max(d,.01);F.x=I.x+dx*k;F.z=I.z+dz*k;F.yaw+=(F.turn>=0?1:-1)*.05;if(F.bonk<=0){F.bonk=.5;sfx('bonk');}}}}
  const r=Math.hypot(F.x,F.z);if(r>230){const a=Math.atan2(F.x,F.z)+Math.PI;let dd=a-F.yaw;dd=Math.atan2(Math.sin(dd),Math.cos(dd));F.yaw+=dd*.03;}
  if(F.y>95){F.y=95;F.pitch=Math.min(F.pitch,0);}}
function updateIsland(dt,inp){const {D,F}=FLY;F.bonk-=dt;
  const ud=flyUD();F.turn+=(-inp.ix*1.5-F.turn)*Math.min(1,dt*5);F.yaw+=F.turn*dt;F.bank=F.turn*.55;
  const tv=inp.iy>0?inp.iy*18:inp.iy*7;F.v=(F.v||0)+(tv-(F.v||0))*Math.min(1,dt*2.5);F.vy=(F.vy||0)+(ud*9-(F.vy||0))*Math.min(1,dt*4);
  const fx=Math.sin(F.yaw),fz=Math.cos(F.yaw);F.x+=fx*F.v*dt;F.z+=fz*F.v*dt;F.y+=F.vy*dt;F.pitch=F.vy/9*.45;islandCollide(F);if(F.y<=Math.max(islandH(F.x,F.z),0)+2.25&&F.vy<0)F.vy=0;
  D.g.position.set(F.x,F.y,F.z);D.g.rotation.set(0,F.yaw,0);D.b.rotation.x=-F.pitch*.8+(F.v>1?-.05:.12);animDragon(D,time,dt,ud>0?1.6:Math.abs(F.v)>2?.9:.35,-F.bank,ud<0?.6:0);
  poseLeonaRiding(.4,true);
  FLY.hist.unshift({x:F.x,y:F.y,z:F.z,yaw:F.yaw});if(FLY.hist.length>60)FLY.hist.pop();babyFollow(dt);
  // iskrice
  const breathing=inp.j;FLY.breathT-=dt;
  if(breathing&&FLY.breathT<=0){FLY.breathT=.035;const m=mouthPos(D);for(let k=0;k<2;k++)flySpark(m.x,m.y,m.z,fx*26+(Math.random()-.5)*5,(Math.random()-.4)*4,fz*26+(Math.random()-.5)*5,FX_SPK[Math.floor(Math.random()*4)],.9,.55,0);
    if(Math.random()<.08)sfx('magic');}
  if(breathing){for(const L of FLY.lant){if(L.on)continue;const dx=L.x-F.x,dy=L.y-F.y,dz=L.z-F.z,d=Math.hypot(dx,dy,dz);if(d<16&&(dx*fx+dz*fz)/Math.max(d,.01)>.45){L.on=true;L.lamp.material=dmat(0xffc04a);L.gl.visible=true;sfx('found');flyBurst(L.x,L.y,L.z,FX_SPK,26);
      const n=FLY.lant.filter(l=>l.on).length;say(n<8?`Lampion upaljen! Još ${8-n}.`:'Svi lampioni svijetle!');flyIslandHud();}}}
  // prstenovi
  const nr=FLY.rings.find(r=>!r.got);
  FLY.rings.forEach(r=>{r.t.rotation.z+=dt*.6;const on=r===nr;r.gl.material.opacity=on?.55+Math.sin(time*6)*.2:.25;r.g.scale.setScalar(on?1+Math.sin(time*4)*.04:1);r.g.visible=!r.got;
    if(!r.got&&Math.hypot(F.x-r.x,F.y-r.y,F.z-r.z)<7.6){r.got=true;sfx('ring');flyBurst(r.x,r.y,r.z,FX_SPK,30,10);const n=FLY.rings.filter(q=>q.got).length;say(n<10?String(n):'Svih deset prstenova!');flyIslandHud();}});
  // jaja
  FLY.eggs.forEach((e,i)=>{if(e.got)return;e.g.rotation.y+=dt;e.g.position.y=e.y+Math.sin(time*2+i)*.25;
    if(Math.hypot(F.x-e.x,F.y-e.y,F.z-e.z)<4.5){e.got=true;sfx('gem');flyBurst(e.x,e.y,e.z,[e.c,0xffffff],24);
      const n=FLY.eggs.filter(q=>q.got).length;const N=FLY.nest;e.g.position.set(N.x+Math.cos(n*1.25)*1.4,N.y+1.4,N.z+Math.sin(n*1.25)*1.4);e.g.scale.setScalar(.8);
      say(n<5?`Zmajevo jaje! Odletjelo je u gnijezdo. Još ${5-n}.`:'Svih pet jaja je u gnijezdu! Leti do gnijezda!');flyIslandHud();}});
  if(!FLY.hatched&&FLY.eggs.every(e=>e.got)){const N=FLY.nest;if(Math.hypot(F.x-N.x,F.z-N.z)<16&&F.y<N.y+20){FLY.hatched=true;sfx('win');
      FLY.eggs.forEach(e=>{flyBurst(e.g.position.x,e.g.position.y,e.g.position.z,[e.c,0xffffff],30);world.remove(e.g);});
      const d=dSave();d.babies=5;store();if(FLY.babies)FLY.babies.forEach(b=>world.remove(b.D.g));addBabies(5,new THREE.Vector3(N.x,N.y+3,N.z));
      banner('Izlegli su se zmajići!','Pet malih zmajića sada leti s tobom!','');}}
  // strelica do sljedećeg cilja
  let tg=nr;if(!tg)tg=FLY.lant.find(l=>!l.on);if(!tg)tg=FLY.eggs.find(e=>!e.got);if(!tg&&!FLY.hatched&&FLY.eggs.every(e=>e.got))tg={x:FLY.nest.x,y:FLY.nest.y+3,z:FLY.nest.z};
  const A=FLY.arrow;A.visible=!!tg;if(tg){A.position.set(F.x,F.y+3.4,F.z);A.lookAt(tg.x,tg.y,tg.z);}
  // kraj
  if(!FLY.won&&FLY.rings.every(r=>r.got)&&FLY.lant.every(l=>l.on)&&FLY.hatched){FLY.won=true;const d=dSave();const first=!d.island;d.island=true;
    let msg='';if(!d.unl.includes(1)){d.unl.push(1);msg='Straško je dobio novu boju: Šumski!';}if(d.race&&!d.unl.includes(3)){d.unl.push(3);msg+=' I Dugin!';}
    save.gems+=first?60:15;store();sfx('win');flyBurst(F.x,F.y+3,F.z,RAIN,60,12);banner('Bravo, Leona!','Zmajev otok je riješen! '+msg,'Leti dalje ili se vrati u špilju.',true,true);}
  // smoke iz vulkana
  if(Math.random()<dt*6)flySpark((Math.random()-.5)*6,50,(Math.random()-.5)*6,(Math.random()-.5)*2,5+Math.random()*3,(Math.random()-.5)*2,[0xff9ed2,0xb08cff,0xffd23a,0x9ef0ff][Math.floor(Math.random()*4)],5,3.5,.4);
  flyParts(dt);flyCam(dt,F,13,4.2);}
function flyCam(dt,F,back,up){if(window.__camOv){const o=window.__camOv,fx=Math.sin(F.yaw),fz=Math.cos(F.yaw);camera.position.set(F.x+o[0]*fz+o[2]*fx,F.y+o[1],F.z-o[0]*fx+o[2]*fz);camera.lookAt(F.x,F.y+.6,F.z);if(skyMesh)skyMesh.position.copy(camera.position);return;}const fx=Math.sin(F.yaw),fz=Math.cos(F.yaw);const a=camera.aspect<1?1.25:1;
  const tp=new THREE.Vector3(F.x-fx*back*a,F.y+up*a-Math.sin(F.pitch)*3,F.z-fz*back*a),tl=new THREE.Vector3(F.x+fx*6,F.y+1+Math.sin(F.pitch)*4,F.z+fz*6);
  const k=Math.min(1,dt*4);camPos.lerp(tp,k);camLook.lerp(tl,k);const gh=WD.H?Math.max(WD.H(camPos.x,camPos.z),WD.waterY!=null?WD.waterY:-1e9):-1e9;if(camPos.y<gh+1.5)camPos.y=gh+1.5;
  camera.position.copy(camPos);camera.lookAt(camLook);if(skyMesh)skyMesh.position.copy(camera.position);followSun(F.x,F.y,F.z);}

/* ================= SVIJET B: VATRENI KANJON (utrka) ================= */
function startCanyon(){const D=flyCommon('Vatreni kanjon');const d=dSave();
  flySky(0xff8a5a,90,300,0xe8866a);WD={waterY:null,H:null};
  const pts=[];for(let i=0;i<=16;i++)pts.push(new THREE.Vector3(Math.sin(i*.8)*55+Math.sin(i*.31)*35,24+Math.sin(i*.55)*7,i*72));
  const curve=new THREE.CatmullRomCurve3(pts);const L=curve.getLength();const NS=700;const fr=[];
  for(let i=0;i<=NS;i++){const u=i/NS,p=curve.getPointAt(u),t=curve.getTangentAt(u);const side=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),t).normalize();const up=new THREE.Vector3().crossVectors(t,side).normalize();fr.push({p,t,side,up});}
  const at=s=>{const f=Math.max(0,Math.min(NS,s/L*NS)),i=Math.floor(f),k=f-i,a=fr[i],b=fr[Math.min(NS,i+1)];return{p:a.p.clone().lerp(b.p,k),t:a.t.clone().lerp(b.t,k).normalize(),side:a.side.clone().lerp(b.side,k).normalize(),up:a.up.clone().lerp(b.up,k).normalize()};};
  // zidovi kanjona
  const rock=[],rock2=[];const r=mulberry(77);
  for(let i=0;i<NS;i+=2){const f=fr[i];for(const s of [-1,1]){const off=19+r()*5,h=26+r()*22;const x=f.p.x+f.side.x*off*s,z=f.p.z+f.side.z*off*s;(r()<.5?rock:rock2).push([x,f.p.y-18+h*.35,z,4+r()*3,h*.5,4+r()*3]);}}
  const bg=blobGeo(1,1,5,1);for(const [list,c] of [[rock,0xa0452a],[rock2,0x7a3322]]){const im=new THREE.InstancedMesh(bg,dmat(c),list.length);const m4=new THREE.Matrix4(),q=new THREE.Quaternion();
    list.forEach((o,k)=>{q.setFromEuler(new THREE.Euler(0,k,0));m4.compose(new THREE.Vector3(o[0],o[1],o[2]),q,new THREE.Vector3(o[3],o[4],o[5]));im.setMatrixAt(k,m4);});world.add(im);}
  // dno: rijeka lave + obale
  {const P=[],I=[],C=[];for(let i=0;i<=NS;i++){const f=fr[i];for(const [w,c] of [[-26,0x5a2a1e],[-9,0xff7a1a],[9,0xff7a1a],[26,0x5a2a1e]]){P.push(f.p.x+f.side.x*w,f.p.y-17,f.p.z+f.side.z*w);const cc=new THREE.Color(c);C.push(cc.r,cc.g,cc.b);}
      if(i<NS){const a=i*4,b=(i+1)*4;for(let k=0;k<3;k++)I.push(a+k,b+k,a+k+1,a+k+1,b+k,b+k+1);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.setIndex(I);g.computeVertexNormals();
    world.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})));
    for(let i=0;i<NS;i+=25){const f=fr[i];glow(world,f.p.x,f.p.y-15,f.p.z,16,0xff7a2a,true,.5);}}
  // prepreke, prstenovi, žeravice
  const obs=[],rings=[],embers=[];const rr=mulberry(99);
  for(let s=120;s<L-80;s+=55){const f=at(s);const lx=(rr()-.5)*16;const vert=rr()<.6;const o={s,lx,ly:vert?0:(rr()-.5)*8,vert,r:vert?2.2:1.6};
    const c=f.p.clone().addScaledVector(f.side,lx);if(vert){const m=put(G.cyl,dmat(0x6a2a1e),c.x,f.p.y-2,c.z,o.r,34,o.r);m.castShadow=true;sph(c.x,f.p.y+15,c.z,o.r*1.3,1.6,o.r*1.3,0x8a3a26);}
    else{c.addScaledVector(f.up,o.ly);const m=put(G.cyl,dmat(0x6a2a1e),c.x,c.y,c.z,o.r,44,o.r);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),f.side);}
    obs.push(o);}
  for(let s=80;s<L-60;s+=95){const f=at(s);const lx=(rr()-.5)*12,ly=(rr()-.4)*7;const c=f.p.clone().addScaledVector(f.side,lx).addScaledVector(f.up,ly);
    const g=new THREE.Group();g.position.copy(c);g.lookAt(c.clone().add(f.t));world.add(g);g.add(new THREE.Mesh(new THREE.TorusGeometry(5.6,.6,10,36),basic(0xffd23a)));glow(g,0,0,0,15,0xffb347,true,.45);rings.push({s,lx,ly,g,got:false});}
  for(let s=60;s<L-40;s+=22){if(rings.some(q=>Math.abs(q.s-s)<10)||obs.some(q=>Math.abs(q.s-s)<8))continue;const f=at(s);const lx=Math.sin(s*.05)*8,ly=Math.cos(s*.037)*4;const c=f.p.clone().addScaledVector(f.side,lx).addScaledVector(f.up,ly);
    const m=put(G.gem,dmat(0xff8a1f),c.x,c.y,c.z,.6,1,.6);glow(world,c.x,c.y,c.z,3.2,0xffa040,true,.6);embers.push({s,lx,ly,m,got:false});}
  // cilj
  {const f=at(L-30);const g=new THREE.Group();g.position.copy(f.p);g.lookAt(f.p.clone().add(f.t));world.add(g);
    for(const s of [-1,1]){put(G.cyl,dmat(0xfff3e0),s*13,0,0,.7,30,.7,g);}const ban=put(G.box,dmat(0xffffff),0,14,0,26,3,.4,g);
    for(let k=0;k<13;k++)put(G.box,dmat(0x222222),-12+k*2,14+((k%2)?.75:-.75),.25,1,1.5,.1,g);}
  // suparnik
  const RV=makeDragon(RIVAL_SKIN);world.add(RV.g);
  const F={s:10,lx:-4,ly:0,vx:0,vy:0,spd:0,base:26,boost:0,ch:1,bonk:0,yaw:0,pitch:0,bank:0};
  FLY={kind:'canyon',D,F,RV,rv:{s:10,lx:4,ly:0,spd:0},at,L,obs,rings,embers,sp:[],hist:[],state:'count',T:0,lastC:4,dg:[],gemN:0};FLY.baka=bakaSetup(D);
  for(let s=71;s<L-50;s+=22){if(obs.some(o=>Math.abs(o.s-s)<6))continue;const f=at(s);const c=f.p.clone().addScaledVector(f.side,-Math.sin(s*.05)*7).addScaledVector(f.up,Math.cos(s*.04+1)*3.5);dGem(c.x,c.y,c.z);}FLY.gemT=FLY.dg.length;
  if(d.babies>0)addBabies(d.babies);
  FLY.hud=flyHud([['place','🏁'],['ch','🔥'],['gem','💎']]);canyonHud();flyGemHud();
  const f0=at(10);camPos.copy(f0.p).addScaledVector(f0.t,-14).add(new THREE.Vector3(0,5,0));camLook.copy(f0.p);
  banner('Vatreni kanjon','Utrka sa zmajem Sivkom! Joystick naprijed za let, ⬆ i ⬇ za gore i dolje, 🔥 za ubrzanje.','');sfx('magic');}
function canyonHud(){const H=FLY.hud,F=FLY.F;H.place.textContent=F.s>=FLY.rv.s?'1. mjesto':'2. mjesto';H.ch.textContent=`× ${F.ch}`;}
function updateCanyon(dt,inp){const {D,F,RV,rv,at,L}=FLY;FLY.T+=dt;F.bonk-=dt;
  if(FLY.state==='count'){const c=Math.min(3,Math.ceil(3.5-FLY.T));if(c!==FLY.lastC){FLY.lastC=c;if(c>0){banner(String(c),'Pripremi se!','');sfx('beep');}else{banner('KRENI!','','');sfx('go');}}
    if(FLY.T>=3.5){FLY.state='race';FLY.T=0;setTimeout(()=>{if(FLY&&FLY.state==='race')banner('','','',false);},700);}}
  const racing=FLY.state==='race',fin=FLY.state==='end';
  // igrač
  if(racing){if(inp.jp&&F.ch>0&&F.boost<=0){F.ch--;F.boost=1.8;sfx('boost');canyonHud();}
    const go=Math.max(0,inp.iy);F.spd+=((F.base*go+(F.boost>0?16:0))*(F.bonk>0?.45:1)-F.spd)*Math.min(1,dt*2);F.boost-=dt;}
  else F.spd+=((fin?14:0)-F.spd)*Math.min(1,dt*2);
  F.s=Math.min(L-5,F.s+F.spd*dt);
  F.vx+=(-inp.ix*14-F.vx)*Math.min(1,dt*5);F.vy+=(flyUD()*10-F.vy)*Math.min(1,dt*5);if(!racing){F.vx*=.9;F.vy*=.9;}
  F.lx=Math.max(-12,Math.min(12,F.lx+F.vx*dt));F.ly=Math.max(-7,Math.min(9,F.ly+F.vy*dt));
  const f=at(F.s);const P=f.p.clone().addScaledVector(f.side,F.lx).addScaledVector(f.up,F.ly);
  D.g.position.copy(P);D.g.lookAt(P.clone().add(f.t));D.g.rotateY(0);D.b.rotation.x=-F.vy*.03;animDragon(D,time,dt,F.boost>0?2:1,F.vx*.04,0);poseLeonaRiding(.5,true);
  if(F.boost>0&&Math.random()<.7){const m=mouthPos(D);flySpark(P.x,P.y,P.z,-f.t.x*8,(Math.random()-.5)*2,-f.t.z*8,FX_SPK[Math.floor(Math.random()*4)],1.2,.5);}
  // sudari
  for(const o of FLY.obs){if(Math.abs(o.s-F.s)>2.2)continue;const hit=o.vert?Math.abs(F.lx-o.lx)<o.r+1.4:Math.abs(F.ly-o.ly)<o.r+1.1;
    if(hit&&F.bonk<=0){F.bonk=.9;sfx('bonk');say('Joj! Pazi na stijene.');F.vx+=F.lx>o.lx?10:-10;}}
  for(const q of FLY.rings){if(!q.got&&Math.abs(q.s-F.s)<2.5&&Math.hypot(F.lx-q.lx,F.ly-q.ly)<5.8){q.got=true;q.g.visible=false;F.boost=Math.max(F.boost,1);sfx('ring');flyBurst(P.x,P.y,P.z,[0xffd23a,0xffffff],20);}}
  for(const e of FLY.embers){if(!e.got&&Math.abs(e.s-F.s)<2&&Math.hypot(F.lx-e.lx,F.ly-e.ly)<2.6){e.got=true;e.m.visible=false;F.ch=Math.min(5,F.ch+1);sfx('gem');canyonHud();}
    if(!e.got)e.m.rotation.y+=dt*2;}
  // suparnik
  if(racing||fin){const tgt=24.5+Math.sin(FLY.T*.4)*2.2+(rv.s<F.s-40?3:0)-(rv.s>F.s+60?4:0);rv.spd+=(tgt-rv.spd)*Math.min(1,dt*1.5);}rv.s=Math.min(L-5,rv.s+rv.spd*dt);
  {let ob=FLY.obs.find(o=>o.s>rv.s&&o.s<rv.s+30);let want=Math.sin(rv.s*.03)*6;if(ob){want=ob.vert?(ob.lx>0?ob.lx-6:ob.lx+6):want;}rv.lx+=(want-rv.lx)*Math.min(1,dt*1.5);
    const wy=ob&&!ob.vert?(ob.ly>0?ob.ly-4:ob.ly+4):Math.sin(rv.s*.02)*3;rv.ly+=(wy-rv.ly)*Math.min(1,dt*1.5);
    const g=at(rv.s);const Q=g.p.clone().addScaledVector(g.side,rv.lx).addScaledVector(g.up,rv.ly);RV.g.position.copy(Q);RV.g.lookAt(Q.clone().add(g.t));animDragon(RV,time+1,dt,1,0,0);}
  FLY.hist.unshift({x:P.x,y:P.y,z:P.z,yaw:D.g.rotation.y});if(FLY.hist.length>60)FLY.hist.pop();babyFollow(dt);
  if(racing&&Math.floor(FLY.T*4)!==FLY.hT){FLY.hT=Math.floor(FLY.T*4);canyonHud();}
  // cilj
  if(racing&&(F.s>=L-30||rv.s>=L-30)){FLY.state='end';FLY.T=0;const win=F.s>=rv.s;const d=dSave();sfx(win?'win':'oops');
    let msg='';if(win){d.race=true;if(!d.unl.includes(2)){d.unl.push(2);msg='Straško je dobio novu boju: Ledeni!';}if(d.island&&!d.unl.includes(3)){d.unl.push(3);msg+=' I Dugin!';}save.gems+=40;flyBurst(P.x,P.y+2,P.z,RAIN,60,12);}
    else save.gems+=10;store();
    banner(win?'Pobjeda!':'Sivko je bio brži!',win?'Bravo, Leona! Straško je prvi! '+msg:'Pokušaj opet – skupljaj žeravice i pritisni 🔥.','Pritisni 🔥 za povratak u špilju.',true,true);}
  if(fin&&FLY.T>1.5&&(inp.ap||inp.jp))flyExit();
  flyParts(dt);
  // kamera
  const back=camera.aspect<1?15:12;const tp=P.clone().addScaledVector(f.t,-back).addScaledVector(f.up,camera.aspect<1?5.5:4.5);const tl=P.clone().addScaledVector(f.t,8);
  const k=Math.min(1,dt*4.5);camPos.lerp(tp,k);camLook.lerp(tl,k);camera.position.copy(camPos);camera.lookAt(camLook);if(skyMesh)skyMesh.position.copy(camera.position);followSun(P.x,P.y,P.z);}

/* ---------- glavna petlja i izbornik ---------- */
function updateFly(dt,inp){if(!FLY)return;FLY.age=(FLY.age||0)+dt;if(FLY.kind!=='canyon'&&!FLY.bh&&FLY.age>(FLY.seek?7:5)){FLY.bh=1;banner('','','',false);}if(inp.bp){flyExit();return;}if(FLY.kind==='island')updateIsland(dt,inp);else if(FLY.kind==='world')updateWorldFly(dt,inp);else updateCanyon(dt,inp);
  if(!FLY)return;const h0=FLY.hist[0];if(h0){flyGemsUpd(h0,dt);bakaUpd(h0,dt);}if(FLY.seek)updateSeek(dt);if(FLY.kind!=='canyon'){FLY.sv=(FLY.sv||0)+dt;if(FLY.sv>20){FLY.sv=0;store();}}
  if(inp.php)photoReq=true;}
function openDragon(){sfx('click');mode='worlds';const d=dSave();const el=$('worldBtns');el.innerHTML='';$('pickTitle').textContent='Straško – kamo letimo?';
  const mk=(t,cls,fn,dis)=>{const b=document.createElement('button');b.type='button';b.className='btn'+(cls?' '+cls:'');b.textContent=t;b.disabled=!!dis;b.onclick=fn;el.appendChild(b);return b;};
  mk('🌋 Zmajev otok'+(d.island?' ✔':''),'go',()=>startIsland());mk('🏁 Vatreni kanjon'+(d.race?' 🏆':''),'gold',()=>startCanyon());
  const br=document.createElement('div');br.style.cssText='flex-basis:100%;height:0';el.appendChild(br);
  DSKINS.forEach((s,i)=>{const own=d.unl.includes(i);mk((d.skin===i?'● ':'')+s.n+(own?'':' 🔒'),'',()=>{if(!own)return;d.skin=i;store();sfx('click');openDragon();},!own);});
  $('wMsg').textContent=`Boje: Šumski – riješi Zmajev otok · Ledeni – pobijedi u kanjonu · Dugin – oboje.`+(d.babies?` · Zmajića: ${d.babies}`:'');showScreen('sWorlds');}


/* ================= STRAŠKO 2: baka, dragulji, špilja, oprema, let iznad svjetova, izgubljeni zmajići ================= */
const BAKA_SKIN={body:0x6b4fa0,belly:0xf3e6ff,ridge:[0xff8fc8],wing:0xffb3d9,edge:0x4a3570,spike:0xfff0fa,eye:0x7ed957,club:0xff8fc8};
const DACC=[{id:'sedlo',n:'Sedlo',ic:'🪑',p:20},{id:'kruna',n:'Kruna',ic:'👑',p:40},{id:'sal',n:'Šal',ic:'🧣',p:25},{id:'masna',n:'Mašna na repu',ic:'🎀',p:15}];
const BAKA_SAYS=['Drži se, Leona!','Joj, kako je visoko!','Bravo, Leona!','Baš lijepo letimo!','Pazi na stijene, zlato moje!','Vidi koliko dragulja!','Straško je dobar zmaj.','Juhu!'];
function dAcc(){const d=dSave();if(!d.acc)d.acc={own:[],wear:[]};return d.acc;}
function wornAcc(){const a=dAcc(),o={};a.wear.forEach(k=>o[k]=1);return o;}
let BAKA=null;
function getBaka(){if(BAKA)return BAKA;BAKA=makeLeonaAny({hair:0x3f3f45,hair2:0x9c9ca6,style:'kratka',short:true,shirt:0x25232b,hood:0x1c1a21,zip:0x3a3842,legs:0x34343f,shoe:0x24242b,outfit:'trenirka',iris:0x4a2e1a});
  const nk=new THREE.Mesh(new THREE.TorusGeometry(.115,.012,6,20),new THREE.MeshToonMaterial({color:0xdfe3ea,gradientMap:TOON}));nk.rotation.x=Math.PI/2-.35;nk.position.set(0,.86,.03);nk.name='ogrlica';BAKA.add(nk);
  try{castAll(BAKA);addOutline(BAKA);}catch(e){}return BAKA;}
function poseAs(ch,fn){const L=leona;leona=ch;try{fn();if(ch.userData.sync)ch.userData.sync();}finally{leona=L;}}
function bakaSetup(D){const m=dSave().baka||0;const B={m,g:null,BD:null};if(!m)return B;const g=getBaka();B.g=g;g.visible=true;g.rotation.set(0,0,0);
  if(m===1){D.seat.add(g);g.position.set(0,-.48,-.74);g.scale.setScalar(.98);}
  else{B.BD=makeDragon(BAKA_SKIN);world.add(B.BD.g);B.BD.seat.add(g);g.position.set(0,-.5,0);g.scale.setScalar(.98);B.BD.g.position.copy(D.g.position);}
  B.t=8+Math.random()*8;return B;}
function bakaUpd(h,dt){const B=FLY.baka;if(!B||!B.m)return;poseAs(B.g,()=>{poseLeonaRiding(.3,true);if(B.m===1){const U=leona.userData;U.arms.forEach((a,i)=>{a.sh.rotation.x=-1.25;a.sh.rotation.z=(i?-1:1)*-.1;a.el.rotation.x=-.3;});}});
  if(B.BD){const H=FLY.hist[Math.min(FLY.hist.length-1,5)]||h;const g=B.BD.g;const tx=H.x+Math.cos(H.yaw)*5.5,tz=H.z-Math.sin(H.yaw)*5.5,ty=H.y+1+Math.sin(time*1.1)*.5;const k=Math.min(1,dt*3.5);
    g.position.x+=(tx-g.position.x)*k;g.position.y+=(ty-g.position.y)*k;g.position.z+=(tz-g.position.z)*k;g.rotation.set(0,H.yaw,0);animDragon(B.BD,time+.7,dt,.9,0,0);}
  B.t-=dt;if(B.t<=0){B.t=22+Math.random()*16;say(BAKA_SAYS[Math.floor(Math.random()*BAKA_SAYS.length)]);}}

/* ---------- dragulji u zmajevim svjetovima ---------- */
function dGem(x,y,z){const c=GEMC[FLY.dg.length%GEMC.length];const m=put(G.gem,dmat(c),x,y,z,.9,1.25,.9);glow(m,0,0,0,4.5,c,true,.6);FLY.dg.push({x,y,z,m,c,got:false,ph:Math.random()*6});}
function flyGemHud(){if(FLY&&FLY.hud&&FLY.hud.gem)FLY.hud.gem.textContent=FLY.gemT?`${FLY.gemN} / ${FLY.gemT}`:String(FLY.gemN);}
function flyGemsUpd(h,dt){const R=FLY.kind==='canyon'?3.6:4.4;
  for(const it of FLY.dg){if(it.got)continue;it.m.rotation.y+=dt*2;it.m.position.y=it.y+Math.sin(time*2.5+it.ph)*.25;
    if(Math.hypot(it.x-h.x,it.y-h.y,it.z-h.z)<R){it.got=true;world.remove(it.m);FLY.gemN++;save.gems++;sfx('gem');flyBurst(it.x,it.y,it.z,[0xffffff,it.c],8,5);flyGemHud();}}
  if(FLY.kind==='world'){for(const it of gems){if(it.got)continue;if(Math.hypot(it.x-h.x,it.y-h.y,it.z-h.z)<4.2){it.got=true;world.remove(it.m);FLY.gemN++;save.gems++;sfx('gem');flyBurst(it.x,it.y,it.z,[0xffffff,it.c||0xff8fc8],8,5);flyGemHud();}}}}

/* ---------- oprema na zmaju ---------- */
function dragonAcc(D,sk,acc,club){if(!acc)return;const b=D.b,h=D.head;const S=(x,y,z,rx,ry,rz,c,p)=>put(G.sph,dmat(c),x,y,z,rx,ry,rz,p||b);
  if(acc.sedlo){S(0,.62,.5,.52,.17,.62,0xff6fa5);S(0,.7,1.02,.3,.16,.1,0xffd166);S(0,.74,-.02,.36,.22,.1,0xffd166);for(const s of [-1,1]){S(s*.6,.2,.5,.06,.42,.3,0xff6fa5);S(s*.64,-.12,.5,.1,.1,.1,0xffd166);}}
  if(acc.kruna){put(G.cyl,dmat(0xffd166),0,.5,.14,.25,.14,.25,h);for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const c=put(G.cone,dmat(0xffd166),Math.cos(a)*.2,.66,.14+Math.sin(a)*.2,.07,.2,.07,h);S(Math.cos(a)*.2,.78,.14+Math.sin(a)*.2,.04,.04,.04,[0xff4f6a,0x5ec8ff,0x7ed957][i%3],h);}}
  if(acc.sal){const t=new THREE.Mesh(new THREE.TorusGeometry(.44,.13,8,20),dmat(0xff4f6a));t.position.set(0,.5,1.46);t.rotation.x=Math.PI/2-.75;b.add(t);const t2=new THREE.Mesh(new THREE.TorusGeometry(.44,.135,8,20,Math.PI/3),dmat(0xffffff));t2.position.copy(t.position);t2.rotation.copy(t.rotation);b.add(t2);
    S(.4,.12,1.5,.12,.36,.08,0xff4f6a);S(.4,-.2,1.5,.13,.06,.09,0xffffff);}
  if(acc.masna&&club){for(const s of [-1,1]){const c=put(G.cone,dmat(0xff6fa5),s*.3,.5,0,.24,.5,.12,club);c.rotation.z=s*Math.PI/2;}S(0,.5,0,.13,.13,.13,0xffd6e8,club);}}

/* ---------- Straškova špilja ---------- */
let CAVE=null;
function dragonIdle(D,t,dt,act){const br=Math.sin(t*1.6);D.wings.forEach((w,i)=>{const s=i?1:-1;w.rotation.set(.1,s*1.25,s*(.7+br*.03));});D.legs.forEach(l=>l.rotation.x=0);
  D.b.position.y=br*.03;D.b.rotation.z=0;D.b.rotation.x=.06;D.tail.forEach((s,i)=>{s.rotation.y=Math.sin(t*1.3-i*.5)*.12+.16;s.rotation.x=.03;});
  const nz=act==='pet'?Math.sin(t*7)*.12:0;D.head.rotation.set(Math.sin(t*.9)*.05+(act==='pet'?.25:0),Math.sin(t*.5)*.25+.3,nz);D.jaw.rotation.x=act==='feed'?.55:.1+Math.max(0,Math.sin(t*.8))*.06;}
function caveHud(){$('cvGems').textContent=save.gems;const d=dSave();$('bCvBaka').textContent='👵 '+['Bez bake','Baka sa mnom','Baka na svom zmaju'][d.baka||0];}
function caveDragon(){if(CAVE.D)world.remove(CAVE.D.g);const d=dSave();const D=makeDragon(DSKINS[d.skin]||DSKINS[0],wornAcc());D.g.position.set(0,1.22,0);D.g.rotation.y=.5;world.add(D.g);CAVE.D=D;}
function cavePeople(){const d=dSave();scene.add(leona);leona.visible=true;leona.scale.setScalar(1);leona.position.set(3.1,0,2.6);leona.rotation.set(0,-2.3,0);
  if(CAVE.bk){CAVE.bk.parent&&CAVE.bk.parent.remove(CAVE.bk);CAVE.bk=null;}
  if(d.baka){const g=getBaka();world.add(g);g.visible=true;g.scale.setScalar(1.2);g.position.set(4.5,0,1.7);g.rotation.set(0,-2.1,0);CAVE.bk=g;}}
function enterCave(){endDuo();if(FLY){FLY=null;}clearWorld();mode='cave';th=null;WD={H:null,waterY:null};const d=dSave();
  if(rig)rig.wrap.visible=false;zara.visible=false;uShadow.visible=false;dShadow.visible=false;arrow.visible=false;
  scene.background=new THREE.Color(0x231634);scene.fog=new THREE.Fog(0x231634,18,46);hemi.intensity=.62;hemi.color.setHex(0xe8d8ff);hemi.groundColor.setHex(0x6a3a5a);sun.intensity=.7;sun.color.setHex(0xffc89a);fxTune(.35,.88,.5);
  CAVE={D:null,sp:[],act:null,bk:null,babies:[]};
  // pod i zidovi
  const fl=new THREE.Mesh(new THREE.CircleGeometry(24,40),dmat(0x5a4468));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;world.add(fl);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(23,24,14,0,Math.PI*2,0,Math.PI/2),new THREE.MeshToonMaterial({color:0x3a2850,gradientMap:TOON,side:THREE.BackSide}));world.add(dome);
  const rg=new THREE.Group();world.add(rg);const r=mulberry(31);
  for(let i=0;i<34;i++){const a=i/34*Math.PI*2,R=15+r()*5;if(Math.cos(a)>.2&&Math.sin(a)>.2)continue;const h=2+r()*5;const c=put(G.cone,dmat(i%3?0x4a3660:0x5b4474),Math.cos(a)*R,h/2,Math.sin(a)*R,.9+r(),h,.9+r(),rg);}
  for(let i=0;i<14;i++){const a=r()*6.28,R=4+r()*14;const c=put(G.cone,dmat(0x4a3660),Math.cos(a)*R,14-r()*2,Math.sin(a)*R-4,.5+r()*.5,3+r()*4,.5+r()*.5,rg);c.rotation.x=Math.PI;}
  mergeKids(rg);
  for(let i=0;i<9;i++){const a=2+i*.5,R=11+(i%3)*2,x=Math.cos(a)*R,z=Math.sin(a)*R;const c=[0xb08cff,0x5ec8ff,0xff9ed2][i%3];const m=put(G.gem,dmat(c),x,1.3,z,.7,1.8+(i%2),.7);m.rotation.z=(i%3-1)*.3;glow(world,x,1.6,z,5,c,true,.55);}
  // lava jezerce
  const lv=new THREE.Mesh(new THREE.CircleGeometry(3.2,24),basic(0xff7a1a));lv.rotation.x=-Math.PI/2;lv.position.set(7.5,.03,-6);world.add(lv);glow(world,7.5,1,-6,11,0xff8a3a,true,.6);
  // blago
  const tg=new THREE.Group();tg.position.set(-5.6,0,-1.2);world.add(tg);const n=Math.min(150,Math.floor(save.gems/3)+4);const ph=.8+Math.min(1.9,n/60);
  put(G.sph,dmat(0xffc83a),0,0,0,1.6+ph*.9,ph,1.6+ph*.9,tg);
  for(let i=0;i<n;i++){const a=r()*6.28,k=Math.sqrt(r()),R=k*(1.5+ph*.9),y=ph*Math.cos(k*Math.PI/2)*.95+.1;const c=GEMC[i%GEMC.length];const m=put(G.gem,dmat(c),Math.cos(a)*R,y,Math.sin(a)*R,.26,.36,.26,tg);m.rotation.set(r()*3,r()*3,r()*3);}
  for(let i=0;i<Math.min(40,n);i++){const a=r()*6.28,R=1+r()*(2.2+ph);const m=put(G.cyl,dmat(0xffe066),Math.cos(a)*R,.06+r()*.2,Math.sin(a)*R,.16,.05,.16,tg);m.rotation.set(r()*.6,0,r()*.6);}
  mergeKids(tg);glow(world,-5.6,ph+.6,-1.2,7,0xffd166,true,.5);CAVE.tre=tg;
  // gnijezdo i zmajići
  const ng=new THREE.Group();ng.position.set(4.6,0,-3.4);world.add(ng);const tor=new THREE.Mesh(new THREE.TorusGeometry(2,.6,8,20),dmat(0x8a5a32));tor.rotation.x=Math.PI/2;tor.position.y=.4;ng.add(tor);put(G.sph,dmat(0xa8784a),0,.2,0,1.7,.3,1.7,ng);
  for(let i=0;i<(d.babies||0);i++){const B=makeDragon(DSKINS[BABYC[i]]);B.g.scale.setScalar(.3);const a=i/5*Math.PI*2;B.g.position.set(4.6+Math.cos(a)*1.05,.75,-3.4+Math.sin(a)*1.05);B.g.rotation.y=a+2;world.add(B.g);CAVE.babies.push(B);}
  if(!(d.babies>0)){const EC=[0xff6fa5,0x7ed957,0x5ec8ff];}
  caveDragon();cavePeople();camPos.set(7,4,12);camLook.set(0,1.6,0);
  $('cvMsg').textContent='';caveHud();banner('','','',false);showScreen('sCave');say(d.baka?'Straškova špilja. Baka je spremna za let!':'Straškova špilja.');}
function exitCave(){if(CAVE&&CAVE.bk&&CAVE.bk.parent)CAVE.bk.parent.remove(CAVE.bk);CAVE=null;scene.fog=null;if(rig)rig.wrap.visible=true;todLabel();store();enterStable();}
function updateCave(dt,inp){if(!CAVE)return;const C=CAVE,D=C.D;
  if(inp.nav.l)nav(-1,0);if(inp.nav.r)nav(1,0);if(inp.nav.u)nav(0,-1);if(inp.nav.d)nav(0,1);if(inp.ap&&focusEl&&!focusEl.disabled)focusEl.click();
  if(inp.bp){if($('sWorlds').classList.contains('on'))$('bWorldsBack').click();else exitCave();if(!CAVE)return;}
  let act=null;if(C.act){const A=C.act;A.t+=dt;act=A.k;
    if(A.k==='feed'){const m=mouthPos(D);if(A.it){const k=Math.min(1,A.t/.8);A.it.position.set(leona.position.x+(m.x-leona.position.x)*k,1.2+(m.y-1.2)*k+Math.sin(k*Math.PI)*1.2,leona.position.z+(m.z-leona.position.z)*k);A.it.rotation.z+=dt*6;
        if(k>=1){world.remove(A.it);A.it=null;sfx('found');}}
      else if(A.t<2&&Math.random()<.6){const fy=D.g.rotation.y+D.head.rotation.y;flySpark(m.x,m.y,m.z,Math.sin(fy)*7+(Math.random()-.5)*3,1+Math.random()*2,Math.cos(fy)*7+(Math.random()-.5)*3,FX_SPK[Math.floor(Math.random()*4)],.8,.6,0);}
      if(A.t>2.2){C.act=null;$('cvMsg').textContent='Mljac! Straško voli ljute papričice.';}}
    else if(A.k==='pet'){if(Math.random()<.35){const hp=new THREE.Vector3(0,.6,0);D.head.localToWorld(hp);flySpark(hp.x+(Math.random()-.5)*1.4,hp.y,hp.z+(Math.random()-.5)*1.4,0,1.6+Math.random(),0,[0xff6fa5,0xff9ed2,0xffffff][Math.floor(Math.random()*3)],.7,1.1,0);}
      if(Math.floor(A.t*5)!==A.p){A.p=Math.floor(A.t*5);tone(140,150,.18,'sine',.05);}if(A.t>2.4){C.act=null;$('cvMsg').textContent='Straško prede od sreće!';}}}
  dragonIdle(D,time,dt,act);C.babies.forEach((B,i)=>{dragonIdle(B,time+i,dt,null);B.head.rotation.set(.5,.2,0);B.g.position.y=.75+Math.sin(time*1.4+i)*.03;});
  poseLeonaStanding();if(act==='pet'||act==='feed'){const U=leona.userData;U.arms[1].sh.rotation.x=-2.2+Math.sin(time*8)*.25;}
  if(C.bk)poseAs(C.bk,()=>{poseLeonaStanding();const U=leona.userData;U.arms[0].sh.rotation.x=-2.4+Math.sin(time*5)*.2;});
  flyParts(dt);
  const port=camera.aspect<1;const o=window.__cvOv;const tp=o?new THREE.Vector3(o[0],o[1],o[2]):new THREE.Vector3(4.2+Math.sin(time*.25)*.6,2.9,port?13.5:8.6),tl=o?new THREE.Vector3(o[3],o[4],o[5]):new THREE.Vector3(.6,port?.9:.5,0);const k=Math.min(1,dt*3);camPos.lerp(tp,k);camLook.lerp(tl,k);camera.position.copy(camPos);camera.lookAt(camLook);followSun(0,0,0);}
function cavePick(title,msg,fill){const el=$('worldBtns');el.innerHTML='';$('pickTitle').textContent=title;$('bTod').hidden=true;
  const mk=(t,cls,fn,dis)=>{const b=document.createElement('button');b.type='button';b.className='btn'+(cls?' '+cls:'');b.textContent=t;b.disabled=!!dis;b.onclick=fn;el.appendChild(b);return b;};
  const br=()=>{const q=document.createElement('div');q.style.cssText='flex-basis:100%;height:0';el.appendChild(q);};fill(mk,br);$('wMsg').textContent=msg||'';showScreen('sWorlds');}
function pickFly(){sfx('click');const d=dSave();cavePick('Straško – kamo letimo?','Leti iznad svjetova koje si otključala s jednorogom i skupljaj dragulje.',(mk,br)=>{
  mk('🌋 Zmajev otok'+(d.island?' ✔':''),'go',()=>startIsland());mk('🏁 Vatreni kanjon'+(d.race?' 🏆':''),'gold',()=>startCanyon());
  mk('🔍 Izgubljeni zmajići'+(d.seek?' ✔':'')+(d.babies>0?'':' 🔒'),'pinkb',()=>startIsland(true),!(d.babies>0));br();
  THEMES.forEach((t,i)=>{const ok=i<=save.maxWorld;mk(`${i+1}. ${t.name}`+(ok?'':' 🔒'),'',()=>startWorldFly(i),!ok);});});
  if(!(d.babies>0))$('wMsg').textContent='Izgubljeni zmajići: prvo izlegni zmajiće na Zmajevom otoku. '+$('wMsg').textContent;}
function pickSkin(){sfx('click');const d=dSave();cavePick('Straškova boja','Šumski – riješi Zmajev otok · Ledeni – pobijedi u kanjonu · Dugin – oboje.',(mk)=>{
  DSKINS.forEach((s,i)=>{const own=d.unl.includes(i);mk((d.skin===i?'● ':'')+s.n+(own?'':' 🔒'),d.skin===i?'go':'',()=>{d.skin=i;store();sfx('click');caveDragon();pickSkin();},!own);});});}
function pickAcc(){const d=dSave(),a=dAcc();cavePick('Oprema za Straška',`Imaš ${save.gems} dragulja.`,(mk)=>{
  DACC.forEach(it=>{const own=a.own.includes(it.id),on=a.wear.includes(it.id);mk(`${it.ic} ${it.n}`+(own?(on?' ✔':''):` – ${it.p} 💎`),on?'go':own?'':'gold',()=>{
    if(!own){if(save.gems<it.p){sfx('oops');$('wMsg').textContent=`Treba ti još ${it.p-save.gems} dragulja. Skupljaj ih u letu!`;say($('wMsg').textContent);return;}save.gems-=it.p;a.own.push(it.id);a.wear.push(it.id);sfx('win');say(`${it.n}! Straško je sretan.`);}
    else{if(on)a.wear=a.wear.filter(x=>x!==it.id);else a.wear.push(it.id);sfx('click');}
    store();caveDragon();caveHud();pickAcc();});});});}
function pickBaka(){sfx('click');const d=dSave();cavePick('Leti li baka s nama?','',(mk)=>{
  [['Bez bake','Leona leti sama.'],['👵 Baka sa mnom','Baka sjedi iza Leone na Strašku.'],['👵🐉 Baka na svom zmaju','Baka leti pokraj Leone na svom ljubičastom zmaju.']].forEach((o,i)=>mk(((d.baka||0)===i?'● ':'')+o[0],(d.baka||0)===i?'go':'',()=>{d.baka=i;store();sfx('click');cavePeople();caveHud();say(o[1]);pickBaka();$('wMsg').textContent=o[1];}));});}

/* ---------- let iznad jednorogovih svjetova ---------- */
function startWorldFly(i){const D=flyCommon('Let: '+THEMES[i].name);levelIdx=i;th=THEMES[i];rng=mulberry(500+i*41);WD={waterY:null,H:null};
  LEVELS[i]();scenery();finishWorld();
  const R=(WD.R||100),cx=WD.cx||0,cz=WD.cz||0;const floor=(x,z)=>Math.max(topAt(x,z),WD.waterY!=null?WD.waterY:-1e9,-6);
  for(let k=0;k<34;k++){const a=k/34*Math.PI*2+Math.sin(k)*.2,rr=R*(.2+.62*((k*37)%100)/100),x=cx+Math.cos(a)*rr,z=cz+Math.sin(a)*rr;api.gem(x,floor(x,z)+7+((k*53)%17),z);}
  gems.forEach(it=>{it.m.scale.multiplyScalar(2.3);});
  const sx=start?start.x:0,sz=start?start.z:0;
  const F={x:sx,y:floor(sx,sz)+9,z:sz,yaw:(start&&start.face)||0,pitch:0,turn:0,bank:0,v:0,vy:0,bonk:0};
  FLY={kind:'world',wi:i,D,F,sp:[],hist:[],dg:[],gemN:0,gemT:Math.min(60,gems.length),R,cx,cz,floor};FLY.baka=bakaSetup(D);
  const d=dSave();if(d.babies>0)addBabies(d.babies);FLY.arrow=makeArrow(0xffd23a);FLY.hud=flyHud([['gem','💎']]);flyGemHud();
  D.g.position.set(F.x,F.y,F.z);camPos.set(F.x-Math.sin(F.yaw)*14,F.y+6,F.z-Math.cos(F.yaw)*14);camLook.set(F.x,F.y,F.z);
  banner(THEMES[i].name,`Leti iznad svijeta i skupi ${Math.min(60,gems.length)} dragulja!`,'');sfx('magic');}
function updateWorldFly(dt,inp){const {D,F}=FLY;F.bonk-=dt;
  const ud=flyUD();F.turn+=(-inp.ix*1.5-F.turn)*Math.min(1,dt*5);F.yaw+=F.turn*dt;F.bank=F.turn*.55;
  const tv=inp.iy>0?inp.iy*18:inp.iy*7;F.v+=(tv-F.v)*Math.min(1,dt*2.5);F.vy+=(ud*9-F.vy)*Math.min(1,dt*4);
  const fx=Math.sin(F.yaw),fz=Math.cos(F.yaw);F.x+=fx*F.v*dt;F.z+=fz*F.v*dt;F.y+=F.vy*dt;F.pitch=F.vy/9*.45;
  const lim=FLY.floor(F.x,F.z)+2.3;if(F.y<lim){F.y=lim;if(F.vy<0)F.vy=0;}if(F.y>70){F.y=70;if(F.vy>0)F.vy=0;}
  const dx=F.x-FLY.cx,dz=F.z-FLY.cz,dd=Math.hypot(dx,dz),mx=FLY.R+18;if(dd>mx){F.x=FLY.cx+dx/dd*mx;F.z=FLY.cz+dz/dd*mx;}
  D.g.position.set(F.x,F.y,F.z);D.g.rotation.set(0,F.yaw,0);D.b.rotation.x=-F.pitch*.8+(F.v>1?-.05:.12);animDragon(D,time,dt,ud>0?1.6:Math.abs(F.v)>2?.9:.35,-F.bank,ud<0?.6:0);poseLeonaRiding(.4,true);
  FLY.hist.unshift({x:F.x,y:F.y,z:F.z,yaw:F.yaw});if(FLY.hist.length>60)FLY.hist.pop();babyFollow(dt);
  FLY.breathT=(FLY.breathT||0)-dt;if(inp.j&&FLY.breathT<=0){FLY.breathT=.035;const m=mouthPos(D);for(let k=0;k<2;k++)flySpark(m.x,m.y,m.z,fx*26+(Math.random()-.5)*5,(Math.random()-.4)*4,fz*26+(Math.random()-.5)*5,FX_SPK[Math.floor(Math.random()*4)],.9,.55,0);}
  try{animateWorld(dt);}catch(e){}
  let best=null,bd=1e9;for(const it of gems){if(it.got)continue;const q=Math.hypot(it.x-F.x,it.y-F.y,it.z-F.z);if(q<bd){bd=q;best=it;}}
  const A=FLY.arrow;A.visible=!!best&&bd>8;if(best){A.position.set(F.x,F.y+3.4,F.z);A.lookAt(best.x,best.y,best.z);}
  if((!best||FLY.gemN>=FLY.gemT)&&!FLY.won){FLY.won=true;save.gems+=20;store();sfx('win');flyBurst(F.x,F.y+3,F.z,RAIN,60,12);banner('Bravo, Leona!',`Skupila si ${FLY.gemT} dragulja! Još 20 za nagradu.`,'Leti dalje ili se vrati u špilju.',true,true);}
  flyParts(dt);flyCam(dt,F,13,4.2);updateSparks(time,F.x,F.y,F.z,th?th.spark:0xffffff);}

/* ---------- izgubljeni zmajići ---------- */
function setupSeek(){const F=FLY;F.seek={found:0,ct:0,list:[],done:false};F.won=true;F.hatched=true;
  F.rings.forEach(r=>{r.got=true;r.g.visible=false;});F.lant.forEach(L=>{L.on=true;L.lamp.material=dmat(0xffc04a);L.gl.visible=true;});F.eggs.forEach(e=>world.remove(e.g));F.eggs=[];
  if(F.babies)F.babies.forEach(b=>world.remove(b.D.g));F.babies=[];
  const I=F.isl,top=k=>[I[k].x-I[k].R*.3,I[k].y+I[k].R*.3+.6,I[k].z-I[k].R*.2];const gr=(x,z)=>[x,islandH(x,z)+.5,z];
  const cand=[top(1),top(4),top(7),top(10),top(3),top(8),gr(-62,40),gr(80,-30),gr(-20,-84),gr(55,70),gr(-88,-12),[8,49.5,6]];
  for(let i=cand.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cand[i],cand[j]]=[cand[j],cand[i]];}
  cand.slice(0,5).forEach((p,i)=>{const D=makeDragon(DSKINS[BABYC[i]]);D.g.scale.setScalar(.36);D.g.position.set(p[0],p[1],p[2]);D.g.rotation.y=Math.random()*6;world.add(D.g);F.seek.list.push({D,x:p[0],y:p[1],z:p[2],found:false});});
  F.hud=flyHud([['baby','🐲'],['warm','📡'],['gem','💎']]);F.hud.baby.textContent='0 / 5';flyGemHud();
  banner('Izgubljeni zmajići','Zmajići su se sakrili po otoku! Slušaj cvrkut: što je brži, to si bliže.','');}
function updateSeek(dt){const F=FLY,K=F.seek,P=F.F;let near=null,nd=1e9;
  for(const b of K.list){if(b.found)continue;dragonIdle(b.D,time,dt,null);b.D.g.position.y=b.y+.45+Math.abs(Math.sin(time*3+b.x))*.25;const q=Math.hypot(b.x-P.x,b.y-P.y,b.z-P.z);if(q<nd){nd=q;near=b;}}
  if(near){F.hud.warm.textContent=nd>110?'Hladno':nd>65?'Toplije':nd>32?'Toplo!':'Vruće!';
    K.ct-=dt;if(K.ct<=0){K.ct=Math.max(.22,Math.min(2.4,nd/45));const v=Math.max(0,Math.min(.1,.11-nd/1500));if(v>0){tone(1500,1900,.07,'triangle',v);tone(1900,1500,.07,'triangle',v,.08);}}
    if(nd<7.5){near.found=true;K.found++;sfx('found');flyBurst(near.x,near.y+1,near.z,[0xff6fa5,0xffffff,0xffd23a],26);F.babies.push({D:near.D});F.hud.baby.textContent=`${K.found} / 5`;
      say(K.found<5?`Pronašla si zmajića! Još ${5-K.found}.`:'Svi zmajići su pronađeni! Odvedi ih kući u gnijezdo.');}}
  else if(!K.done){F.hud.warm.textContent='U gnijezdo!';const N=F.nest,A=F.arrow;A.visible=true;A.position.set(P.x,P.y+3.4,P.z);A.lookAt(N.x,N.y+3,N.z);
    if(Math.hypot(P.x-N.x,P.z-N.z)<16&&P.y<N.y+22){K.done=true;A.visible=false;const d=dSave();const first=!d.seek;d.seek=true;save.gems+=first?40:15;store();sfx('win');flyBurst(P.x,P.y+3,P.z,RAIN,60,12);
      banner('Bravo, Leona!','Svi zmajići su opet kod kuće!','Leti dalje ili se vrati u špilju.',true,true);}}}

{const ob=$('bWorldsBack').onclick;$('bWorldsBack').onclick=()=>{if(mode==='cave'){todLabel();caveHud();showScreen('sCave');return;}ob();};}
$('bCvFeed').onclick=()=>{if(!CAVE||CAVE.act)return;sfx('click');const it=new THREE.Group();put(G.cone,dmat(0xe5262f),0,0,0,.12,.5,.12,it).rotation.x=Math.PI;put(G.cyl,dmat(0x3f9a4a),0,.3,0,.03,.14,.03,it);world.add(it);CAVE.act={k:'feed',t:0,it};$('cvMsg').textContent='';say('Evo ti ljuta papričica, Straško!');};
$('bCvPet').onclick=()=>{if(!CAVE||CAVE.act)return;sfx('click');CAVE.act={k:'pet',t:0};$('cvMsg').textContent='';say('Dobar zmaj!');};
$('bCvAcc').onclick=()=>{sfx('click');pickAcc();};$('bCvSkin').onclick=()=>pickSkin();$('bCvBaka').onclick=()=>pickBaka();$('bCvFly').onclick=()=>pickFly();$('bCvBack').onclick=()=>{sfx('click');exitCave();};
window.__drag={get FLY(){return FLY;},get CAVE(){return CAVE;},makeDragon,get cam(){return camera;},enterCave,startIsland,startCanyon,startWorldFly,dSave,getBaka};

$('bDragon').onclick=()=>{sfx('click');enterCave();};
function glamLabel(){$('bGlam').textContent=glamOn()?'✨ Sjaj: da':'✨ Sjaj: ne';}
$('bGlam').onclick=()=>{save.glam=!glamOn();store();applyGlam();glamLabel();rebuildRig();sfx('magic');say(glamOn()?'Čarobni sjaj je uključen.':'Čarobni sjaj je isključen.');enterStable();};
applyGlam();glamLabel();
{const oh=$('bHome').onclick;$('bHome').onclick=()=>{if(mode==='fly'){flyExit();return;}oh();};}
boot();
window.__g={get rig(){return rig;},get S(){return S;},get world(){return world;},topAt:(x,z)=>topAt(x,z),terrainAt:(x,z)=>terrainAt(x,z),get perf(){return PERF;},get pm(){return perfMon;},setPerf(n){PERF=n;applyPerf();},setMode:m=>mode=m,mount:()=>mountLeona(),fx:(s,t,r)=>fxTune(s,t,r),get bloom(){return bloom;},get composer(){return composer;},get leona(){return leona;},get camera(){return camera;},api:null,P,get mode(){return mode;},startRide,startRace,get gems(){return gems;},get foals(){return foals;},save,enterStable,get rideState(){return rideState;},get race(){return race;},get WD(){return WD;},get arches(){return arches;},get bones(){return bones;},dog,say,get voiceOn(){return voiceOn;},get hrVoice(){return hrVoice;},startDuoRace,startDuoRide,get duo(){return duo;},C1,C2,duoStep(n,a,b){for(let i=0;i<n;i++){time+=1/30;stateT+=1/30;updateSweepers(1/30);if(!duo||mode!=='ride')return;updateDuo(1/30,[Object.assign({},NOINP,a||{}),Object.assign({},NOINP,b||{})]);}},step(n,inp){for(let i=0;i<n;i++)update(1/30,Object.assign({},NOINP,inp||{}));},bunny:c=>makeBunny(c),bird:c=>makeBird(c),duck:(s,c)=>makeDuck(s,c),scene};
})();

