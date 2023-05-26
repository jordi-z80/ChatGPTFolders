/* global DirectoryItem, GTools, backendData */


class DirectoryItemManager
{
	constructor()
	{
		this.rootFolder = null;
	}

	#createNewRoot()
	{
		this.rootFolder = new DirectoryItem ("Root");
		console.log ("No tree data, created new root folder. Self = ",self);
	}	

	loadDirectoryItems()
	{
		let self = this;

		return new Promise ((resolve,reject) =>
		{
			// already loaded
			if (self.rootFolder != null) { resolve(); return; }

			self.rootFolder = new DirectoryItem ("Root");

			chrome.storage.local.get(['directoryItems'], function(result)
			{
				if (result == null || result.directoryItems == null)
				{
					self.#createNewRoot();
					resolve();
					return;
				}

				let tree = JSON.parse(result.directoryItems);
				if (tree == null)
				{
					self.#createNewRoot();
					resolve();
					return;
				}

				self.rootFolder = DirectoryItem.fromObject (tree);

				resolve();

			});
		});


	}




	async saveDirectoryItems()
	{
		let self = this;

		if (this.rootFolder == null) return console.log ("Tried to save directory items when rootFolder being null.");
		return chrome.storage.local.set(
			{directoryItems : JSON.stringify(self.rootFolder)}, 
			function() 
			{
				//console.log ("---------------Saved tree items",self.rootFolder,self);
			});
	}

	containsName (name)
	{
		// should/does check all or should check childs only?
		return this.rootFolder.containsName (name);
	}

	addFolderChild (name)
	{
		return this.rootFolder.addFolderChild (name);
	}

	getRoot()
	{
		return this.rootFolder;
	}

	getFolderById (id)
	{
		return this.rootFolder.getFolderById (id,true);
	}

	getChatByLink (link)
	{
		return this.rootFolder.getChatByLink (link,true);
	}

	getParentOf (child, scannedNode = null)
	{
		if (scannedNode == null) scannedNode = this.rootFolder;

		// we don't hold a parent, so we have to traverse the root until a child is the child parameter
		if (scannedNode.children.includes (child)) return scannedNode;

		console.log (scannedNode);

		for (let childNode of scannedNode.children)
		{
			if (childNode.isFolder())
			{
				let parent = this.getParentOf (child, childNode);
				if (parent != null) return parent;
			}
		}

		return null;
	}

	isParentOf (parent, child)
	{
		if (parent == null || child == null) return false;
		if (parent == child) return false;

		// let's make the previous foeach as a for
		for (let childNode of parent.children)
		{
			if (childNode == child) return true;
			if (childNode.isFolder())
			{
				if (this.isParentOf (childNode, child)) return true;
			}
		}

		return false;
	}

	isChildOf (child, parent)
	{
		return this.isParentOf (parent, child);
	}



	deleteFolderById (id)
	{
		let folder = this.rootFolder.getFolderById (id,true);
		if (folder == null) return;

		let parent = this.getParentOf (folder);
		if (parent == null) return;

		// should move all the childs somewhere? Specially if they're folders! Maybe create a trash folder?

		parent.deleteChild (folder);
		this.saveDirectoryItems();
	}

	moveFolderToFolder (sourceFolder, targetFolder)
	{
		if (sourceFolder == null || targetFolder == null) return false;
		if (sourceFolder == targetFolder) return false;
		if (this.isParentOf (sourceFolder, targetFolder)) return false;

		const parent = this.getParentOf (sourceFolder);
		if (parent == null) return false;
		if (parent == targetFolder) return true;			// already there
		
		parent.deleteChild (sourceFolder);
		targetFolder.addFolderChild (sourceFolder);
		this.saveDirectoryItems();

		return true;
	}

	moveChatToFolder (chatId, targetFolder)
	{
		if (chatId == null || targetFolder == null) return false;

		// get the backend chat id
		let backendChat =backendData.getConversationById (chatId);
		if (backendChat == null) return false;

		// get the chat inside the folder, if present
		let chatNode = this.rootFolder.getFolderById (chatId,true);

		if (chatNode != null)
		{
			const parent = this.getParentOf (chatNode);
			if (parent == targetFolder) return true;			// already there

			parent?.deleteChild (chatNode);
		}

		targetFolder.addLinkChild (backendChat.title, backendChat.id);
		this.saveDirectoryItems();

		return true;
	}

	removeChatFromFolder (chatId)
	{
		let chat = this.getChatByLink (chatId);
		if (chat == null) return;
		let parent =this.getParentOf (chat);
		if (parent == null) return;

		parent.children = parent.children.filter (child => child != chat);

		this.saveDirectoryItems();
	}



}