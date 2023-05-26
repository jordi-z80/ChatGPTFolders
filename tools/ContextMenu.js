class ContextMenu
{
	constructor()
	{
		this.#createContextMenu();
	}


	#createContextMenu (element, menuItems)
	{
		console.log ("Creating context menu");

		// create a context menu
		this.contextMenu = document.createElement("div");
		this.contextMenu.style.display = "none";
		this.contextMenu.style.position = "absolute";
		this.contextMenu.style.border = "1px solid #000";
		this.contextMenu.style.backgroundColor = "#fff";
		this.contextMenu.style.zIndex = "1000";
		this.contextMenu.style.padding = "10px";

		document.body.appendChild(this.contextMenu);
	}

	// function to show the context menu
	showContextMenu(event) 
	{
		console.log ("Showing context menu");
		this.contextMenu.style.display = "block";
		this.contextMenu.style.left = `${event.pageX}px`;
		this.contextMenu.style.top = `${event.pageY}px`;
	}

	// function to hide the context menu
	hideContextMenu()
	{
		console.log ("Hiding context menu");
		this.contextMenu.style.display = "none";
	}

	addOption (optionName, optionFunction=null)
	{
		const option = document.createElement("p");
		option.textContent = optionName;
		if (optionFunction != null) 
		{
			option.classList.add ("contextMenuOption");
			option.addEventListener("click", optionFunction);
		}

		this.contextMenu.appendChild(option);
		return option;
	}

	addTag (tag)
	{
		this.contextMenu.setAttribute ("data-tag", tag);
	}

	static getTagFromOption (option)
	{
		const tag = option.parentNode.getAttribute ("data-tag");
		return tag;
	}

}

