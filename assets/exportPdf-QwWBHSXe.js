const y="SI Presensi - Pulsating Digital Enterprise",w=["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"],a=t=>String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"),$=t=>{if(!t)return"-";const e=new Date(t);return Number.isNaN(e.getTime())?String(t):`${String(e.getDate()).padStart(2,"0")} ${w[e.getMonth()]} ${e.getFullYear()}`},v=t=>{if(!t)return"-";const e=new Date(t);return Number.isNaN(e.getTime())?String(t):`${e.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})} WIB, ${$(e)}`},T=(t=new Date)=>{const e=new Date(t);return Number.isNaN(e.getTime())?new Date().toISOString().slice(0,10):e.toISOString().slice(0,10)},k=t=>Array.isArray(t)?t.find(Boolean)||"":t||"",A=t=>!t||typeof t!="object"?"":Object.entries(t).map(([e,i])=>`${e.replace(/[A-Z]/g,o=>"-"+o.toLowerCase())}:${i}`).join(";"),N=t=>t&&typeof t=="object"&&!Array.isArray(t)&&("image"in t||"images"in t),S=t=>{if(t&&typeof t=="object"&&!Array.isArray(t)){const e=t.className?` class="${a(t.className)}"`:"",i=t.style?` style="${a(A(t.style))}"`:"",o=t.text??"";if(N(t)){const s=t.image||k(t.images),l=s?`<div class="photo-box photo-box-has"><img src="${a(s)}" alt="Foto" /></div>`:'<div class="photo-box photo-box-empty"><span class="photo-na">-</span></div>',d=o!==""&&o!==null&&o!==void 0?`<div class="photo-caption">${a(o)}</div>`:"";return`<td class="cell cell-photo${e}"${i}>${l}${d}</td>`}const p=o!==""&&o!==null&&o!==void 0?`<div>${a(o)}</div>`:"";return`<td class="cell${e}"${i}>${p||"-"}</td>`}return`<td class="cell">${a(t===""||t===null||t===void 0?"-":t)}</td>`},D=(t=[])=>{const e=t.filter(i=>i&&i.label);return e.length?`
    <div class="meta-grid">
      ${e.map(i=>`
        <div class="meta-item">
          <span>${a(i.label)}</span>
          <strong>${a(i.value??"-")}</strong>
        </div>
      `).join("")}
    </div>
  `:""};function z({title:t,subtitle:e=y,columns:i,rows:o,fileName:m="laporan-presensi",orientation:p="landscape",meta:s=[],emptyText:l="Tidak ada data untuk dicetak.",footer:d="Dicetak dari Sistem Aplikasi Absensi Global SaaS"}){if(typeof window>"u")return!1;const r=window.open("","_blank","width=1400,height=900");if(!r||r.closed||typeof r.closed>"u")return!1;const c=Array.isArray(i)?i:[],g=Array.isArray(o)?o:[],f=c.map(n=>n.width?`<col style="width:${a(n.width)}" />`:"<col />").join(""),h=g.length?g.map((n,j)=>{const b=Array.isArray(n)?n:n.cells;return`<tr${n!=null&&n.className?` class="${a(n.className)}"`:""}>${(b||[]).map(S).join("")}</tr>`}).join(""):`<tr><td class="empty" colspan="${c.length||1}">${a(l)}</td></tr>`,x=v(new Date),u=`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${a(m)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap" rel="stylesheet" />
        <style>
          @page { size: A4 ${p}; margin: 8mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #000;
            background: #fff;
            font-family: Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .report-page { width: 100%; }
          .report-title {
            text-align: center;
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 3px;
            line-height: 1.2;
          }
          .report-subtitle {
            text-align: center;
            font-size: 10px;
            font-weight: 700;
            color: #555;
            margin-bottom: 8px;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 4px;
            margin: 0 0 7px;
          }
          .meta-item {
            border: 1px solid #777;
            padding: 4px 6px;
            min-height: 28px;
          }
          .meta-item span {
            display: block;
            font-size: 7px;
            font-weight: 700;
            color: #555;
            text-transform: uppercase;
          }
          .meta-item strong {
            display: block;
            font-size: 9px;
            margin-top: 1px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 1px solid #000;
          }
          th {
            background: #0070c0;
            color: #fff;
            border: 1px solid #000;
            padding: 6px 4px;
            font-size: 8px;
            line-height: 1.15;
            text-align: center;
            font-weight: 700;
            text-transform: uppercase;
          }
          td {
            border: 1px solid #000;
            padding: 5px 4px;
            font-size: 8px;
            line-height: 1.35;
            text-align: center;
            vertical-align: middle;
            word-break: break-word;
            white-space: pre-wrap;
          }
          tbody tr:nth-child(even) td { background: #f7f7f7; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .mono { font-family: Consolas, 'Courier New', monospace; }
          .status-done { font-weight: 700; }
          .cell-photo { vertical-align: middle; }
          .photo-box {
            width: 100%;
            height: 72px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .photo-box-has img {
            max-width: 100%;
            max-height: 68px;
            width: auto;
            height: auto;
            object-fit: contain;
            border: 1px solid #555;
            display: block;
          }
          .photo-box-empty {
            color: #999;
            font-size: 8px;
          }
          .photo-na { font-style: italic; }
          .photo-caption { font-size: 7px; color: #666; margin-top: 1px; }
          .empty {
            padding: 22px;
            font-size: 11px;
            color: #555;
          }
          .print-footer {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: 7px;
            font-size: 8px;
            color: #555;
          }
          .developer-watermark {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-top: 15px;
            margin-bottom: 5px;
            opacity: 0.85;
          }
          .developer-watermark .ornament {
            color: #0070c0;
            font-size: 10px;
            font-weight: bold;
            user-select: none;
          }
          .developer-watermark .watermark-text {
            font-family: 'Great Vibes', 'Brush Script MT', cursive;
            font-size: 16px;
            color: #000;
            font-weight: 500;
            white-space: nowrap;
          }
          @media print {
            body { margin: 0; }
            thead { display: table-header-group; }
            tr { break-inside: avoid; page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <main class="report-page">
          <h1 class="report-title">${a(t)}</h1>
          <div class="report-subtitle">${a(e)}</div>
          ${D(s)}
          <table>
            <colgroup>${f}</colgroup>
            <thead>
              <tr>${c.map(n=>`<th>${a(n.header||n)}</th>`).join("")}</tr>
            </thead>
            <tbody>${h}</tbody>
          </table>
          <div class="developer-watermark">
            <span class="ornament">✧══════════•❁❀❁•══════════✧</span>
            <span class="watermark-text">Developer Richard Meha</span>
            <span class="ornament">✧══════════•❁❀❁•══════════✧</span>
          </div>
          <div class="print-footer">
            <span>${a(d)}</span>
            <span>Generated: ${a(x)}</span>
          </div>
        </main>
        <script>
          window.onload = function () {
            setTimeout(function () { window.print(); }, 450);
          };
        <\/script>
      </body>
    </html>
  `;return r.document.write(u),r.document.close(),!0}export{z as e,T as f};
