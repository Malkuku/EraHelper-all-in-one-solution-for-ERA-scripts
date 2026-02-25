/**
 * 从正文中应用一次Mvu更新
 */
const updateMvuDataFromContent = async ()=>{
  await waitGlobalInitialized('Mvu');

  const mvu_data = Mvu.getMvuData({ type: 'message', message_id: -1 });
  const content = getChatMessages(-1)[0].message
  const new_data = await Mvu.parseMessage(content, mvu_data);
  if(new_data){
    await Mvu.replaceMvuData(new_data, { type: 'message', message_id: getLastMessageId() });
    await eventEmit(Mvu.events.VARIABLE_UPDATE_ENDED,new_data,mvu_data);
  }
}


/**
 * 从指定文本中应用一次Mvu更新
 */
const updateMvuData = async (content : string) =>{
  await waitGlobalInitialized('Mvu');

  const mvu_data = Mvu.getMvuData({ type: 'message', message_id: -1 });
  const new_data = await Mvu.parseMessage(content, mvu_data);
  if(new_data){
    await Mvu.replaceMvuData(new_data, { type: 'message', message_id: getLastMessageId() });
    await eventEmit(Mvu.events.VARIABLE_UPDATE_ENDED,new_data,mvu_data);
  }

}

/**
 * 将Mvu变量回滚到上一楼的
 */
const backUpMvuData = async ()=>{
  await waitGlobalInitialized('Mvu');
  const old_data = Mvu.getMvuData({ type: 'message', message_id: -1 });
  const mvu_data = Mvu.getMvuData({ type: 'message', message_id: Math.max(0,getLastMessageId()-1) });
  if(mvu_data){
    await Mvu.replaceMvuData(mvu_data, { type: 'message', message_id: getLastMessageId() });
    await eventEmit(Mvu.events.VARIABLE_UPDATE_ENDED,mvu_data,old_data);
  }
}

/**
 * 通过变量对象覆盖更新Mvu变量
 */
const updateMvuDataByObj = async(obj: object) => {
  const mvuData = Mvu.getMvuData({ type: 'message', message_id: -1 });
  const newData = mvuData;
  newData.stat_data = obj;
  if(newData){
    await Mvu.replaceMvuData(newData, { type: 'message', message_id: getLastMessageId() });
    await eventEmit(Mvu.events.VARIABLE_UPDATE_ENDED,newData,mvuData);
  }
}

export const MvuUtil = {
  updateMvuDataFromContent,
  updateMvuData,
  backUpMvuData,
  updateMvuDataByObj
}

