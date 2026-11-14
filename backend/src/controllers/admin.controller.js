const supabase = require('../config/supabase');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validPeriod(periodStart, periodEnd) {
    return typeof periodStart === 'string'
        && Number.isFinite(Date.parse(periodStart))
        && typeof periodEnd === 'string'
        && Number.isFinite(Date.parse(periodEnd))
        && Date.parse(periodEnd) > Date.parse(periodStart);
}

function mapSettlementError(error) {
    const statusByCode = {
        '22023': 400,
        '22003': 400,
        'P0002': 404,
        'P0001': 409,
        '23505': 409,
    };
    if (error && statusByCode[error.code]) {
        error.status = statusByCode[error.code];
    }
    return error;
}

async function resetVendorActivation(req, res, next) {
    try {
        const vendorId = String(req.params.vendorId || '');
        if (!UUID_RE.test(vendorId)) {
            return res.status(400).json({ error: 'A valid vendor ID is required.' });
        }
        const before = await supabase.from('vendors').select('id,activated_at').eq('id',vendorId).maybeSingle();
        if (before.error) throw before.error;
        const { data, error } = await supabase.rpc('admin_reset_vendor_activation', {
            p_vendor_id: vendorId,
            p_activated_at: new Date().toISOString(),
        });
        if (error) throw error;
        await writeAudit(req, 'vendor_reset_activation', 'vendor', vendorId, before.data, data, req.body?.reason);
        return res.json({ success: true, message: 'Vendor free-commission period reset.', vendor: data });
    } catch (error) {
        return next(error);
    }
}

async function getVendorSettlementSummary(req, res, next) {
    try {
        const vendorId = String(req.params.vendorId || '');
        const { period_start: periodStart, period_end: periodEnd } = req.query;

        if (!UUID_RE.test(vendorId)) {
            return res.status(400).json({ error: 'A valid vendor ID is required.' });
        }
        if (!validPeriod(periodStart, periodEnd)) {
            return res.status(400).json({ error: 'Provide a valid settlement period. The end must be after the start.' });
        }

        const start = new Date(periodStart).toISOString();
        const end = new Date(periodEnd).toISOString();
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id,total_price,service_fee,commission_amount,completed_at,settlement_due_at')
            .eq('vendor_id', vendorId)
            .eq('payment_method', 'cash')
            .eq('status', 'completed')
            .gte('completed_at', start)
            .lt('completed_at', end)
            .order('completed_at', { ascending: true });

        if (ordersError) throw ordersError;

        const orderIds = (orders || []).map((order) => order.id);
        let settlementLines = [];
        if (orderIds.length) {
            const { data, error } = await supabase
                .from('vendor_settlement_lines')
                .select('order_id,amount_kobo')
                .in('order_id', orderIds);
            if (error) throw error;
            settlementLines = data || [];
        }

        const settledByOrder = new Map();
        for (const line of settlementLines) {
            const amount = Number(line.amount_kobo);
            if (!Number.isSafeInteger(amount) || amount < 0) {
                throw new Error('A settlement ledger entry contains an invalid amount.');
            }
            const key = String(line.order_id);
            settledByOrder.set(key, (settledByOrder.get(key) || 0) + amount);
        }

        const orderSummaries = (orders || []).map((order) => {
            const serviceFee = Number(order.service_fee || 0);
            const commission = Number(order.commission_amount || 0);
            const settled = settledByOrder.get(String(order.id)) || 0;
            const outstanding = Math.max(0, serviceFee + commission - settled);
            return {
                order_id: order.id,
                completed_at: order.completed_at,
                settlement_due_at: order.settlement_due_at,
                gross_cash_collected_kobo: Number(order.total_price || 0),
                service_fee_kobo: serviceFee,
                commission_kobo: commission,
                already_settled_kobo: settled,
                outstanding_kobo: outstanding,
                overdue: outstanding > 0 && Boolean(order.settlement_due_at)
                    && Date.parse(order.settlement_due_at) < Date.now(),
            };
        });

        const totals = orderSummaries.reduce((sum, order) => ({
            gross_cash_collected_kobo: sum.gross_cash_collected_kobo + order.gross_cash_collected_kobo,
            service_fee_due_kobo: sum.service_fee_due_kobo + order.service_fee_kobo,
            commission_due_kobo: sum.commission_due_kobo + order.commission_kobo,
            already_settled_kobo: sum.already_settled_kobo + order.already_settled_kobo,
            outstanding_kobo: sum.outstanding_kobo + order.outstanding_kobo,
            overdue_orders: sum.overdue_orders + (order.overdue ? 1 : 0),
        }), {
            gross_cash_collected_kobo: 0,
            service_fee_due_kobo: 0,
            commission_due_kobo: 0,
            already_settled_kobo: 0,
            outstanding_kobo: 0,
            overdue_orders: 0,
        });

        if (Object.values(totals).some((value) => !Number.isSafeInteger(value) || value < 0)) {
            return res.status(422).json({ error: 'Settlement totals exceed the safe calculation range.' });
        }

        return res.json({
            success: true,
            vendor_id: vendorId,
            period_start: start,
            period_end: end,
            orders_count: orderSummaries.length,
            ...totals,
            orders: orderSummaries,
        });
    } catch (error) {
        return next(error);
    }
}

