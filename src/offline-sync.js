import { addStory, toast } from './api/index.js';
import { readOutbox, removeOutbox } from './idb.js';

export async function trySyncOutbox(){
  try{
    if(!navigator.onLine) return;
    const items = await readOutbox();
    for(const it of items){
      try{
        await addStory({ description: it.description, file: it.file, lat: it.lat, lon: it.lon });
        await removeOutbox(it._id);
        try{ toast('Story offline tersinkron.', true); }catch{}
      }catch{}
    }
  }catch{}
}

export function setupOutboxSync(){
  try{ window.addEventListener('online', ()=> { trySyncOutbox(); }); }catch{}
}

