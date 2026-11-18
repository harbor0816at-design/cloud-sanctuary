/* 云上圣所 · Sanctuary — app */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const store={get(k,d){try{const v=localStorage.getItem('sanct_'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{if(v==null)localStorage.removeItem('sanct_'+k);else localStorage.setItem('sanct_'+k,JSON.stringify(v));}catch(e){}}};

/* ---------- language & currency ---------- */
const LANGS=['en','fr','de','it','es','zh'];
const LANG=(window.SANCT_LANG&&window.I18N[window.SANCT_LANG])?window.SANCT_LANG:'en';
const DICT=window.I18N[LANG],SCR=window.SCRIPTURE[LANG]||window.SCRIPTURE.en;
function t(k,v){let s=DICT[k];if(s==null)s=window.I18N.en[k];if(s==null)return k;if(v)for(const x in v)s=s.split('{'+x+'}').join(v[x]);return s;}
const LOCALE={en:'en-US',fr:'fr-FR',de:'de-DE',it:'it-IT',es:'es-ES',zh:'zh-CN'}[LANG];
document.documentElement.lang=LANG==='zh'?'zh-CN':LANG;
if(LANG!=='en'&&!location.pathname.startsWith('/'+LANG+'/'))document.title=t('docTitle'); // language pages carry their own SEO title
document.querySelectorAll('[data-i18n]').forEach(el=>{el.innerHTML=t(el.dataset.i18n);});
let CUR=store.get('cur',null);
if(CUR!=='eur'&&CUR!=='usd'){let tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch(e){}CUR=/^Europe\//.test(tz)?'eur':'usd';}
function price(c){try{return new Intl.NumberFormat(LOCALE,{style:'currency',currency:CUR.toUpperCase(),minimumFractionDigits:c%100?2:0,maximumFractionDigits:2}).format(c/100);}catch(e){return (CUR==='eur'?'€':'$')+(c/100).toFixed(c%100?2:0);}}
const PRICE={candle:100,confession:990};

const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
if(isTouch)document.body.classList.add('touch');

if(typeof THREE==='undefined'){$('#loading').textContent=t('engineFail');return;}

/* ---------- backend (Supabase) ---------- */
const SB_URL='https://smwqqiebkdaheikihbrg.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtd3FxaWVia2RhaGVpa2loYnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NzU2NzksImV4cCI6MjEwNzU1MTY3OX0.ouoYJ_OTLp4aazXn7H9xcwGJQOQ-pF1fttwR7U5WaG4';
let sb=null;
try{if(window.supabase&&window.supabase.createClient)sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:8}}});}catch(e){sb=null;}
async function rpc(fn,args){if(!sb)throw new Error('offline');const r=await sb.rpc(fn,args||{});if(r.error)throw r.error;return r.data;}
const myId=(()=>{let id=null;try{id=sessionStorage.getItem('sanct_id');}catch(e){}if(!id){id=Math.random().toString(36).slice(2,10);try{sessionStorage.setItem('sanct_id',id);}catch(e){}}return id;})();

/* ---------- account state ---------- */
let token=store.get('tok',null),me=null,payOn=false;
const OT=(n,p)=>{try{if(window.OpsTrack)window.OpsTrack.track(n,p);}catch(_){}};
function myName(){return me&&me.show_name?me.name:null;}
function myPub(){return me&&me.show_name?me.pub_id:null;}
function setAcctBtn(){const b=$('#acctbtn');b.textContent=me?(me.name||'?').slice(0,1).toUpperCase():'👤';b.classList.toggle('in',!!me);}
function logoutLocal(){token=null;me=null;store.set('tok',null);setAcctBtn();retrack();}
async function loadMe(){if(!token||!sb){setAcctBtn();return;}try{const u=await rpc('sanct_me',{p_token:token});if(u){me=u;}else logoutLocal();}catch(e){}setAcctBtn();retrack();}
async function loadConfig(){if(!sb)return;try{const c=await rpc('sanct_public_config');payOn=!!(c&&c.payments);}catch(e){}}
const REF=(()=>{const q=new URLSearchParams(location.search).get('ref');if(q&&/^[a-f0-9]{4,12}$/i.test(q)){store.set('ref',{c:q,ts:Date.now()});return q;}const r=store.get('ref',null);return r&&Date.now()-r.ts<30*864e5?r.c:null;})();

/* ---------- scripture ---------- */
const VERSES=SCR.verses;
const dayIdx=Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/864e5);
let verseIdx=dayIdx%VERSES.length;

/* ---------- renderer / scene ---------- */
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:devicePixelRatio<1.5&&!isTouch,powerPreference:'high-performance'});}
catch(e1){try{renderer=new THREE.WebGLRenderer({antialias:false});}catch(e2){renderer=null;}}
if(!renderer){OT('webgl_fail',{ua:navigator.userAgent.slice(0,120)});$('#loading').textContent=t('noWebGL'); return;}
const MAX_PR=Math.min(devicePixelRatio,isTouch?1:1.25);let PR=MAX_PR;
renderer.setPixelRatio(PR);
renderer.setSize(innerWidth,innerHeight);
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.2;
$('#stage').appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0c0907);
scene.fog=new THREE.FogExp2(0x1c140d,0.02);
const camera=new THREE.PerspectiveCamera(isTouch&&innerWidth<innerHeight?78:68,innerWidth/innerHeight,0.05,140);
camera.rotation.order='YXZ';
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=isTouch&&innerWidth<innerHeight?78:68;camera.updateProjectionMatrix();renderer.setPixelRatio(PR);renderer.setSize(innerWidth,innerHeight);});

/* ---------- procedural textures ---------- */
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function mkC(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return[c,c.getContext('2d')];}
const maxAniso=Math.min(4,renderer.capabilities.getMaxAnisotropy());
function toTex(c,srgb){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(srgb!==false)t.encoding=THREE.sRGBEncoding;t.anisotropy=maxAniso;return t;}
function grain(g,w,h,amt,r){const id=g.getImageData(0,0,w,h),d=id.data;for(let i=0;i<d.length;i+=4){const n=(r()-.5)*amt;d[i]+=n;d[i+1]+=n;d[i+2]+=n;}g.putImageData(id,0,0);}
function hsl(h,s,l){return`hsl(${h},${s}%,${l}%)`;}

function floorTexture(){const[c,g]=mkC(512,512),r=rng(7);const n=4,s=512/n;
 for(let i=0;i<n;i++)for(let j=0;j<n;j++){const dark=(i+j)%2;const l=dark?30+r()*5:52+r()*6;g.fillStyle=hsl(30+r()*8,dark?14:18,l);g.fillRect(i*s,j*s,s,s);
  for(let k=0;k<6;k++){g.strokeStyle=`rgba(255,255,255,${.03+r()*.04})`;g.lineWidth=1+r()*2;g.beginPath();g.moveTo(i*s+r()*s,j*s+r()*s);g.bezierCurveTo(i*s+r()*s,j*s+r()*s,i*s+r()*s,j*s+r()*s,i*s+r()*s,j*s+r()*s);g.stroke();}}
 g.strokeStyle='rgba(20,14,9,.75)';g.lineWidth=3;for(let i=0;i<=n;i++){g.beginPath();g.moveTo(i*s,0);g.lineTo(i*s,512);g.stroke();g.beginPath();g.moveTo(0,i*s);g.lineTo(512,i*s);g.stroke();}
 grain(g,512,512,18,r);return toTex(c);}
function stoneTexture(){const[c,g]=mkC(512,512),r=rng(11);g.fillStyle='#4e4337';g.fillRect(0,0,512,512);const rh=64;
 for(let y=0;y<512;y+=rh){let x=-(r()*120);while(x<512){const w=90+r()*90;const l=44+r()*12;g.fillStyle=hsl(32+r()*6,16+r()*6,l);g.fillRect(x+2,y+2,w-4,rh-4);
  const gr=g.createLinearGradient(0,y,0,y+rh);gr.addColorStop(0,'rgba(255,240,220,.08)');gr.addColorStop(1,'rgba(0,0,0,.12)');g.fillStyle=gr;g.fillRect(x+2,y+2,w-4,rh-4);
  if(x+w>512){g.fillStyle=hsl(32+r()*6,18,l);g.fillRect(x+2-512,y+2,w-4,rh-4);}x+=w;}}
 grain(g,512,512,22,r);return toTex(c);}
function woodTexture(){const[c,g]=mkC(256,256),r=rng(3);g.fillStyle='#5a3a22';g.fillRect(0,0,256,256);
 for(let i=0;i<70;i++){const y=r()*256;g.strokeStyle=`rgba(${r()<.5?'30,16,8':'120,80,45'},${.15+r()*.25})`;g.lineWidth=.5+r()*2;g.beginPath();g.moveTo(0,y);for(let x=0;x<=256;x+=32)g.lineTo(x,y+Math.sin(x*.03+i)*2.5);g.stroke();}
 grain(g,256,256,14,r);return toTex(c);}
function plankTexture(){const[c,g]=mkC(256,256),r=rng(5);for(let i=0;i<8;i++){g.fillStyle=hsl(25,30+r()*8,16+r()*6);g.fillRect(i*32,0,32,256);g.fillStyle='rgba(0,0,0,.5)';g.fillRect(i*32,0,2,256);}grain(g,256,256,12,r);return toTex(c);}
function glowTexture(){const[c,g]=mkC(128,128);const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,220,160,.55)');gr.addColorStop(1,'rgba(255,180,90,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return toTex(c);}
function rayTexture(){const[c,g]=mkC(64,256);const v=g.createLinearGradient(0,0,0,256);v.addColorStop(0,'rgba(255,236,200,0)');v.addColorStop(.6,'rgba(255,236,200,.35)');v.addColorStop(1,'rgba(255,236,200,.75)');g.fillStyle=v;g.fillRect(0,0,64,256);
 g.globalCompositeOperation='destination-in';const h=g.createLinearGradient(0,0,64,0);h.addColorStop(0,'rgba(0,0,0,0)');h.addColorStop(.5,'rgba(0,0,0,1)');h.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=h;g.fillRect(0,0,64,256);return toTex(c);}
const PALS=[['#1d3f8a','#2a5cc7','#7a1f2b','#c23b3b','#d9a52b','#2f7a4a','#5a2d82'],['#174a7c','#2c7fb8','#e0b13a','#a3312a','#3c8d5a','#e8d9a8'],['#5b1f6e','#2b4fa2','#c8962e','#8c2430','#2f6f73','#d47a2c']];
function glassTexture(seed,motif){const W=256,H=512,[c,g]=mkC(W,H),r=rng(seed),pal=PALS[seed%PALS.length];
 g.save();g.beginPath();g.moveTo(0,H);g.lineTo(0,128);g.arc(128,128,128,Math.PI,0);g.lineTo(W,H);g.closePath();g.clip();
 const cols=5,rows=11,pts=[];for(let j=0;j<=rows;j++){pts[j]=[];for(let i=0;i<=cols;i++){const jx=(i>0&&i<cols)?(r()-.5)*28:0,jy=(j>0&&j<rows)?(r()-.5)*24:0;pts[j][i]=[i*W/cols+jx,j*H/rows+jy];}}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const p=[pts[j][i],pts[j][i+1],pts[j+1][i+1],pts[j+1][i]];g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let k=1;k<4;k++)g.lineTo(p[k][0],p[k][1]);g.closePath();
  const col=pal[Math.floor(r()*pal.length)];g.fillStyle=col;g.fill();g.fillStyle=`rgba(255,255,255,${r()*.18})`;g.fill();g.strokeStyle='#15100b';g.lineWidth=4;g.stroke();}
 // medallion
 const cx=128,cy=250,R=74;g.beginPath();g.arc(cx,cy,R,0,Math.PI*2);g.fillStyle='#f1d58a';g.fill();g.lineWidth=7;g.strokeStyle='#15100b';g.stroke();
 g.beginPath();g.arc(cx,cy,R-14,0,Math.PI*2);g.fillStyle=pal[0];g.fill();g.lineWidth=4;g.stroke();
 if(motif===0){g.fillStyle='#f6ead0';g.fillRect(cx-7,cy-44,14,88);g.fillRect(cx-32,cy-20,64,14);g.strokeRect(cx-7,cy-44,14,88);}
 else if(motif===1){for(let k=0;k<8;k++){const a=k/8*Math.PI*2;g.beginPath();g.ellipse(cx+Math.cos(a)*30,cy+Math.sin(a)*30,20,10,a,0,Math.PI*2);g.fillStyle=k%2?'#e9c46a':'#f6ead0';g.fill();g.lineWidth=3;g.stroke();}g.beginPath();g.arc(cx,cy,12,0,7);g.fillStyle='#c23b3b';g.fill();g.stroke();}
 else{g.beginPath();g.moveTo(cx,cy-46);g.quadraticCurveTo(cx+30,cy-10,cx+48,cy-24);g.quadraticCurveTo(cx+26,cy+10,cx+6,cy+8);g.lineTo(cx,cy+46);g.lineTo(cx-6,cy+8);g.quadraticCurveTo(cx-26,cy+10,cx-48,cy-24);g.quadraticCurveTo(cx-30,cy-10,cx,cy-46);g.fillStyle='#f6ead0';g.fill();g.lineWidth=3;g.stroke();}
 // arch top ornament
 g.beginPath();g.arc(128,110,46,0,Math.PI*2);g.fillStyle='#e0b13a';g.fill();g.lineWidth=5;g.stroke();g.beginPath();g.arc(128,110,26,0,7);g.fillStyle=pal[1];g.fill();g.stroke();
 g.restore();g.beginPath();g.moveTo(3,H-3);g.lineTo(3,128);g.arc(128,128,125,Math.PI,0);g.lineTo(W-3,H-3);g.closePath();g.lineWidth=8;g.strokeStyle='#15100b';g.stroke();
 return toTex(c);}
