// "Hosted" = the online copy (Vercel / GitHub Pages): no server, nothing saved, sheet music decrypted
// in the browser. Detected from the address, so no build settings are needed on the host:
// the Mac version only ever runs on 127.0.0.1 / localhost.
const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];
export const HOSTED = import.meta.env.VITE_HOSTED === 'true' || !LOCAL_HOSTS.includes(location.hostname);
