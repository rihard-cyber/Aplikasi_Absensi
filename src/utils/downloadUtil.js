export const downloadCSV = (data, filename) => {
  if (!data || !data.length) {
    alert('Tidak ada data untuk diunduh.');
    return;
  }
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(r => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};