function roseTexture(){const S=512,[c,g]=mkC(S,S),r=rng(42),cx=256,cy=256;g.beginPath();g.arc(cx,cy,252,0,7);g.fillStyle='#15100b';g.fill();
 const ring=(r1,r2,n,cols)=>{for(let k=0;k<n;k++){const a0=k/n*Math.PI*2,a1=(k+1)/n*Math.PI*2;g.beginPath();g.arc(cx,cy,r2,a0,a1);g.arc(cx,cy,r1,a1,a0,true);g.closePath();g.fillStyle=cols[k%cols.length];g.fill();g.fillStyle=`rgba(255,255,255,${r()*.15})`;g.fill();g.lineWidth=5;g.strokeStyle='#15100b';g.stroke();}};
 ring(196,244,24,['#1d3f8a','#c23b3b','#2a5cc7','#d9a52b']);ring(140,192,16,['#5a2d82','#2f7a4a','#e0b13a','#2a5cc7']);
 for(let k=0;k<12;k++){const a=k/12*Math.PI*2;g.save();g.translate(cx+Math.cos(a)*100,cy+Math.sin(a)*100);g.rotate(a);g.beginPath();g.ellipse(0,0,38,18,0,0,7);g.fillStyle=k%2?'#c23b3b':'#e9c46a';g.fill();g.lineWidth=5;g.stroke();g.restore();}
 g.beginPath();g.arc(cx,cy,56,0,7);g.fillStyle='#f1d58a';g.fill();g.lineWidth=6;g.stroke();g.fillStyle='#f6ead0';g.fillRect(cx-8,cy-38,16,76);g.fillRect(cx-30,cy-16,60,14);g.lineWidth=3;g.strokeRect(cx-8,cy-38,16,76);
 const t=toTex(c);return t;}
function labelTexture(text,sub){const[c,g]=mkC(512,160);g.fillStyle='rgba(18,12,8,.0)';g.fillRect(0,0,512,160);g.textAlign='center';g.fillStyle='#e8c98a';g.font='600 '+(LANG==='en'?56:64)+'px "Noto Serif SC","Songti SC",Georgia,serif';g.fillText(text,256,sub?78:100);if(sub){g.font='30px "Noto Serif SC","Songti SC",serif';g.fillStyle='#bfa77c';g.fillText(sub,256,128);}return toTex(c);}

const TX={floor:floorTexture(),stone:stoneTexture(),wood:woodTexture(),plank:plankTexture(),glow:glowTexture(),ray:rayTexture()};
TX.floor.repeat.set(26/4,37/4);
const floor2=TX.floor.clone();floor2.needsUpdate=true;floor2.repeat.set(1,1);

/* ---------- materials ---------- */
const PH=(o)=>new THREE.MeshPhongMaterial(Object.assign({shininess:6,specular:0x111111},o));
const M={
 stone:PH({map:TX.stone}),
 stoneLight:PH({map:TX.stone,color:0xe9dcc6}),
 floor:PH({map:TX.floor,shininess:22,specular:0x2a241c}),
 marble:PH({map:floor2,color:0xfff3e0,shininess:40,specular:0x3a3428}),
 wood:PH({map:TX.wood,shininess:14}),
 darkWood:PH({map:TX.wood,color:0x8a6a52,shininess:12}),
 plank:PH({map:TX.plank,side:THREE.DoubleSide}),
 iron:PH({color:0x2a2623,shininess:30,specular:0x444444}),
 brass:PH({color:0xc1913f,shininess:60,specular:0x8a6a30}),
 cloth:PH({color:0xf3ece0}),
 red:PH({color:0x7d1d22}),
 wax:PH({color:0xf5e9d0,emissive:0x3a2008}),
 page:PH({color:0xf2e6cc}),
};
const flameMat=new THREE.MeshBasicMaterial({color:0xffd99a});
const glowMat=new THREE.SpriteMaterial({map:TX.glow,color:0xffa24a,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.85});

/* ---------- geometry helpers ---------- */
const colliders=[];
function addCol(x1,x2,z1,z2){colliders.push([Math.min(x1,x2),Math.max(x1,x2),Math.min(z1,z2),Math.max(z1,z2)]);}
function worldUV(geo,w,h,d,s){const uv=geo.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;uv.setXY(i,uv.getX(i)*dims[f][0]/s,uv.getY(i)*dims[f][1]/s);}uv.needsUpdate=true;}
function box(w,h,d,mat,x,y,z,o){o=o||{};const g=new THREE.BoxGeometry(w,h,d);if(mat.map&&o.uv!==false)worldUV(g,w,h,d,o.s||4);const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);(o.parent||scene).add(m);if(o.col)addCol(x-w/2,x+w/2,z-d/2,z+d/2);return m;}
function wall(x1,x2,y1,y2,z1,z2,mat){const m=box(x2-x1,y2-y1,z2-z1,mat||M.stone,(x1+x2)/2,(y1+y2)/2,(z1+z2)/2);if(y1<1.8)addCol(x1,x2,z1,z2);return m;}
function cyl(rt,rb,h,mat,x,y,z,seg,parent){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||16),mat);m.position.set(x,y,z);(parent||scene).add(m);return m;}
const flames=[];
const flameGeo=new THREE.SphereGeometry(.016,8,6);
function flame(x,y,z,s,parent){s=s||1;const g=new THREE.Group();const core=new THREE.Mesh(flameGeo,flameMat);core.scale.set(1,2.6,1);core.position.y=.03;g.add(core);const sp=new THREE.Sprite(glowMat);sp.scale.set(.32,.32,1);sp.position.y=.035;g.add(sp);g.userData.dyn=true;g.position.set(x,y,z);g.scale.setScalar(s);(parent||scene).add(g);const f={g,core,sp,ph:Math.random()*10};flames.push(f);return f;}

/* ---------- architecture ---------- */
// floor
const fl=new THREE.Mesh(new THREE.PlaneGeometry(26,37),M.floor);fl.rotation.x=-Math.PI/2;fl.position.set(.5,0,3);scene.add(fl);
// nave walls
const WH=9;
wall(-7.6,-7,0,WH,-14,-1);wall(-7.6,-7,0,WH,5,20);wall(-7.6,-7,6,WH,-1,5);
wall(7,7.6,0,WH,-14,1);wall(7,7.6,0,WH,4,20);wall(7,7.6,3,WH,1,4);
wall(-7.6,7.6,0,13.5,-14.6,-14);wall(-7.6,7.6,0,13.5,20,20.6);
// alcove (candles)
wall(-11.6,-11,0,6,-1.6,5.6);wall(-11,-7.6,0,6,-1.6,-1);wall(-11,-7.6,0,6,5,5.6);wall(-11.6,-7.6,6,6.4,-1.6,5.6);
// reflection room
wall(12,12.6,0,4.2,-2.6,7.6);wall(7.6,12,0,4.2,-2.6,-2);wall(7.6,12,0,4.2,7,7.6);wall(7.6,12.6,4,4.4,-2.6,7.6,M.darkWood);
// door frame of reflection room
box(.7,3.1,.18,M.darkWood,7.3,1.55,.92);box(.7,3.1,.18,M.darkWood,7.3,1.55,4.08);box(.7,.2,3.3,M.darkWood,7.3,3.05,2.5);
// alcove arch trim
box(.3,6.1,.25,M.stoneLight,-7.15,3.05,-.88);box(.3,6.1,.25,M.stoneLight,-7.15,3.05,4.88);box(.3,.3,6,M.stoneLight,-7.15,6,2);
// roof
const roofL=box(8.5,.25,35.4,M.plank,-3.65,11,3,{uv:false});roofL.rotation.z=.5011;
const roofR=box(8.5,.25,35.4,M.plank,3.65,11,3,{uv:false});roofR.rotation.z=-.5011;
TX.plank.repeat.set(4,14);
// cornice
box(.5,.4,34,M.stoneLight,-6.85,9,3,{s:2});box(.5,.4,34,M.stoneLight,6.85,9,3,{s:2});
// platform & steps
box(14,.45,7,M.marble,0,.225,-10.5,{uv:false});
box(14,.22,.6,M.marble,0,.11,-6.7,{uv:false});
function floorH(x,z){if(x>-7&&x<7){if(z<-7)return .45;if(z<-6.4)return .22;}return 0;}
// columns + arches
const colZ=[16,12,8,4,0,-4,-8];
colZ.forEach(z=>{[-4.5,4.5].forEach(x=>{const y0=floorH(x,z);cyl(.34,.38,7-y0,M.stoneLight,x,y0+(7-y0)/2,z,20);box(.95,.3,.95,M.stoneLight,x,y0+.15,z,{s:2});box(.9,.35,.9,M.stoneLight,x,7.05,z,{s:2});addCol(x-.42,x+.42,z-.42,z+.42);});
 const rib=new THREE.Mesh(new THREE.TorusGeometry(4.5,.13,8,40,Math.PI),M.stoneLight);rib.position.set(0,7.2,z);scene.add(rib);});
for(let i=0;i<colZ.length-1;i++){const zm=(colZ[i]+colZ[i+1])/2;[-4.5,4.5].forEach(x=>{const a=new THREE.Mesh(new THREE.TorusGeometry(2,.15,8,30,Math.PI),M.stoneLight);a.rotation.y=Math.PI/2;a.position.set(x,7.2,zm);scene.add(a);});}
// entrance doors
[-1.05,1.05].forEach(x=>{box(2,4.2,.15,M.darkWood,x,2.1,19.9,{s:1.5});const ring=new THREE.Mesh(new THREE.TorusGeometry(.12,.02,6,16),M.iron);ring.position.set(x>0?x-.7:x+.7,1.3,19.8);scene.add(ring);});
box(4.6,.35,.3,M.stoneLight,0,4.35,19.9,{s:2});

/* windows */
function lancet(x,y,z,ry,seed,motif,w,h){w=w||1.5;h=h||3.9;const t=glassTexture(seed,motif);const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide,fog:false,toneMapped:true}));m.position.set(x,y,z);m.rotation.y=ry;scene.add(m);
 const fr=new THREE.Mesh(new THREE.PlaneGeometry(w+.3,h+.3),M.stoneLight);fr.position.copy(m.position);fr.rotation.y=ry;fr.translateZ(-.01);scene.add(fr);return m;}
const sideZ=[14,10,-5,-11];
sideZ.forEach((z,i)=>{lancet(-6.97,5.3,z,Math.PI/2,i+1,i%3);lancet(6.97,5.3,z,-Math.PI/2,i+7,(i+1)%3);});
lancet(-3.4,5.6,-13.97,0,21,1,1.3,3.6);lancet(3.4,5.6,-13.97,0,22,2,1.3,3.6);
lancet(-4,7,19.97,Math.PI,31,2,1.2,3);lancet(4,7,19.97,Math.PI,32,1,1.2,3);
const rose=new THREE.Mesh(new THREE.CircleGeometry(1.9,48),new THREE.MeshBasicMaterial({map:roseTexture(),fog:false}));rose.position.set(0,9.6,-13.96);scene.add(rose);
const roseRing=new THREE.Mesh(new THREE.RingGeometry(1.9,2.2,48),M.stoneLight);roseRing.position.set(0,9.6,-13.95);scene.add(roseRing);
const rose2=new THREE.Mesh(new THREE.CircleGeometry(1.5,48),new THREE.MeshBasicMaterial({map:roseTexture(),fog:false}));rose2.position.set(0,9.8,19.96);rose2.rotation.y=Math.PI;scene.add(rose2);
// light shafts from left windows
const rayMat=new THREE.MeshBasicMaterial({map:TX.ray,color:0xffe1b0,transparent:true,opacity:.42,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false});
const poolMat=new THREE.MeshBasicMaterial({map:TX.glow,color:0xffd49a,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false});
const rayDir=new THREE.Vector3(1,-.6,.18);
const shafts=[];
sideZ.forEach(z=>{const start=new THREE.Vector3(-6.9,5.3,z);const t=(5.3-floorH(2,z+1.6))/.6;const L=rayDir.length()*t;const d=rayDir.clone().normalize();
 for(let k=0;k<2;k++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,L),rayMat);m.position.copy(start).addScaledVector(d,L/2);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d);m.rotateY(k*Math.PI/2);m.userData.dyn=true;scene.add(m);shafts.push(m);}
 const hit=start.clone().addScaledVector(rayDir,t);const p=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.8),poolMat);p.rotation.x=-Math.PI/2;p.position.set(hit.x,floorH(hit.x,hit.z)+.012,hit.z);p.userData.dyn=true;scene.add(p);shafts.push(p);});

/* ---------- furnishings ---------- */
// pews
function makePew(len){const g=new THREE.Group();const add=(w,h,d,x,y,z)=>box(w,h,d,M.wood,x,y,z,{s:1.5,parent:g});add(len,.07,.46,0,.45,0);add(len,.55,.05,0,.78,.22);add(len,.05,.09,0,1.07,.22);add(.07,1.0,.58,-len/2,.5,.02);add(.07,1.0,.58,len/2,.5,.02);add(len,.12,.07,0,.86,.28);return g;}
const pewRows=[];const pewT=makePew(3.0);
for(let i=0;i<9;i++){const z=11-i*1.4;pewRows.push(z);[-2.3,2.3].forEach(x=>{const p=pewT.clone();p.position.set(x,0,z);scene.add(p);});}
addCol(-3.85,-.75,-.5,11.35);addCol(.75,3.85,-.5,11.35);
// altar
box(3,1,1.1,M.stoneLight,0,.95,-10.5,{s:2,col:true});box(3.2,.04,1.25,M.cloth,0,1.47,-10.5,{uv:false});box(1.0,.7,.02,M.red,0,1.1,-9.86,{uv:false});
[-1.15,1.15].forEach(x=>{cyl(.07,.1,.06,M.brass,x,1.52,-10.6);cyl(.02,.03,.3,M.brass,x,1.68,-10.6);cyl(.035,.035,.42,M.wax,x,2.04,-10.6);flame(x,2.25,-10.6,1.3);});
// book on altar
const bk=box(.42,.05,.3,M.red,0,1.52,-10.35,{uv:false});
// cross
box(.32,4.4,.22,M.darkWood,0,4.9,-13.75,{s:1.5});box(2.5,.32,.22,M.darkWood,0,5.95,-13.75,{s:1.5});
// rail
box(2.4,.08,.14,M.darkWood,-1.8,.88,-5.8,{s:1.5});box(2.4,.08,.14,M.darkWood,1.8,.88,-5.8,{s:1.5});
for(let x=-3;x<=3.01;x+=.4){if(Math.abs(x)<.6)continue;cyl(.025,.03,.84,M.darkWood,x,.42,-5.8,8);}
addCol(-3.05,-.6,-5.9,-5.7);addCol(.6,3.05,-5.9,-5.7);
box(2.4,.1,.35,M.red,-1.8,.05,-5.45,{uv:false});box(2.4,.1,.35,M.red,1.8,.05,-5.45,{uv:false});
// lectern with open Bible
const lg=new THREE.Group();lg.position.set(3.2,.45,-7.8);scene.add(lg);
cyl(.06,.08,1.0,M.brass,0,.5,0,12,lg);cyl(.25,.3,.06,M.brass,0,.03,0,16,lg);
const desk=box(.62,.04,.46,M.darkWood,0,1.05,0,{s:1.5,parent:lg});desk.rotation.x=.35;
const pgL=box(.27,.03,.38,M.page,-.14,1.09,0,{uv:false,parent:lg});pgL.rotation.set(.35,0,.05);
const pgR=box(.27,.03,.38,M.page,.14,1.09,0,{uv:false,parent:lg});pgR.rotation.set(.35,0,-.05);
addCol(2.9,3.5,-8.1,-7.5);
// chandeliers
[10,2].forEach(z=>{const g=new THREE.Group();g.position.set(0,6.4,z);scene.add(g);const ring=new THREE.Mesh(new THREE.TorusGeometry(.95,.035,8,40),M.brass);ring.rotation.x=Math.PI/2;g.add(ring);cyl(.012,.012,5,M.iron,0,2.5,0,6,g);
 for(let k=0;k<6;k++){const a=k/6*Math.PI*2;const x=Math.cos(a)*.95,zz=Math.sin(a)*.95;cyl(.02,.02,.12,M.wax,x,.08,zz,8,g);flame(x,.15,zz,1,g);}});
