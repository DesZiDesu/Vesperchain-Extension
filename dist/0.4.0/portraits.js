// User-selected local rasters only. No model URLs, SVG, animated files, or remote requests.
const LIMIT = 6 * 1024 * 1024;
export function rasterSize(bytes) {
    const b = new Uint8Array(bytes), v = new DataView(bytes);
    if (b.length >= 24 && [137,80,78,71,13,10,26,10].every((x,i) => b[i] === x)) {
        // Reject APNG, whose animation is unnecessary for a portrait.
        let i = 8;
        while (i + 12 <= b.length) { const n = v.getUint32(i); if (String.fromCharCode(...b.slice(i+4,i+8)) === 'acTL') throw new Error('Animated images are not supported.'); i += 12 + n; }
        return [v.getUint32(16), v.getUint32(20)];
    }
    if (b[0] === 255 && b[1] === 216) {
        let i = 2;
        while (i + 4 < b.length) {
            if (b[i++] !== 255) break;
            while (b[i] === 255) i++;
            const marker = b[i++]; if (marker === 217 || marker === 218) break;
            const n = v.getUint16(i); if (n < 2 || i+n > b.length) break;
            if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && n >= 7) return [v.getUint16(i+5),v.getUint16(i+3)];
            i += n;
        }
    }
    throw new Error('Choose a valid PNG or JPEG image.');
}
export async function optimizePortrait(file, doc = document, chooseCrop = null) {
    if (!file || file.size > LIMIT || file.size === 0) throw new Error('Choose a PNG/JPEG up to 6 MB.');
    const bytes = await file.arrayBuffer(), [w,h] = rasterSize(bytes);
    if (!w || !h || w*h > 16000000 || w > 8192 || h > 8192) throw new Error('Portrait exceeds 16 megapixels or 8192 pixels per side.');
    const win = doc.defaultView, url = win.URL.createObjectURL(new win.Blob([bytes]));
    const img = new win.Image();
    try {
        img.src = url; await img.decode();
        const edge = Math.min(img.naturalWidth,img.naturalHeight);
        const crop = chooseCrop ? await chooseCrop(img) : {x:(img.naturalWidth-edge)/2,y:(img.naturalHeight-edge)/2,edge};
        if(!crop)return null;
        const canvas = doc.createElement('canvas'); canvas.width = canvas.height = 384;
        const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Image processing is unavailable.');
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img,crop.x,crop.y,crop.edge,crop.edge,0,0,384,384);
        const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/webp',0.9));
        if (!blob || blob.size > 200000) throw new Error('Portrait is too complex. Choose a smaller image.');
        return blob;
    } finally { img.src = ''; win.URL.revokeObjectURL(url); }
}
export function portraitStore(win = window) {
    let connection, generation = 0;
    const urls = new Map(), pending = new Map();
    async function db() {
        if (!connection) connection = new Promise((resolve,reject) => {
            const request = win.indexedDB.open('vesperchain-portraits',1);
            request.onupgradeneeded = () => request.result.createObjectStore('images');
            request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
        }).catch(error => { connection = null; throw error; });
        return connection;
    }
    async function transaction(mode, operation) {
        const database = await db();
        return new Promise((resolve,reject) => {
            const tx = database.transaction('images',mode), request = operation(tx.objectStore('images'));
            tx.oncomplete = () => resolve(request.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Portrait save was interrupted.'));
        });
    }
    function release() { generation++; for (const url of urls.values()) if (url) win.URL.revokeObjectURL(url); urls.clear(); pending.clear(); }
    return {
        async set(key,blob) { await transaction('readwrite',s => blob ? s.put(blob,key) : s.delete(key)); release(); },
        get: key => transaction('readonly',s => s.get(key)),
        async url(key) {
            if (urls.has(key)) return urls.get(key);
            if (!pending.has(key)) {
                const stamp = generation;
                let request;
                request = transaction('readonly',s => s.get(key)).then(blob => {
                if(stamp !== generation) return null;
                // Bound the live object URL cache. Images that decoded already remain painted.
                if (urls.size >= 64) { const oldest=urls.keys().next().value, old=urls.get(oldest); if(old)win.URL.revokeObjectURL(old); urls.delete(oldest); }
                const url=blob ? win.URL.createObjectURL(blob) : null; urls.set(key,url); return url;
                }).finally(()=>{if(pending.get(key)===request)pending.delete(key);});
                pending.set(key,request);
            }
            return pending.get(key);
        },
        release,
        async destroy() { release(); if(connection)(await connection).close(); },
    };
}
