// era-aware-sleep.ts

// let logResolve: (() => void) | null = null;
// //
// // /* ---------- 劫持 console.log（只劫持一次） ---------- */
// const rawLog = console.log;
// console.log = (...args: any[]) => {
//   rawLog(...args);
//   const msg = args.join(' ');
//   if (
//     msg.includes('ERA') &&
//     msg.includes('MacroParser') &&
//     msg.includes('handleGenerateAfterData')
//   ) {
//     console.log( 'ERA MacroParser，等待处理');
//     logResolve?.();   // 日志命中，立即放行
//     logResolve = null;
//   }
// };

/* ---------- 可提前唤醒的 sleep ---------- */
export function eraAwareSleep(ms: number): Promise<void> {
  return Promise.race([
    //new Promise<void>(r => { logResolve = r; }),          // 日志触发 //为了保证扩展性，暂时不对日志进行劫持
    new Promise<void>(r => setTimeout(r, ms)), // 兜底超时
  ]); //.finally(() => { logResolve = null; });
}
