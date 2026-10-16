function json(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}

const clean=v=>String(v??"").trim();

async function schemaReady(DB){
  try{
    await DB.prepare("SELECT 1 FROM graphic_templates LIMIT 1").first();
    return true;
  }catch{
    return false;
  }
}

function validDocument(doc){
  if(!doc || typeof doc!=="object")return "Template document is required.";
  if(!doc.canvas || typeof doc.canvas!=="object")return "Template canvas is missing.";
  if(!Array.isArray(doc.elements))return "Template elements are missing.";
  const w=Number(doc.canvas.width),h=Number(doc.canvas.height);
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<100||h<100||w>5000||h>5000)return "Invalid canvas size.";
  if(doc.elements.length>300)return "A template may contain at most 300 elements.";
  return "";
}

export async function onRequestGet(context){
  const DB=context.env.DB;
  if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  if(!(await schemaReady(DB)))return json({
    ok:false,
    code:"GRAPHICS_SCHEMA_MISSING",
    error:"Graphics template storage is not installed. Run migrations/0026_graphic_templates.sql on this D1 database."
  },503);

  const id=clean(new URL(context.request.url).searchParams.get("id"));
  try{
    if(id){
      const row=await DB.prepare(`
        SELECT template_id,name,document_json,created_at,updated_at,updated_by
        FROM graphic_templates
        WHERE template_id=?
      `).bind(id).first();
      if(!row)return json({ok:false,error:"Template not found."},404);
      let document;
      try{document=JSON.parse(row.document_json)}catch{return json({ok:false,error:"Stored template JSON is invalid."},500)}
      return json({ok:true,template:{
        template_id:row.template_id,
        name:row.name,
        document,
        created_at:row.created_at,
        updated_at:row.updated_at,
        updated_by:row.updated_by||null
      }});
    }

    const res=await DB.prepare(`
      SELECT template_id,name,created_at,updated_at,updated_by,
             length(document_json) AS document_bytes
      FROM graphic_templates
      ORDER BY updated_at DESC,name COLLATE NOCASE
    `).all();
    return json({ok:true,templates:res.results||[]});
  }catch(err){
    return json({ok:false,error:"Graphics template query failed.",detail:String(err?.message||err)},500);
  }
}

export async function onRequestPost(context){
  const DB=context.env.DB;
  if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  if(!(await schemaReady(DB)))return json({
    ok:false,
    code:"GRAPHICS_SCHEMA_MISSING",
    error:"Graphics template storage is not installed. Run migrations/0026_graphic_templates.sql on this D1 database."
  },503);

  let body;
  try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be valid JSON."},400)}
  const action=clean(body.action||"save");
  const actor=context.data.actorEmail||"unknown-access-user";

  try{
    if(action==="delete"){
      const id=clean(body.template_id);
      if(!id)return json({ok:false,error:"template_id is required."},422);
      await DB.prepare("DELETE FROM graphic_templates WHERE template_id=?").bind(id).run();
      return json({ok:true,action:"deleted",template_id:id});
    }

    if(action!=="save")return json({ok:false,error:"Unsupported graphics template action."},400);
    const name=clean(body.name);
    if(name.length<1||name.length>120)return json({ok:false,error:"Template name must be 1–120 characters."},422);
    const docError=validDocument(body.document);
    if(docError)return json({ok:false,error:docError},422);
    const document_json=JSON.stringify(body.document);
    if(document_json.length>2000000)return json({ok:false,error:"Template is too large to save. Remove or reduce embedded images."},413);

    let id=clean(body.template_id);
    if(id){
      const exists=await DB.prepare("SELECT template_id FROM graphic_templates WHERE template_id=?").bind(id).first();
      if(!exists)return json({ok:false,error:"Template not found. Use Save As to create a new template."},404);
      await DB.prepare(`
        UPDATE graphic_templates
        SET name=?,document_json=?,updated_at=CURRENT_TIMESTAMP,updated_by=?
        WHERE template_id=?
      `).bind(name,document_json,actor,id).run();
    }else{
      id=`gt_${crypto.randomUUID()}`;
      await DB.prepare(`
        INSERT INTO graphic_templates(template_id,name,document_json,updated_by)
        VALUES(?,?,?,?)
      `).bind(id,name,document_json,actor).run();
    }

    const row=await DB.prepare(`
      SELECT template_id,name,created_at,updated_at,updated_by
      FROM graphic_templates WHERE template_id=?
    `).bind(id).first();
    return json({ok:true,action:"saved",template:row});
  }catch(err){
    return json({ok:false,error:"Graphics template update failed.",detail:String(err?.message||err)},500);
  }
}
