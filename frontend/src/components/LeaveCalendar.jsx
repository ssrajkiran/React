import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function LeaveCalendar({ onSelect }) {

 const [range,setRange]=useState([]);

 const handleChange = value => {

  if(Array.isArray(value) && value.length===2){

   const from=formatLocal(value[0]);
   const to=formatLocal(value[1]);

   const days =
    Math.floor(
     (strip(value[1]) - strip(value[0])) / (1000*60*60*24)
    ) + 1;

   onSelect(from,to,days);
  }

  // single day click
  if(!Array.isArray(value)){
   const d=formatLocal(value);
   onSelect(d,d,1);
  }

  setRange(value);
 };

 return(
 <Calendar
  selectRange
  onChange={handleChange}
  value={range}
 />
 );
}

/* ---------- helpers ---------- */

// convert Date → YYYY-MM-DD (LOCAL, not UTC)
function formatLocal(d){
 const y=d.getFullYear();
 const m=String(d.getMonth()+1).padStart(2,"0");
 const day=String(d.getDate()).padStart(2,"0");
 return `${y}-${m}-${day}`;
}

// remove time portion
function strip(d){
 return new Date(d.getFullYear(),d.getMonth(),d.getDate());
}
