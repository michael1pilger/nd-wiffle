import {json,deleteSession,clearSessionCookie} from "../_account.js";
export async function onRequestPost(context){await deleteSession(context);return json({ok:true},200,{"set-cookie":clearSessionCookie()})}
