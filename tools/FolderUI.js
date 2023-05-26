/* globals directoryItems, ContextMenu, GTools, Constants, backendData */

let contextMenu = null;


// note: tries to simulate the look&feel and layout of the chat list
function displayDirectoryItems ()
{
	// note: the directories can't be populated until the backend data is ready
	if (backendData?.conversationData == null) return console.log ("Backend data not ready");

	// already present, use refresh instead?
	if (document.getElementById ("ourFolderList") != null) return refreshDirectoryItems();

	//console.log ("Building directory");

	// we want the folder list to be inside the scrollable zone.
	const firstDiv = document.querySelector('div.flex.flex-col.gap-2.pb-2.text-gray-100.text-sm');
	if (firstDiv == null) return;

	// the first h3 is usually "Today". Let's find it and create a copy of it
	let firstH3 = firstDiv.querySelector('h3');
	if (firstH3 == null) return;

	// we need to insert into the previous span
	const previousSpan = firstH3.closest ("span");
	if (previousSpan == null) return console.log ("This is probably a bug.",firstDiv);

	// the h3 and the recursive list of folders goes into a div
	const ourMainDiv = document.createElement ("div");
	ourMainDiv.id = "ourMainFolderDiv";

	// create a sticky div so that it sticks to the top
	const stickyDiv = document.createElement ("div");
	stickyDiv.classList.add ("sticky","top-0","z-[17]");
	ourMainDiv.appendChild (stickyDiv);

	// create a copy of the h3
	let foldersHeader = firstH3.cloneNode (true);
	foldersHeader.id = "foldersHeader";
	foldersHeader.textContent = "Folders";
	stickyDiv.appendChild (foldersHeader);

	// all of this inside the <ol>
	const ourOL = document.createElement ("ol");
	ourOL.id = "ourFolderList";

	// now generate the list of folders
	displayDirectoryItemsRecursive (directoryItems.getRoot(), ourOL, 0);

	ourMainDiv.appendChild (ourOL);


	// finally
	previousSpan.insertBefore (ourMainDiv, previousSpan.children[0]);
}

function refreshDirectoryItems()
{
	const ourOL = document.getElementById ("ourFolderList");
	if (ourOL == null) return;

	//console.log ("Refreshing directory");

	ourOL.innerHTML = "";

	// now generate the list of folders
	displayDirectoryItemsRecursive (directoryItems.getRoot(), ourOL, 0);
}


function displayDirectoryItemsRecursive (folder, baseElement, level)
{
	let collapsed = backendData.getFolderCollapsedStatus (folder.folderId);
	let image = collapsed ? Constants.ClosedFolder : Constants.OpenFolder;

	let rv = displayCommonItem (level,image,folder.name,"folder_"+folder.folderId,true);
	let liContainer = rv.li;
	let folderContainer = rv.div;

	baseElement.appendChild (liContainer);

	// childrens (even if there are none) go inside a <ol>. It will be the next sibling of folderContainer
	let innerOL = document.createElement ("ol");
	liContainer.appendChild (innerOL);

	// collapse the folder if it was collapsed before
	if (backendData.getFolderCollapsedStatus (folder.folderId))
	{
		GTools.toggleCollapse (innerOL);
	}

	// when this folder is clicked, toggle innerOL visibility
	folderContainer.addEventListener ("click", function (event)
	{
		let collapse = GTools.toggleCollapse (innerOL);
		backendData.setFolderCollapsedStatus (folder.folderId, collapse);

		// if the folder was collapsed, we need to change the image
		let icon = document.getElementById ("folderIcon-"+folder.folderId);
		if (icon != null)
		{
			let src = collapse ? Constants.ClosedFolder : Constants.OpenFolder;
			icon.src = chrome.runtime.getURL (src);
		}
	});

	// click away menu
	document.addEventListener ("click", function (event) { contextMenu?.hideContextMenu(); contextMenu = null; });

	// folder right clicked: show context menu
	folderContainer.addEventListener ("contextmenu", function (event)
	{
		event.preventDefault();
		
		contextMenu?.hideContextMenu(); 
		contextMenu = null;

		contextMenu = new ContextMenu();
		contextMenu.addOption ("Folder id : "+folder.folderId);
		contextMenu.addOption ("Rename", onRenameFolder);
		contextMenu.addOption ("Delete", onDeleteFolder);
		contextMenu.addOption ("Add current chat to this folder", function() { console.log ("Add current chat to this folder"); });

		contextMenu.addTag (folder.folderId);

		contextMenu.showContextMenu (event);

	});

	addDragHandlers (folderContainer);
	addDropHandlers (folderContainer,folder);

	
	// now add the children inside the folder
	folder.children.forEach (child =>
	{
		if (child.isFolder())
		{
			displayDirectoryItemsRecursive (child, innerOL, level+1);
		}
		else
		{
			displayDirectoryItemChat (child, innerOL, level+1);
		}

	});

}


