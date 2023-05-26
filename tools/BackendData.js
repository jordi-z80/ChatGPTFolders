
// The backend data holds the data about the chats. A part of it it's loaded from server once per 
// browser session (I should change this). As it takes a while to load conversations, a cached 
// version is loaded from storage until the final data is available.
class BackendData
{

	constructor ()
	{
		this.conversationsUrl = 'https://chat.openai.com/backend-api/conversations';
		this.conversationData = [];
		this.wipLoadConversationData = [];
		this.folderStatus = {};						// folder status is not backend data, will have to refactor this
		this.chatModelStatus = {};					// for each chat, save its model
		//console.log ("Init BackendData");
	}

	async loadMiscData()
	{
		let self = this;

		this.folderStatus = {};
		chrome.storage.local.get (["folderStatus"], (result) =>
		{
			if (result != null) self.folderStatus = result.folderStatus;
		});

		this.chatModelStatus = {};
		chrome.storage.local.get (["chatModelStatus"], (result) =>
		{
			if (result != null) self.chatModelStatus = result.chatModelStatus;
		});

	}

	async loadCachedConversationData ()
	{
		let self = this;
		chrome.storage.local.get (["conversations"], (result) =>
		{
			self.conversationData = result.conversations;
			//console.log ("Loaded cached conversation data ",self.conversationData,self);
		});
	}
	
	async downloadConversationData (start=0,end=500,retries = 0)
	{
		let self = this;
		//console.log (`Downloading conversation data ${start} to ${end}`);

		const MaxConversations = 50;

		let limit = end-start;
		if (limit>MaxConversations) limit = MaxConversations;

		return chrome.storage.local.get(["authToken"])
		.then (result =>
		{
			let url = new URL(self.conversationsUrl);
			url.searchParams.append('offset',start);
			url.searchParams.append('limit',limit);

			return fetch (url, 
				{
					method: 'GET',
					headers:
					{
						'Content-Type': 'application/json',
						'Authorization': result.authToken
					}
				});
		})
		.then (response => 
		{
			return response.json();
		})
		.then (jsonData => 
		{
			for (let idx in jsonData.items)
			{
				const conv = jsonData.items[idx];
				const item = { id: conv.id , title: conv.title };
				self.wipLoadConversationData.push (item);
			}

			start += jsonData.items.length;
			if (start >= end || start >= jsonData.total)
			{
				// make new data available
				self.conversationData = self.wipLoadConversationData;

				// save for next time caching
				chrome.storage.local.set ( { conversations : self.conversationData });

				console.log ("Finished downloading conversation data. Total conversations:",self.conversationData.length);
				return;
			} 
			else return self.downloadConversationData(start,end,0);

		})
		.catch (error => 
		{
			// todo : retry 5 times
			return this.downloadConversationData(start,end,retries+1);
		});
	}

	getConversationById (id)
	{
		if (this.downloadConversationData == false) return null;
		if (this.conversationData == null) return null;

		return this.conversationData.find (conv => conv.id == id);
	}

	setFolderCollapsedStatus (folderId,collapsed)
	{
		let self = this;

		// folder status is a dictionary, key folderId, value is true or false (collapsed)
		this.folderStatus[folderId] = collapsed;

		chrome.storage.local.set ( { folderStatus : self.folderStatus });
	}

	getFolderCollapsedStatus (folderId)
	{
		if (this.folderStatus == null) this.folderStatus = {};
		if (this.folderStatus[folderId] == null) return false;
		return this.folderStatus[folderId];
	}

	addModelData (modelName,chatId)
	{
		let self = this;
		if (this.chatModelStatus == null) this.chatModelStatus = {};
		this.chatModelStatus[chatId] = modelName;
		chrome.storage.local.set ( { chatModelStatus : self.chatModelStatus });
	}

	getModelData (chatId)
	{
		if (this.chatModelStatus[chatId] == null) return null;
		return this.chatModelStatus[chatId];
	}
}