export default function({list,onClose}){

return(
<div style={{
 position:"fixed",
 inset:0,
 background:"#0008"
}}>

<div style={{
 background:"#fff",
 margin:"10%",
 padding:20
}}>

<h3>My Leave History</h3>

{list.map((l,i)=>(
<div key={i}>
{l.from} → {l.to} | {l.type}
</div>
))}

<button onClick={onClose}>Close</button>

</div>
</div>
);
}