// prayer wall board
box(.08,1.9,5,M.darkWood,-6.93,1.85,14.5,{s:1.5});
{const r=rng(99);const cardCols=[0xf3e6c8,0xeadcc0,0xf6efe0,0xe8d3b0,0xf1dccf];for(let i=0;i<34;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(.26,.18),new THREE.MeshLambertMaterial({color:cardCols[i%5]}));m.position.set(-6.88,1.05+r()*1.6,12.2+r()*4.6);m.rotation.set(0,Math.PI/2,(r()-.5)*.3);scene.add(m);}}
// labels
function label(text,sub,x,y,z,ry,w){const m=new THREE.Mesh(new THREE.PlaneGeometry(w||2.4,(w||2.4)*160/512),new THREE.MeshBasicMaterial({map:labelTexture(text,sub),transparent:true,depthWrite:false}));m.position.set(x,y,z);m.rotation.y=ry;scene.add(m);}
label(t('lblWall'),t('lblWallSub'),-6.86,3.25,14.5,Math.PI/2,2.2);
label(t('lblCandle'),t('lblCandleSub'),-6.85,6.85,2,Math.PI/2,3);
label(t('lblReflect'),t('lblReflectSub'),6.84,3.75,2.5,-Math.PI/2,2);
// candle alcove stand
const slots=[];
{const tiers=[[-9.95,.85],[-10.25,1.05],[-10.55,1.25]];tiers.forEach(([x,y],ti)=>{box(.3,.04,4.2,M.iron,x,y,2,{uv:false});box(.04,y,.04,M.iron,x,y/2,0,{uv:false});box(.04,y,.04,M.iron,x,y/2,4,{uv:false});
 for(let k=0;k<12;k++){const z=.25+k*(3.5/11);const cup=cyl(.03,.026,.05,M.brass,x,y+.045,z,10);slots.push({x,y:y+.07,z,lit:false,f:null});}});
 addCol(-10.8,-9.75,-.1,4.1);
 // tall paschal-style candle
 cyl(.08,.08,1.1,M.wax,-10.7,.55,-.6);flame(-10.7,1.12,-.6,1.8);
 // sand tray
 box(.5,.12,4.2,M.iron,-9.7,.6,2,{uv:false});}
// reflection room
box(.55,.22,1.0,M.red,10.7,.11,2.5,{uv:false});box(.12,.75,1.0,M.darkWood,11.05,.6,2.5,{s:1.5});box(.3,.06,1.05,M.darkWood,11.05,1.0,2.5,{s:1.5});addCol(10.4,11.2,2,3);
box(.1,1.1,.08,M.darkWood,11.95,2.3,2.5,{s:1.5});box(.1,.08,.6,M.darkWood,11.95,2.55,2.5,{s:1.5});
cyl(.12,.15,1.0,M.iron,8.2,.5,6.4);cyl(.04,.04,.25,M.wax,8.2,1.12,6.4);flame(8.2,1.26,6.4,1.4);
lancet(11.97,2.3,5.4,-Math.PI/2,51,0,.7,1.8);lancet(11.97,2.3,-.4,-Math.PI/2,52,2,.7,1.8);
box(1.6,.04,.6,M.darkWood,8.4,.8,-1.6,{s:1.5,col:true});box(.05,.8,.5,M.darkWood,7.7,.4,-1.6,{s:1.5});box(.05,.8,.5,M.darkWood,9.1,.4,-1.6,{s:1.5});

// confessional booth (left aisle)
{const bz=7.1,dw=M.darkWood;
 box(.12,2.7,2.3,dw,-6.92,1.35,bz,{s:1.5});box(1.7,2.7,.12,dw,-6.1,1.35,bz-1.15,{s:1.5});box(1.7,2.7,.12,dw,-6.1,1.35,bz+1.15,{s:1.5});
 box(1.95,.18,2.55,dw,-6.12,2.78,bz,{s:1.5});box(1.2,.3,1.4,dw,-6.12,3.0,bz,{s:1.5});
 box(.07,.62,.07,M.brass,-6.12,3.45,bz,{uv:false});box(.07,.07,.34,M.brass,-6.12,3.58,bz,{uv:false});
 box(.14,2.7,.14,dw,-5.27,1.35,bz-1.1,{s:1.5});box(.14,2.7,.14,dw,-5.27,1.35,bz+1.1,{s:1.5});box(.12,.18,2.3,dw,-5.27,2.62,bz,{s:1.5});
 const cur=new THREE.Mesh(new THREE.PlaneGeometry(.95,2.35),M.red);cur.position.set(-5.31,1.3,bz-.6);cur.rotation.y=Math.PI/2;scene.add(cur);
 box(.03,.55,.55,M.brass,-6.84,1.4,bz,{uv:false});box(.5,.16,.9,M.red,-6.5,.08,bz,{uv:false});
 box(.2,.04,.3,dw,-6.8,1.0,bz+.75,{uv:false});cyl(.03,.03,.14,M.wax,-6.8,1.09,bz+.75,10);flame(-6.8,1.17,bz+.75,1.2);
 addCol(-6.98,-5.2,bz-1.25,bz-1.05);addCol(-6.98,-5.2,bz+1.05,bz+1.25);addCol(-6.98,-6.8,bz-1.2,bz+1.2);
 label(t('lblConfess'),t('lblConfessSub'),-5.18,3.3,bz,Math.PI/2,1.8);}

/* ---------- merge static geometry (one draw call per material) ---------- */
function mergeStatic(){scene.updateMatrixWorld(true);const groups=new Map(),remove=[];
 scene.traverse(o=>{if(!o.isMesh||o.userData.dyn||Array.isArray(o.material))return;let p=o.parent;while(p&&p!==scene){if(p.userData.dyn)return;p=p.parent;}
  const g=o.geometry;if(!g.index||!g.attributes.uv||!g.attributes.normal)return;const k=o.material.uuid;if(!groups.has(k))groups.set(k,{mat:o.material,items:[]});groups.get(k).items.push(o);remove.push(o);});
 const v=new THREE.Vector3(),nm=new THREE.Matrix3();
 groups.forEach(({mat,items})=>{let nv=0,ni=0;items.forEach(o=>{nv+=o.geometry.attributes.position.count;ni+=o.geometry.index.count;});
  const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),uv=new Float32Array(nv*2),idx=nv>65535?new Uint32Array(ni):new Uint16Array(ni);let vo=0,io=0;
  items.forEach(o=>{const g=o.geometry,Pa=g.attributes.position,Na=g.attributes.normal,Ua=g.attributes.uv,Ia=g.index;nm.getNormalMatrix(o.matrixWorld);
   for(let i=0;i<Pa.count;i++){const j=(vo+i)*3;v.fromBufferAttribute(Pa,i).applyMatrix4(o.matrixWorld);pos[j]=v.x;pos[j+1]=v.y;pos[j+2]=v.z;v.fromBufferAttribute(Na,i).applyMatrix3(nm).normalize();nor[j]=v.x;nor[j+1]=v.y;nor[j+2]=v.z;uv[(vo+i)*2]=Ua.getX(i);uv[(vo+i)*2+1]=Ua.getY(i);}
   for(let i=0;i<Ia.count;i++)idx[io+i]=Ia.getX(i)+vo;vo+=Pa.count;io+=Ia.count;});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(new THREE.BufferAttribute(idx,1));geo.computeBoundingSphere();
  const m=new THREE.Mesh(geo,mat);m.matrixAutoUpdate=false;scene.add(m);});
 remove.forEach(o=>{o.parent.remove(o);});}
mergeStatic();

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight(0xffe7c4,0x3a2a1a,.85));
const sun=new THREE.DirectionalLight(0xffdcae,.55);sun.position.set(-10,8,3);scene.add(sun);
const altarL=new THREE.PointLight(0xffc27a,1.5,16,1.6);altarL.position.set(0,4.2,-10);scene.add(altarL);
const naveL=new THREE.PointLight(0xffb469,1.1,22,1.4);naveL.position.set(0,6,6);scene.add(naveL);
const candleL=new THREE.PointLight(0xff9a45,.6,9,2);candleL.position.set(-9.4,1.9,2);scene.add(candleL);

/* dust motes */
const dustN=isTouch?90:160;const dg=new THREE.BufferGeometry();const dp=new Float32Array(dustN*3);const dr=rng(5);
for(let i=0;i<dustN;i++){dp[i*3]=-6+dr()*12;dp[i*3+1]=.5+dr()*8.5;dp[i*3+2]=-12+dr()*31;}
dg.setAttribute('position',new THREE.BufferAttribute(dp,3));
const dust=new THREE.Points(dg,new THREE.PointsMaterial({map:TX.glow,color:0xffe0b0,size:.06,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(dust);


/* ---------- candles state ---------- */
const slotOrder=slots.map((s,i)=>i).sort((a,b)=>((a*7919)%36)-((b*7919)%36));
function lightSlot(i){const s=slots[i];if(!s||s.lit)return;s.lit=true;s.c=cyl(.016,.016,.05,M.wax,s.x,s.y,s.z,8);s.f=flame(s.x,s.y+.03,s.z,1);s.t=performance.now();}
function unlightSlot(s){scene.remove(s.f.g);scene.remove(s.c);const k=flames.indexOf(s.f);if(k>=0)flames.splice(k,1);s.lit=false;s.f=s.c=null;}
function litCount(){return slots.filter(s=>s.lit).length;}
function updateCandleLight(){candleL.intensity=.45+litCount()*.04;}
function lightNext(){let i=slotOrder.find(i=>!slots[i].lit);if(i==null){const old=slots.filter(s=>s.lit).sort((a,b)=>a.t-b.t)[0];unlightSlot(old);i=slots.indexOf(old);}lightSlot(i);updateCandleLight();return i;}
function setLitTo(n){n=Math.min(n,slots.length);while(litCount()<n)lightNext();updateCandleLight();}
let candles24=0;
if(sb)rpc('sanct_candle_count').then(n=>{candles24=n||0;setLitTo(candles24);}).catch(()=>setLitTo(5));else setLitTo(5);

/* ---------- other visitors (realtime presence) ---------- */
const ghosts=new Map();
const ghostRobe=new THREE.CylinderGeometry(.15,.3,1.25,12),ghostHead=new THREE.SphereGeometry(.12,12,10);
const GHOST_COLS=[0xdcc6a2,0xbfcadb,0xd9bab1,0xc3d2bd,0xd8d0a9,0xcabedb];
function nameSprite(text){const[c,g]=mkC(256,64);g.font='600 30px "Noto Serif SC","Songti SC",serif';g.textAlign='center';g.textBaseline='middle';g.shadowColor='rgba(0,0,0,.8)';g.shadowBlur=6;g.fillStyle='#f3dfb4';g.fillText(text.slice(0,16),128,34);
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:toTex(c),transparent:true,depthWrite:false,opacity:.9}));sp.scale.set(1.0,.25,1);return sp;}
function makeGhost(c){const g=new THREE.Group();const mat=new THREE.MeshLambertMaterial({color:GHOST_COLS[(c|0)%6],emissive:0x3a2410,transparent:true,opacity:.88});
 const robe=new THREE.Mesh(ghostRobe,mat);robe.position.y=.625;g.add(robe);const head=new THREE.Mesh(ghostHead,mat);head.position.y=1.4;g.add(head);
 const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xffd9a0,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0}));halo.scale.set(1,1,1);halo.position.y=1.45;g.add(halo);
 g.visible=false;scene.add(g);return{g,robe,head,halo,mat,x:0,z:0,yaw:0,tx:0,tz:0,tyaw:0,s:'walk',seen:0,fresh:true,n:null,ns:null};}
function poseGhost(o){const s=o.s;let rs=1,hy=1.4;if(s==='sit'){rs=.62;hy=.98;}else if(s==='kneel'){rs=.66;hy=1.02;}o.robe.scale.y=rs;o.robe.position.y=.625*rs;o.head.position.y=hy;o.halo.position.y=hy+.06;o.halo.material.opacity=(s==='walk')?0:.55;if(o.ns)o.ns.position.y=hy+.38;}
function setGhostName(o,n){n=n?String(n).slice(0,24):null;if(o.n===n)return;o.n=n;if(o.ns){o.g.remove(o.ns);o.ns.material.map.dispose();o.ns.material.dispose();o.ns=null;}if(n){o.ns=nameSprite(n);o.g.add(o.ns);poseGhost(o);}}
function removeGhost(id){const o=ghosts.get(id);if(!o)return;setGhostName(o,null);scene.remove(o.g);o.mat.dispose();o.halo.material.dispose();ghosts.delete(id);}
let praying=false,onlineN=1;
function myState(){if(P.mode==='locked')return P.eye<1.05?'kneel':'sit';return praying?'pray':'walk';}
function prayers(){const names=[];let anon=0;if(myState()!=='walk'){if(myName())names.push({n:myName(),u:null});else anon++;}ghosts.forEach(o=>{if(o.s!=='walk'&&o.g.visible){if(o.n)names.push({n:o.n,u:o.u});else anon++;}});return{names,anon,n:names.length+anon};}
function prayingCount(){return prayers().n;}
const net={ch:null,ready:false,last:{x:0,z:0,y:0,s:'',t:0},
 send(ev,p){if(this.ch&&this.ready){try{this.ch.send({type:'broadcast',event:ev,payload:Object.assign({id:myId},p||{})});}catch(e){}}}};
