// Fetches a protected file with the Bearer token, converts to a blob URL, and triggers a browser
// download by clicking a hidden anchor. Needed because <a href> cannot attach an Authorization header.
export async function downloadAuthenticated(url: string, filename: string): Promise<void> {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
