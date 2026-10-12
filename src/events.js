// Dates without a valid calendar day remain upcoming until manually archived.
export function isPastPerformance(event, now = new Date()) {
 if(event.archived===true)return true;
 const match=String(event.date||'').match(/^(\d{4})[-.年/](\d{1,2})[-.月/](\d{1,2})(?:日|$|\s)/);
 if(!match)return false;
 const [,y,m,d]=match.map(Number);const date=new Date(Date.UTC(y,m-1,d));
 if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return false;
 const today=new Date(now.getTime()+9*60*60*1000).toISOString().slice(0,10);
 return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`<today;
}
