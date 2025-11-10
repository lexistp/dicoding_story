import L from 'leaflet';
export function initMap(el,{center=[-6.2,106.816666],zoom=11}={}){
  const map=L.map(el,{scrollWheelZoom:true}).setView(center,zoom);
  const standard=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'});
  const humanitarian=L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors, HOT'});
  standard.addTo(map); L.control.layers({'OSM Standard':standard,'OSM Humanitarian':humanitarian}).addTo(map);
  setTimeout(()=>map.invalidateSize(),60); window.addEventListener('resize',()=>map.invalidateSize()); return map;
}