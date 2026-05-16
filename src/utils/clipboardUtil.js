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
      const title = document.createElement('div');
      title.textContent = 'KODE TIDAK BISA DISALIN OTOMATIS';
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '8px';
      title.style.color = '#00C9FF';
      title.style.fontSize = '10px';
      title.style.textTransform = 'uppercase';
      title.style.letterSpacing = '0.2em';
      const code = document.createElement('div');
      code.textContent = text;
      code.style.marginBottom = '12px';
      code.style.padding = '8px';
      code.style.background = 'rgba(255,255,255,0.05)';
      code.style.borderRadius = '8px';
      code.style.wordBreak = 'break-all';
      code.style.fontSize = '13px';
      const help = document.createElement('div');
      help.textContent = 'Silakan salin manual dari kode di atas';
      help.style.color = 'rgba(255,255,255,0.5)';
      help.style.fontSize = '10px';
      div.append(title, code, help);
      document.body.appendChild(div);
      setTimeout(() => document.body.removeChild(div), 8000);
      return false;
    } catch {}
    return false;
  }
};