async function createVendorSettlement(req, res, next) {
    try {
        const vendorId = String(req.params.vendorId || '');
        if (!UUID_RE.test(vendorId)) {
            return res.status(400).json({ error: 'A valid vendor ID is required.' });
        }

        const periodStart = req.body?.period_start;
        const periodEnd = req.body?.period_end;
        const onlineOffset = req.body?.online_earnings_offset_kobo ?? 0;
        const cashRemitted = req.body?.cash_remitted_kobo ?? 0;
        const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 1000) : null;

        if (!validPeriod(periodStart, periodEnd)) {
            return res.status(400).json({ error: 'Provide a valid settlement period. The end must be after the start.' });
        }

        const validKoboAmount = (value) => Number.isSafeInteger(value) && value >= 0;
        if (!validKoboAmount(onlineOffset) || !validKoboAmount(cashRemitted)
            || onlineOffset + cashRemitted <= 0
            || !Number.isSafeInteger(onlineOffset + cashRemitted)) {
            return res.status(400).json({ error: 'Settlement amounts must be non-negative whole kobo amounts, with a positive total.' });
        }

        const { data, error } = await supabase.rpc('admin_create_vendor_settlement', {
            p_vendor_id: vendorId,
            p_period_start: new Date(periodStart).toISOString(),
            p_period_end: new Date(periodEnd).toISOString(),
            p_online_earnings_offset_kobo: onlineOffset,
            p_cash_remitted_kobo: cashRemitted,
            p_notes: notes,
        });
        if (error) throw mapSettlementError(error);

        await writeAudit(req, 'settlement_create', 'settlement', data?.settlement_id, null, data, notes);
        return res.status(201).json({ success: true, settlement: data });
    } catch (error) {
        return next(error);
    }
}



