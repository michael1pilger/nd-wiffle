function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
const n=v=>Number(v||0);
export async function onRequestGet(context){
  const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  const url=new URL(context.request.url),seriesId=url.searchParams.get("series")||"",game=n(url.searchParams.get("game"));
  if(!seriesId||!Number.isInteger(game)||game<1||game>7)return json({ok:false,error:"series and game are required."},400);
  try{
    const row=await DB.prepare("SELECT payload_json FROM series WHERE series_id=?").bind(seriesId).first();
    if(!row)return json({ok:false,error:"Series not found."},404);
    let payload={};try{payload=JSON.parse(row.payload_json||"{}")}catch{}
    const media=(payload.game_media||[]).find(x=>Number(x.game)===game),pdf=media?.scorecard;
    if(!pdf?.base64)return json({ok:false,error:"No scorecard PDF was uploaded for this game."},404);
    const bin=atob(String(pdf.base64)),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    const filename=String(pdf.filename||`scorecard-game-${game}.pdf`).replace(/[\r\n"]/g,"");
    return new Response(bytes,{status:200,headers:{"content-type":"application/pdf","content-disposition":`inline; filename="${filename}"`,"cache-control":"public, max-age=300"}});
  }catch(err){return json({ok:false,error:"Scorecard lookup failed.",detail:String(err?.message||err)},500)}
}
