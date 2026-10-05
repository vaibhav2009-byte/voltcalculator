const ROOMS=["Living room","Bedroom","Kitchen","Other"],COL=["#ffb62e","#38d6c4","#ff6b6b","#8d99ff"];
const QUICK=[["LED bulb",9,6,0],["Fan",75,10,1],["Fridge",150,8,2],["AC",1500,6,1],["TV",100,4,0],["Laptop",60,6,3],["Washing machine",500,1,3],["Geyser",2000,.5,3]];
const $=id=>document.getElementById(id);
let S={items:[{n:"LED bulb",w:9,q:4,h:6,r:0},{n:"Ceiling fan",w:75,q:2,h:10,r:1},{n:"Refrigerator",w:150,q:1,h:8,r:2},{n:"Television",w:100,q:1,h:4,r:0}],mode:"flat",tab:-1};
try{const x=JSON.parse(localStorage.getItem("volttrack"));if(x&&x.items)S=x}catch(e){}
const kwh=i=>i.w*i.q*i.h/1000;
const f=(n,d=1)=>(+n).toLocaleString("en-IN",{minimumFractionDigits:d,maximumFractionDigits:d});
const num=id=>parseFloat($(id).value)||0;

function bill(units){
  let e;
  if(S.mode==="flat")e=units*num("rate");
  else e=Math.min(units,100)*num("s1")+Math.max(0,Math.min(units,300)-100)*num("s2")+Math.max(0,units-300)*num("s3");
  return (e+num("fix"))*(1+num("tax")/100);
}
function render(){
  const days=num("days")||30,d=S.items.reduce((a,i)=>a+kwh(i),0),m=d*days,b=bill(m);
  $("lcd").textContent=m.toFixed(1).padStart(5,"0");
  $("sDay").textContent=f(d,2);$("sBill").textContent="₹"+f(b,0);
  const L=$("sLvl");L.className="lvl "+(m<150?"low":m<300?"mid":"high");L.textContent=m===0?"–":m<150?"Low":m<300?"Moderate":"High";
  // donut by room
  const rt=ROOMS.map((_,r)=>S.items.filter(i=>i.r===r).reduce((a,i)=>a+kwh(i),0));
  let acc=0,seg=[];rt.forEach((v,r)=>{if(v>0){const s=acc/d*100;acc+=v;seg.push(`${COL[r]} ${s}% ${acc/d*100}%`)}});
  $("donut").style.background=seg.length?`conic-gradient(${seg.join(",")})`:"";
  $("legend").innerHTML=rt.map((v,r)=>v>0?`<li><i style="background:${COL[r]}"></i>${ROOMS[r]} ${f(v/d*100,0)}%</li>`:"").join("");
  // goal
  const g=num("goal");$("gv").textContent=g;
  const m2=m*(1-g/100),b2=bill(m2);
  $("gU").textContent=f(m-m2,1)+" kWh";$("gB").textContent="₹"+f(b2,0);$("gY").textContent="₹"+f((b-b2)*12,0);
  // list
  const mx=Math.max(...S.items.map(kwh),0.001);
  document.querySelectorAll("#tabs button").forEach(t=>t.classList.toggle("on",+t.dataset.t===S.tab));
  const vis=S.items.map((it,idx)=>({it,idx})).filter(x=>S.tab<0||x.it.r===S.tab);
  $("list").innerHTML=vis.length?vis.map(({it,idx})=>`<div class="item"><div class="nm">${esc(it.n)}<small>${ROOMS[it.r]}</small></div>
   <label>W<input type="number" data-i="${idx}" data-k="w" value="${it.w}"></label>
   <label>Qty<input type="number" data-i="${idx}" data-k="q" value="${it.q}"></label>
   <label>Hrs<input type="number" step=".5" data-i="${idx}" data-k="h" value="${it.h}"></label>
   <div class="kw">${f(kwh(it),2)} kWh/d</div><button class="del" data-del="${idx}">✕</button>
   <div class="bar"><i style="width:${kwh(it)/mx*100}%"></i></div></div>`).join(""):`<div class="empty">No appliances here yet. Add one above.</div>`;
  try{localStorage.setItem("volttrack",JSON.stringify(S))}catch(e){}
}
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function init(){
  $("tabs").innerHTML=`<button data-t="-1">All</button>`+ROOMS.map((r,i)=>`<button data-t="${i}">${r}</button>`).join("");
  $("fRoom").innerHTML=ROOMS.map((r,i)=>`<option value="${i}">${r}</option>`).join("");
  $("quick").innerHTML=QUICK.map((q,i)=>`<button data-q="${i}">${q[0]}</button>`).join("");
  $("tabs").onclick=e=>{if(e.target.dataset.t!=null){S.tab=+e.target.dataset.t;render()}};
  $("quick").onclick=e=>{const q=QUICK[e.target.dataset.q];if(q){S.items.push({n:q[0],w:q[1],q:1,h:q[2],r:q[3]});render()}};
  $("form").onsubmit=e=>{e.preventDefault();S.items.push({n:$("fName").value.trim(),w:num("fW"),q:Math.max(1,num("fQ")),h:Math.min(24,num("fH")),r:+$("fRoom").value});e.target.reset();$("fQ").value=1;render()};
  $("list").oninput=e=>{const t=e.target;if(t.dataset.i!=null){S.items[t.dataset.i][t.dataset.k]=parseFloat(t.value)||0;render0()}};
  $("list").onclick=e=>{if(e.target.dataset.del!=null){S.items.splice(e.target.dataset.del,1);render()}};
  document.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{S.mode=b.dataset.m;modeUI();render()});
  ["rate","s1","s2","s3","fix","tax","days","goal"].forEach(i=>$(i).oninput=render);
  $("pr").onclick=()=>window.print();
  $("rst").onclick=()=>{if(confirm("Remove all appliances?")){S.items=[];render()}};
  $("dl").onclick=download;
  modeUI();render();
}
// re-render without rebuilding the list (keeps input focus)
function render0(){const a=document.activeElement,i=a.dataset.i,k=a.dataset.k,p=a.selectionStart;render();const n=document.querySelector(`[data-i="${i}"][data-k="${k}"]`);if(n){n.focus();try{n.setSelectionRange(p,p)}catch(e){}}}
function modeUI(){document.querySelectorAll(".seg button").forEach(b=>b.classList.toggle("on",b.dataset.m===S.mode));$("flatBox").hidden=S.mode!=="flat";$("slabBox").hidden=S.mode==="flat"}
function download(){
  const days=num("days")||30,d=S.items.reduce((a,i)=>a+kwh(i),0),m=d*days,b=bill(m),g=num("goal"),b2=bill(m*(1-g/100));
  const L=["VoltTrack — Electricity Usage Report","Generated: "+new Date().toLocaleString(),"","Appliance,Room,Power (W),Quantity,Hours/day,kWh/day,kWh/month",
   ...S.items.map(i=>`"${i.n}",${ROOMS[i.r]},${i.w},${i.q},${i.h},${kwh(i).toFixed(3)},${(kwh(i)*days).toFixed(2)}`),"",
   "Daily energy (kWh),"+d.toFixed(3),"Monthly energy (kWh),"+m.toFixed(2),"Tariff,"+(S.mode==="flat"?"Flat ₹"+num("rate")+"/unit":"Slab"),
   "Estimated monthly bill (Rs),"+b.toFixed(2),"Saving goal (%),"+g,"Units saved (kWh),"+(m*g/100).toFixed(2),"Bill after saving (Rs),"+b2.toFixed(2),"Yearly saving (Rs),"+((b-b2)*12).toFixed(2)];
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+L.join("\r\n")],{type:"text/csv"}));a.download="volttrack-report.csv";a.click();
}
init();
