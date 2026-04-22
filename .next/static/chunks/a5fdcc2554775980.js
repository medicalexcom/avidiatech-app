(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,233525,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"warnOnce",{enumerable:!0,get:function(){return o}});let o=e=>{}},491915,(e,t,r)=>{"use strict";function o(e,t={}){if(t.onlyHashChange)return void e();let r=document.documentElement;if("smooth"!==r.dataset.scrollBehavior)return void e();let i=r.style.scrollBehavior;r.style.scrollBehavior="auto",t.dontForceLayout||r.getClientRects(),e(),r.style.scrollBehavior=i}Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"disableSmoothScrollDuringRouteTransition",{enumerable:!0,get:function(){return o}}),e.r(233525)},563491,e=>{"use strict";var t=e.i(843476),r=e.i(271645);function o({error:o,reset:i}){return(0,r.useEffect)(()=>{try{e.A(45990).then(({captureException:e})=>{e(o)})}catch(e){}console.error("[GlobalError]",o)},[o]),(0,t.jsxs)("html",{lang:"en",children:[(0,t.jsxs)("head",{children:[(0,t.jsx)("title",{children:"Something went wrong — AvidiaTech"}),(0,t.jsx)("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),(0,t.jsx)("style",{children:`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #0f172a;
            color: #f1f5f9;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          .card {
            max-width: 480px;
            width: 100%;
            text-align: center;
          }
          .icon {
            width: 56px;
            height: 56px;
            margin: 0 auto 1.5rem;
          }
          h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
          p  { font-size: 0.9375rem; color: #94a3b8; line-height: 1.6; margin-bottom: 1.75rem; }
          .digest {
            font-size: 0.75rem;
            color: #475569;
            font-family: monospace;
            margin-bottom: 1.5rem;
          }
          button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: #6366f1;
            color: #fff;
            border: none;
            border-radius: 10px;
            padding: 0.6rem 1.5rem;
            font-size: 0.9375rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 150ms ease;
          }
          button:hover { background: #4f46e5; }
          .bar {
            position: fixed;
            top: 0; left: 0; right: 0;
            height: 3px;
            background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #0ea5e9 100%);
          }
        `})]}),(0,t.jsxs)("body",{children:[(0,t.jsx)("div",{className:"bar"}),(0,t.jsxs)("div",{className:"card",children:[(0,t.jsxs)("svg",{className:"icon",viewBox:"0 0 56 56",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[(0,t.jsx)("defs",{children:(0,t.jsxs)("linearGradient",{id:"ge-g",x1:"0",y1:"0",x2:"1",y2:"1",children:[(0,t.jsx)("stop",{offset:"0%",stopColor:"#ef4444"}),(0,t.jsx)("stop",{offset:"100%",stopColor:"#b91c1c"})]})}),(0,t.jsx)("rect",{x:"7",y:"7",width:"42",height:"42",rx:"8",transform:"rotate(45 28 28)",fill:"url(#ge-g)",opacity:"0.15"}),(0,t.jsx)("rect",{x:"7",y:"7",width:"42",height:"42",rx:"8",transform:"rotate(45 28 28)",stroke:"#ef4444",strokeWidth:"1.5",fill:"none"}),(0,t.jsx)("path",{d:"M28 18v14",stroke:"#ef4444",strokeWidth:"2.5",strokeLinecap:"round"}),(0,t.jsx)("circle",{cx:"28",cy:"37",r:"1.5",fill:"#ef4444"})]}),(0,t.jsx)("h1",{children:"Something went wrong"}),(0,t.jsx)("p",{children:"An unexpected error occurred at the application level. Our team has been notified automatically. Please try reloading the page."}),o?.digest&&(0,t.jsxs)("p",{className:"digest",children:["Error ID: ",o.digest]}),(0,t.jsxs)("button",{onClick:i,children:[(0,t.jsxs)("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round",children:[(0,t.jsx)("path",{d:"M13 2.5A6.5 6.5 0 1 1 3.2 5.5"}),(0,t.jsx)("path",{d:"M3 2l.2 3.5L6.5 4"})]}),"Try again"]})]})]})]})}e.s(["default",()=>o])},45990,e=>{e.v(t=>Promise.all(["static/chunks/28edab1047c4f0de.js","static/chunks/6b15057c74c891cb.js","static/chunks/6ce3b3c27c087c99.js"].map(t=>e.l(t))).then(()=>t(146523)))}]);