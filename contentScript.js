/* global DirectoryItemManager, GTools, ContextMenu, displayDirectoryItems, BackendData, Constants */
/* global addDragHandlers */


let directoryItems = null;
let backendData = null;

(
	()=>
	{
		init();

		chrome.runtime.onMessage.addListener(async (obj, sender, sendResponse) =>
		{
			// load the root folder
			if (directoryItems == null)
			{
				directoryItems = new DirectoryItemManager();
				await directoryItems.loadDirectoryItems();
			}

			// deconstruct parameters
			const { type,url } = obj;

			console.log ("Current chat is ",url);

			switch (type)
			{
				case "at_chat_openai": onNewChatGPTWindow(); break;
				case "authReceived": onAuthReceived(); break;
				case "command": onCommandReceived (obj.command); break;

			}
		});

		function onCommandReceived (cmd)
		{
			switch (cmd)
			{
				case "toogle_root_collapse": return rootCollapse();
			}

			function rootCollapse()
			{
				let root = directoryItems.getRoot();
				let rootElement = document.getElementById ("folder_"+root.folderId);
				let innerOL = rootElement.parentNode.querySelector ("ol");
				GTools.toggleCollapse (innerOL);
			}

		}

		async function init ()
		{
			backendData = new BackendData();

			// work first with the cached data
			await backendData.loadCachedConversationData();
			await backendData.loadMiscData();
			observeChatList (document.body);
			displayDirectoryItems ();
		}

		async function onAuthReceived()
		{
			// now load it remotely
			await backendData.downloadConversationData()

			console.log ("auth received");

			// modify the chats, adding an ID for them (it's been already done, it will fill the new chats)
			observeChatList (document.body);

			// finally populate folders again (should fix this, as it's already been populated now?)
			displayDirectoryItems();
		}


		function onNewChatGPTWindow()
		{
			GTools.easyObserver (mainObserverFunc);
		}


		// All functions that modify the DOM go here.
		function mainObserverFunc(element)
		{
			//console.log ("mainObserverFunc",element);
			
			// note: those functions will be changing the DOM at their own pace
			insertModelOnBottom (document.body);
			createOurNavBar (document.body);
			displayDirectoryItems();

			observeChatList();
		}

		function observeChatList(newElement)
		{
			// never return true, as chat list must always be observed
			if (backendData?.conversationData == null) return false;

			const chatList = document.querySelectorAll ("a.flex.py-3.px-3.items-center.gap-3.relative");
			if (chatList == null || chatList.length == 0)  return false;

			for (let chat of chatList)
			{
				// for each present chat
				// make it draggable
				chat.setAttribute ("draggable",true);

				// get its title
				const innerDiv = chat.querySelector ("div");
				const innerText = innerDiv.innerText;

				// search the title in the backendData
				// Fixme: if two conversations have the same title, this will only work for the first one
				const found = backendData.conversationData.find (item => item.title == innerText);

				// if found, add the ID to the chat
				if (found != null)
				{
					if (backendData.getConversationById (found.id) == null) console.log ("ERROR: backendData.getConversationById (found.id) is null");
					
					chat.setAttribute (Constants.DraggableId,"aiChat_"+found.id);
					addDragHandlers (chat);
				}
			}

			return false;
		}

		
		function insertModelOnBottom(newElement)
		{
			// model already on the bottom, do nothing
			if (newElement.querySelector ("#ourModelText") != null) return true;

			// search for the model on the top (it may not be present)
			// there's probably a better way, but I haven't coded in JS for 20 years.
			let modelNameElement = newElement.querySelector(".flex.items-center.justify-center.gap-1.border-b.border-black\\/10.bg-gray-50.p-3.text-gray-500.dark\\:border-gray-900\\/50.dark\\:bg-gray-700.dark\\:text-gray-300");
			let modelNameElement2 = document.querySelector(".flex.items-center.justify-center.gap-1.border-b.border-black\\/10.bg-gray-50.p-3.text-gray-500.dark\\:border-gray-900\\/50.dark\\:bg-gray-700.dark\\:text-gray-300");
			
			if(modelNameElement2 != null && modelNameElement == null) console.log ("-------------------------- HERE fail");
			if (modelNameElement == null) return false;

			// search for a span with the ChatGPT warning text
			const allSpans = Array.from (newElement.querySelectorAll("span"));
			const chatGPTSpan = allSpans.find (span => span.textContent.includes ("ChatGPT may produce inaccurate information"));

			// create a text node with the model name
			const container=document.createElement ("div");
			container.innerHTML=`
			<div id='ourModelText'>
			Current model : <b>${modelNameElement.textContent}</b>
			</div>`;

			chatGPTSpan.appendChild (container);

			// save data about this chat and the model

			// get current window.history state
			let url = window.history.state.url;
			let chatId = url.substring (url.lastIndexOf ("/")+1);

			backendData.addModelData (modelNameElement.textContent, chatId);

			return true;
		}

		function createOurNavBar(newElement)
		{
			// already created
			if (newElement.querySelector ("#ourNavBar") != null) return;

			// search nav (it may be not present sometimes? JS is weird)
			const navElement = newElement.querySelector("nav[aria-label='Chat history']");
			if (navElement == null) return;


			// Create the toolbar div
			const toolbar = document.createElement('div');
			toolbar.setAttribute('id', 'ourNavBar');
			toolbar.setAttribute('class', 'jtoolbar');

			// create new folder button
			let toolCreateFolder = document.createElement ("img");
			toolCreateFolder.classList.add ("jtoolbar-icon");
			toolbar.appendChild(toolCreateFolder);
			toolCreateFolder.src = chrome.runtime.getURL (Constants.AddFolder);

			toolCreateFolder.addEventListener ("click", newFolderClickedEventHandler);

			// create a debug button
			if (Constants.DEBUG)
			{
				let debugButton = document.createElement ("img");
				debugButton.classList.add ("jtoolbar-icon");
				debugButton.src = chrome.runtime.getURL ("images/folder.svg");
				debugButton.setAttribute ("margin-left","40px");
				toolbar.appendChild(debugButton);

				debugButton.addEventListener ("click", ()=>
				{
					// refresh the folders
					directoryItems.loadDirectoryItems();
				});

			}


			// insert the toolbar
			navElement.insertBefore (toolbar, navElement.children[0].nextSibling);

			console.log ("Added ourNavBar :"+toolbar);
		}

		function newFolderClickedEventHandler (event)
		{
			// ask for the name of the folder as a popup
			let userInput = prompt ("Enter the name of the folder", "New Folder");
			if (userInput == null || userInput.trim() === "") return;

			userInput = userInput.trim();

			if (directoryItems.containsName (userInput))
			{
				alert ("A folder with that name already exists");
				return;
			}

			directoryItems.addFolderChild (userInput);
			directoryItems.saveDirectoryItems();

			// refresh the display
			displayDirectoryItems();
			
		}


	}
)();
