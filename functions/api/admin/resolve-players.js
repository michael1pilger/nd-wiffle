
function json(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}
const clean=v=>String(v||"").trim();
function key(v){
  return clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}
function levenshtein(a,b){
  a=key(a);b=key(b);
  if(a===b)return 0;
  if(!a.length)return b.length;
  if(!b.length)return a.length;
  const prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    let diag=prev[0];prev[0]=i;
    for(let j=1;j<=b.length;j++){
      const old=prev[j];
      prev[j]=Math.min(prev[j]+1,prev[j-1]+1,diag+(a[i-1]===b[j-1]?0:1));
      diag=old;
    }
  }
  return prev[b.length];
}
function similarity(a,b){
  const A=key(a),B=key(b);
  if(!A||!B)return 0;
  if(A===B)return 1;
  const dist=levenshtein(A,B);
  const edit=1-dist/Math.max(A.length,B.length);
  const at=new Set(A.split(" ")),bt=new Set(B.split(" "));
  const inter=[...at].filter(x=>bt.has(x)).length;
  const token=inter/Math.max(at.size,bt.size,1);
  return Math.max(edit, token*0.92);
}
function plausible(uploaded,candidate){
  const A=key(uploaded),B=key(candidate);
  const score=similarity(A,B);
  const dist=levenshtein(A,B);
  const firstA=A.split(" ")[0]||"",firstB=B.split(" ")[0]||"";
  const lastA=A.split(" ").slice(-1)[0]||"",lastB=B.split(" ").slice(-1)[0]||"";
  return score>=0.72 || dist<=2 || (lastA===lastB && similarity(firstA,firstB)>=0.55);
}

export async function onRequestPost(context){
  const DB=context.env.DB;
  if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  let body;
  try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be valid JSON."},400)}
  const incoming=Array.isArray(body.names)?body.names.map(clean).filter(Boolean):[];
  const unique=[...new Map(incoming.map(n=>[key(n),n])).values()];
  if(unique.length>100)return json({ok:false,error:"Too many player names in one request."},400);

  try{
    const [playersRes,aliasesRes]=await DB.batch([
      DB.prepare("SELECT player_id,name,class_year,retired FROM players ORDER BY name"),
      DB.prepare(`
        SELECT pa.alias,pa.player_id,p.name,p.class_year,p.retired
        FROM player_aliases pa JOIN players p ON p.player_id=pa.player_id
      `)
    ]);
    const players=playersRes.results||[];
    const exact=new Map(players.map(p=>[key(p.name),p]));
    const aliases=new Map((aliasesRes.results||[]).map(a=>[key(a.alias),a]));
    const results=unique.map(uploaded_name=>{
      const k=key(uploaded_name);
      const ex=exact.get(k);
      if(ex)return {
        uploaded_name,status:"exact",player_id:ex.player_id,canonical_name:ex.name,
        class_year:ex.class_year,retired:ex.retired,candidates:[]
      };
      const al=aliases.get(k);
      if(al)return {
        uploaded_name,status:"alias",player_id:al.player_id,canonical_name:al.name,
        class_year:al.class_year,retired:al.retired,candidates:[]
      };
      const candidates=players
        .map(p=>({...p,score:similarity(uploaded_name,p.name)}))
        .filter(p=>plausible(uploaded_name,p.name))
        .sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name))
        .slice(0,3)
        .map(p=>({player_id:p.player_id,name:p.name,class_year:p.class_year,retired:p.retired,score:Number(p.score.toFixed(3))}));
      return {uploaded_name,status:candidates.length?"similar":"new",candidates};
    });
    return json({ok:true,build:"v48",results});
  }catch(err){
    return json({ok:false,error:"Player registry lookup failed.",detail:String(err?.message||err)},500);
  }
}
