export default function LeaveHistoryModal({list,onClose}){

return(
<div style={{
 position:"fixed",
 inset:0,
 background:"rgba(17,24,39,0.45)",
 backdropFilter:"blur(8px)",
 display:"flex",
 alignItems:"center",
 justifyContent:"center",
 padding:16,
 zIndex:1000
}}>

<div style={{
 background:"var(--bg-card)",
 width:"80vw",
 height:"80vh",
 maxHeight:"80vh",
 borderRadius:12,
 boxShadow:"0 20px 60px rgba(0,0,0,0.18)",
 padding:24,
 overflow:"auto"
}}>

<h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:700,color:"var(--t-base)"}}>My Leave History</h3>

{list.map((l,i)=>(
<div key={i} style={{padding:"8px 0",borderBottom:"1px solid var(--border-soft)",fontSize:13,color:"var(--t-base)"}}>
{l.from} → {l.to} | {l.type}
</div>
))}

<button onClick={onClose} style={{
 marginTop:16,
 padding:"9px 18px",
 background:"var(--bg-muted)",
 border:"1px solid var(--border)",
 borderRadius:8,
 fontSize:13,
 fontWeight:600,
 color:"var(--t-muted)",
 cursor:"pointer"
}}>Close</button>

</div>
</div>
);
}
