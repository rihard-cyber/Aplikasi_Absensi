function __vite__mapDeps(indexes) {
  if (!__vite__mapDeps.viteFileDeps) {
    __vite__mapDeps.viteFileDeps = ["assets/index-DxW5bFt6.js","assets/supabase-DLjN7efb.js","assets/motion-Drq5vYCG.js","assets/react-C3wRtmh0.js","assets/icons-CdMV6WOb.js","assets/index-BVL-1nDS.css"]
  }
  return indexes.map((i) => __vite__mapDeps.viteFileDeps[i])
}
import{_ as i}from"./supabase-DLjN7efb.js";let r=null;function o(){if(r)return r;try{const e=localStorage.getItem("__web_device_id");if(e)return r=e,r}catch{}const t="web-"+("10000000-1000-4000-8000"+-1e11).toString().replace(/[018]/g,e=>(e^crypto.getRandomValues(new Uint8Array(1))[0]&15>>e/4).toString(16));try{localStorage.setItem("__web_device_id",t)}catch{}return r=t,r}const c={async getId(){try{const{Device:t}=await i(()=>import("./index-DxW5bFt6.js").then(n=>n.p),__vite__mapDeps([0,1,2,3,4,5]));return{identifier:(await t.getId()).identifier}}catch{return{identifier:o()}}},async getInfo(){try{const{Device:t}=await i(()=>import("./index-DxW5bFt6.js").then(e=>e.p),__vite__mapDeps([0,1,2,3,4,5]));return await t.getInfo()}catch{return{platform:"web",operatingSystem:navigator.platform||"unknown",osVersion:"browser",model:navigator.userAgent.substring(0,50)}}}};export{c as D};