const myColor=Math.floor(Math.random()*6);
function retrack(){if(net.ch&&net.ready&&!document.hidden){try{net.ch.track({c:myColor,n:myName(),u:myPub()});}catch(e){}net.last.t=0;}if(room&&room.ready){try{room.ch.track({n:myName(),u:myPub()});}catch(e){}}}
function onPos(p){if(!p||p.id===myId)return;let o=ghosts.get(p.id);if(!o){if(ghosts.size>=40)return;o=makeGhost(p.c);ghosts.set(p.id,o);}
 o.tx=+p.x||0;o.tz=+p.z||0;o.tyaw=+p.y||0;o.s=p.s||'walk';o.seen=performance.now();if(o.fresh){o.x=o.tx;o.z=o.tz;o.yaw=o.tyaw;o.fresh=false;}o.g.visible=true;o.u=p.u||null;setGhostName(o,p.n);poseGhost(o);}
function updateOnline(){const el=$('#online');if(!net.ready){el.classList.remove('show');return;}el.classList.add('show');el.querySelector('span').textContent=t('onlineN',{n:onlineN});
 if(!$('#intro').classList.contains('hide'))$('#loading').textContent=onlineN>1?t('introOnline',{n:onlineN}):t('introQuiet');}
function connect(){if(!sb)return;try{
 const ch=sb.channel('sanctuary-main',{config:{presence:{key:myId},broadcast:{self:false}}});net.ch=ch;
 ch.on('presence',{event:'sync'},()=>{const st=ch.presenceState();onlineN=Math.max(1,Object.keys(st).length);ghosts.forEach((o,id)=>{if(!st[id])removeGhost(id);else{const m=st[id][0];if(m&&'n' in m){o.u=m.u||null;setGhostName(o,m.n);}}});updateOnline();});
 ch.on('presence',{event:'leave'},({key})=>removeGhost(key));
 ch.on('broadcast',{event:'pos'},({payload})=>onPos(payload));
 ch.on('broadcast',{event:'candle'},()=>{lightNext();candles24++;if($('#intro').classList.contains('hide'))toast(t('someoneLit'));});
 ch.on('broadcast',{event:'hello'},()=>{net.last.t=0;});
 ch.subscribe(status=>{if(status==='SUBSCRIBED'){net.ready=true;retrack();net.send('hello');updateOnline();}
  else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){net.ready=false;updateOnline();}});
}catch(e){net.ch=null;}}
document.addEventListener('visibilitychange',()=>{if(!net.ch||!net.ready)return;try{if(document.hidden)net.ch.untrack();else retrack();}catch(e){}});
function netTick(now,dt){if(net.ready&&!document.hidden){const l=net.last,s=myState();const moved=Math.hypot(P.x-l.x,P.z-l.z)>.06||Math.abs(P.yaw-l.y)>.08||s!==l.s;
 if((moved&&now-l.t>220)||now-l.t>4000){l.x=P.x;l.z=P.z;l.y=P.yaw;l.s=s;l.t=now;net.send('pos',{x:+P.x.toFixed(2),z:+P.z.toFixed(2),y:+P.yaw.toFixed(2),s,c:myColor,n:myName(),u:myPub()});}}
 const k=1-Math.exp(-dt*7);ghosts.forEach(o=>{if(now-o.seen>15000)o.g.visible=false;o.x+=(o.tx-o.x)*k;o.z+=(o.tz-o.z)*k;o.yaw=angLerp(o.yaw,o.tyaw,k);o.g.position.set(o.x,floorH(o.x,o.z),o.z);o.g.rotation.y=o.yaw;});}

/* ---------- prayer gatherings (rooms) ---------- */
let room=null;
function joinRoomChannel(id,onSync){leaveRoom();if(!sb)return;const ch=sb.channel('sanct-room-'+id,{config:{presence:{key:myId}}});room={id,ch,ready:false,members:{}};
 ch.on('presence',{event:'sync'},()=>{if(!room||room.ch!==ch)return;room.members=ch.presenceState();onSync&&onSync();});
 ch.subscribe(st=>{if(st==='SUBSCRIBED'&&room&&room.ch===ch){room.ready=true;try{ch.track({n:myName(),u:myPub()});}catch(e){}}});}
function leaveRoom(){if(room){try{sb.removeChannel(room.ch);}catch(e){}room=null;}}
function roomPeople(){const names=[];let anon=0;if(!room)return{names,anon};Object.entries(room.members).forEach(([k,a])=>{const m=a&&a[0];if(m&&m.n)names.push({n:m.n,u:k===myId?null:(m.u||null)});else anon++;});return{names,anon};}

/* ---------- public group prayer (every :00 and :30, 5 minutes) ---------- */
const G_PERIOD=30*60e3,G_WIN=5*60e3;let gWasLive=null,gNext=0;
function groupInfo(){const ph=Date.now()%G_PERIOD;return ph<G_WIN?{live:true,left:G_WIN-ph}:{live:false,until:G_PERIOD-ph};}
const mmss=ms=>{const s=Math.max(0,Math.ceil(ms/1000));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`:`${m}:${String(x).padStart(2,'0')}`;};
function groupTick(now){if(now<gNext)return;gNext=now+1000;const g=groupInfo(),el=$('#group');el.classList.add('show');
 if(g.live){el.classList.add('live');el.textContent=t('pillLive',{n:prayingCount()});}else{el.classList.remove('live');el.textContent=t('pillNext',{t:mmss(g.until)});}
 if(gWasLive===false&&g.live&&$('#intro').classList.contains('hide')){bell(392,.5);setTimeout(()=>bell(523.25,.4),700);toast(t('gBegan'));}gWasLive=g.live;}

/* ---------- player ---------- */
const P={x:0,z:18.5,eye:1.65,yaw:0,pitch:-.02,mode:'walk',bob:0};
let anim=null,saved=null,lockKind=null;
const keys={};
addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;keys[e.code]=true;if(e.code==='KeyE'||e.code==='Enter'){const b=$('#actions button');if(b)b.click();}if(e.code==='Escape')closeSheet();});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
const cvs=renderer.domElement;let lookId=null,lx=0,ly=0;
cvs.addEventListener('pointerdown',e=>{if(lookId!==null)return;lookId=e.pointerId;lx=e.clientX;ly=e.clientY;try{cvs.setPointerCapture(e.pointerId);}catch(_){} });
cvs.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;const k=e.pointerType==='touch'?.0055:.0035;P.yaw-=(e.clientX-lx)*k;P.pitch-=(e.clientY-ly)*k;P.pitch=Math.max(-1.2,Math.min(1.2,P.pitch));lx=e.clientX;ly=e.clientY;});
const endLook=e=>{if(e.pointerId===lookId)lookId=null;};cvs.addEventListener('pointerup',endLook);cvs.addEventListener('pointercancel',endLook);
const joy=$('#joy'),knob=$('#knob');let joyId=null,jx=0,jy=0;
function joyMove(e){const r=joy.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const d=Math.hypot(dx,dy),m=46;if(d>m){dx*=m/d;dy*=m/d;}jx=dx/m;jy=dy/m;knob.style.transform=`translate(${dx}px,${dy}px)`;}
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;try{joy.setPointerCapture(e.pointerId);}catch(_){}joyMove(e);e.preventDefault();});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e);});
const joyEnd=e=>{if(e.pointerId!==joyId)return;joyId=null;jx=jy=0;knob.style.transform='';};joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);
function blocked(x,z){const r=.28;for(const c of colliders){if(x>c[0]-r&&x<c[1]+r&&z>c[2]-r&&z<c[3]+r)return true;}return false;}
function moveTo(tg,dur,then){anim={from:{x:P.x,z:P.z,eye:P.eye,yaw:P.yaw,pitch:P.pitch},to:tg,t:0,dur:dur||1.2,then};}
function angLerp(a,b,k){let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*k;}

/* ---------- zones & hotspots ---------- */
function zoneAt(x,z){if(x<-7.4)return t('zCandle');if(x>7.4)return t('zReflect');if(x<-4.9&&z>5.8&&z<8.4)return t('zConfess');if(z<-6.4)return t('zAltar');if(x<-4.6&&z>11.8)return t('zWall');return t('zMain');}
const spots=[
 {test:(x,z)=>Math.abs(x)<1.15&&z>-.7&&z<11.6,label:'aSit',act:sitDown},
 {test:(x,z)=>Math.hypot(x,z+5.0)<1.15,label:'aKneel',act:kneel},
 {test:(x,z)=>Math.hypot(x-3.2,z+6.5)<1.3,label:'aVerse',act:()=>openVerse()},
 {test:(x,z)=>x<-7.5&&z>-1&&z<5,label:'aCandle',act:()=>openCandle()},
 {test:(x,z)=>x>7.5,label:'aReflect',act:()=>openReflect()},
 {test:(x,z)=>Math.hypot(x+4.75,z-6.6)<1.05,label:'aConfess',act:enterBooth},
 {test:(x,z)=>x<-4.7&&z>12&&z<17.2,label:'aWall',act:()=>openWall()},
];
let curSpot=null,actionsKey='';
function renderActions(){let key,html=[];
 if(P.mode==='locked'){key='locked-'+lockKind;html=lockKind==='booth'?[[t('cfT'),()=>openConfessIntro()],[t('aStand'),standUp,'sec']]:[[t('aPray'),()=>openPrayer()],[t('aStand'),standUp,'sec']];}
 else if(curSpot){key='s'+spots.indexOf(curSpot);html=[[t(curSpot.label),curSpot.act]];}
 else key='none';
 if(sheetOpen)key+='-sheet';
 if(key===actionsKey)return;actionsKey=key;const el=$('#actions');el.innerHTML='';
 if(sheetOpen)return;
 html.forEach(([tx,fn,cls])=>{const b=document.createElement('button');b.textContent=tx;if(cls)b.className=cls;b.onclick=e=>{e.stopPropagation();fn();};el.appendChild(b);});}
function lockAt(kind,tg,dur,then){if(P.mode==='walk')saved={x:P.x,z:P.z};P.mode='anim';moveTo(tg,dur,()=>{P.mode='locked';lockKind=kind;then&&then();});}
function sitDown(){let best=pewRows[0];pewRows.forEach(z=>{if(Math.abs(z-P.z)<Math.abs(best-P.z))best=z;});const side=P.x<0?-1:1;lockAt('seat',{x:side*1.55,z:best+.06,eye:1.13,yaw:0,pitch:.02},1.3,()=>openPrayer());}
function kneel(){lockAt('kneel',{x:0,z:-5.15,eye:.98,yaw:0,pitch:.16},1.4,()=>openPrayer());}
function enterBooth(){lockAt('booth',{x:-6.35,z:7.1,eye:1.0,yaw:Math.PI/2,pitch:.05},1.4,()=>openConfessIntro());}
function standUp(){closeSheet();leaveRoom();if(!saved){P.mode='walk';lockKind=null;return;}P.mode='anim';moveTo({x:saved.x,z:saved.z,eye:1.65,yaw:P.yaw,pitch:0},1.0,()=>{P.mode='walk';lockKind=null;saved=null;});}
function sitQuick(cb){if(P.mode==='locked'&&lockKind==='seat'){cb();return;}closeSheet();const row=pewRows[Math.floor(Math.random()*pewRows.length)],side=Math.random()<.5?-1:1;
 P.mode='anim';fade(()=>{P.x=0;P.z=row+.7;P.yaw=0;P.pitch=0;P.eye=1.65;saved={x:0,z:row+.7};moveTo({x:side*1.55,z:row+.06,eye:1.13,yaw:0,pitch:.02},1.0,()=>{P.mode='locked';lockKind='seat';cb();});});}

/* ---------- sheet ---------- */
let sheetOpen=false,sheetCleanup=null;
function openSheet(title,html,init){if(sheetCleanup){const c=sheetCleanup;sheetCleanup=null;c();}$('#sheetTitle').textContent=title;$('#sheetBody').innerHTML=html;$('#sheetBody').scrollTop=0;$('#sheet').classList.add('open');document.body.classList.add('sheet');sheetOpen=true;actionsKey='';if(init)sheetCleanup=init($('#sheetBody'))||null;}
function closeSheet(){if(sheetCleanup){const c=sheetCleanup;sheetCleanup=null;c();}$('#sheet').classList.remove('open');document.body.classList.remove('sheet');sheetOpen=false;actionsKey='';if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();}
$('#sheetX').onclick=closeSheet;
['pointerdown','touchstart','keydown'].forEach(ev=>$('#sheet').addEventListener(ev,e=>e.stopPropagation(),{passive:true}));
function toast(tx){const el=$('#toast');el.textContent=tx;el.style.opacity=1;clearTimeout(toast._t);toast._t=setTimeout(()=>el.style.opacity=0,2800);}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function verseHTML(v){return`<div class="verse">${v[0]}</div><div class="ref">— ${v[1]} · ${t('bibleV')}</div>`;}
function breathHTML(m){return`<div class="breath"><span>${t('inhale')}</span></div><div class="clock">${mmss(m*60e3)}</div>`;}

/* prayer timer (shared) */
function timerUI(root,minutes,onDone,opt){opt=opt||{};let t0=performance.now(),dur=minutes*60e3,done=false,logged=false;praying=true;
 const br=root.querySelector('.breath'),lab=br.querySelector('span'),clk=root.querySelector('.clock');
 const log=()=>{if(logged)return;logged=true;praying=false;const sec=Math.round(Math.min(dur,performance.now()-t0)/1000);if(token&&sb&&sec>=20)rpc('sanct_log_prayer',{p_token:token,p_seconds:sec,p_group:!!opt.group&&sec>=60}).then(()=>loadMe()).catch(()=>{});};
 const iv=setInterval(()=>{const el=performance.now()-t0;const c=(el/1000)%10;let s;if(c<4){s=.62+.38*(c/4);lab.textContent=t('inhale');}else{s=1-.38*((c-4)/6);lab.textContent=t('exhale');}br.style.transform=`scale(${s})`;
  const left=Math.max(0,dur-el);clk.textContent=mmss(left);
  if(left<=0&&!done){done=true;clearInterval(iv);log();bell(392);setTimeout(()=>bell(523.25,.5),600);onDone&&onDone();}},100);
 return()=>{clearInterval(iv);log();};}
function amenHTML(){return`<div class="verse">${t('amen')}</div><div class="p" style="text-align:center">${t('amenP')}</div>`;}
function peopleHTML(names,anon){if(!names.length&&!anon)return'';const rep=names.some(p=>p.u);return`<div class="people"><div class="ref" style="margin:8px 0 6px">${t('roomWith')}</div>${names.map(p=>p.u?`<span class="chip rep" data-ru="${esc(p.u)}" data-rn="${esc(p.n)}" title="${esc(t('reportUser'))}">${esc(p.n)} <i>⚑</i></span>`:`<span class="chip">${esc(p.n)}</span>`).join('')}${anon?`<span class="chip dim">${t('roomAnon',{n:anon})}</span>`:''}${rep?`<div class="note" style="margin-top:4px">${t('reportUserP')}</div>`:''}</div>`;}
$('#sheetBody').addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('[data-ru]');if(!c)return;e.preventDefault();openReport({type:'user',id:c.dataset.ru,label:c.dataset.rn});});

function openPrayer(tab,autoMin){OT('open_prayer',{tab:tab||'quiet'});tab=tab||'quiet';const v=VERSES[verseIdx];
 const body=`<div class="tabs"><button data-t="quiet">${t('tQuiet')}</button><button data-t="lord">${t('tLord')}</button><button data-t="medi">${t('tMedi')}</button></div><div id="pt"></div>
 <div class="note">${t('prayNote')}${P.mode==='locked'?t('prayNoteSeat'):''}</div>`;
 openSheet(t('prayT'),body,root=>{let stop=null;const pt=root.querySelector('#pt');
  function show(tb){if(stop){stop();stop=null;}root.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===tb));
   if(tb==='quiet'){pt.innerHTML=`${verseHTML(v)}<div class="p" style="text-align:center">${t('quietP')}</div><div class="row">${[1,3,5,10].map(m=>`<button class="btn" data-m="${m}">${t('min',{n:m})}</button>`).join('')}</div>`;
    const start=(m,group)=>{pt.innerHTML=`${group?`<div class="ref" style="margin:6px 0 0" id="gp"></div>`:''}${breathHTML(m)}<div class="p" style="text-align:center;margin-top:8px">${v[0]}</div><div id="ppl"></div><div class="row"><button class="btn" id="stopT">${t('end')}</button></div>`;
     const upd=()=>{const p=prayers();const e=pt.querySelector('#gp');if(e)e.textContent=t('groupPray',{n:p.n});const q=pt.querySelector('#ppl');if(q)q.innerHTML=peopleHTML(p.names,p.anon);};
     let gi=null;if(group){upd();gi=setInterval(upd,2000);}
     const st=timerUI(pt,m,()=>{if(gi)clearInterval(gi);pt.innerHTML=`${amenHTML()}<div class="row"><button class="btn" id="again">${t('again')}</button></div>`;pt.querySelector('#again').onclick=()=>show('quiet');},{group});
     stop=()=>{if(gi)clearInterval(gi);st();};
     pt.querySelector('#stopT').onclick=()=>show('quiet');};
    pt.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>start(+b.dataset.m));
    if(autoMin){const m=autoMin;autoMin=0;start(m,true);}}
   else if(tb==='lord'){pt.innerHTML=`<div class="verse" style="font-size:17px">${SCR.lord[0]}</div><div class="ref">— ${SCR.lord[1]}${/^(cf|vgl)/.test(SCR.lord[1])?'':' · '+t('bibleV')}</div><div class="row"><button class="btn" id="lb">${t('lordBell')}</button></div>`;pt.querySelector('#lb').onclick=()=>{bell(392);toast(t('amenToast'));};}
   else{pt.innerHTML=`${verseHTML(v)}<ul class="q"><li>${t('mediRead')}</li><li>${t('mediThink')}</li><li>${t('mediAsk')}</li><li>${t('mediRest')}</li></ul>`;}}
  root.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>show(b.dataset.t));show(tab);return()=>{if(stop)stop();};});}

function openVerse(){OT('open_verse');const draw=root=>{root.querySelector('#vv').innerHTML=verseHTML(VERSES[verseIdx]);};
 openSheet(t('verseT'),`<div id="vv"></div><div class="p">${t('verseP')}</div><div class="row"><button class="btn" id="nx">${t('nextV')}</button><button class="btn pri" id="pr">${t('prayV')}</button></div>`,root=>{draw(root);root.querySelector('#nx').onclick=()=>{verseIdx=(verseIdx+1)%VERSES.length;draw(root);};root.querySelector('#pr').onclick=()=>openPrayer('medi');});}

/* ---------- accounts ---------- */
function requireLogin(after){if(me){after();return;}openAccount(t('needLogin'),after);}
function openAccount(reason,after){OT('account_open',{reason:String(reason||'')});if(me){openProfile();return;}let mode='login',email='';
 const render=root=>{root.innerHTML=`${reason?`<div class="p" style="margin-bottom:8px">${reason}</div>`:''}<div class="tabs"><button data-m="login" class="${mode==='login'?'on':''}">${t('login')}</button><button data-m="register" class="${mode==='register'?'on':''}">${t('register')}</button></div>
  <input class="field" id="ae" type="email" autocomplete="email" placeholder="${t('email')}" value="${esc(email)}">
  ${mode==='register'?`<input class="field" id="an" maxlength="24" placeholder="${t('dname')}" style="margin-top:8px">`:''}
  <input class="field" id="ap" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" placeholder="${t('password')}" style="margin-top:8px">
  <div class="row"><button class="btn pri" id="ago">${mode==='login'?t('loginBtn'):t('regBtn')}</button></div>
  <div class="note"><a href="/privacy.html" style="color:#bfa77c">${t('privacy')}</a></div>`;
  root.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{email=root.querySelector('#ae').value;mode=b.dataset.m;render(root);});
  root.querySelector('#ago').onclick=async()=>{const btn=root.querySelector('#ago');const e=root.querySelector('#ae').value.trim(),p=root.querySelector('#ap').value;let r;btn.disabled=true;
   try{r=mode==='login'?await rpc('sanct_login',{p_email:e,p_password:p}):await rpc('sanct_signup',{p_email:e,p_password:p,p_name:root.querySelector('#an').value.trim(),p_lang:LANG,p_ref:REF});}catch(_){r={error:'offline'};}
   btn.disabled=false;if(!r||r.error){toast(t('aErr_'+((r&&r.error)||'offline')));return;}
   token=r.token;store.set('tok',token);me=r.user;setAcctBtn();retrack();closeSheet();toast(mode==='register'&&me.candle_credits>0?t('refWelcome'):t('welcome',{n:me.name}));if(after)setTimeout(after,350);};};
 openSheet(t('acctT'),'<div id="acc"></div>',root=>{render(root.querySelector('#acc'));});}
function openProfile(){const u=me;const st=[t('statPray',{n:Math.round(u.seconds_prayed/60)}),t('statCandle',{n:u.candles}),t('statConfess',{n:u.confessions}),t('statGroup',{n:u.group_sessions})];
 openSheet(t('acctT'),`<div class="p">${esc(u.email)}</div><div class="stats">${st.map(s=>`<span class="chip">${s}</span>`).join('')}</div>
  <label class="lbl">${t('dname')}</label><input class="field" id="pn" maxlength="24" value="${esc(u.name)}">
  <label class="chk"><input type="checkbox" id="ps" ${u.show_name?'checked':''}> ${t('showName')}</label>
  <label class="lbl">${t('currency')}</label><div class="row" style="justify-content:flex-start"><button class="btn ${CUR==='eur'?'pri':''}" data-c="eur">EUR €</button><button class="btn ${CUR==='usd'?'pri':''}" data-c="usd">USD $</button></div>
  <div class="row"><button class="btn pri" id="psave">${t('saveBtn')}</button><button class="btn" id="pout">${t('logout')}</button></div>
  <div class="sec">${t('invT')}</div><div class="p">${t('invStats',{v:u.ref_visits||0,i:u.invites||0,c:u.candle_credits||0})}</div><div class="row" style="justify-content:flex-start"><button class="btn" id="pinv">🎁 ${t('mInvite')}</button></div>`,root=>{
  root.querySelector('#pinv').onclick=()=>openInvite();
  root.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{CUR=b.dataset.c;store.set('cur',CUR);root.querySelectorAll('[data-c]').forEach(x=>x.classList.toggle('pri',x===b));});
  root.querySelector('#psave').onclick=async()=>{let r;try{r=await rpc('sanct_update_profile',{p_token:token,p_name:root.querySelector('#pn').value.trim(),p_show_name:root.querySelector('#ps').checked,p_lang:LANG});}catch(_){r={error:'offline'};}
   if(r&&r.user){me=r.user;setAcctBtn();retrack();toast(t('saved'));}else{if(r&&r.error==='auth')logoutLocal();toast(t('aErr_'+((r&&r.error)||'offline')));}};
  root.querySelector('#pout').onclick=async()=>{try{await rpc('sanct_logout',{p_token:token});}catch(_){}logoutLocal();closeSheet();};});}
$('#acctbtn').onclick=()=>openAccount();

/* ---------- modal layer (share / invite / report; sits above the sheet) ---------- */
let modalEl=null;
function closeModal(){if(modalEl){modalEl.remove();modalEl=null;}}
function modal(title,html,init){closeModal();const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="mbox" role="dialog" aria-modal="true"><div class="mhead"><b>${esc(title)}</b><button class="mx" aria-label="${esc(t('close'))}">✕</button></div><div class="mbody">${html}</div></div>`;
 m.addEventListener('click',e=>{if(e.target===m)closeModal();});m.querySelector('.mx').onclick=closeModal;document.body.appendChild(m);modalEl=m;if(init)init(m.querySelector('.mbody'));}
