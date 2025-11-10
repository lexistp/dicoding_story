import { StoryModel } from '../models/storyModel.js';

export class HomePresenter{
  constructor(){ this.model = new StoryModel(15); }

  async load({page=1, location=1, nocache=false}){
    return this.model.fetchPage({page, location, nocache});
  }

  makeFilter({keyword='', onlyLoc=true, timeFilter='all'}){
    const kw = String(keyword||'').toLowerCase();
    const now = Date.now();
    return (s)=>{
      const match=(s.name||'').toLowerCase().includes(kw)||(s.description||'').toLowerCase().includes(kw);
      const hasLoc=typeof s.lat==='number'&&typeof s.lon==='number';
      let timeOk=true;
      if(timeFilter!=='all'){ const days=parseInt(timeFilter,10); timeOk=(now - new Date(s.createdAt).getTime()) <= days*24*60*60*1000; }
      return match && (!onlyLoc || hasLoc) && timeOk;
    };
  }

  async globalSearch({filter, onlyLoc=true, isCanceled}){
    const results=[]; const size=this.model.size;
    for(let p=1;;p++){
      if(typeof isCanceled==='function' && isCanceled()) return null;
      const { list } = await this.model.fetchPage({page:p, location: onlyLoc?1:0});
      for(const s of list){ if(filter(s)) results.push(s); }
      if(list.length < size) break;
    }
    return results;
  }
}
