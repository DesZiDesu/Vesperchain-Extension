// Temporary local crop session. Only the final 384px raster is persisted.
export function choosePortraitCrop(img, dialog, l) {
    const doc=dialog.ownerDocument, win=doc.defaultView;
    return new Promise(resolve=>{
        const panel=doc.createElement('div');panel.className='vc-crop-editor';
        panel.innerHTML=`<p>${l('ลากภาพเพื่อจัดตำแหน่ง · ใช้สองนิ้วบีบเพื่อซูม','Drag to position · Pinch with two fingers to zoom')}</p><canvas width="512" height="512" tabindex="0" aria-label="${l('จัดภาพ: ลากหรือบีบซูม ใช้ปุ่มลูกศรขยับ และบวกหรือลบซูม','Crop: drag or pinch; arrow keys move, plus/minus zoom')}"></canvas><label class="vc-crop-slider">${l('ซูม','Zoom')}<input type="range" min="1" max="5" step="0.01" value="1"></label><div class="vc-crop-actions"><button type="button" data-crop-reset>${l('เริ่มใหม่','Reset')}</button><button type="button" data-crop-cancel>${l('ยกเลิก','Cancel')}</button><button type="button" data-crop-save>${l('ใช้ภาพนี้','Use image')}</button></div>`;
        dialog.querySelector('[data-npc-image]').closest('label').after(panel);
        const canvas=panel.querySelector('canvas'), ctx=canvas.getContext('2d'), slider=panel.querySelector('input');
        if(!ctx){panel.remove();resolve(null);return;}
        const base=Math.min(img.naturalWidth,img.naturalHeight), points=new Map(), abort=new win.AbortController();
        let zoom=1,x=img.naturalWidth/2,y=img.naturalHeight/2,raf=0,done=false;
        const listen=(n,event,fn,options={})=>n.addEventListener(event,fn,{...options,signal:abort.signal});
        function constrain(){const h=base/zoom/2;x=Math.max(h,Math.min(img.naturalWidth-h,x));y=Math.max(h,Math.min(img.naturalHeight-h,y));}
        function draw(){raf=0;const edge=base/zoom;ctx.clearRect(0,0,512,512);ctx.drawImage(img,x-edge/2,y-edge/2,edge,edge,0,0,512,512);}
        function update(){constrain();slider.value=zoom;canvas.dataset.zoom=zoom;canvas.dataset.x=x;canvas.dataset.y=y;if(!raf)raf=win.requestAnimationFrame(draw);}
        function finish(value){if(done)return;done=true;abort.abort();observer.disconnect();if(raf)win.cancelAnimationFrame(raf);points.clear();panel.remove();resolve(value);}
        const observer=new win.MutationObserver(()=>{if(!dialog.isConnected || !panel.isConnected)finish(null);});observer.observe(doc.body,{childList:true,subtree:true});
        listen(dialog,'close',()=>finish(null));listen(dialog,'cancel',()=>finish(null));
        const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};
        const geometry=()=>{const p=[...points.values()];return p.length>1?{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}:{...p[0],d:0};};
        listen(canvas,'pointerdown',e=>{if(e.button!==0 || points.size>=2)return;e.preventDefault();points.set(e.pointerId,point(e));canvas.setPointerCapture(e.pointerId);});
        listen(canvas,'pointermove',e=>{if(!points.has(e.pointerId))return;e.preventDefault();const before=geometry(),oldEdge=base/zoom;points.set(e.pointerId,point(e));const after=geometry();if(before.d>0&&after.d>0)zoom=Math.max(1,Math.min(5,zoom*after.d/before.d));const edge=base/zoom;x+=(before.x-.5)*oldEdge-(after.x-.5)*edge;y+=(before.y-.5)*oldEdge-(after.y-.5)*edge;update();});
        for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(canvas,event,e=>points.delete(e.pointerId));
        listen(canvas,'wheel',e=>{e.preventDefault();zoom=Math.max(1,Math.min(5,zoom*Math.exp(-e.deltaY*.002)));update();},{passive:false});
        listen(canvas,'keydown',e=>{const step=base/zoom*.04;if(e.key==='ArrowLeft')x+=step;else if(e.key==='ArrowRight')x-=step;else if(e.key==='ArrowUp')y+=step;else if(e.key==='ArrowDown')y-=step;else if(['+','='].includes(e.key))zoom=Math.min(5,zoom*1.1);else if(e.key==='-')zoom=Math.max(1,zoom/1.1);else return;e.preventDefault();update();});
        listen(slider,'input',()=>{zoom=Number(slider.value);update();});
        listen(panel.querySelector('[data-crop-reset]'),'click',()=>{zoom=1;x=img.naturalWidth/2;y=img.naturalHeight/2;update();});
        listen(panel.querySelector('[data-crop-cancel]'),'click',()=>finish(null));
        listen(panel.querySelector('[data-crop-save]'),'click',()=>{const edge=base/zoom;finish({x:x-edge/2,y:y-edge/2,edge});});
        update();panel.scrollIntoView({block:'nearest'});
    });
}
