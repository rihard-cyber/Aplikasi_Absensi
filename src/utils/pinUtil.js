export const generatePin = (id) => {
  if (!id || id === 'all') return '999999';
  let hash = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let pinStr = Math.abs(hash).toString();
  while (pinStr.length < 6) pinStr += '0';
  return pinStr.substring(0, 6);
};
