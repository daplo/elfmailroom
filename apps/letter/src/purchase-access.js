export const purchaseId=()=>location.pathname.match(/\/purchase\/([^/]+)/)?.[1]||new URLSearchParams(location.search).get('order');
export function purchaseToken(id){
 const supplied=new URLSearchParams(location.hash.slice(1)).get('token');
 try{if(supplied&&/^[a-f0-9]{64}$/.test(supplied)){sessionStorage.setItem(`elf-access-${id}`,supplied);return supplied;}return sessionStorage.getItem(`elf-access-${id}`)||'';}catch{return supplied||'';}
}
export async function orderRequest(id,action='',data){
 const token=purchaseToken(id);
 return fetch(`/api/orders/${encodeURIComponent(id)}${action}`,{method:data?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
}
export async function orderApi(id,action='',data){const response=await orderRequest(id,action,data);const result=await response.json();if(!response.ok)throw new Error(result.error||'Please try again.');return result;}
