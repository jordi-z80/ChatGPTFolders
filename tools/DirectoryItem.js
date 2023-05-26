class DirectoryItem 
{
	constructor(name, link = null, children = null, id = null) 
	{
		this.name = name;
		this.link = link; 			// If it's a folder, link should be null
		this.children = children; 	// Array of either Folder instances or links
		if (this.children == null) this.children = [];

		this.folderId = id;	
		if (id == null) this.folderId = Math.random().toString(36).substring (2, 9); //  i have to improve this.

		this.collapsed = false;
	}

	isFolder ()
	{
		return this.link == null;
	}
  
	// A method to add child to the folder
	addFolderChild(name) 
	{
		if (name instanceof DirectoryItem) 
		{
			return this.children.push(name);
		}
		else
		{
			let folderChild = new DirectoryItem (name);
			this.children.push(folderChild);
			return folderChild;
		}
	}
  
	// A method to add link to the folder
	addLinkChild(name, link) 
	{
		let linkChild = new DirectoryItem (name, link);
		this.children.push(linkChild);
		console.log ("add link child  : ",this);
		return linkChild;
	}

	static fromObject(obj) 
	{
		let folder = new DirectoryItem(obj.name, obj.link, null, obj.folderId);
		for (let child of obj.children) 
		{
			if (child.link) 
			{ 
				// Child is a link
				folder.addLinkChild(child.name, child.link);
			} else 
			{
				// Child is a folder
				folder.children.push(DirectoryItem.fromObject(child));
			}
		}
		return folder;
	}

	// Returns if this item or a child item has the given name
	containsName(name)
	{
		if (this.name == name) return true;
		for (let child of this.children)
		{
			if (child.containsName(name)) return true;
		}
		return false;
	}

	getFolderById (id, recursive = true)
	{
		if (this.folderId == id) return this;
		if (!recursive) return null;

		for (let child of this.children)
		{ 
			let result = child.getFolderById (id);
			if (result != null) return result;
		}
		return null;

	}

	getChatByLink (link, recursive = true)
	{
		if (this.link == link) return this;
		if (!recursive) return null;

		for (let child of this.children)
		{ 
			let result = child.getChatByLink (link);
			if (result != null) return result;
		}
		return null;

	}

	deleteChild (child)
	{
		this.children = this.children.filter (c => c != child);
	}

  }
  