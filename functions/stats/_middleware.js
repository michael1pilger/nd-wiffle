function transformStats(response){
  const transformed=new HTMLRewriter()
    .on('body',{
      element(el){
        el.append('<script src="/assets/stats-pitching-rates.js?v=171"></script>',{html:true});
      }
    })
    .transform(response);

  const headers=new Headers(transformed.headers);
  headers.set('cache-control','no-store');
  return new Response(transformed.body,{
    status:transformed.status,
    statusText:transformed.statusText,
    headers
  });
}

export async function onRequest(context){
  const response=await context.next();
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  return transformStats(response);
}
