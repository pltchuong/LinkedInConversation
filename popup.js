// TODO:
// - broken avatar
// - save opened conversation?
// - odd/even bg

jQuery(document).ready(function($) {
  
  // configurations
  var items_per_load = 10;
  
  // global settings
  $.ajaxSetup({async: false});
  
  // load data from DB
  var runtime = JSON.parse(localStorage.getItem('runtime'));
  var conversations = JSON.parse(localStorage.getItem('conversations'));
  
  // display conversations
  displayConversations();
  
  $(document)
    
    // open a singular conversation
    .on('click', '.conversation', function() {
      var message_dom = this;
      $('.loading').fadeIn(function() {
        var memberID = $(message_dom).data('conversation');
        var messages = getConversation(memberID).messages;
        messages.forEach(function(message) {
          $('.singular > h3')
            .data('conversation', memberID)
            .data('offsetTop', $(window).scrollTop());
          $('.singular > h3 text').text(getPartner(message).name);
          $('.singular > ul').append('<li><b>' + getSenderName(message) + ':</b> ' + trimText(message) + '</li>');
        });
        $('.loading').fadeOut();
        $('.inner').animate({left: -$('.conversations').outerWidth()});
        $('body').animate({scrollTop: 0});
      });
    })
    
    // back to conversation list
    .on('click', '.singular h3 span', function() {
      $('.singular > ul > li').remove();
      $('.inner').animate({left: 0});
      $('body').animate({scrollTop: $('.singular h3').data('offsetTop')});
      
      var conversation = $('.conversation[data-conversation="' + $('.singular h3').data('conversation') + '"]');
      $(conversation).data('backgroundColor', $(conversation).css('backgroundColor')).css({backgroundColor: '#287bbc'});
      $(conversation).animate({backgroundColor: $(conversation).data('backgroundColor')}, 2200);
    })
    
    // reload conversations
    .on('click', '.reload', function() {
      chrome.extension.sendMessage({action: 'reload'}, function (response) {
        conversations = JSON.parse(localStorage.getItem('conversations'));
        $('.conversations').html('');
        displayConversations();
      });
    })
    
    // more conversations
    .on('click', '.more', function() {
      if($('.conversation').length >= Object.keys(conversations).length) {
        chrome.extension.sendMessage({action: 'more'}, function (response) {
          conversations = JSON.parse(localStorage.getItem('conversations'));
          displayConversations($('.conversation').length);
        });
      } else {
        displayConversations($('.conversation').length);
      }
      $('body').animate({scrollTop: $(document).height()});
    })
    
    .on('keyup', function(e) {
      // z
      if (e.keyCode == 90) {
        $('.singular h3 span').click();
      }
      // a
      if (e.keyCode == 65) {
        $('.more').click();
      }
      // r
      if (e.keyCode == 82) {
        $('.reload').click();
      }
    })
  ;
  
  function displayConversations(offset) {
    chrome.browserAction.getBadgeText({}, function(badge) {
      if(badge == 'err') {
        $('.error').show();
      } else {
        $('.error').hide();
      }
    })
    
    offset = offset ? offset : 0;
    var total_count = 0;
    var onetime_count = 0;
    for(var i in conversations) {
      if(total_count < offset) {
        total_count++;
        continue;
      }
      if(onetime_count >= items_per_load) break;
      var conversation = conversations[i];
      for(var i in conversation.messages) {
        var message = conversation.messages[i];
        var memberID = getPartner(message).memberID;
        var name = getSenderName(message);
        var picId = getPartner(message).picId;
        picId = picId ? ('https://media.licdn.com/mpr/mpr/shrink_100_100/' + picId) : 'https://static.licdn.com/scds/common/u/img/themes/katy/ghosts/profiles/ghost_profile_40x40_v1.png';
        $('.conversations').append('\
          <div class="conversation clearfix" data-conversation="' + memberID + '">\
            <img src="' + picId + '" />\
            <div><b>' + name + ': </b>' + trimText(message, 120 - name.length) + '</div>\
          </div>\
        ');
        break;
      }
      
      onetime_count++;
    }
  }
  
  // utility to extract text from message object
  function trimText(message, limit) {
    var text = message.bodyParts[0].text.replace(/\n\>?On \d[\s\S]*/gi, '').trim();
    if(limit) {
      if(text.length > limit) {
        text = text.substr(0, limit);
        text = text.substr(0, Math.min(text.length, text.lastIndexOf(' ')));
        text += '...';
      }
      text += ' <i>more</i>';
    }
    return text;
  }
  
  // utility to get partner from message object
  function getPartner(message) {
    return message.isSentByUser ? message.recipients[0] : message.sender;
  }
  
  // utility to get sender name from message object
  function getSenderName(message) {
    return message.isSentByUser ? 'Me' : getPartner(message).name;
  }
  
  function getConversation(memberID) {
    for (var i in conversations) {
      if (conversations[i].memberID == memberID) {
        return conversations[i];
      }
    }
    return false;
  }
  
});
