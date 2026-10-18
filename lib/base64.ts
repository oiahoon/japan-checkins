// Works in Node and browsers without shipping a Buffer shim to GitHub Pages.
export function encodeBase64(bytes:Uint8Array){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text)}
export function decodeBase64(text:string){const raw=atob(text.replace(/\s/g,'')),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
