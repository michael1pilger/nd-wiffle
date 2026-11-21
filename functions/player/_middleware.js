function rewriteHofToV169(response){
  const transformed=new HTMLRewriter()
    .on('script[src^="/assets/hof.js"]',{element(el){el.setAttribute('src','/assets/hof.js?v=169')}})
    .transform(response);
  const headers=new Headers(transformed.headers);headers.set('cache-control','no-store');
  return new Response(transformed.body,{status:transformed.status,statusText:transformed.statusText,headers});
}
export async function onRequest(context){
  const response=await context.next(),type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  return rewriteHofToV169(response);
}
