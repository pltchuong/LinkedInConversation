// TODO: 
// - reload = fetch without update runtime, line 26

jQuery(document).ready(function($) {
  
  $.ajaxSetup({async: false});
  
  var conversations = localStorage.getItem('conversations');
  conversations = conversations ? JSON.parse(conversations) : [];
  
  var runtime = localStorage.getItem('runtime');
  runtime = runtime ? JSON.parse(runtime) : {conversation_offset: 1, conversation_opened: 0};
  localStorage.setItem('runtime', JSON.stringify(runtime));
  
  // fetch conversations
  if(localStorage.length == 1) {
    fetch();
  }
  chrome.browserAction.setBadgeText({text: 'db'});
  
  // event listeners
  chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.action === 'reload') {
      fetch();
      
      //runtime.conversation_offset -= 10;
      //localStorage.setItem('runtime', JSON.stringify(runtime));
      
      sendResponse('ok');
    }
    if(request.action === 'more') {
      fetch(runtime.conversation_offset);
      sendResponse('ok');
    }
  });
  
  // fetch conversations based on offset
  function fetch(offset) {
    if(!offset) offset = 1;
    $.get('https://www.linkedin.com/inbox/messages?startRow=' + offset, function(response) {
      var items = $(response).find('.inbox-list li.inbox-item');
      if(items.length > 0) {
        items.each(function(i) {
          chrome.browserAction.setBadgeText({text: (i + 1) + '/10'});
          search($(this).find('.participants').text().trim());
        });
        
        // save runtime
        runtime.conversation_offset += 10;
        localStorage.setItem('runtime', JSON.stringify(runtime));
        
        // save conversations
        conversations.sort(function(a, b) {return new Date(b.lastupdate) - new Date(a.lastupdate);});
        localStorage.setItem('conversations', JSON.stringify(conversations));
        
        chrome.browserAction.setBadgeText({text: 'db'});
      } else {
        chrome.browserAction.setBadgeText({text: 'err'});
      }
    }).fail(function() {
      chrome.browserAction.setBadgeText({text: 'err'});
    });
  }
  
  // search messages based on conversation name (recursively because there might be more than one page)
  function search(conversation, offset) {
    var count = false;
    if(!offset) offset = 1;
    $.get('https://www.linkedin.com/inbox/search?startRow=' + offset + '&keywords=' + conversation, function(response) {
      count = parseInt($(response).find('#message-list').data('count'));
      $(response).find('.inbox-list li.inbox-item').each(function() {
        if($(this).find('.participants:contains(\'' + conversation + '\')').length > 0) {
          $.get('https://www.linkedin.com/inbox/detail?itemId=' + $(this).data('gid'), function(response) {
            var message = response.content.message;
            var memberID = getPartner(message).memberID;
            var conversation = getConversation(memberID);
            if(!conversation) {
              conversation = {
                'memberID': memberID,
                'messages': [], 
                'lastupdate': false
              };
              conversations.push(conversation);
            }
            if(!getMessage(message.itemId, conversation)) {
              conversation.messages.push(message);
              conversation.messages.sort(function(a, b) {return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();});
              var d = new Date(message.createDate).getTime();
              conversation.lastupdate = conversation.lastupdate > d ? conversation.lastupdate : d;
            }
          });
        }
        offset++;
      });
    });
    
    if(offset < count) {
      search(conversation, offset);
    }
  }
  
  function getPartner(message) {
    return message.isSentByUser ? message.recipients[0] : message.sender;
  }
  
  function getConversation(memberID) {
    for (var i in conversations) {
      if (conversations[i].memberID == memberID) {
        return conversations[i];
      }
    }
    return false;
  }
  
  function getMessage(itemId, conversation) {
    var messages = conversation.messages;
    for (var i in messages) {
      if (messages[i].itemId == itemId) {
        return messages[i];
      }
    }
    return false;
  }
  
});
