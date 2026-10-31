"use strict";
const menu = "filee-save-original";
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({id:menu,title:"Filee：原文件另存为… / Save original as…",contexts:["all"],documentUrlPatterns:["http://*/*","https://*/*"]});
});
async function status(tabId,text,title) {
  await chrome.action.setBadgeText({tabId,text});
  await chrome.action.setTitle({tabId,title});
}
chrome.action.onClicked.addListener(async tab => {
  try {
    if (!/^https?:/.test(tab.url || "")) throw new Error("Open a normal website first.");
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:["svg-drag.js"]});
    await status(tab.id,"ON","Ctrl + drag to Filee; right-click to save an original file.");
  } catch (error) { await status(tab.id,"!",error.message); }
});
chrome.contextMenus.onClicked.addListener(async (info,tab) => {
  if (info.menuItemId !== menu || !tab?.id) return;
  try {
    const result = await chrome.tabs.sendMessage(tab.id,{type:"filee-download-target"},{frameId:info.frameId || 0});
    if (!result || result.error) throw new Error(result?.error || "Refresh this page and try again.");
    if (!/^https?:\/\//i.test(result.url) && !/^data:image\//i.test(result.url)) throw new Error("Unsupported download address.");
    // Chrome owns the saved file and its history entry. Never supply a temporary path.
    await chrome.downloads.download({url:result.url, ...(result.filename ? {filename:result.filename} : {}),saveAs:true,conflictAction:"uniquify"});
    await status(tab.id,"","Download started. Check Chrome Downloads for completion.");
  } catch (error) { await status(tab.id,"!",error.message); }
});
