// Reserve readable space for every asset; distribute the rest by absolute net return.
export function returnMosaic(items,width,height) {
  if(!items.length||width<=0||height<=0) return [];
  const total=items.reduce((sum,item)=>sum+Math.abs(item.net??0),0);
  const nodes=items.map((item,index)=>({...item,index,weight:total ? .6/items.length+.4*Math.abs(item.net??0)/total : 1/items.length}))
    .sort((a,b)=>b.weight-a.weight||a.index-b.index)
    .map(item=>({...item,area:item.weight*width*height}));
  const rectangles=[];
  let box={x:0,y:0,w:width,h:height},row=[];
  const worst=(entries,side)=>{
    if(!entries.length) return Infinity;
    const sum=entries.reduce((s,n)=>s+n.area,0),min=Math.min(...entries.map(n=>n.area)),max=Math.max(...entries.map(n=>n.area));
    return Math.max(side*side*max/(sum*sum),sum*sum/(side*side*min));
  };
  function place(entries){
    const area=entries.reduce((sum,n)=>sum+n.area,0);
    if(box.w>=box.h){
      const w=area/box.h;let y=box.y;
      entries.forEach(n=>{const h=n.area/w;rectangles.push({...n,x:box.x,y,w,h});y+=h;});
      box={...box,x:box.x+w,w:Math.max(0,box.w-w)};
    }else{
      const h=area/box.w;let x=box.x;
      entries.forEach(n=>{const w=n.area/h;rectangles.push({...n,x,y:box.y,w,h});x+=w;});
      box={...box,y:box.y+h,h:Math.max(0,box.h-h)};
    }
  }
  for(const node of nodes){
    const side=Math.min(box.w,box.h);
    if(row.length&&worst([...row,node],side)>worst(row,side)){place(row);row=[];}
    row.push(node);
  }
  if(row.length)place(row);
  return rectangles;
}
