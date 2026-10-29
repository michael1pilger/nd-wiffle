function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
const n=v=>Number(v||0);
function validLineScore(ls){
  if(!ls||typeof ls!=="object")return false;
  for(const key of ["away_runs","home_runs","away_hits","home_hits"]){
    if(!Array.isArray(ls[key])||ls[key].some(v=>!Number.isInteger(Number(v))||Number(v)<0))return false;
  }
  return true;
}
export async function onRequestPost(context){
  const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  let body;try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be valid JSON."},400)}
  const seriesId=String(body?.series_id||"").trim(),game=n(body?.game),actor=context.data.actorEmail||"unknown-access-user";
  if(!seriesId)return json({ok:false,error:"series_id is required."},400);
  if(body?.series_import!==true&&(!Number.isInteger(game)||game<1||game>7))return json({ok:false,error:"A valid game number is required."},400);
  try{
    const row=await DB.prepare("SELECT payload_json FROM series WHERE series_id=?").bind(seriesId).first();
    if(!row)return json({ok:false,error:"Published series not found."},404);
    let payload={};try{payload=JSON.parse(row.payload_json||"{}")}catch{return json({ok:false,error:"Published series payload is unreadable."},500)}
    const games=Array.isArray(payload.games)?payload.games:[];

    if(body?.series_import===true){
      const pdf=body.series_scorecard;
      if(!pdf||pdf.mime_type!=="application/pdf"||typeof pdf.base64!=="string"||!pdf.base64)return json({ok:false,error:"Series import requires one combined PDF."},422);
      if(Number(pdf.size||0)>5000000)return json({ok:false,error:"Combined series PDF exceeds the 5 MB limit."},422);
      if(!Array.isArray(body.games)||!body.games.length)return json({ok:false,error:"Series import requires reviewed game splits."},422);
      const media=Array.isArray(payload.game_media)?payload.game_media.map(x=>({...x})):[];
      let eventCount=0;
      for(const upd of body.games){
        const gno=n(upd?.game),official=games.find(g=>Number(g.game)===gno);
        if(!official)return json({ok:false,error:`Game ${gno} is not part of this published series.`},422);
        if(!validLineScore(upd.line_score))return json({ok:false,error:`Game ${gno}: reviewed line score is invalid.`},422);
        const ar=upd.line_score.away_runs.reduce((a,b)=>a+n(b),0),hr=upd.line_score.home_runs.reduce((a,b)=>a+n(b),0);
        if(ar!==n(official.away_score)||hr!==n(official.home_score))return json({ok:false,error:`Game ${gno}: imported line score ${ar}-${hr} does not match published final ${official.away_score}-${official.home_score}.`},422);
        const pbp=Array.isArray(upd.play_by_play)?upd.play_by_play.map(x=>({text:String(x?.text??x??"").trim().slice(0,500)})).filter(x=>x.text):[];
        if(pbp.length>500)return json({ok:false,error:`Game ${gno}: play-by-play is limited to 500 events.`},422);
        eventCount+=pbp.length;
        const idx=media.findIndex(x=>Number(x.game)===gno),current=idx>=0?media[idx]:{game:gno},next={...current,game:gno,line_score:upd.line_score,play_by_play:pbp};
        if(idx>=0)media[idx]=next;else media.push(next);
      }
      media.sort((a,b)=>Number(a.game)-Number(b.game));payload.game_media=media;
      payload.series_scorecard={filename:String(pdf.filename||"series-scorecard.pdf").slice(0,180),mime_type:"application/pdf",size:Number(pdf.size||0),base64:pdf.base64};
      await DB.batch([
        DB.prepare("UPDATE series SET payload_json=?,updated_at=CURRENT_TIMESTAMP WHERE series_id=?").bind(JSON.stringify(payload),seriesId),
        DB.prepare("INSERT INTO import_history(series_id,action,actor_email,payload_json) VALUES(?,?,?,?)").bind(seriesId,"series_media_import",actor,JSON.stringify({series_id:seriesId,games_updated:body.games.length,play_by_play_events:eventCount,series_scorecard:true}))
      ]);
      return json({ok:true,series_id:seriesId,games_updated:body.games.length,play_by_play_events:eventCount,series_scorecard_available:true,actor_email:actor});
    }

    if(!games.some(g=>Number(g.game)===game))return json({ok:false,error:`Game ${game} is not part of this published series.`},422);

    const media=Array.isArray(payload.game_media)?payload.game_media.map(x=>({...x})):[];
    const idx=media.findIndex(x=>Number(x.game)===game),current=idx>=0?media[idx]:{game};
    const next={...current,game};

    if(Object.prototype.hasOwnProperty.call(body,"scorecard")&&body.scorecard){
      const pdf=body.scorecard;
      if(pdf.mime_type!=="application/pdf"||typeof pdf.base64!=="string"||!pdf.base64)return json({ok:false,error:"Scorecard must be a PDF with embedded file data."},422);
      if(Number(pdf.size||0)>2000000)return json({ok:false,error:"Scorecard PDF exceeds the 2 MB per-game limit."},422);
      next.scorecard={filename:String(pdf.filename||`scorecard-game-${game}.pdf`).slice(0,180),mime_type:"application/pdf",size:Number(pdf.size||0),base64:pdf.base64};
    }
    if(Object.prototype.hasOwnProperty.call(body,"line_score")&&body.line_score){
      if(!validLineScore(body.line_score))return json({ok:false,error:"Line-score data is invalid."},422);
      next.line_score=body.line_score;
    }
    if(Object.prototype.hasOwnProperty.call(body,"play_by_play")){
      if(!Array.isArray(body.play_by_play))return json({ok:false,error:"play_by_play must be an array."},422);
      if(body.play_by_play.length>500)return json({ok:false,error:"Play-by-play is limited to 500 events per game."},422);
      next.play_by_play=body.play_by_play.map(x=>({text:String(x?.text??x??"").trim().slice(0,500)})).filter(x=>x.text);
    }
    if(idx>=0)media[idx]=next;else media.push(next);
    media.sort((a,b)=>Number(a.game)-Number(b.game));payload.game_media=media;

    await DB.batch([
      DB.prepare("UPDATE series SET payload_json=?,updated_at=CURRENT_TIMESTAMP WHERE series_id=?").bind(JSON.stringify(payload),seriesId),
      DB.prepare("INSERT INTO import_history(series_id,action,actor_email,payload_json) VALUES(?,?,?,?)").bind(seriesId,"media_update",actor,JSON.stringify({series_id:seriesId,game,scorecard_updated:!!body.scorecard,line_score_updated:!!body.line_score,play_by_play_events:Array.isArray(body.play_by_play)?body.play_by_play.length:null}))
    ]);
    return json({ok:true,series_id:seriesId,game,actor_email:actor,scorecard_available:!!next.scorecard?.base64,line_score_available:!!next.line_score,play_by_play_events:(next.play_by_play||[]).length});
  }catch(err){return json({ok:false,error:"Game Center update failed.",detail:String(err?.message||err)},500)}
}
