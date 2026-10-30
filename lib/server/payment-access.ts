import {db} from './db';
import {hasPermission} from './permissions';
export function canAccessPaymentOrder(order:any,user:any,sessionId:unknown){
  if(user&&hasPermission(user.role,'view_orders'))return true;
  if(user?.email&&order.customer_email&&user.email.toLowerCase()===order.customer_email.toLowerCase())return true;
  if(user?.id&&order.customer_id&&db.prepare('SELECT id FROM customers WHERE id=? AND user_id=?').get(order.customer_id,user.id))return true;
  return typeof sessionId==='string'&&sessionId.length>=10&&!!order.session_id&&sessionId===order.session_id;
}