addEventListener('keydown',e=>{if(e.key==='Escape'&&modalEl)closeModal();});

/* ---------- sharing & referral ---------- */
function track(kind,channel,target){if(!sb)return;rpc('sanct_track',{p_kind:kind,p_ref:kind==='visit'?REF:(me&&me.ref_code)||null,p_channel:channel||null,p_target:target||null}).catch(()=>{});}
const SITE=/^(localhost|127\.)/.test(location.hostname)?location.origin:'https://cloudsanctuary.app';
function shareUrl(params){const q=new URLSearchParams(params||{});if(me&&me.ref_code)q.set('ref',me.ref_code);const s=q.toString();return SITE+'/'+(LANG==='en'?'':LANG+'/')+(s?'?'+s:'');}
function share(o){const url=shareUrl(o.params),text=o.text||t('shSite'),kind=o.kind||'site';
 const open=()=>{const enc=encodeURIComponent,full=text+' '+url;
  const ch=[['WhatsApp','https://wa.me/?text='+enc(full)],['Telegram','https://t.me/share/url?url='+enc(url)+'&text='+enc(text)],['X','https://twitter.com/intent/tweet?text='+enc(text)+'&url='+enc(url)],['Facebook','https://www.facebook.com/sharer/sharer.php?u='+enc(url)],[t('shEmail'),'mailto:?subject='+enc(t('shSubject'))+'&body='+enc(full)]];
  modal(t('shareT'),`<div class="p">${esc(text)}</div><input class="field" id="shu" readonly value="${esc(url)}" style="margin-top:10px"><div class="row"><button class="btn pri" id="shc">🔗 ${t('shCopy')}</button></div>
   <div class="row share">${ch.map(([n,h],i)=>`<a class="btn" data-ch="${i}" href="${esc(h)}" target="_blank" rel="noopener">${esc(n)}</a>`).join('')}${navigator.share?`<button class="btn" id="shm">${t('shMore')}</button>`:''}</div>`,root=>{
   root.querySelector('#shc').onclick=async()=>{const inp=root.querySelector('#shu');let ok=false;try{await navigator.clipboard.writeText(url);ok=true;}catch(_){try{inp.select();ok=document.execCommand('copy');}catch(__){}}toast(ok?t('shCopied'):url);track('share','copy',kind);};
   root.querySelectorAll('[data-ch]').forEach(a=>a.onclick=()=>track('share',['whatsapp','telegram','x','facebook','email'][+a.dataset.ch],kind));
   const m=root.querySelector('#shm');if(m)m.onclick=()=>navigator.share({title:'Sanctuary',text,url}).then(()=>track('share','native',kind)).catch(()=>{});});};
 if(navigator.share&&isTouch){navigator.share({title:'Sanctuary',text,url}).then(()=>track('share','native',kind)).catch(e=>{if(!e||e.name!=='AbortError')open();});}else open();}
function openInvite(){OT('invite_open');
 if(!me){modal(t('invT'),`<div class="p">${t('invP')}</div><div class="p" style="margin-top:8px">${t('invLogin')}</div><div class="row"><button class="btn pri" id="ivr">${t('register')}</button><button class="btn" id="ivs">${t('invShareAnyway')}</button></div>`,root=>{
  root.querySelector('#ivr').onclick=()=>{closeModal();openAccount(null,()=>openInvite());};root.querySelector('#ivs').onclick=()=>{closeModal();share({kind:'invite'});};});return;}
 const url=shareUrl({});
 modal(t('invT'),`<div class="p">${t('invP')}</div><label class="lbl">${t('invLink')}</label><input class="field" readonly value="${esc(url)}"><div class="p" style="margin-top:10px">${t('invStats',{v:me.ref_visits||0,i:me.invites||0,c:me.candle_credits||0})}</div><div class="row"><button class="btn pri" id="ivs">📤 ${t('shareT')}</button></div>`,root=>{
  root.querySelector('#ivs').onclick=()=>{closeModal();share({kind:'invite'});};});}

/* ---------- reports & takedown requests ---------- */
const REASONS=['spam','abuse','hate','sexual','violence','scam','illegal','copyright','privacy','other'];
function openReport(o){const type=o.type||'other';let reason=type==='other'?'copyright':null;
 const tn={prayer:'rpTypePrayer',room:'rpTypeRoom',user:'rpTypeUser'}[type];
 const what=type==='other'?`<div class="p">${t('rpOtherP')}</div>`:`<label class="lbl">${t('rpWhat')}</label><div class="card"><div class="m" style="margin:0 0 4px">${t(tn)}</div><div class="t">${esc((o.label||'').slice(0,140))}</div></div>`;
 modal(type==='other'?t('rpOther'):t('rpT'),`${type==='other'?'':`<div class="p">${t('rpP')}</div>`}${what}<label class="lbl">${t('rpReason')}</label><div class="row reasons" style="justify-content:flex-start">${REASONS.map(r=>`<button class="btn ${r===reason?'pri':''}" data-rs="${r}">${t('rs_'+r)}</button>`).join('')}</div>
  <textarea class="field" id="rpd" maxlength="2000" placeholder="${esc(type==='other'?t('rpDetailsReq'):t('rpDetails'))}" style="min-height:${type==='other'?110:70}px;margin-top:10px"></textarea>
  <input class="field" id="rpc" type="email" maxlength="200" placeholder="${esc(t('rpContact'))}" value="${esc(me&&me.email||'')}" style="margin-top:8px">
  <div class="row"><button class="btn pri" id="rps">${t('rpSend')}</button></div>`,root=>{
  root.querySelectorAll('[data-rs]').forEach(b=>b.onclick=()=>{reason=b.dataset.rs;root.querySelectorAll('[data-rs]').forEach(x=>x.classList.toggle('pri',x===b));});
  root.querySelector('#rps').onclick=async()=>{if(!reason){toast(t('rpReason')+'?');return;}const d=root.querySelector('#rpd').value.trim();if(type==='other'&&d.length<10){toast(t('rpErr_need_details'));return;}
   const btn=root.querySelector('#rps');btn.disabled=true;let r;
   try{r=await rpc('sanct_file_report',{p_type:type,p_target:o.id?String(o.id):null,p_label:(o.label||'').slice(0,140)||null,p_reason:reason,p_details:d||null,p_contact:root.querySelector('#rpc').value.trim()||null,p_token:token});}catch(_){r={error:'offline'};}
   btn.disabled=false;if(!r||r.error){const k='rpErr_'+((r&&r.error)||'');toast(DICT[k]||window.I18N.en[k]?t(k):t('aErr_offline'));return;}
   closeModal();toast(r.dup?t('rpDup'):t('rpThanks'));if(o.done)o.done();};});}

