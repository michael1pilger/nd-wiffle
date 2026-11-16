// Spring League must use a separate D1 binding. Do not fall back to the fall DB.
export function requireSpringDb(context){
  const db=context?.env?.SPRING_DB;
  if(!db){
    const err=new Error('SPRING_DB binding is not configured. Spring League data is intentionally isolated from the primary ND Wiffle career database.');
    err.code='SPRING_DB_NOT_CONFIGURED';
    throw err;
  }
  return db;
}
