export default function({list,onClose}){

return(
<div style={{
 position:"fixed",
 inset:0,
 background:"rgba(17,24,39,0.45)",
 backdropFilter:"blur(2px)",
 display:"flex",
 alignItems:"center",
 justifyContent:"center",
 padding:16,
 zIndex:1000
}}>

<div style={{
 background:"#fff",
 width:"80%",
 maxWidth:520,
 maxHeight:"calc(100vh - 32px)",
 borderRadius:12,
 boxShadow:"0 20px 60px rgba(0,0,0,0.18)",
 padding:24,
 overflow:"auto"
}}>

<h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:700}}>My Leave History</h3>

{list.map((l,i)=>(
<div key={i} style={{padding:"8px 0",borderBottom:"1px solid #E5E7EB",fontSize:13}}>
{l.from} → {l.to} | {l.type}
</div>
))}

<button onClick={onClose} style={{
 marginTop:16,
 padding:"9px 18px",
 background:"#fff",
 border:"1px solid #E5E7EB",
 borderRadius:8,
 fontSize:13,
 fontWeight:600,
 color:"#6B7280",
 cursor:"pointer"
}}>Close</button>

</div>
</div>
);
}