/* ---------- payments (Stripe Checkout; beta-free while payments are switched off) ---------- */
async function buy(kind){OT('checkout_click',{plan:kind});if(!sb){toast(t('aErr_offline'));return null;}let r;
 try{r=await rpc('sanct_create_order',{p_token:token,p_kind:kind,p_currency:CUR});}catch(_){toast(t('aErr_offline'));return null;}
 if(!r||r.error){if(r&&r.error==='auth'){logoutLocal();openAccount(t('needLogin'));}else toast(t('aErr_'+((r&&r.error)||'offline')));return null;}
 if(r.status==='beta_free')return r.id;
 try{const res=await fetch(SB_URL+'/functions/v1/sanct-stripe-checkout',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify({token,order:r.id,lang:LANG,origin:location.origin})});
  const j=await res.json();if(j&&j.url){store.set('pend',{id:r.id,kind,ts:Date.now()});location.href=j.url;return null;}if(j&&j.error==='not_configured'){toast(t('payUnavail'));return null;}}catch(_){}
 toast(t('payFail'));return null;}
async function useOrder(id){try{return await rpc('sanct_use_order',{p_token:token,p_id:id});}catch(_){return{error:'offline'};}}
let resume=null;
async function checkReturn(){const q=new URLSearchParams(location.search);const p=store.get('pend',null);if(!q.has('pay')&&!p)return;
 if(q.has('pay'))history.replaceState(null,'',location.pathname);
 if(!p||!token)return;if(q.get('pay')==='cancel'||Date.now()-p.ts>36e5){store.set('pend',null);if(q.get('pay')==='cancel')toast(t('payCancel'));return;}
 if(q.get('pay')==='ok'){toast(t('payWaiting'));try{await fetch(SB_URL+'/functions/v1/sanct-stripe-confirm',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify({token,order:p.id})});}catch(_){}}
 for(let i=0;i<12;i++){let s=null;try{s=await rpc('sanct_order_status',{p_token:token,p_id:p.id});}catch(_){}
  if(s==='paid'){store.set('pend',null);resume=p;toast(t('payDone'));return;}if(s==='used'||s==='failed'||s==null){store.set('pend',null);return;}await new Promise(r=>setTimeout(r,1500));}}
function priceNote(){return payOn?t('payNote'):t('betaFree');}

/* ---------- candles ---------- */
function openCandle(){OT('candle_open');OT('pricing_view',{plan:'candle'});
 openSheet(t('candleT'),`<div class="p">${t('candleP')}</div>
 <input class="field" id="cn" maxlength="40" placeholder="${t('candleFor')}" style="margin-top:12px">
 <div class="row">${me&&me.candle_credits>0?`<button class="btn pri" id="cfree">${t('credit',{n:me.candle_credits})}</button>`:''}<button class="btn ${me&&me.candle_credits>0?'':'pri'}" id="cl">${t('lightFor',{p:price(PRICE.candle)})}</button></div>
 <div class="note">${priceNote()}<br>${sb?t('candles24',{n:candles24})+' ':''}${me?t('myCandles',{n:me.candles}):''}</div>`,root=>{
  root.querySelector('#cl').onclick=()=>{const name=root.querySelector('#cn').value.trim();requireLogin(async()=>{const id=await buy('candle');if(id)lightPaid(id,name);});};
  const f=root.querySelector('#cfree');if(f)f.onclick=async()=>{f.disabled=true;const name=root.querySelector('#cn').value.trim();let r;try{r=await rpc('sanct_use_credit',{p_token:token});}catch(_){r={error:'offline'};}f.disabled=false;
   if(!r||r.error){if(r&&r.error==='auth')logoutLocal();toast(t('aErr_'+((r&&r.error)||'offline')));return;}lightDone(r,name);};});}
async function lightPaid(id,name){const r=await useOrder(id);if(!r||r.error){toast(t('aErr_'+((r&&r.error)||'offline')));return;}lightDone(r,name);}
function lightDone(r,name){
 const i=lightNext();if(r.candles24)candles24=r.candles24;bell(659.25,.35);net.send('candle');loadMe();
 const s=slots[i];closeSheet();P.mode='anim';moveTo({x:-9.1,z:Math.max(.4,Math.min(3.6,s.z)),eye:1.5,yaw:Math.PI/2,pitch:-.35},1.0,()=>{P.mode='walk';});
 const who=name?t('candleWho',{n:esc(name)}):'';
 openSheet(t('candleLit'),`<div class="verse">🕯</div><div class="p" style="text-align:center">${t('candleLitP',{who})}</div>${verseHTML(VERSES[3])}
  <div class="row"><button class="btn pri" id="q1">${t('quiet1')}</button><button class="btn" id="cl2">${t('close')}</button></div><div class="row"><button class="btn" id="csh">📤 ${t('shCandleBtn')}</button></div>`,r2=>{r2.querySelector('#cl2').onclick=closeSheet;r2.querySelector('#csh').onclick=()=>share({kind:'candle',text:t('shCandle'),params:{go:'candle'}});
  r2.querySelector('#q1').onclick=()=>{r2.innerHTML=`${breathHTML(1)}<div class="row"><button class="btn" id="x1">${t('end')}</button></div>`;const stop=timerUI(r2,1,()=>{r2.innerHTML=`<div class="verse">${t('amen')}</div><div class="row"><button class="btn" id="x2">${t('close')}</button></div>`;r2.querySelector('#x2').onclick=closeSheet;});r2.querySelector('#x1').onclick=()=>closeSheet();sheetCleanup=stop;};});}

/* ---------- free reflection room ---------- */
function openReflect(){OT('open_reflect');let step=0,stop=null,draft='';const N=5;
 const render=root=>{if(stop){stop();stop=null;}const dots=`<div class="steps">${Array.from({length:N},(_,i)=>`<i class="${i<=step?'on':''}"></i>`).join('')}</div>`;const nav=`<div class="row"><button class="btn" data-b>${t('back')}</button><button class="btn pri" data-n>${t('cont')}</button></div>`;let h='';
  if(step===0)h=`${dots}<div class="p" style="text-align:center">${t('rf0')}</div>${verseHTML(SCR.search)}${breathHTML(.5)}<div class="row"><button class="btn pri" data-n>${t('cont')}</button></div>`;
  else if(step===1)h=`${dots}<div class="p">${t('rf1')}</div><ul class="q"><li>${t('rfq1')}</li><li>${t('rfq2')}</li><li>${t('rfq3')}</li><li>${t('rfq4')}</li></ul>${nav}`;
  else if(step===2)h=`${dots}<div class="p">${t('rf2')}</div><textarea class="field" id="rt" placeholder="${t('rfPh')}"></textarea><div class="note" style="margin-top:8px">${t('rfLocal')}</div>${nav}`;
  else if(step===3)h=`${dots}<div class="p">${t('rf3')}</div><div class="card"><div class="t">${t('contrition')}</div></div>${verseHTML(SCR.confess)}${nav}`;
  else h=`${dots}<div id="burnArea"></div><div class="p" style="text-align:center">${t('rf4')}</div><div class="row"><button class="btn pri" id="give">${t('burn')}</button></div><div class="row"><button class="btn" data-b>${t('back')}</button><button class="btn" id="fin">${t('done')}</button></div><div class="note">${t('notSacrament')}</div>`;
  root.innerHTML=h;
  root.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{if(step===2)draft=root.querySelector('#rt').value;step++;render(root);});
  root.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{if(step===2)draft=root.querySelector('#rt').value;step--;render(root);});
  if(step===2)root.querySelector('#rt').value=draft;
  if(step===0)stop=timerUI(root,.5,()=>{});
  if(step===4){root.querySelector('#give').onclick=()=>{const a=root.querySelector('#burnArea');a.innerHTML=`<div class="burn"${draft.trim()?'':' style="text-align:center"'}>${draft.trim()?esc(draft):'✝'}</div>`;draft='';bell(293.66,.4);setTimeout(()=>{a.innerHTML=`<div class="verse">${t('given')}</div>`;},2500);root.querySelector('#give').disabled=true;};
   root.querySelector('#fin').onclick=()=>{draft='';closeSheet();toast(t('peaceToast'));};}};
 openSheet(t('reflectT'),'<div id="rf"></div>',root=>{render(root.querySelector('#rf'));return()=>{if(stop)stop();draft='';};});}

/* ---------- confessional (guided, paid) ---------- */
function openConfessIntro(){OT('confession_start');OT('pricing_view',{plan:'confession'});
 openSheet(t('cfT'),`<div class="p">${t('cfIntro')}</div><ul class="q">${['cfInc1','cfInc2','cfInc3','cfInc4','cfInc5'].map(k=>`<li>${t(k)}</li>`).join('')}</ul>
  <div class="row"><button class="btn pri" id="cfgo">${t('cfBuy',{p:price(PRICE.confession)})}</button></div>
  <div class="note">${priceNote()}<br>${t('cfPrivacy')}<br><br>${t('notSacrament')}</div>`,root=>{
  root.querySelector('#cfgo').onclick=()=>requireLogin(async()=>{const id=await buy('confession');if(id)startConfession(id);});});}
async function startConfession(orderId){const r=await useOrder(orderId);if(!r||r.error){toast(t('aErr_'+((r&&r.error)||'offline')));return;}loadMe();
 if(!(P.mode==='locked'&&lockKind==='booth')){if(P.mode==='walk')saved={x:P.x,z:P.z};P.mode='anim';fade(()=>{P.x=-4.75;P.z=6.6;moveTo({x:-6.35,z:7.1,eye:1.0,yaw:Math.PI/2,pitch:.05},1.0,()=>{P.mode='locked';lockKind='booth';});});}
 runConfession();}
function runConfession(){let step=1,stop=null,draft='',areas={},pen=null,mic=null;const N=5;
 const AREAS={areaGod:['qGod1','qGod2','qGod3'],areaOthers:['qOthers1','qOthers2','qOthers3','qOthers4'],areaSelf:['qSelf1','qSelf2','qSelf3'],areaWorld:['qWorld1','qWorld2']};
 const stopMic=()=>{if(mic){try{mic.stream.getTracks().forEach(x=>x.stop());cancelAnimationFrame(mic.raf);mic.ctx.close();}catch(_){}mic=null;}};
 const render=root=>{if(stop){stop();stop=null;}stopMic();const dots=`<div class="steps">${Array.from({length:N},(_,i)=>`<i class="${i<step?'on':''}"></i>`).join('')}</div>`;
  const nav=(n)=>`<div class="row">${step>1?`<button class="btn" data-b>${t('back')}</button>`:''}<button class="btn pri" data-n ${n===false?'disabled':''}>${t('cont')}</button></div>`;let h='';
  if(step===1)h=`${dots}<div class="cfh">${t('cfS1')}</div><div class="p" style="text-align:center">${t('cfS1P')}</div>${verseHTML(SCR.search)}${breathHTML(1)}${nav()}`;
  else if(step===2){h=`${dots}<div class="cfh">${t('cfS2')}</div><div class="p">${t('cfS2P')}</div><div class="row" style="justify-content:flex-start">${Object.keys(AREAS).map(a=>`<button class="btn ${areas[a]?'pri':''}" data-a="${a}">${t(a)}</button>`).join('')}</div>
   ${Object.keys(areas).filter(a=>areas[a]).length?`<div class="p">${t('cfS2Q')}</div><ul class="q">${Object.keys(AREAS).filter(a=>areas[a]).map(a=>AREAS[a].map(q=>`<li>${t(q)}</li>`).join('')).join('')}</ul>`:''}${nav()}`;}
  else if(step===3)h=`${dots}<div class="cfh">${t('cfS3')}</div><div class="p">${t('cfS3P')}</div><textarea class="field" id="cft" placeholder="${t('rfPh')}"></textarea>
   <div class="card"><div class="t" style="font-size:13px;color:#cbb994">${t('cfSpeakP')}</div><div class="meter"><i id="lvl"></i></div><div class="row" style="margin:6px 0 0"><button class="btn" id="mic">${t('cfMicOn')}</button></div></div>
   <div class="note" style="margin-top:8px">${t('rfLocal')}</div>${nav()}`;
  else if(step===4)h=`${dots}<div class="cfh">${t('cfS4')}</div><div class="p">${t('cfS4P')}</div><div class="card"><div class="t">${t('contrition')}</div></div><div class="p">${t('cfS4Pen')}</div>
   <div class="pens">${['pen1','pen2','pen3','pen4'].map(k=>`<button class="btn ${pen===k?'pri':''}" data-p="${k}">${t(k)}</button>`).join('')}</div>${nav()}`;
  else h=`${dots}<div class="cfh">${t('cfS5')}</div><div id="burnArea"></div><div class="p" style="text-align:center">${t('cfS5P')}</div><div class="row"><button class="btn pri" id="give">${t('burn')}</button></div>
   <div id="after" style="display:none">${verseHTML(SCR.confess)}<div class="ref" style="margin-top:14px">${t('cfBless')}</div>${verseHTML(SCR.bless)}<div class="row"><button class="btn" id="card">${t('cfCard')}</button><button class="btn pri" id="fin">${t('cfFinish')}</button></div></div>
   <div class="note">${t('notSacrament')}</div>`;
  root.innerHTML=h;
  const keep=()=>{const ta=root.querySelector('#cft');if(ta)draft=ta.value;};
  root.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{keep();step++;render(root);root.parentElement.scrollTop=0;});
  root.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{keep();step--;render(root);});
  root.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{areas[b.dataset.a]=!areas[b.dataset.a];render(root);});
  root.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{pen=b.dataset.p;render(root);});
  if(step===1)stop=timerUI(root,1,()=>{});
  if(step===3){root.querySelector('#cft').value=draft;const mb=root.querySelector('#mic');
   mb.onclick=async()=>{if(mic){stopMic();mb.textContent=t('cfMicOn');root.querySelector('#lvl').style.width='0';return;}
    try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const ctx=new(window.AudioContext||window.webkitAudioContext)();const an=ctx.createAnalyser();an.fftSize=512;ctx.createMediaStreamSource(stream).connect(an);const buf=new Uint8Array(an.fftSize);
     mic={stream,ctx,raf:0};mb.textContent=t('cfMicOff');const lv=root.querySelector('#lvl');
     const tick=()=>{if(!mic)return;an.getByteTimeDomainData(buf);let s=0;for(let i=0;i<buf.length;i++){const v=(buf[i]-128)/128;s+=v*v;}lv.style.width=Math.min(100,Math.sqrt(s/buf.length)*400)+'%';mic.raf=requestAnimationFrame(tick);};tick();}
    catch(_){toast(t('cfMicFail'));}};}
  if(step===5){root.querySelector('#give').onclick=()=>{const a=root.querySelector('#burnArea');a.innerHTML=`<div class="burn"${draft.trim()?'':' style="text-align:center"'}>${draft.trim()?esc(draft):'✝'}</div>`;draft='';bell(293.66,.4);root.querySelector('#give').disabled=true;
    setTimeout(()=>{a.innerHTML=`<div class="verse">${t('given')}</div>`;root.querySelector('#after').style.display='block';setTimeout(()=>bell(523.25,.35),400);},2500);};
   root.querySelector('#card').onclick=()=>peaceCard(pen);
   root.querySelector('#fin').onclick=()=>{draft='';closeSheet();toast(t('peaceToast'));};}};
 openSheet(t('cfT'),'<div id="cf"></div>',root=>{render(root.querySelector('#cf'));return()=>{if(stop)stop();stopMic();draft='';};});}