async function writeAudit(req, action, resourceType, resourceId, oldValue, newValue, reason=null) {
  const { error } = await supabase.from('admin_audit_logs').insert({
    actor_user_id:req.admin.id, actor_role:req.admin.profile.role, action,
    resource_type:resourceType, resource_id:resourceId==null?null:String(resourceId),
    old_value:oldValue??null,new_value:newValue??null,reason,
    request_id:req.headers['x-request-id']||null
  });
  if(error) throw error;
}
async function getDashboard(req,res,next){
 try{
  const range=String(req.query.range||'30d');const now=new Date();const start=new Date(now);
  if(range==='today')start.setHours(0,0,0,0);else if(range==='7d')start.setDate(start.getDate()-7);else if(range==='30d')start.setDate(start.getDate()-30);else if(range==='90d')start.setDate(start.getDate()-90);else return res.status(400).json({error:'range must be today, 7d, 30d or 90d'});
  const [orders,vendors,customers,pending,cashOrders]=await Promise.all([
   supabase.from('orders').select('id,vendor_id,customer_id,items,total_price,subtotal_price,service_fee,commission_amount,status,payment_method,created_at,completed_at,settlement_due_at').gte('created_at',start.toISOString()),
   supabase.from('vendors').select('id,business_name,verification_status,admin_suspended,created_at'),
   supabase.from('orders').select('customer_id').gte('created_at',start.toISOString()).not('customer_id','is',null),
   supabase.from('vendors').select('id',{count:'exact',head:true}).eq('verification_status','pending'),
   supabase.from('orders').select('id,service_fee,commission_amount,completed_at,settlement_due_at').eq('payment_method','cash').eq('status','completed')
  ]);
  for(const x of [orders,vendors,customers,pending,cashOrders])if(x.error)throw x.error;
  const list=orders.data||[],vs=vendors.data||[],completed=list.filter(o=>o.status==='completed');
  const uniqueCustomers=new Set((customers.data||[]).map(x=>x.customer_id));
  let newCustomers=0;for(let p=1;p<=5;p++){const u=await supabase.auth.admin.listUsers({page:p,perPage:1000});if(u.error)throw u.error;const users=u.data.users||[];newCustomers+=users.filter(x=>new Date(x.created_at)>=start&&(!x.user_metadata?.role||x.user_metadata?.role==='student')).length;if(users.length<1000)break;}
  const day=new Date();day.setHours(0,0,0,0);const week=new Date(day);week.setDate(week.getDate()-6);const month=new Date(now.getFullYear(),now.getMonth(),1);
  const countSince=d=>list.filter(o=>new Date(o.created_at)>=d).length;
  const sum=(a,k)=>a.reduce((n,o)=>n+Number(o[k]||0),0);
  const cashIds=(cashOrders.data||[]).map(o=>o.id);let settledLines=[];
  if(cashIds.length){const q=await supabase.from('vendor_settlement_lines').select('order_id,amount_kobo').in('order_id',cashIds);if(q.error)throw q.error;settledLines=q.data||[];}
  const settledBy=new Map();for(const l of settledLines)settledBy.set(l.order_id,(settledBy.get(l.order_id)||0)+Number(l.amount_kobo||0));
  const cashOwed=(cashOrders.data||[]).reduce((n,o)=>n+Math.max(0,Number(o.service_fee||0)+Number(o.commission_amount||0)-(settledBy.get(o.id)||0)),0);
  const seriesMap=new Map();for(const o of list){const date=o.created_at.slice(0,10),r=seriesMap.get(date)||{date,orders:0,revenue_kobo:0};r.orders++;if(o.status==='completed')r.revenue_kobo+=Number(o.subtotal_price??o.total_price??0);seriesMap.set(date,r);}
  const vendorRev=new Map();for(const o of completed)vendorRev.set(o.vendor_id,(vendorRev.get(o.vendor_id)||0)+Number(o.subtotal_price??o.total_price??0));
  const topVendors=vs.map(v=>({id:v.id,name:v.business_name,gmv_kobo:vendorRev.get(v.id)||0})).sort((a,b)=>b.gmv_kobo-a.gmv_kobo).slice(0,5);
  const itemMap=new Map();for(const o of completed){const lines=Array.isArray(o.items)?o.items:[];for(const item of lines){const nm=String(item.name||item.title||'Item');const qty=Number(item.qty||item.quantity||1);itemMap.set(nm,(itemMap.get(nm)||0)+qty);}}
  const topItems=[...itemMap.entries()].map(([name,quantity])=>({name,quantity})).sort((a,b)=>b.quantity-a.quantity).slice(0,5);
  const stats={orders_today:countSince(day),orders_week:countSince(week),orders_month:countSince(month),gmv_kobo:sum(completed,'subtotal_price')||sum(completed,'total_price'),service_fees_kobo:sum(completed,'service_fee'),commission_kobo:sum(completed,'commission_amount'),platform_profit_kobo:sum(completed,'service_fee')+sum(completed,'commission_amount'),active_vendors:vs.filter(v=>v.verification_status==='accepted'&&!v.admin_suspended).length,new_customers:newCustomers,pending_vendor_applications:pending.count||0,cash_owed_kobo:cashOwed};
  if(req.admin.profile.role==='support'){for(const key of ['gmv_kobo','service_fees_kobo','commission_kobo','platform_profit_kobo','cash_owed_kobo'])delete stats[key];}\n  return res.json({success:true,range,stats,series:[...seriesMap.values()].sort((a,b)=>a.date.localeCompare(b.date)),top_vendors:topVendors,top_items:topItems});
 }catch(e){return next(e);}
}
async function getAdminProfile(req,res,next){try{const {data,error}=await supabase.from('admin_profiles').update({last_login_at:new Date().toISOString()}).eq('user_id',req.admin.id).select('user_id,full_name,avatar_url,role,status,last_login_at,created_at').single();if(error)throw error;return res.json({success:true,profile:data,email:req.admin.email});}catch(e){return next(e);}}
async function listAuditLogs(req,res,next){try{const page=Math.max(1,Number(req.query.page)||1),limit=Math.min(100,Math.max(10,Number(req.query.limit)||25));const {data,error,count}=await supabase.from('admin_audit_logs').select('*',{count:'exact'}).order('created_at',{ascending:false}).range((page-1)*limit,page*limit-1);if(error)throw error;return res.json({success:true,data,total:count,page,limit});}catch(e){return next(e);}}
module.exports={resetVendorActivation,getVendorSettlementSummary,createVendorSettlement,getDashboard,getAdminProfile,listAuditLogs,writeAudit};
