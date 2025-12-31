(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,45540,e=>{"use strict";var t=e.i(43476),a=e.i(71645);function s(e){try{if("string"==typeof e)return e;return JSON.stringify(e)}catch{return String(e)}}let r=[{label:"Avidia Standard",value:"avidia_standard"},{label:"Shopify Conversion",value:"shopify"},{label:"General E-commerce",value:"ecommerce"},{label:"Technical / Industrial",value:"technical"},{label:"Lifestyle / Marketing",value:"lifestyle"}];function i(){let{generate:e,loading:i,error:l}=function(){let[e,t]=(0,a.useState)(!1),[r,i]=(0,a.useState)(null);return{generate:async function(e){t(!0),i(null);try{let a=await fetch("/api/v1/describe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)}),r=null;try{r=await a.json()}catch(e){r=null}if(!a.ok){let e=[];e.push(r?.error||`Status ${a.status}`),r?.detail&&e.push(`detail=${s(r.detail)}`),r?.debug&&e.push(`debug=${s(r.debug)}`),!r&&a.statusText&&e.push(a.statusText);let l=Error(e.filter(Boolean).join(" | "));return i(l),t(!1),null}try{sessionStorage.setItem("avidia:describe:lastResult",JSON.stringify(r)),window.dispatchEvent(new Event("storage"))}catch{}return t(!1),r}catch(e){return i(e),t(!1),null}},loading:e,error:r}}(),[n,o]=(0,a.useState)(""),[d,c]=(0,a.useState)(""),[m,u]=(0,a.useState)(""),[h,p]=(0,a.useState)(""),[x,g]=(0,a.useState)("avidia_standard"),[b,f]=(0,a.useState)(null);async function v(t){if(t&&t.preventDefault(),!n.trim()||!d.trim())return void alert("Please provide product name and a short description.");let a=function(e){let t=e.split(/\r?\n/).map(e=>e.trim()).filter(Boolean),a={};for(let e of t){let[t,...s]=e.split(":");t&&(a[t.trim()]=s.join(":").trim())}return a}(h),s={name:n.trim(),shortDescription:d.trim(),brand:m.trim()||void 0,specs:Object.keys(a).length?a:void 0,format:x},r=await e(s);r?.normalizedPayload?.id&&f(r.normalizedPayload.id)}return(0,t.jsxs)("form",{onSubmit:v,className:"space-y-4 bg-white dark:bg-slate-900 border rounded-lg p-4 shadow-sm",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("label",{className:"text-xs font-medium",children:"Product name"}),(0,t.jsx)("input",{value:n,onChange:e=>o(e.target.value),className:"mt-1 w-full border rounded px-3 py-2",placeholder:"e.g. Portable Folding Ramp"})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("label",{className:"text-xs font-medium",children:"Short manufacturer description"}),(0,t.jsx)("textarea",{value:d,onChange:e=>c(e.target.value),rows:3,className:"mt-1 w-full border rounded px-3 py-2",placeholder:"One or two lines describing the product"})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("label",{className:"text-xs font-medium",children:"Brand (optional)"}),(0,t.jsx)("input",{value:m,onChange:e=>u(e.target.value),className:"mt-1 w-full border rounded px-3 py-2",placeholder:"Brand name"})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("label",{className:"text-xs font-medium",children:"Specs (optional — key: value per line)"}),(0,t.jsx)("textarea",{value:h,onChange:e=>p(e.target.value),rows:4,className:"mt-1 w-full border rounded px-3 py-2",placeholder:"Weight: 12 kg\\nWidth: 80 cm"}),(0,t.jsx)("p",{className:"text-xs text-slate-500 mt-1",children:"Tip: use key:value per line to give the generator structured info."})]}),(0,t.jsxs)("div",{className:"flex items-center gap-3",children:[(0,t.jsxs)("div",{className:"flex-1",children:[(0,t.jsx)("label",{className:"text-xs font-medium",children:"Description format"}),(0,t.jsx)("select",{value:x,onChange:e=>g(e.target.value),className:"mt-1 w-full border rounded px-3 py-2",children:r.map(e=>(0,t.jsx)("option",{value:e.value,children:e.label},e.value))})]}),(0,t.jsx)("div",{className:"w-44",children:(0,t.jsx)("button",{type:"submit",disabled:i,className:"mt-6 w-full px-3 py-2 bg-indigo-600 text-white rounded",children:i?"Generating…":"Generate Description"})})]}),l&&(0,t.jsxs)("div",{className:"text-sm text-red-600",children:["Error: ",l.message||String(l)]}),b&&(0,t.jsxs)("div",{className:"text-xs text-slate-500",children:["Last generated id: ",b]})]})}e.s(["default",()=>i],45540)},43889,e=>{"use strict";var t=e.i(43476),a=e.i(71645);function s(){var e,s;let r,{result:i}=function(){let[e,t]=(0,a.useState)(null);return(0,a.useEffect)(()=>{function e(){try{let e=sessionStorage.getItem("avidia:describe:lastResult");if(!e)return t(null);t(JSON.parse(e))}catch{t(null)}}return e(),window.addEventListener("storage",e),()=>window.removeEventListener("storage",e)},[]),{result:e,setResult:t}}(),[l,n]=(0,a.useState)("overview"),[o,d]=(0,a.useState)("iframe"),c=(0,a.useRef)(`t_${Math.random().toString(36).slice(2)}_${Date.now()}`),m=(0,a.useRef)(null),[u,h]=(0,a.useState)(520);(0,a.useEffect)(()=>{n("overview")},[i]);let p=i?.descriptionHtml??"",x=i?.sections??{},g=i?.seo??{},b=(0,a.useMemo)(()=>{switch(l){case"overview":return p||x.overview||"";case"hook":return x.hook||"";case"main":return x.mainDescription||"";case"features":return x.featuresBenefits||"";case"specs":return x.specifications||"";case"links":return x.internalLinks||"";case"why":return x.whyChoose||"";case"manuals":return x.manuals||x.manualsSectionHtml||"";case"faqs":return x.faqs||"";default:return""}},[l,p,x]);return((0,a.useEffect)(()=>{"iframe"===o&&h(520)},[o,l,b]),(0,a.useEffect)(()=>{function e(e){let t=e.data;if(!t||"avidia:describe:iframeHeight"!==t.type||t.token!==c.current)return;let a=Number(t.height);if(!Number.isFinite(a)||a<=0)return;let s=Math.max(120,Math.ceil(a));h(e=>6>Math.abs(e-s)?e:s)}return window.addEventListener("message",e),()=>window.removeEventListener("message",e)},[]),i)?(0,t.jsxs)("div",{className:"bg-white dark:bg-slate-900 border rounded-lg shadow-sm flex flex-col overflow-hidden",style:{height:"clamp(600px, 80vh, 980px)"},children:[(0,t.jsxs)("div",{className:"shrink-0 p-4 border-b bg-white/90 dark:bg-slate-900/70 backdrop-blur",children:[(0,t.jsxs)("div",{className:"flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",children:[(0,t.jsxs)("div",{className:"flex items-center gap-3 min-w-0",children:[(0,t.jsx)("h2",{className:"text-lg font-semibold",children:"Preview"}),(0,t.jsxs)("div",{className:"text-xs text-slate-500 truncate",children:["Source: ",i?.normalizedPayload?.source??"Describe"]})]}),(0,t.jsxs)("div",{className:"flex flex-wrap items-center gap-2",children:[(0,t.jsx)("button",{onClick:function(){let e=b||"";navigator.clipboard.writeText(e).then(()=>alert("Tab HTML copied to clipboard"))},className:"px-3 py-1 border rounded text-sm",children:"Copy Tab HTML"}),(0,t.jsx)("button",{onClick:function(){navigator.clipboard.writeText(p||"").then(()=>alert("Full HTML copied to clipboard"))},className:"px-3 py-1 border rounded text-sm",children:"Copy Full HTML"}),(0,t.jsx)("button",{onClick:function(){let e=g.h1??"",t=g.pageTitle??g.title??"",a=g.metaDescription??"",s=Array.isArray(g.keywords)?g.keywords.join(", "):g.keywords??"",r=`H1: ${e}
Page Title: ${t}
Meta Description: ${a}
Search Keywords: ${s}`;navigator.clipboard.writeText(r).then(()=>alert("SEO metadata copied to clipboard"))},className:"px-3 py-1 border rounded text-sm",children:"Copy SEO Meta"}),(0,t.jsx)("button",{onClick:function(){let e=new Blob([JSON.stringify(i??{},null,2)],{type:"application/json"}),t=URL.createObjectURL(e),a=document.createElement("a");a.href=t,a.download=`describe-${Date.now()}.json`,a.click(),URL.revokeObjectURL(t)},className:"px-3 py-1 border rounded text-sm",children:"Download JSON"}),(0,t.jsx)("button",{onClick:function(){sessionStorage.setItem("avidia:import:payload",JSON.stringify(i??{})),window.location.href="/dashboard/import"},className:"px-3 py-1 bg-indigo-600 text-white rounded text-sm",children:"Send to Import"})]})]}),(0,t.jsxs)("div",{className:"mt-3 flex flex-wrap gap-3 items-center border-t pt-3",children:[(0,t.jsx)("div",{className:"flex flex-wrap gap-3",children:[{id:"overview",label:"Overview"},{id:"features",label:"Features"},{id:"specs",label:"Specs"},{id:"links",label:"Links"},{id:"manuals",label:"Manuals"},{id:"seo",label:"SEO"},{id:"json",label:"Raw JSON"}].map(e=>(0,t.jsx)("button",{onClick:()=>n(e.id),className:`text-sm ${l===e.id?"font-semibold text-slate-900 dark:text-slate-50":"text-slate-500"}`,children:e.label},e.id))}),(0,t.jsxs)("div",{className:"ml-auto flex items-center gap-2",children:[(0,t.jsx)("span",{className:"text-xs text-slate-500",children:"View:"}),(0,t.jsx)("button",{onClick:()=>d("styled"),className:`text-xs px-2 py-1 border rounded ${"styled"===o?"font-semibold":""}`,children:"Styled"}),(0,t.jsx)("button",{onClick:()=>d("iframe"),className:`text-xs px-2 py-1 border rounded ${"iframe"===o?"font-semibold":""}`,children:"HTML Viewer"})]})]})]}),(0,t.jsx)("div",{className:"flex-1 min-h-0 overflow-y-auto p-4",children:"seo"===l?(0,t.jsxs)("div",{className:"space-y-3 text-sm",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("strong",{children:"H1:"})," ",g.h1||(0,t.jsx)("em",{className:"text-slate-500",children:"Not available"})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("strong",{children:"Page Title:"})," ",(g.pageTitle??g.title)||(0,t.jsx)("em",{className:"text-slate-500",children:"Not available"})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("strong",{children:"Meta Description:"}),(0,t.jsx)("div",{className:"mt-1 text-slate-600 dark:text-slate-300 whitespace-pre-wrap",children:g.metaDescription||(0,t.jsx)("em",{className:"text-slate-500",children:"Not available"})})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("strong",{children:"Search Keywords:"}),(0,t.jsx)("div",{className:"mt-1 text-slate-600 dark:text-slate-300",children:Array.isArray(g.keywords)?g.keywords.join(", "):g.keywords??(0,t.jsx)("em",{className:"text-slate-500",children:"Not available"})})]})]}):"json"===l?(0,t.jsx)("pre",{className:"text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded overflow-x-auto",children:JSON.stringify(i,null,2)}):"iframe"===o?(0,t.jsx)("iframe",{ref:m,title:"HTML Preview",className:"w-full block border-0 shadow-none rounded-none bg-transparent",style:{height:u},sandbox:"allow-scripts",scrolling:"no",srcDoc:(e=c.current,r=(s=b||"")?s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,""):"",`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<style>
  html, body { margin:0; padding:0; }
  /* Hide iframe-internal scrollbars (prevents "2 scrolls") */
  html, body { overflow: hidden; }

  body {
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
    padding: 16px;
    padding-bottom: 40px; /* small safety so last line never kisses the edge */
    line-height: 1.5;
    background: transparent;
    color: #0f172a;
  }

  /* Document-like layout (no visible frame) */
  .page {
    max-width: 920px;
    margin: 0 auto;
    padding-bottom: 16px; /* extra safety for margin-collapse / final elements */
  }

  h1,h2,h3 { margin: 0.9em 0 0.4em; }
  p { margin: 0.55em 0; }
  ul,ol { margin: 0.4em 0 0.8em 1.2em; padding: 0; }
  li { margin: 0.25em 0; }
  hr { border: 0; border-top: 1px solid rgba(226,232,240,0.9); margin: 1.25em 0; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid rgba(226,232,240,0.9); padding: 8px; vertical-align: top; }
  a { color: #0ea5e9; text-decoration: underline; }

  @media (prefers-color-scheme: dark) {
    body { color: #e2e8f0; }
    hr { border-top-color: rgba(51,65,85,0.9); }
    td, th { border-color: rgba(51,65,85,0.9); }
    a { color: #38bdf8; }
  }
</style>
</head>
<body>
  <div class="page">
    ${r}
  </div>

<script>
(function(){
  var TOKEN = ${JSON.stringify(e)};

  function computeContentHeight(){
    // ✅ Measure only the actual content wrapper.
    // Avoid documentElement/body scrollHeight unless page is missing,
    // because those can "floor" to viewport height and cause blank space.
    var page = document.querySelector('.page');
    if (page) {
      var h = 0;
      try {
        h = Math.max(h, page.scrollHeight || 0);
        h = Math.max(h, page.offsetHeight || 0);
        var rect = page.getBoundingClientRect ? page.getBoundingClientRect() : null;
        if (rect && rect.height) h = Math.max(h, rect.height);
      } catch(e) {}

      // buffer for rounding + fonts + last margin
      h = Math.ceil(h) + 24;
      return Math.max(120, h);
    }

    // Fallback (only if .page missing)
    var fb = 0;
    try {
      fb = Math.max(
        document.body ? document.body.scrollHeight : 0,
        document.body ? document.body.offsetHeight : 0
      );
    } catch(e) {}
    fb = Math.ceil(fb) + 24;
    return Math.max(120, fb);
  }

  function postHeight(){
    try {
      parent.postMessage(
        { type: "avidia:describe:iframeHeight", token: TOKEN, height: computeContentHeight() },
        "*"
      );
    } catch(e) {}
  }

  function burst(){
    postHeight();
    requestAnimationFrame(postHeight);
    setTimeout(postHeight, 60);
    setTimeout(postHeight, 180);
    setTimeout(postHeight, 360);
    setTimeout(postHeight, 700);
  }

  window.addEventListener("load", function(){ burst(); });

  // Observe DOM changes to keep height accurate
  try {
    var mo = new MutationObserver(function(){ postHeight(); });
    mo.observe(document.body, { childList:true, subtree:true, characterData:true });
  } catch(e) {}

  // ResizeObserver catches font reflow / images etc.
  try {
    var ro = new ResizeObserver(function(){ postHeight(); });
    ro.observe(document.body);
    ro.observe(document.documentElement);
  } catch(e) {}

  window.addEventListener("resize", postHeight);

  // Kick once ASAP
  burst();
})();
</script>
</body>
</html>`)}):(0,t.jsx)("div",{className:"prose prose-slate max-w-none dark:prose-invert prose-h2:mt-5 prose-h3:mt-4 prose-li:my-0.5",dangerouslySetInnerHTML:{__html:b||"<em>No content available for this tab yet.</em>"}})})]}):(0,t.jsx)("div",{className:"bg-white dark:bg-slate-900 border rounded-lg p-6 shadow-sm",children:(0,t.jsx)("div",{className:"text-sm text-slate-500",children:"No generated description yet. Fill the form and click Generate."})})}e.s(["default",()=>s])}]);