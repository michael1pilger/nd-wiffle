const enc=new TextEncoder();
const dec=new TextDecoder();
const ITERATIONS=100000;
const SESSION_DAYS=30;

export function json(body,status=200,extra={}){
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...extra}});
}
function b64(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
function unb64(s){s=String(s||"").replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
function randomToken(bytes=32){const a=new Uint8Array(bytes);crypto.getRandomValues(a);return b64(a)}
async function sha256Text(v){const d=await crypto.subtle.digest("SHA-256",enc.encode(String(v)));return b64(new Uint8Array(d))}
async function derive(password,salt,iterations=ITERATIONS){
  const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:unb64(salt),iterations:Number(iterations||ITERATIONS)},key,256);
  return b64(new Uint8Array(bits));
}
function safeEqual(a,b){const x=enc.encode(String(a)),y=enc.encode(String(b));if(x.length!==y.length)return false;let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0}
export async function makePassword(password){const salt=randomToken(16),hash=await derive(password,salt,ITERATIONS);return {salt,hash,iterations:ITERATIONS}}
export async function verifyPassword(password,row){const hash=await derive(password,row.password_salt,row.password_iterations);return safeEqual(hash,row.password_hash)}
function cookies(request){const out={};for(const part of String(request.headers.get("cookie")||"").split(";")){const i=part.indexOf("=");if(i>0)out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim())}return out}
export async function getUser(context){
  const DB=context.env.DB;if(!DB)return null;const token=cookies(context.request).ndw_session;if(!token)return null;
  const hash=await sha256Text(token),row=await DB.prepare(`
    SELECT ua.user_id,ua.player_id,ua.display_name,ua.account_type,ua.email,ua.token_balance,ua.starter_tokens_granted,ua.active,
           COALESCE(p.name,ua.display_name,ua.email) AS player_name,
           COALESCE(p.name,ua.display_name,ua.email) AS account_name,
           p.class_year,tr.team_id,t.display_name AS team_name,us.expires_at
    FROM user_sessions us JOIN user_accounts ua ON ua.user_id=us.user_id
    LEFT JOIN players p ON p.player_id=ua.player_id
    LEFT JOIN team_rosters tr ON tr.player_id=ua.player_id AND tr.season=2026
    LEFT JOIN teams t ON t.team_id=tr.team_id
    WHERE us.session_hash=? AND datetime(us.expires_at)>datetime('now') AND ua.active=1
  `).bind(hash).first();
  return row||null;
}
export async function requireUser(context){const user=await getUser(context);if(!user)return {user:null,response:json({ok:false,error:"Login required."},401)};return {user,response:null}}
export async function createSession(DB,userId){
  const token=randomToken(32),hash=await sha256Text(token),expires=new Date(Date.now()+SESSION_DAYS*86400000).toISOString();
  await DB.batch([
    DB.prepare("DELETE FROM user_sessions WHERE datetime(expires_at)<=datetime('now')"),
    DB.prepare("INSERT INTO user_sessions(session_hash,user_id,expires_at) VALUES(?,?,?)").bind(hash,userId,expires)
  ]);
  return {token,expires};
}
export async function deleteSession(context){const token=cookies(context.request).ndw_session;if(!token||!context.env.DB)return;const hash=await sha256Text(token);await context.env.DB.prepare("DELETE FROM user_sessions WHERE session_hash=?").bind(hash).run()}
export function sessionCookie(token,maxAge=SESSION_DAYS*86400){return `ndw_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`}
export function clearSessionCookie(){return "ndw_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"}
export function normalizeEmail(v){return String(v||"").trim().toLowerCase()}