function displayCommonItem (level,image,elementName,draggableId,isFolder)
{
	let zLevel = 25 - level;

	// first we'll add the folder itself
	const liContainer = document.createElement ("li");
	liContainer.innerHTML = `<li class="relative" style="background-color: #ff0000; z-index:[${zLevel}]; opacity: 1; height: auto; transform: none; transform-origin: 50% 50% 0px;">`;

	// Fetch URLs for images
	const image1Url = chrome.runtime.getURL(image);

	// Create the container div
	const folderContainer = document.createElement('div');
	folderContainer.classList.add ("container","relative");

	const startingSpace = level * Constants.FolderOffset;

	if (level > 0) folderContainer.setAttribute ("draggable", "true");

	let colorStyle = "";
	if (isFolder) colorStyle = `style="color: yellow;"`;

	// Set the innerHTML of the container
	folderContainer.innerHTML = `
	<a class="flex-container relative">
		<div style="flex-basis: ${startingSpace}px;"></div>
		<img class="flex-item-image" id="folderIcon-${draggableId.substring(7)}" src="${image1Url}">
		<div class="flex-item-text" ${colorStyle}>${elementName}</div>
	</a>
	`;

	folderContainer.id = draggableId;
	folderContainer.setAttribute (Constants.DraggableId,folderContainer.id);

	// Append the container to the body of the document
	liContainer.appendChild(folderContainer);

	return { li: liContainer, div: folderContainer };
}

function displayDirectoryItemChat (chat, innerOL, level)
{
	// first find the chat in the "real" list
	let str = `[${Constants.DraggableId}="aiChat_${chat.link}"]`;

	let convA = document.querySelector (str);
	if (convA == null) 
	{
		console.log ("Not found",str);
		return;
	}

	let chatImage = Constants.ChatIcon;
	let chatModel = backendData.getModelData (chat.link);
	if (chatModel != null)
	{
		let temptativeChatImage = Constants[chatModel];
		if (temptativeChatImage != null) chatImage = temptativeChatImage;

	}

	let rv = displayCommonItem (level,chatImage,chat.name,"aiChat_"+chat.link,false);
	innerOL.appendChild (rv.li);

	rv.div.addEventListener ("click", async function (event)
	{
		// quick solution: just open the page
		let url2 = "https://chat.openai.com/c/"+chat.link;
		
		window.open (url2, "_self");
		return;

/*		
		// this will be useful to download the conversation and inject it inside the document.
		console.log ("Clicked!");

		let url = 'https://chat.openai.com/backend-api/conversation/'+chat.link;

		chrome.storage.local.get(["authToken"])
		.then ((result) => fetch (url,
		{
			method: 'GET',
			headers:
			{
				'Authorization': result.authToken,
				'Content-Type': 'application/json'
			}
		}))
		.then (response => response.json())
		.then ( (response) =>
		{
			console.log ("Response",response);
			window.history.pushState ("dummy_xyzzy",chat.title, "https://chat.openai.com/c/"+chat.link);
		});
*/

	});

	let ourChatContainer = rv.div;

	// click away menu
	document.addEventListener ("click", function (event) { contextMenu?.hideContextMenu(); contextMenu = null; });

	// folder right clicked: show context menu
	ourChatContainer.addEventListener ("contextmenu", function (event)
	{
		event.preventDefault();
		
		contextMenu?.hideContextMenu(); 

		contextMenu = new ContextMenu();
		contextMenu.addOption ("Remove", onRemoveFileFromFolder);

		contextMenu.addTag (chat.link);

		contextMenu.showContextMenu (event);

	});	

	addDragHandlers (ourChatContainer);

}


