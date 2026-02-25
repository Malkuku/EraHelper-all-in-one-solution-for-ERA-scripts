/**
 * 从正文中应用一次Mvu更新
 */
const updateMvuDataFromContent = async ()=>{
  await waitGlobalInitialized('Mvu');

  const mvu_data = Mvu.getMvuData({ type: 'message', message_id: -1 });
  const content = getChatMessages(-1)[0].message
  const new_data = await Mvu.parseMessage(content, mvu_data);

  await Mvu.replaceMvuData(new_data, { type: 'message', message_id: getLastMessageId() });
}


/**
 * 从指定文本中应用一次Mvu更新
 */
const updateMvuData = async (content : string) =>{
  await waitGlobalInitialized('Mvu');

  const mvu_data = Mvu.getMvuData({ type: 'message', message_id: -1 });
  const new_data = await Mvu.parseMessage(content, mvu_data);

  await Mvu.replaceMvuData(new_data, { type: 'message', message_id: getLastMessageId() });
}

/**
 * 将Mvu变量回滚到上一楼的
 */
const backUpMvuData = async ()=>{
  await waitGlobalInitialized('Mvu');

  const mvu_data = Mvu.getMvuData({ type: 'message', message_id: Math.max(0,getLastMessageId()-1) });
  if(mvu_data){
    await Mvu.replaceMvuData(mvu_data, { type: 'message', message_id: getLastMessageId() });
  }
}

export const MvuUtil = {
  updateMvuDataFromContent,
  updateMvuData,
  backUpMvuData
}

