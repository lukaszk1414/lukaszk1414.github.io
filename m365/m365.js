const LINKS=[
{title:'Microsoft 365 Admin Center',url:'https://admin.microsoft.com'},
{title:'Microsoft Entra Admin Center',url:'https://entra.microsoft.com'},
{title:'Azure Portal',url:'https://portal.azure.com'},
{title:'Intune Admin Center',url:'https://intune.microsoft.com'},
{title:'Exchange Admin Center',url:'https://admin.exchange.microsoft.com'}
];

const el=id=>document.getElementById(id);

function clock(){
  const d=new Date();
  el('clock').textContent=d.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
  el('datePretty').textContent=d.toLocaleDateString('pl-PL');
}
setInterval(clock,1000);clock();

function renderLinks(){
  const root=el('tiles');
  LINKS.forEach(l=>{
    const a=document.createElement('a');
    a.className='tileLink';
    a.href=l.url;a.target='_blank';
    a.textContent=l.title;
    root.appendChild(a);
  });
}
renderLinks();

async function weather(){
  const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude=52.23&longitude=21.01&current=temperature_2m,weather_code&timezone=Europe/Warsaw');
  const j=await r.json();
  el('temp').textContent=Math.round(j.current.temperature_2m)+'°';
  el('kpiWeather').textContent=el('temp').textContent;
}
weather();
