export function rng(n){return()=>{n|=0;n=n+0x6D2B79F5|0;let t=Math.imul(n^n>>>15,1|n);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

export const truth=x=>.56*Math.sin(2.6*x)+.17*x;
export function generateDataset(seed=7,noise=.2){const r=rng(seed);const train=Array.from({length:20},(_,i)=>{const x=-.98+i*1.96/19;return{x,y:truth(x)+(r()-.5)*noise*3}});const test=Array.from({length:45},()=>{const x=r()*2-1;return{x,y:truth(x)+(r()-.5)*noise*3}});return {train,test};}

export function fitPolynomial(train,d,reg){let n=d+1,A=Array.from({length:n},()=>Array(n).fill(0)),b=Array(n).fill(0);train.forEach(p=>{let v=Array.from({length:n},(_,j)=>p.x**j);for(let i=0;i<n;i++){b[i]+=v[i]*p.y/train.length;for(let j=0;j<n;j++)A[i][j]+=v[i]*v[j]/train.length}});for(let i=0;i<n;i++)A[i][i]+=(i?reg:0)+1e-9;for(let i=0;i<n;i++){let k=i;for(let j=i+1;j<n;j++)if(Math.abs(A[j][i])>Math.abs(A[k][i]))k=j;[A[i],A[k]]=[A[k],A[i]];[b[i],b[k]]=[b[k],b[i]];let p=A[i][i];for(let j=i;j<n;j++)A[i][j]/=p;b[i]/=p;for(let k=0;k<n;k++)if(k!==i){let f=A[k][i];for(let j=i;j<n;j++)A[k][j]-=f*A[i][j];b[k]-=f*b[i]}}return x=>b.reduce((v,w,j)=>v+w*x**j,0)}

export const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
export function median(values){const sorted=[...values].sort((a,b)=>a-b);const i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2;}
export function classificationMetrics(scores,threshold){let tp=0,fp=0,fn=0;for(const s of scores){const positive=s.p>=threshold;if(positive&&s.positive)tp++;if(positive&&!s.positive)fp++;if(!positive&&s.positive)fn++;}return {tp,fp,fn,precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null};}
