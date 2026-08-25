export async function onRequestGet(context) {
  if (!context.env.DB) {
    return Response.json({ ok:false, error:"D1 binding DB is missing." }, { status:500 });
  }
  try {
    const [players, teams, series] = await context.env.DB.batch([
      context.env.DB.prepare("SELECT COUNT(*) AS count FROM players"),
      context.env.DB.prepare("SELECT COUNT(*) AS count FROM teams"),
      context.env.DB.prepare("SELECT COUNT(*) AS count FROM series")
    ]);
    return Response.json({
      ok:true,
      build:"v58",
      actor_email:context.data.actorEmail,
      database:{
        players:Number(players.results?.[0]?.count || 0),
        teams:Number(teams.results?.[0]?.count || 0),
        series:Number(series.results?.[0]?.count || 0)
      }
    }, { headers:{ "cache-control":"no-store" } });
  } catch (err) {
    return Response.json({ ok:false, error:String(err?.message || err) }, { status:500 });
  }
}
