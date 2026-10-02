import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, type ChartEvent, type ActiveElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
ChartJS.register(CategoryScale,LinearScale,BarElement,PointElement,LineElement,ArcElement,Tooltip,Legend);
const palette=['#143b63','#2d6fae','#f36a22','#1f8a63','#6c55ab','#dca03a','#4c9da6','#9c6b57'];
type Series={label:string;values:number[]};
export function Chart({labels,values,kind='bar',onSelect,series}:{labels:string[];values:number[];kind?:'bar'|'line'|'doughnut';onSelect?:(index:number)=>void;series?:Series[]}){
  const data={labels,datasets:series?series.map((s,i)=>({label:s.label,data:s.values,backgroundColor:palette[i%palette.length],borderColor:palette[i%palette.length],borderWidth:2,tension:.25})): [{label:'Cases',data:values,backgroundColor:kind==='doughnut'?palette:'#2d6fae',borderColor:'#2d6fae',borderWidth:kind==='line'?2:0,tension:.25}]};
  const options={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:kind==='doughnut'||Boolean(series),position:'bottom' as const}},onClick:(_event:ChartEvent,elements:ActiveElement[])=>{if(elements[0])onSelect?.(elements[0].index);}, ...(kind==='doughnut'?{}:{scales:{y:{beginAtZero:true,ticks:{precision:0}},x:{grid:{display:false}}}})};
  return <div className="chart">{kind==='doughnut'?<Doughnut data={data} options={options}/>:kind==='line'?<Line data={data} options={options}/>:<Bar data={data} options={options}/>}</div>;
}
