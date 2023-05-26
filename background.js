// background.js console.log only appears in its console, not in the current web page.

/* global */


//chrome.storage.local.clear();

const AuthURL = "https://chat.openai.com/api/auth/session";


let authReceived = false;
console.log ("Background script loaded");


chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) 
{
	if (changeInfo.status == "complete")
	if (tab.url != null && tab.url.includes("https://chat.openai.com/"))
	{
		chrome.tabs.sendMessage(tabId, 
			{
				type: "at_chat_openai",
				url: tab.url
			});

	}
});

// Get the auth token to be able to list and scan the conversations by its Id
chrome.webRequest.onBeforeSendHeaders.addListener ( function(details) 
{
	// we need it only once, isn't it?
	if (authReceived) return;

	for (var i = 0; i < details.requestHeaders.length; ++i) 
	{
		if (details.requestHeaders[i].name === 'Authorization') 
		{
			chrome.storage.local.set( { authToken : details.requestHeaders[i].value })
			authReceived=true;

			chrome.tabs.sendMessage (details.tabId,{ type: "authReceived" });
			console.log ("Auth token received ",details.url)

			// will remove the listener, this will work once per browser session, isn't it?
			chrome.webRequest.onBeforeSendHeaders.removeListener(arguments.callee);
			break;
		}
	}
	},
	{urls: ["https://chat.openai.com/*"]},
	['requestHeaders']
);

chrome.commands.onCommand.addListener(function(command)
{
	if (command == "toogle_root_collapse") 
	{
		chrome.tabs.query ({active: true, currentWindow: true}, function (tabs)
		{
			chrome.tabs.sendMessage (tabs[0].id,{ type: "command", command : command });
		});
		
	}
});




