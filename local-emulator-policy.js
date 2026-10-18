export function shouldUseLocalEmulators({hostname,search}={}){
 const localHost=hostname==='localhost'||hostname==='127.0.0.1'||hostname==='[::1]';
 return localHost&&new URLSearchParams(search||'').get('nexorEmulators')==='1';
}
