(async ()=>{
  try{
    const res = await fetch('http://127.0.0.1:3000/api/risk/heatmap-db');
    const j = await res.json();
    const out = (j.features||[]).map(f=>({zoneId:f.properties.zoneId, zoneName:f.properties.zoneName, description:f.properties.description, explanation:f.properties.explanation}));
    console.log(JSON.stringify(out, null, 2));
  }catch(e){console.error(e)}
})();