function wrapLines(g,text,maxW){const out=[];const isCJK=/[㐀-鿿]/.test(text);const parts=isCJK?Array.from(text):text.split(' ');let line='';
 parts.forEach(p=>{const test=line?(isCJK?line+p:line+' '+p):p;if(g.measureText(test).width>maxW&&line){out.push(line);line=p;}else line=test;});if(line)out.push(line);return out;}
function peaceCard(pen){const W=1080,H=1350,[c,g]=mkC(W,H);const gr=g.createRadialGradient(W/2,H*.38,50,W/2,H*.45,H*.8);gr.addColorStop(0,'#3b2814');gr.addColorStop(1,'#0c0907');g.fillStyle=gr;g.fillRect(0,0,W,H);
 g.strokeStyle='#d9b26a';g.lineWidth=4;g.strokeRect(50,50,W-100,H-100);g.lineWidth=1.5;g.strokeRect(66,66,W-132,H-132);
 g.fillStyle='#f0d49a';g.fillRect(W/2-6,150,12,110);g.fillRect(W/2-40,180,80,12);
 const serif='"Noto Serif SC","Songti SC",Georgia,serif';g.textAlign='center';g.fillStyle='#f0d49a';g.font='600 64px '+serif;g.fillText(t('cfCardTitle'),W/2,350);
 g.fillStyle='#bfae93';g.font='30px '+serif;g.fillText(new Date().toLocaleDateString(LANG==='zh'?'zh-CN':'en-GB',{year:'numeric',month:'long',day:'numeric'}),W/2,410);
 g.fillStyle='#f4ead8';g.font='40px '+serif;let y=520;wrapLines(g,SCR.bless[0].replace(/<br>/g,' '),W-260).forEach(l=>{g.fillText(l,W/2,y);y+=64;});
 g.fillStyle='#d9b26a';g.font='30px '+serif;g.fillText('— '+SCR.bless[1],W/2,y+20);y+=110;
 if(pen){g.fillStyle='#bfae93';g.font='28px '+serif;g.fillText(t('cfCardCommit'),W/2,y);y+=56;g.fillStyle='#f4ead8';g.font='36px '+serif;wrapLines(g,t(pen),W-300).forEach(l=>{g.fillText(l,W/2,y);y+=54;});}
 g.fillStyle='#8f7f68';g.font='26px '+serif;g.fillText(LANG==='zh'?'云上圣所 · Sanctuary':'Sanctuary · a church in the cloud',W/2,H-110);
 try{const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='peace-card.png';document.body.appendChild(a);a.click();a.remove();}catch(_){}}

/* ---------- prayer wall ---------- */
function openWall(focus){OT('open_wall');const mine=store.get('wall2',[]);const prayed=store.get('prayed2',{});const reported=store.get('reported',{});let items=[],state=sb?'loading':'offline';
 const draw=root=>{const box=root.querySelector('#cards');let h='';
  mine.forEach(c=>{h+=`<div class="card"><div class="t">${esc(c.t)}</div><div class="m"><span>${t('yourReq')}<span class="tag">${t('reviewing')}</span></span><span>${new Date(c.at).toLocaleDateString(LOCALE)}</span></div></div>`;});
  if(state==='loading')h+=`<div class="p" style="text-align:center;padding:14px">${t('wallLoading')}</div>`;
  else if(state==='offline')h+=`<div class="p" style="text-align:center;padding:14px">${t('wallOffline')}</div>`;
  else if(!items.length)h+=`<div class="p" style="text-align:center;padding:14px">${t('wallEmpty')}</div>`;
  const list=focus?[...items].sort((a,b)=>(b.id===focus)-(a.id===focus)):items;
  list.forEach(c=>{if(reported[c.id])return;const done=prayed[c.id];h+=`<div class="card${c.id===focus?' focus':''}"><div class="t">${esc(c.body)}</div><div class="m"><span>${t('anon')} · ${new Date(c.created_at).toLocaleDateString(LOCALE)} · <a href="#" data-r="${c.id}" style="color:#8a7a62">${t('report')}</a> · <a href="#" data-sh="${c.id}" style="color:#bfa77c">${t('shPrayBtn')}</a></span><button class="btn" data-id="${c.id}">${done?t('prayed'):t('prayFor')} · ${c.pray_count}</button></div></div>`;});
  box.innerHTML=h;
  box.querySelectorAll('[data-sh]').forEach(a=>a.onclick=e=>{e.preventDefault();const it=items.find(x=>x.id===a.dataset.sh);if(it)share({kind:'prayer',text:t('shPray',{t:it.body.length>90?it.body.slice(0,88)+'…':it.body}),params:{pray:it.id}});});
  box.querySelectorAll('[data-id]').forEach(b=>b.onclick=async()=>{const id=b.dataset.id;if(prayed[id])return;prayed[id]=1;store.set('prayed2',prayed);bell(587.33,.25);toast(t('prayedToast'));
   const it=items.find(x=>x.id===id);if(it)it.pray_count++;draw(root);try{const n=await rpc('sanct_pray',{p_id:id});if(it&&n>=0){it.pray_count=n;draw(root);}}catch(_){}});
  box.querySelectorAll('[data-r]').forEach(a=>a.onclick=e=>{e.preventDefault();const id=a.dataset.r;const it=items.find(x=>x.id===id);openReport({type:'prayer',id,label:it?it.body:'',done:()=>{reported[id]=1;store.set('reported',reported);draw(root);}});});};
 const load=async root=>{if(!sb){state='offline';draw(root);return;}try{items=await rpc('sanct_list_prayers')||[];state='ok';}catch(_){state='offline';}draw(root);};
 openSheet(t('wallT'),`<div class="p">${t('wallP')}</div>
  <textarea class="field" id="wt" maxlength="120" placeholder="${t('wallPh')}" style="min-height:80px;margin-top:10px"></textarea>
  <div class="row"><button class="btn pri" id="wp">${t('wallSubmit')}</button></div><div id="cards"></div>
  <div class="note">${t('wallRules')}</div>`,root=>{draw(root);load(root);
  root.querySelector('#wp').onclick=async()=>{const ta=root.querySelector('#wt'),v=ta.value.trim();if(v.length<2){toast(t('moreWords'));return;}const btn=root.querySelector('#wp');btn.disabled=true;
   let r='offline';try{r=await rpc('sanct_submit_prayer',{p_body:v});}catch(_){}btn.disabled=false;
   toast(DICT['eRes_'+r]?t('eRes_'+r):t('eRes_fail'));if(r==='pending'){mine.unshift({t:v,at:Date.now()});mine.splice(10);store.set('wall2',mine);ta.value='';draw(root);}};});}

/* ---------- gatherings sheet ---------- */
function openGroup(){OT('open_group');let rooms=[],iv=null,startIn=0,dur=10;
 const drawPublic=root=>{const g=groupInfo();root.querySelector('#gpub').innerHTML=g.live?`<div class="verse">${t('gLiveLeft',{t:mmss(g.left)})}</div><div class="ref">${t('gNow',{n:prayingCount()})}</div><div class="row"><button class="btn pri" id="gj">${t('gJoin')}</button></div>`
   :`<div class="verse">${t('gStartsIn',{t:mmss(g.until)})}</div><div class="p" style="text-align:center">${t('gBellNote')}</div><div class="row"><button class="btn" id="ginv">📤 ${t('shGroupBtn')}</button></div>`;const j=root.querySelector('#gj');if(j)j.onclick=()=>joinPublic();const gi=root.querySelector('#ginv');if(gi)gi.onclick=()=>share({kind:'group',text:t('shGroup'),params:{go:'group'}});};
 const drawRooms=root=>{const now=Date.now();const el=root.querySelector('#grooms');if(!sb){el.innerHTML='';return;}
  el.innerHTML=rooms.length?rooms.map((r,i)=>{const st=new Date(r.starts_at).getTime(),live=now>=st;return`<div class="card"><div class="t">${esc(r.topic)}</div><div class="m"><span>${t('gHost',{n:esc(r.host_name||'—')})} · ${live?`<b style="color:#8fd18b">${t('gLive')}</b>`:t('gIn',{t:mmss(st-now)})} · ${t('gMins',{n:r.duration_min})}</span><span><a href="#" data-rr="${i}" title="${esc(t('report'))}" style="color:#8a7a62;margin-right:10px">⚑</a><button class="btn" data-r="${i}">${t('gEnter')}</button></span></div></div>`;}).join(''):`<div class="p">${t('gNoRooms')}</div>`;
  el.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const r=rooms[+b.dataset.r];requireLogin(()=>joinRoom(r));});
  el.querySelectorAll('[data-rr]').forEach(a=>a.onclick=e=>{e.preventDefault();const r=rooms[+a.dataset.rr];openReport({type:'room',id:r.id,label:r.topic,done:()=>{rooms=rooms.filter(x=>x!==r);drawRooms(root);}});});};
 const drawCreate=root=>{const el=root.querySelector('#gcreate');if(!sb){el.innerHTML='';return;}
  el.innerHTML=`<input class="field" id="gt" maxlength="60" placeholder="${t('gTopic')}"><label class="lbl">${t('gStart')}</label><div class="row" style="justify-content:flex-start">${[[0,'gNowOpt'],[15,'gIn15'],[30,'gIn30'],[60,'gIn60']].map(([v,k])=>`<button class="btn ${startIn===v?'pri':''}" data-s="${v}">${t(k)}</button>`).join('')}</div>
   <label class="lbl">${t('gDur')}</label><div class="row" style="justify-content:flex-start">${[5,10,15,30].map(v=>`<button class="btn ${dur===v?'pri':''}" data-d="${v}">${t('gMins',{n:v})}</button>`).join('')}</div><div class="row"><button class="btn pri" id="gc">${t('gCreateBtn')}</button></div>`;
  el.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{const tp=el.querySelector('#gt').value;startIn=+b.dataset.s;drawCreate(root);el.querySelector('#gt').value=tp;});
  el.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const tp=el.querySelector('#gt').value;dur=+b.dataset.d;drawCreate(root);el.querySelector('#gt').value=tp;});
  el.querySelector('#gc').onclick=()=>{const topic=el.querySelector('#gt').value.trim();requireLogin(async()=>{let r;try{r=await rpc('sanct_create_room',{p_token:token,p_topic:topic,p_start_in_min:startIn,p_duration:dur});}catch(_){r={error:'offline'};}
   if(!r||r.error){if(r&&r.error==='auth'){logoutLocal();openAccount(t('needLogin'));return;}const k='gErr_'+((r&&r.error)||'');toast(DICT[k]?t(k):t('aErr_'+((r&&r.error)||'offline')));return;}
   toast(t('gCreated'));joinRoom({id:r.id,topic,host_name:me.name,starts_at:new Date(Date.now()+startIn*60e3).toISOString(),duration_min:dur});});};};
 openSheet(t('groupT'),`<div class="p">${t('groupP')}</div><div class="sec">${t('gPublic')}</div><div id="gpub"></div><div class="sec">${t('gRooms')}</div><div id="grooms"></div><div class="sec">${t('gCreate')}</div><div id="gcreate"></div>`,root=>{
  drawPublic(root);drawRooms(root);drawCreate(root);
  if(sb)rpc('sanct_list_rooms').then(r=>{rooms=r||[];drawRooms(root);}).catch(()=>{});
  iv=setInterval(()=>{drawPublic(root);drawRooms(root);},1000);return()=>clearInterval(iv);});}
function joinPublic(){const g=groupInfo();const mins=g.live?Math.max(.5,g.left/60e3):3;sitQuick(()=>openPrayer('quiet',mins));}
function joinRoom(r){sitQuick(()=>openRoomPrayer(r));}
function openRoomPrayer(r){let stop=null,iv=null,startedT=false;const st=new Date(r.starts_at).getTime(),endT=st+r.duration_min*60e3;
 openSheet(r.topic,`<div class="ref">${t('gHost',{n:esc(r.host_name||'—')})}</div><div id="rp"></div><div id="rppl"></div><div class="row"><button class="btn" id="rinv">📤 ${t('shRoomBtn')}</button></div><div class="note">${t('prayNote')} · <a href="#" id="rrep" style="color:#8a7a62">${t('reportRoom')}</a></div>`,root=>{
  const rp=root.querySelector('#rp'),pp=root.querySelector('#rppl');
  root.querySelector('#rinv').onclick=()=>share({kind:'room',text:t('shRoom',{t:r.topic}),params:{room:r.id}});
  root.querySelector('#rrep').onclick=e=>{e.preventDefault();openReport({type:'room',id:r.id,label:r.topic});};
  const drawPeople=()=>{const p=roomPeople();pp.innerHTML=peopleHTML(p.names,p.anon);};
  joinRoomChannel(r.id,drawPeople);
  const tick=()=>{const now=Date.now();if(now<st){rp.innerHTML=`<div class="verse">${t('roomWait',{t:mmss(st-now)})}</div>${verseHTML(VERSES[verseIdx])}`;return;}
   if(!startedT){startedT=true;if(now<endT){bell(392,.45);rp.innerHTML=`${breathHTML((endT-now)/60e3)}<div class="p" style="text-align:center;margin-top:8px">${VERSES[verseIdx][0]}</div>`;stop=timerUI(rp,(endT-now)/60e3,()=>{rp.innerHTML=amenHTML();},{group:true});}else rp.innerHTML=amenHTML();}};
  tick();iv=setInterval(tick,1000);
  return()=>{clearInterval(iv);if(stop)stop();leaveRoom();};});}
