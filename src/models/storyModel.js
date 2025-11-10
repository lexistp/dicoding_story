import { fetchStories } from '../api/index.js';

export class StoryModel{
  constructor(size=15){ this.size=size; }
  async fetchPage({page=1, location=1, nocache=false}){
    const data = await fetchStories({page, size:this.size, location, nocache});
    const list = data.listStory || [];
    return { list, hasMore: list.length === this.size };
  }
}