function addDragHandlers (element)
{
	console.log ("Adding drag handlers to ",element);
	element.addEventListener (("dragstart"), function (event)
	{
		event.dataTransfer.setData ("text/plain", element.getAttribute (Constants.DraggableId));
	});
}

function addDropHandlers (folderContainer,folder)
{
	folderContainer.addEventListener (("dragover"), function (event)
	{
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";

		// highlight the folder
		folderContainer.classList.add ("dragOver");
	});

	folderContainer.addEventListener (("dragleave"), function (event)
	{
		event.preventDefault();
		folderContainer.classList.remove ("dragOver");
	});

	folderContainer.addEventListener (("drop"), function (event)
	{
		event.preventDefault();

		const draggedId = getDraggedId (event);
		console.log ("drop to folder "+folder.name+" from "+draggedId);

		// if the id starts with folder_
		if (draggedId.startsWith ("folder_"))
		{
			const draggedFolder = directoryItems.getFolderById (draggedId.substring(7));
			if (draggedFolder == null) return console.log ("dragged folder not found ",draggedId);

			console.log ("dragged folder is ",draggedFolder);
			console.log ("target folder is ",folder);

			// let's move the dragged folder to the target folder
			let ok = directoryItems.moveFolderToFolder (draggedFolder,folder);
			if (!ok) console.log ("dragged folder is parent of target folder, do nothing");
			else console.log ("Moviment fet, teoricament");

			// refresh
			displayDirectoryItems (directoryItems);
		}
		else if (draggedId.startsWith ("aiChat_"))
		{
			const chatId = draggedId.substring(7);

			// suppose the chat is in a folder, so we remove it
			directoryItems.removeChatFromFolder (chatId);

			directoryItems.moveChatToFolder (chatId,folder);

			displayDirectoryItems (directoryItems);
		}
	});			


	function getDraggedId (event)
	{
		let draggedId = event.dataTransfer.getData ("text/plain");
		if (draggedId == null || draggedId.trim() === "") return null;
		return draggedId.trim();
	}
}

function onRenameFolder (event)
{
	// get the associated folder tag
	let folderId = ContextMenu.getTagFromOption (event.currentTarget);
	if (folderId == null) return;

	// close the context menu
	contextMenu.hideContextMenu();

	// get the folder
	let folder = directoryItems.getFolderById (folderId);

	// ask for the name of the folder as a popup
	let userInput = prompt ("Enter the new name of the folder", folder.name);

	if (userInput == null || userInput.trim() === "") return;
	userInput = userInput.trim();

	if (directoryItems.containsName (userInput))
	{
		alert ("A folder with that name already exists");
		return;
	}

	folder.name = userInput;
	event.currentTarget.textContent = userInput;

	directoryItems.saveDirectoryItems();
	refreshDirectoryItems();
}

function onDeleteFolder(event)
{
	// get the associated folder tag
	let folderId = ContextMenu.getTagFromOption (event.currentTarget);
	if (folderId == null) return;

	// close the context menu
	contextMenu.hideContextMenu();

	// get the folder
	let folder = directoryItems.getFolderById (folderId);

	// ask for confirmation (will have to add more data later, like 'all chats will be moved')
	if (!confirm ("Are you sure you want to delete the folder "+folder.name+"?")) return;

	// delete the folder
	directoryItems.deleteFolderById (folderId);

	refreshDirectoryItems();

}

function onRemoveFileFromFolder (event)
{
	// get the associated folder tag
	let folderId = ContextMenu.getTagFromOption (event.currentTarget);
	if (folderId == null) return;

	directoryItems.removeChatFromFolder (folderId);

	refreshDirectoryItems();

}