$('#group').onclick=openGroup;

/* ---------- map / teleport ---------- */
const PLACES=[['pEntrance',{x:0,z:18.5,yaw:0}],['pAltar',{x:0,z:-4.2,yaw:0}],['pCandle',{x:-8.4,z:2,yaw:Math.PI/2}],['pConfess',{x:-4.4,z:6.4,yaw:Math.PI/2}],['pReflect',{x:8.6,z:2.5,yaw:-Math.PI/2}],['pWall',{x:-5.2,z:14.5,yaw:Math.PI/2}],['pLectern',{x:3.2,z:-5.6,yaw:0}]];
function tele(x,z,yaw,cb){closeSheet();leaveRoom();saved=null;lockKind=null;P.mode='anim';fade(()=>{P.x=x;P.z=z;P.yaw=yaw;P.pitch=0;P.eye=1.65;P.mode='walk';cb&&setTimeout(cb,150);});}
function goDo(kind){
 if(kind==='pray')return sitQuick(()=>openPrayer());
 if(kind==='candle')return tele(-8.6,2,Math.PI/2,()=>openCandle());
 if(kind==='confess')return tele(-4.75,6.6,Math.PI/2,()=>enterBooth());
 if(kind==='group')return openGroup();
 if(kind==='wall')return tele(-5.2,14.5,Math.PI/2,()=>openWall());
 if(kind==='verse')return tele(3.2,-5.6,0,()=>openVerse());}
document.querySelectorAll('#dock [data-go]').forEach(b=>b.onclick=e=>{e.stopPropagation();goDo(b.dataset.go);});
function langRow(){return`<div class="row langs" style="justify-content:flex-start">${LANGS.map(l=>`<button class="btn ${l===LANG?'pri':''}" data-lang="${l}">${({en:'English',fr:'Français',de:'Deutsch',it:'Italiano',es:'Español',zh:'中文'})[l]}</button>`).join('')}</div>`;}
function bindLang(root){root.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{const l=b.dataset.lang;if(l===LANG)return;store.set('lang',l);location.href='/'+(l==='en'?'':l+'/')+location.search;});}
function openMenu(){OT('open_menu');openSheet(t('menuT'),`<div class="sec" style="margin-top:4px;border:none;padding-top:0">${t('goT')}</div><div class="tele">${PLACES.map((p,i)=>`<button class="btn" data-i="${i}">${t(p[0])}<small>${t(p[0]+'S')}</small></button>`).join('')}</div>
 <div class="row" style="justify-content:flex-start"><button class="btn pri" id="minv">🎁 ${t('mInvite')}</button><button class="btn" id="mverse">📖 ${t('verseT')}</button><button class="btn" id="mmusic">♪ ${t('mMusic')} · ${audioOn?t('mOn'):t('mOff')}</button></div>
 <div class="sec">🌐 ${t('langT')}</div>${langRow()}
 <div class="note"><a href="/privacy.html" style="color:#bfa77c">${t('privacy')}</a> · <a href="#" id="mrep" style="color:#bfa77c">${t('mReport')}</a><br>${t('goTip')}</div>`,root=>{
 root.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const tg=PLACES[+b.dataset.i][1];tele(tg.x,tg.z,tg.yaw);});
 bindLang(root);root.querySelector('#minv').onclick=()=>openInvite();root.querySelector('#mrep').onclick=e=>{e.preventDefault();openReport({type:'other'});};
 root.querySelector('#mmusic').onclick=()=>{setAudio(!audioOn);openMenu();};
 root.querySelector('#mverse').onclick=()=>goDo('verse');});}
$('#menubtn').onclick=openMenu;
function fade(mid){const o=document.createElement('div');o.style.cssText='position:fixed;inset:0;background:#0b0806;z-index:15;opacity:0;transition:opacity .35s;pointer-events:none';document.body.appendChild(o);requestAnimationFrame(()=>o.style.opacity=1);setTimeout(()=>{mid();o.style.opacity=0;setTimeout(()=>o.remove(),400);},380);}

/* ---------- audio ---------- */
let ac=null,master=null,audioOn=false;
function initAudio(){if(ac)return;try{ac=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
 master=ac.createGain();master.gain.value=0;master.connect(ac.destination);
 const conv=ac.createConvolver();const len=ac.sampleRate*4,buf=ac.createBuffer(2,len,ac.sampleRate);for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);}conv.buffer=buf;
 const wet=ac.createGain();wet.gain.value=.8;conv.connect(wet);wet.connect(ac.destination);
 const pad=ac.createGain();const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;pad.connect(lp);lp.connect(master);lp.connect(conv);
 [130.81,196,261.63,329.63,392].forEach((f,i)=>{const o=ac.createOscillator();o.type=i%2?'triangle':'sine';o.frequency.value=f;o.detune.value=(Math.random()-.5)*8;const g=ac.createGain();g.gain.value=.05;const l=ac.createOscillator();l.frequency.value=.05+i*.031;const lg=ac.createGain();lg.gain.value=.03;l.connect(lg);lg.connect(g.gain);o.connect(g);g.connect(pad);o.start();l.start();});
 pad.gain.value=1;master._conv=conv;}
function setAudio(on){initAudio();if(!ac)return;if(ac.state==='suspended')ac.resume();audioOn=on;master.gain.cancelScheduledValues(ac.currentTime);master.gain.linearRampToValueAtTime(on?.55:0,ac.currentTime+1.5);}
function bell(f,vol){if(!ac)initAudio();if(!ac)return;if(ac.state==='suspended')ac.resume();vol=vol||.4;const t0=ac.currentTime;[[1,1],[2.76,.45],[5.4,.25],[8.9,.12]].forEach(([m,a])=>{const o=ac.createOscillator();o.frequency.value=f*m;const g=ac.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol*a,t0+.01);g.gain.exponentialRampToValueAtTime(.0001,t0+4/m+.6);o.connect(g);g.connect(ac.destination);g.connect(master._conv);o.start(t0);o.stop(t0+5);});}

/* ---------- loop ---------- */
const clock=new THREE.Clock();let lastZone='',hintT=0;
function update(dt,tm){
 if(anim){anim.t+=dt/anim.dur;const k=Math.min(1,anim.t),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;const a=anim.from,b=anim.to;P.x=a.x+(b.x-a.x)*e;P.z=a.z+(b.z-a.z)*e;P.eye=a.eye+(b.eye-a.eye)*e;P.yaw=angLerp(a.yaw,b.yaw,e);P.pitch=a.pitch+(b.pitch-a.pitch)*e;if(k>=1){const th=anim.then;anim=null;th&&th();}}
 else if(P.mode==='walk'){let f=0,s=0;if(keys.KeyW||keys.ArrowUp)f+=1;if(keys.KeyS||keys.ArrowDown)f-=1;if(keys.KeyA||keys.ArrowLeft)s-=1;if(keys.KeyD||keys.ArrowRight)s+=1;f-=jy;s+=jx;
  const mag=Math.hypot(f,s);if(mag>.05){if(mag>1){f/=mag;s/=mag;}const sp=(keys.ShiftLeft?3.6:2.4)*dt;const sy=Math.sin(P.yaw),cy=Math.cos(P.yaw);const dx=(-sy*f+cy*s)*sp,dz=(-cy*f-sy*s)*sp;
   if(!blocked(P.x+dx,P.z))P.x+=dx;if(!blocked(P.x,P.z+dz))P.z+=dz;P.bob+=dt*Math.min(1,mag)*8;}
  P.eye+=(1.65-P.eye)*Math.min(1,dt*6);}
 else if(P.mode==='locked'){if(keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD||Math.abs(jx)+Math.abs(jy)>.5){if(!sheetOpen)standUp();}}
 const fh=floorH(P.x,P.z);P._fh=(P._fh==null?fh:P._fh+(fh-P._fh)*Math.min(1,dt*8));
 camera.position.set(P.x,P._fh+P.eye+(P.mode==='walk'?Math.sin(P.bob)*.025:0),P.z);camera.rotation.set(P.pitch,P.yaw,0);
 curSpot=null;if(P.mode==='walk'&&!anim){for(const sp of spots){if(sp.test(P.x,P.z)){curSpot=sp;break;}}}
 renderActions();
 const z=P.mode==='locked'&&lockKind==='kneel'?t('zKneel'):zoneAt(P.x,P.z);if(z!==lastZone){lastZone=z;$('#zone').textContent=z;}
 for(const f of flames){const n=Math.sin(tm*9+f.ph)*.5+Math.sin(tm*23+f.ph*2)*.3;f.core.scale.set(1+n*.08,2.6+n*.35,1+n*.08);const gs=.3+n*.03;f.sp.scale.set(gs,gs,1);}
 candleL.intensity=(.45+litCount()*.04)*(1+Math.sin(tm*7)*.05+Math.sin(tm*13)*.03);
 const pa=dg.attributes.position.array;for(let i=0;i<dustN;i++){pa[i*3+1]+=Math.sin(tm*.3+i)*.0012-.0006;pa[i*3]+=Math.cos(tm*.2+i*1.7)*.001;if(pa[i*3+1]<.4)pa[i*3+1]=9;}dg.attributes.position.needsUpdate=true;
 rayMat.opacity=.38+Math.sin(tm*.25)*.06;
 if(hintT>0){hintT-=dt;if(hintT<=0)$('#hint').style.opacity=0;}
 const now=performance.now();netTick(now,dt);groupTick(now);}
/* adaptive resolution + quality, and fewer frames when idle */
let fpsN=0,fpsT=performance.now(),lowQ=false,frameN=0;
function adapt(now){fpsN++;const el=now-fpsT;if(el<2000)return;const fps=fpsN*1000/el;fpsN=0;fpsT=now;if(document.hidden)return;
 if(fps<42&&PR>.5){PR=Math.max(.5,PR*.8);renderer.setPixelRatio(PR);renderer.setSize(innerWidth,innerHeight);}
 else if(fps>57&&PR<MAX_PR){PR=Math.min(MAX_PR,PR*1.1);renderer.setPixelRatio(PR);renderer.setSize(innerWidth,innerHeight);}
 if(fps<24&&PR<=.5&&!lowQ){lowQ=true;dust.visible=false;shafts.forEach(m=>m.visible=false);}}
function loop(){requestAnimationFrame(loop);const now=performance.now();const dt=Math.min(.05,clock.getDelta());update(dt,clock.elapsedTime);frameN++;
 const idle=sheetOpen&&!anim&&P.mode!=='walk';if(idle&&frameN%3)return;renderer.render(scene,camera);adapt(now);}

/* ---------- start ---------- */
P._fh=0;camera.position.set(P.x,P.eye,P.z);
renderer.render(scene,camera);
$('#loading').textContent=sb?t('connecting'):'';
loop();
connect();
loadConfig();
loadMe().then(checkReturn);
if('serviceWorker' in navigator&&location.protocol==='https:'){addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}
let deferredPrompt=null;const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installLink').style.display='inline';});
if(isIOS&&!standalone)$('#installLink').style.display='inline';
$('#installLink').onclick=e=>{e.preventDefault();if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;}else if(isIOS)toast(t('iosInstall'));};
function begin(kind){$('#intro').classList.add('hide');document.body.classList.add('in');setAudio(true);
 if(resume){const r=resume;resume=null;if(r.kind==='candle')setTimeout(()=>lightPaid(r.id,''),500);else setTimeout(()=>startConfession(r.id),500);return;}
 if(typeof kind==='function'){kind();return;}
 if(kind&&kind!=='explore'){goDo(kind);return;}
 const h=$('#hint');h.textContent=t(isTouch?'hintTouch':'hintDesk');h.style.opacity=1;hintT=7;
 P.mode='anim';P.z=19.6;moveTo({x:0,z:16.5,eye:1.65,yaw:0,pitch:0},2.4,()=>{P.mode='walk';});}
document.querySelectorAll('#intro [data-go]').forEach(b=>b.onclick=()=>begin(b.dataset.go));
/* landing from shared links: ?ref= ?room= ?pray= ?go= ?report=1 */
(function landing(){const q=new URLSearchParams(location.search);const room=q.get('room'),pray=q.get('pray'),go=q.get('go'),report=q.get('report');
 ['ref','room','pray','go','report'].forEach(k=>q.delete(k));if(room||pray||go||report||new URLSearchParams(location.search).has('ref')){const r=q.toString();history.replaceState(null,'',location.pathname+(r?'?'+r:''));}
 if(REF)setTimeout(()=>{if(!(me&&me.ref_code===REF))track('visit','link');},1500);
 const land=$('#land');const show=(h,btn,fn)=>{land.innerHTML=`<div>${h}</div>${btn?`<button class="btn pri" id="landgo">${btn}</button>`:''}`;land.hidden=false;const b=$('#landgo');if(b)b.onclick=()=>begin(fn);};
 const uuid=/^[0-9a-f-]{36}$/i;
 if(report){show(t('rpOther'),t('mReport'),()=>openReport({type:'other'}));return;}
 if(room&&uuid.test(room)&&sb){rpc('sanct_get_room',{p_id:room}).then(r=>{if(r&&r.id)show(`${t('landRoom')}<br><b>“${esc(r.topic)}”</b> · ${t('gHost',{n:esc(r.host_name||'—')})}`,t('landRoomBtn'),()=>requireLogin(()=>joinRoom(r)));else show(t('roomGone'),t('tlGroup'),()=>openGroup());}).catch(()=>{});return;}
 if(pray&&uuid.test(pray)){show(t('landPray'),t('landPrayBtn'),()=>tele(-5.2,14.5,Math.PI/2,()=>openWall(pray)));return;}
 if(go&&['pray','candle','confess','group','wall'].includes(go)){show(REF?t('landRef'):t('introShort').split('<br>')[0],t('tl'+go[0].toUpperCase()+go.slice(1)),go);return;}
 if(REF)show(t('landRef'),null);})();
$('#tCandleP').textContent=price(PRICE.candle);$('#tConfessP').textContent=price(PRICE.confession);
{const lr=$('#introLang');if(lr){lr.innerHTML=langRow();bindLang(lr);}}
})();
