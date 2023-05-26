class GTools
{

	// observes changes in the DOM. When a mutation happens, foreaches the changes and
	// redirects them, one by one, to the callback, as HTMLElements.
	// If the callback returns true, the observer is disconnected.
	// The idea was good, but I don't know why it works sometimes and sometimes it doesn't.
	static easyObserver(observedCallback)
	{
		if (GTools.observerCount === undefined) 
		{
			GTools.observerCount = 0;
			GTools._mainObserver = null;
		}

		if (GTools._mainObserver != null)
		{
			GTools._mainObserver.disconnect();
			GTools.observerCount--;
		}

		if (GTools.observerCount > 4)
		{
			console.log ("Too many observers, check it's not a bug");
			return;
		}
		
		GTools.observerCount++;
		
		const observer = new MutationObserver(function(mutationList,observer)
		{
			for (let mutation of mutationList)
			{
				if (mutation.type == "childList" && mutation.addedNodes.length > 0)
				{
					for (let node of mutation.addedNodes)
					{
						if (node instanceof HTMLElement)
						{
							observer.disconnect();
							GTools.observerCount--;

							if (!observedCallback(node)) 
							{
								// reobserve unless the callback returns true
								GTools._mainObserver = GTools.easyObserver (observedCallback);
								return observer;									
							}
						}
					}

				}
			}
		});

		observer.observe (document.documentElement, { attribute:true, childList: true, subtree: true});

		return observer;
	}


	// Returns true if the element has been collapsed, false if it has been expanded
	static toggleCollapse (element) 
	{
		// If the element is collapsed
		if (element.style.height === "0px")
		{
			element.style.height = "auto";
			var height = element.clientHeight + "px";
			element.style.height = "0px";

			setTimeout(function () 
			{ 
				element.removeEventListener('transitionend', cleanup);
			});

			return false;
		} 
		// If the element is expanded
		else 
		{
			element.style.height = element.clientHeight + "px";

			setTimeout(function () 
			{
				element.style.transition = "height 0.2s";
				element.style.height = "0px";
			}, 0);

			// Clean up after the transition is done
			element.addEventListener('transitionend', cleanup);

			return true;
		}
		
		function cleanup() 
		{
			element.style.transition = "";
			element.style.height = "0px";
			element.removeEventListener('transitionend', cleanup);
		}		
	}

}

