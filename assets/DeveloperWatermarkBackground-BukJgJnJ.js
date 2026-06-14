import{j as e}from"./motion-Drq5vYCG.js";import{r as m}from"./react-C3wRtmh0.js";function g({theme:l="dark"}){const[a,i]=m.useState(()=>{try{return localStorage.getItem("tenant_name")||"ABSENSI"}catch{return"ABSENSI"}});m.useEffect(()=>{try{const t=localStorage.getItem("tenant_name");t&&i(t)}catch{}const r=setInterval(()=>{try{const t=localStorage.getItem("tenant_name");t&&t!==a&&i(t)}catch{}},2e3);return()=>clearInterval(r)},[a]);const d=(r=>{if(!r||r==="Memuat...")return"SAAS";let t=r.replace(/^(PT\.?|CV\.?|UD\.?)\s+/i,"").trim();if(t.length>10){const n=t.split(/\s+/);if(n.length>1){const s=n.filter(o=>!["dan","&","of","the","bersama","jaya","indonesia"].includes(o.toLowerCase())).map(o=>o.charAt(0)).join("").toUpperCase();if(s.length>=2)return s}return n[0].toUpperCase()}return t.toUpperCase()})(a);return e.jsxs("div",{className:`watermark-bg-container theme-${l}`,children:[e.jsx("style",{children:`
        .watermark-bg-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
          user-select: none;
        }
        @keyframes watermark-drift {
          0% { transform: translate3d(5vw, 5vh, 0); }
          25% { transform: translate3d(45vw, 15vh, 0); }
          50% { transform: translate3d(10vw, 60vh, 0); }
          75% { transform: translate3d(48vw, 40vh, 0); }
          100% { transform: translate3d(5vw, 5vh, 0); }
        }
        .ukiran-watermark {
          position: fixed;
          left: 0;
          top: 0;
          animation: watermark-drift 60s ease-in-out infinite;
          text-align: center;
          font-family: 'Consolas', monospace;
          pointer-events: none;
          user-select: none;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          width: 340px;
          padding: 1rem;
          border-radius: 12px;
          transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        
        .theme-dark .ukiran-watermark {
          color: #00ffff;
          box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.15);
          border: 1px solid rgba(0, 255, 255, 0.2);
          background: rgba(13, 19, 36, 0.45);
          opacity: 0.12;
        }
        .theme-dark .ukiran-logo-text {
          color: #00ffff;
          font-size: 1.45rem;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
          -webkit-text-stroke: 0.6px rgba(0, 0, 0, 0.8);
        }
        .theme-dark .ukiran-sub-text {
          font-size: 0.75rem;
          letter-spacing: 0.22em;
          color: #c7d2fe;
          font-weight: bold;
          -webkit-text-stroke: 0.3px rgba(0, 0, 0, 0.5);
        }
        .theme-dark .ukiran-ornament-top, .theme-dark .ukiran-ornament-bottom {
          font-size: 1.05rem;
          color: #00ffff;
          letter-spacing: 0.1em;
          font-weight: bold;
          -webkit-text-stroke: 0.6px rgba(0, 0, 0, 0.8);
        }

        .theme-light .ukiran-watermark {
          color: #1e3a8a;
          box-shadow: inset 0 0 12px rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.15);
          background: rgba(255, 255, 255, 0.5);
          opacity: 0.08;
        }
        .theme-light .ukiran-logo-text {
          color: #1e3a8a;
          font-size: 1.45rem;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
          -webkit-text-stroke: 0.6px rgba(255, 255, 255, 0.9);
        }
        .theme-light .ukiran-sub-text {
          font-size: 0.75rem;
          letter-spacing: 0.22em;
          color: #2563eb;
          font-weight: bold;
          -webkit-text-stroke: 0.3px rgba(255, 255, 255, 0.7);
        }
        .theme-light .ukiran-ornament-top, .theme-light .ukiran-ornament-bottom {
          font-size: 1.05rem;
          color: #2563eb;
          letter-spacing: 0.1em;
          font-weight: bold;
          -webkit-text-stroke: 0.6px rgba(255, 255, 255, 0.9);
        }

        @media (max-width: 768px) {
          .ukiran-watermark {
            width: 260px;
            padding: 0.5rem;
          }
          .theme-dark .ukiran-logo-text, .theme-light .ukiran-logo-text {
            font-size: 1.15rem;
            letter-spacing: 0.12em;
          }
          .theme-dark .ukiran-sub-text, .theme-light .ukiran-sub-text {
            font-size: 0.65rem;
            letter-spacing: 0.12em;
          }
          .theme-dark .ukiran-ornament-top, .theme-dark .ukiran-ornament-bottom,
          .theme-light .ukiran-ornament-top, .theme-light .ukiran-ornament-bottom {
            font-size: 0.85rem;
          }
          @keyframes watermark-drift {
            0% { transform: translate3d(5vw, 5vh, 0); }
            25% { transform: translate3d(25vw, 15vh, 0); }
            50% { transform: translate3d(5vw, 55vh, 0); }
            75% { transform: translate3d(28vw, 35vh, 0); }
            100% { transform: translate3d(5vw, 5vh, 0); }
          }
        }
      `}),e.jsxs("div",{className:"ukiran-watermark",children:[e.jsx("div",{className:"ukiran-ornament-top",children:"◤━━━━ ❖ ━━━━◥"}),e.jsx("div",{className:"ukiran-logo-text",children:"DEVELOPER: RICHARD MEHA"}),e.jsxs("div",{className:"ukiran-sub-text",children:["★ ",d," SECURITY CORE ARCHITECT ★"]}),e.jsx("div",{className:"ukiran-ornament-bottom",children:"◣━━━━ ❖ ━━━━◢"})]})]})}export{g as D};
