/** Database-backed Cravio admin authorization. */
const supabase=require('../config/supabase');
async function verifyAdmin(req,res,next){
 const header=req.headers.authorization||'';if(!header.startsWith('Bearer '))return res.status(401).json({error:'Authentication required'});
 try{const {data,error}=await supabase.auth.getUser(header.slice(7).trim());if(error||!data?.user)return res.status(401).json({error:'Invalid session'});
 const {data:profile,error:profileError}=await supabase.from('admin_profiles').select('user_id,full_name,avatar_url,role,status').eq('user_id',data.user.id).maybeSingle();
 if(profileError)return next(profileError);if(!profile||profile.status!=='active')return res.status(403).json({error:'Active Cravio admin access required'});
 req.admin={...data.user,profile};return next();}catch(e){return next(e);}
}
function requireSuperAdmin(req,res,next){if(req.admin?.profile?.role!=='super_admin')return res.status(403).json({error:'Super Admin permission required'});return next();}
module.exports={verifyAdmin,requireSuperAdmin};