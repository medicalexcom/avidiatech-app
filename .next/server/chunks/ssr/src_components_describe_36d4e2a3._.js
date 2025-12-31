module.exports=[10926,a=>{"use strict";var b=a.i(87924),c=a.i(72131);function d(a){try{if("string"==typeof a)return a;return JSON.stringify(a)}catch{return String(a)}}let e=[{label:"Avidia Standard",value:"avidia_standard"},{label:"Shopify Conversion",value:"shopify"},{label:"General E-commerce",value:"ecommerce"},{label:"Technical / Industrial",value:"technical"},{label:"Lifestyle / Marketing",value:"lifestyle"}];function f(){let{generate:a,loading:f,error:g}=function(){let[a,b]=(0,c.useState)(!1),[e,f]=(0,c.useState)(null);return{generate:async function(a){b(!0),f(null);try{let c=await fetch("/api/v1/describe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)}),e=null;try{e=await c.json()}catch(a){e=null}if(!c.ok){let a=[];a.push(e?.error||`Status ${c.status}`),e?.detail&&a.push(`detail=${d(e.detail)}`),e?.debug&&a.push(`debug=${d(e.debug)}`),!e&&c.statusText&&a.push(c.statusText);let g=Error(a.filter(Boolean).join(" | "));return f(g),b(!1),null}try{sessionStorage.setItem("avidia:describe:lastResult",JSON.stringify(e)),window.dispatchEvent(new Event("storage"))}catch{}return b(!1),e}catch(a){return f(a),b(!1),null}},loading:a,error:e}}(),[h,i]=(0,c.useState)(""),[j,k]=(0,c.useState)(""),[l,m]=(0,c.useState)(""),[n,o]=(0,c.useState)(""),[p,q]=(0,c.useState)("avidia_standard"),[r,s]=(0,c.useState)(null);async function t(b){if(b&&b.preventDefault(),!h.trim()||!j.trim())return void alert("Please provide product name and a short description.");let c=function(a){let b=a.split(/\r?\n/).map(a=>a.trim()).filter(Boolean),c={};for(let a of b){let[b,...d]=a.split(":");b&&(c[b.trim()]=d.join(":").trim())}return c}(n),d={name:h.trim(),shortDescription:j.trim(),brand:l.trim()||void 0,specs:Object.keys(c).length?c:void 0,format:p},e=await a(d);e?.normalizedPayload?.id&&s(e.normalizedPayload.id)}return(0,b.jsxs)("form",{onSubmit:t,className:"space-y-4 bg-white dark:bg-slate-900 border rounded-lg p-4 shadow-sm",children:[(0,b.jsxs)("div",{children:[(0,b.jsx)("label",{className:"text-xs font-medium",children:"Product name"}),(0,b.jsx)("input",{value:h,onChange:a=>i(a.target.value),className:"mt-1 w-full border rounded px-3 py-2",placeholder:"e.g. Portable Folding Ramp"})]}),(0,b.jsxs)("div",{children:[(0,b.jsx)("label",{className:"text-xs font-medium",children:"Short manufacturer description"}),(0,b.jsx)("textarea",{value:j,onChange:a=>k(a.target.value),rows:3,className:"mt-1 w-full border rounded px-3 py-2",placeholder:"One or two lines describing the product"})]}),(0,b.jsxs)("div",{children:[(0,b.jsx)("label",{className:"text-xs font-medium",children:"Brand (optional)"}),(0,b.jsx)("input",{value:l,onChange:a=>m(a.target.value),className:"mt-1 w-full border rounded px-3 py-2",placeholder:"Brand name"})]}),(0,b.jsxs)("div",{children:[(0,b.jsx)("label",{className:"text-xs font-medium",children:"Specs (optional — key: value per line)"}),(0,b.jsx)("textarea",{value:n,onChange:a=>o(a.target.value),rows:4,className:"mt-1 w-full border rounded px-3 py-2",placeholder:"Weight: 12 kg\\nWidth: 80 cm"}),(0,b.jsx)("p",{className:"text-xs text-slate-500 mt-1",children:"Tip: use key:value per line to give the generator structured info."})]}),(0,b.jsxs)("div",{className:"flex items-center gap-3",children:[(0,b.jsxs)("div",{className:"flex-1",children:[(0,b.jsx)("label",{className:"text-xs font-medium",children:"Description format"}),(0,b.jsx)("select",{value:p,onChange:a=>q(a.target.value),className:"mt-1 w-full border rounded px-3 py-2",children:e.map(a=>(0,b.jsx)("option",{value:a.value,children:a.label},a.value))})]}),(0,b.jsx)("div",{className:"w-44",children:(0,b.jsx)("button",{type:"submit",disabled:f,className:"mt-6 w-full px-3 py-2 bg-indigo-600 text-white rounded",children:f?"Generating…":"Generate Description"})})]}),g&&(0,b.jsxs)("div",{className:"text-sm text-red-600",children:["Error: ",g.message||String(g)]}),r&&(0,b.jsxs)("div",{className:"text-xs text-slate-500",children:["Last generated id: ",r]})]})}a.s(["default",()=>f],10926)},9812,a=>{"use strict";var b=a.i(87924),c=a.i(72131);function d(){var a,d;let e,{result:f}=function(){let[a,b]=(0,c.useState)(null);return(0,c.useEffect)(()=>{function a(){try{let a=sessionStorage.getItem("avidia:describe:lastResult");if(!a)return b(null);b(JSON.parse(a))}catch{b(null)}}return a(),window.addEventListener("storage",a),()=>window.removeEventListener("storage",a)},[]),{result:a,setResult:b}}(),[g,h]=(0,c.useState)("overview"),[i,j]=(0,c.useState)("iframe"),k=(0,c.useRef)(`t_${Math.random().toString(36).slice(2)}_${Date.now()}`),l=(0,c.useRef)(null),[m,n]=(0,c.useState)(520);(0,c.useEffect)(()=>{h("overview")},[f]);let o=f?.descriptionHtml??"",p=f?.sections??{},q=f?.seo??{},r=(0,c.useMemo)(()=>{switch(g){case"overview":return o||p.overview||"";case"hook":return p.hook||"";case"main":return p.mainDescription||"";case"features":return p.featuresBenefits||"";case"specs":return p.specifications||"";case"links":return p.internalLinks||"";case"why":return p.whyChoose||"";case"manuals":return p.manuals||p.manualsSectionHtml||"";case"faqs":return p.faqs||"";default:return""}},[g,o,p]);return((0,c.useEffect)(()=>{"iframe"===i&&n(520)},[i,g,r]),(0,c.useEffect)(()=>{function a(a){let b=a.data;if(!b||"avidia:describe:iframeHeight"!==b.type||b.token!==k.current)return;let c=Number(b.height);if(!Number.isFinite(c)||c<=0)return;let d=Math.max(120,Math.ceil(c));n(a=>6>Math.abs(a-d)?a:d)}return window.addEventListener("message",a),()=>window.removeEventListener("message",a)},[]),f)?(0,b.jsxs)("div",{className:"bg-white dark:bg-slate-900 border rounded-lg shadow-sm flex flex-col overflow-hidden",style:{height:"clamp(600px, 80vh, 980px)"},children:[(0,b.jsxs)("div",{className:"shrink-0 p-4 border-b bg-white/90 dark:bg-slate-900/70 backdrop-blur",children:[(0,b.jsxs)("div",{className:"flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",children:[(0,b.jsxs)("div",{className:"flex items-center gap-3 min-w-0",children:[(0,b.jsx)("h2",{className:"text-lg font-semibold",children:"Preview"}),(0,b.jsxs)("div",{className:"text-xs text-slate-500 truncate",children:["Source: ",f?.normalizedPayload?.source??"Describe"]})]}),(0,b.jsxs)("div",{className:"flex flex-wrap items-center gap-2",children:[(0,b.jsx)("button",{onClick:function(){let a=r||"";navigator.clipboard.writeText(a).then(()=>alert("Tab HTML copied to clipboard"))},className:"px-3 py-1 border rounded text-sm",children:"Copy Tab HTML"}),(0,b.jsx)("button",{onClick:function(){navigator.clipboard.writeText(o||"").then(()=>alert("Full HTML copied to clipboard"))},className:"px-3 py-1 border rounded text-sm",children:"Copy Full HTML"}),(0,b.jsx)("button",{onClick:function(){let a=q.h1??"",b=q.pageTitle??q.title??"",c=q.metaDescription??"",d=Array.isArray(q.keywords)?q.keywords.join(", "):q.keywords??"",e=`H1: ${a}
Page Title: ${b}
Meta Description: ${c}
Search Keywords: ${d}`;navigator.clipboard.writeText(e).then(()=>alert("SEO metadata copied to clipboard"))},className:"px-3 py-1 border rounded text-sm",children:"Copy SEO Meta"}),(0,b.jsx)("button",{onClick:function(){let a=new Blob([JSON.stringify(f??{},null,2)],{type:"application/json"}),b=URL.createObjectURL(a),c=document.createElement("a");c.href=b,c.download=`describe-${Date.now()}.json`,c.click(),URL.revokeObjectURL(b)},className:"px-3 py-1 border rounded text-sm",children:"Download JSON"}),(0,b.jsx)("button",{onClick:function(){sessionStorage.setItem("avidia:import:payload",JSON.stringify(f??{})),window.location.href="/dashboard/import"},className:"px-3 py-1 bg-indigo-600 text-white rounded text-sm",children:"Send to Import"})]})]}),(0,b.jsxs)("div",{className:"mt-3 flex flex-wrap gap-3 items-center border-t pt-3",children:[(0,b.jsx)("div",{className:"flex flex-wrap gap-3",children:[{id:"overview",label:"Overview"},{id:"features",label:"Features"},{id:"specs",label:"Specs"},{id:"links",label:"Links"},{id:"manuals",label:"Manuals"},{id:"seo",label:"SEO"},{id:"json",label:"Raw JSON"}].map(a=>(0,b.jsx)("button",{onClick:()=>h(a.id),className:`text-sm ${g===a.id?"font-semibold text-slate-900 dark:text-slate-50":"text-slate-500"}`,children:a.label},a.id))}),(0,b.jsxs)("div",{className:"ml-auto flex items-center gap-2",children:[(0,b.jsx)("span",{className:"text-xs text-slate-500",children:"View:"}),(0,b.jsx)("button",{onClick:()=>j("styled"),className:`text-xs px-2 py-1 border rounded ${"styled"===i?"font-semibold":""}`,children:"Styled"}),(0,b.jsx)("button",{onClick:()=>j("iframe"),className:`text-xs px-2 py-1 border rounded ${"iframe"===i?"font-semibold":""}`,children:"HTML Viewer"})]})]})]}),(0,b.jsx)("div",{className:"flex-1 min-h-0 overflow-y-auto p-4",children:"seo"===g?(0,b.jsxs)("div",{className:"space-y-3 text-sm",children:[(0,b.jsxs)("div",{children:[(0,b.jsx)("strong",{children:"H1:"})," ",q.h1||(0,b.jsx)("em",{className:"text-slate-500",children:"Not available"})]}),(0,b.jsxs)("div",{children:[(0,b.jsx)("strong",{children:"Page Title:"})," ",(q.pageTitle??q.title)||(0,b.jsx)("em",{className:"text-slate-500",children:"Not available"})]}),(0,b.jsxs)("div",{children:[(0,b.jsx)("strong",{children:"Meta Description:"}),(0,b.jsx)("div",{className:"mt-1 text-slate-600 dark:text-slate-300 whitespace-pre-wrap",children:q.metaDescription||(0,b.jsx)("em",{className:"text-slate-500",children:"Not available"})})]}),(0,b.jsxs)("div",{children:[(0,b.jsx)("strong",{children:"Search Keywords:"}),(0,b.jsx)("div",{className:"mt-1 text-slate-600 dark:text-slate-300",children:Array.isArray(q.keywords)?q.keywords.join(", "):q.keywords??(0,b.jsx)("em",{className:"text-slate-500",children:"Not available"})})]})]}):"json"===g?(0,b.jsx)("pre",{className:"text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded overflow-x-auto",children:JSON.stringify(f,null,2)}):"iframe"===i?(0,b.jsx)("iframe",{ref:l,title:"HTML Preview",className:"w-full block border-0 shadow-none rounded-none bg-transparent",style:{height:m},sandbox:"allow-scripts",scrolling:"no",srcDoc:(a=k.current,e=(d=r||"")?d.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,""):"",`<!doctype html>
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
    ${e}
  </div>

<script>
(function(){
  var TOKEN = ${JSON.stringify(a)};

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
</html>`)}):(0,b.jsx)("div",{className:"prose prose-slate max-w-none dark:prose-invert prose-h2:mt-5 prose-h3:mt-4 prose-li:my-0.5",dangerouslySetInnerHTML:{__html:r||"<em>No content available for this tab yet.</em>"}})})]}):(0,b.jsx)("div",{className:"bg-white dark:bg-slate-900 border rounded-lg p-6 shadow-sm",children:(0,b.jsx)("div",{className:"text-sm text-slate-500",children:"No generated description yet. Fill the form and click Generate."})})}a.s(["default",()=>d])}];

//# sourceMappingURL=src_components_describe_36d4e2a3._.js.map