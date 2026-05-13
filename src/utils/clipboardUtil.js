export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const success = document.execCommand('copy');
      document.body.removeChild(ta);
      if (success) return true;
    } catch {}
    try {
      const div = document.createElement('div');
      div.style.position = 'fixed';
      div.style.bottom = '20px';
      div.style.left = '50%';
      div.style.transform = 'translateX(-50%)';
      div.style.zIndex = '999999';
      div.style.background = '#1A1C23';
      div.style.border = '1px solid rgba(255,255,255,0.1)';
      div.style.borderRadius = '16px';
      div.style.padding = '16px 24px';
      div.style.maxWidth = '90vw';
      div.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5)';
      div.style.color = '#fff';
      div.style.fontSize = '12px';
      div.style.fontFamily = 'monospace';
      div.style.textAlign = 'center';
      div.innerHTML = `<div style="font-weight:bold;margin-bottom:8px;color:#00C9FF;font-size:10px;text-transform:uppercase;letter-spacing:0.2em">KODE TIDAK BISA DISALIN OTOMATIS</div><div style="margin-bottom:12px;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;word-break:break-all;font-size:13px">${text}</div><div style="color:rgba(255,255,255,0.5);font-size:10px">Silakan salin manual dari kode di atas</div>`;
      document.body.appendChild(div);
      setTimeout(() => document.body.removeChild(div), 8000);
      return false;
    } catch {}
    return false;
  }
};
