/**
 * $.fn.ccmconversation
 * Functions for conversation handling
 *
 * Events:
 *    beforeInitializeConversation         : Before Conversation Initialized
 *    initializeConversation               : Conversation Initialized
 *    conversationLoaded                   : Conversation Loaded
 *    conversationPostError                : Error posting message
 *    conversationBeforeDeleteMessage      : Before deleting message
 *    conversationDeleteMessage            : Deleting message
 *    conversationDeleteMessageError       : Error deleting message
 *    conversationBeforeAddMessageFromJSON : Before adding message from json
 *    conversationAddMessageFromJSON       : After adding message from json
 *    conversationBeforeUpdateCount        : Before updating message count
 *    conversationUpdateCount              : After updating message count
 *    conversationBeforeSubmitForm         : Before submitting form
 *    conversationSubmitForm               : After submitting form
 */

(function($,window){
	"use strict";
	$.extend($.fn,{
		ccmconversation:function(options) {
			return this.each(function() {
				var $obj = $(this);
				var data = $obj.data('ccmconversation');
				if (!data) {
					$obj.data('ccmconversation', (data = new CCMConversation($obj, options)));
				}
			});
		}
	});
	var CCMConversation = function(element, options) {
		this.publish("beforeInitializeConversation",{element:element,options:options});
		this.init(element,options);
		this.publish("initializeConversation",{element:element,options:options});
	};
	CCMConversation.fn = CCMConversation.prototype = {
		publish: function(t,f) {
			f = f || {};
			f.CCMConversation = this;
			window.ccm_event.publish(t,f);
		},
		init: function(element,options) {
			var obj = this;

			obj.$element = element;
			obj.options = $.extend({
				method:        'ajax',
				paginate:      false,
				displayMode:   'threaded',
				itemsPerPage:  -1,
				activeUsers:   [],
				uninitialized: true
			}, options);

			var enablePosting = (obj.options.posttoken != '') ? 1 : 0;
			var paginate = (obj.options.paginate) ? 1 : 0;
			var orderBy = (obj.options.orderBy);
			var enableOrdering = (obj.options.enableOrdering);
			var displayPostingForm = (obj.options.displayPostingForm);
			var insertNewMessages = (obj.options.insertNewMessages);

			if (obj.options.method == 'ajax') {
				$.post(CCM_TOOLS_PATH + '/conversations/view_ajax', {
					'cnvID': obj.options.cnvID,
					'enablePosting': enablePosting,
					'itemsPerPage': obj.options.itemsPerPage,
					'paginate': paginate,
					'displayMode': obj.options.displayMode,
					'orderBy': orderBy,
					'enableOrdering': enableOrdering,
					'displayPostingForm': displayPostingForm,
					'insertNewMessages': insertNewMessages
				}, function(r) {
					var oldobj = window.obj;
					window.obj = obj;
					obj.$element.empty().append(r);
					window.obj = oldobj;
					obj.attachBindings();
					obj.publish('conversationLoaded');
				});
			} else {
				obj.attachBindings();
				obj.finishSetup();
				obj.publish('conversationLoaded');
			}
		},
		mentionList: function(items, coordinates, bindTo) {
			var obj = this;
			if (!coordinates) return;
			obj.dropdown.parent.css({top:coordinates.y,left:coordinates.x});
			if (items.length == 0) {
				obj.dropdown.handle.dropdown('toggle');
				obj.dropdown.parent.remove();
				obj.dropdown.active = false;
				return;
			}

			obj.dropdown.list.empty();
			items.map(function(item){
				var listitem = $('<li/>');
				var anchor = $('<a/>').appendTo(listitem).text(item.getName());
				anchor.click(function(){ccm_event.fire('conversationsMentionSelect',{obj:obj,item:item},bindTo)});
				listitem.appendTo(obj.dropdown.list);
			});
			if (!obj.dropdown.active) {
				obj.dropdown.active = true;
				obj.dropdown.parent.appendTo(obj.$element);
				obj.dropdown.handle.dropdown('toggle');
			}
		},
		attachBindings: function() {
			var obj = this;
			if (obj.options.uninitialized) {
				obj.options.uninitialized = false;
				ccm_event.bind('conversationsMention',function(e){
						obj.mentionList(e.eventData.items,e.eventData.coordinates || false, e.eventData.bindTo || obj.$element.get(0));
					},
					obj.$element.get(0) // Bind to this conversation only.
				);
				obj.dropdown = {};
				obj.dropdown.parent = $('<div/>').css({
					position:'absolute',
					height:0,
					width:0
				});
				obj.dropdown.active = false;
				obj.dropdown.handle = $('<a/>').appendTo(obj.dropdown.parent);
				obj.dropdown.list = $('<ul/>').addClass('dropdown-menu').appendTo(obj.dropdown.parent);
				obj.dropdown.handle.dropdown();
			}
			var paginate = (obj.options.paginate) ? 1 : 0;
			var enablePosting = (obj.options.posttoken != '') ? 1 : 0;

			obj.$replyholder = obj.$element.find('div.ccm-conversation-add-reply');
			obj.$newmessageform = obj.$element.find('div.ccm-conversation-add-new-message form');
			obj.$deleteholder = obj.$element.find('div.ccm-conversation-delete-message');
			obj.$messagelist = obj.$element.find('div.ccm-conversation-message-list');
			obj.$messagecnt = obj.$element.find('.ccm-conversation-message-count');
			obj.$postbuttons = obj.$element.find('button[data-submit=conversation-message]');
			obj.$sortselect = obj.$element.find('select[data-sort=conversation-message-list]');
			obj.$loadmore = obj.$element.find('[data-load-page=conversation-message-list]');
			obj.$messages = obj.$element.find('div.ccm-conversation-messages');
			obj.$messagerating = obj.$element.find('span.ccm-conversation-message-rating');

			if (obj.$newmessageform.dropzone) {
				obj.$newmessageform.dropzone({
					'url': CCM_TOOLS_PATH + '/conversations/add_file', 
					'success' : function(neat, response) { console.log(response)}
				});
			}

			obj.$element.on('click', 'button[data-submit=conversation-message]', function() {
				obj.submitForm($(this));
				return false;
			});
			obj.$element.on('click', 'a[data-toggle=conversation-reply]', function() {
				var $replyform = obj.$replyholder.appendTo($(this).closest('div[data-conversation-message-id]'));
				$replyform.attr('data-form', 'conversation-reply').show();
				$replyform.find('button[data-submit=conversation-message]').attr('data-post-parent-id', $(this).attr('data-post-parent-id'));
				$replyform.attr('rel', Math.floor(Math.random()*100001)); 
				return false;
			});
			obj.$element.on('click', 'a[data-submit=delete-conversation-message]', function() {
				var $link = $(this);
				obj.$deletedialog = obj.$deleteholder.clone();
				if (obj.$deletedialog.dialog) {
					obj.$deletedialog.dialog({
						modal: true,
						dialogClass: 'ccm-conversation-dialog',
						title: obj.$deleteholder.attr('data-dialog-title'),
						buttons: [
							{
								'text': obj.$deleteholder.attr('data-cancel-button-title'),
								'class': 'btn pull-left',
								'click': function() {
									obj.$deletedialog.dialog('close');
								}
							},
							{
								'text': obj.$deleteholder.attr('data-confirm-button-title'),
								'class': 'btn pull-right btn-danger',
								'click': function() {
									obj.deleteMessage($link.attr('data-conversation-message-id'));
								}
							}
						]
					});
				} else {
					if (confirm('Remove this message? Replies to it will not be removed.')) {
						obj.deleteMessage($link.attr('data-conversation-message-id'));
					}
				}
				return false;
			});

			obj.$element.on('change', 'select[data-sort=conversation-message-list]', function() {
				obj.$messagelist.load(CCM_TOOLS_PATH + '/conversations/view_ajax', {
					'cnvID': obj.options.cnvID,
					'task': 'get_messages',
					'enablePosting': enablePosting,
					'displayMode': obj.options.displayMode,
					'itemsPerPage': obj.options.itemsPerPage,
					'paginate': paginate,
					'orderBy': $(this).val(),
					'enableOrdering': obj.options.enableOrdering,
					'displayPostingForm': displayPostingForm,
					'insertNewMessages': insertNewMessages
				}, function(r) {
					obj.$replyholder.appendTo(obj.$element);
					obj.attachBindings();
				});
			});
			
			obj.$element.on('click', '[data-load-page=conversation-message-list]', function() {
				var nextPage = parseInt(obj.$loadmore.attr('data-next-page'));
				var totalPages = parseInt(obj.$loadmore.attr('data-total-pages'));
				var data = {
					'cnvID': obj.options.cnvID,
					'itemsPerPage': obj.options.itemsPerPage,
					'displayMode': obj.options.displayMode,
					'enablePosting': enablePosting,
					'page': nextPage,
					'orderBy': obj.$sortselect.val()
				};

				$.ajax({
					type: 'post',
					data: data,
					url: CCM_TOOLS_PATH + '/conversations/message_page',
					success: function(html) {
						obj.$messages.append(html);
						if ((nextPage + 1) > totalPages) {
							obj.$loadmore.hide();
						} else {
							obj.$loadmore.attr('data-next-page', nextPage + 1);
						}
					}
				});
			});
			
			obj.$element.on('click', 'i.icon-thumbs-up', function() {
				//alert('upvote');
				obj.$messagerating.load(CCM_TOOLS_PATH + '/conversations/rate');
			});
			
			obj.$element.on('click', 'i.icon-thumbs-down', function() {
				//alert('downvote');
				obj.$messagerating.load(CCM_TOOLS_PATH + '/conversations/rate'), {
				
				};
			});
			
		},
		handlePostError: function($form, messages) {
			if (!messages) {
				var messages = ['An unspecified error occurred.'];
			}
			obj.publish('conversationPostError',{messages:messages});
			var s = '';
			$.each(messages, function(i, m) {
				s += m + '<br>';
			});
			$form.find('div.ccm-conversation-errors').html(s).show();
		},
		deleteMessage: function(msgID) {

			var obj = this;
			obj.publish('conversationBeforeDeleteMessage',{msgID:msgID});
			var	formArray = [{
				'name': 'cnvMessageID',
				'value': msgID
			}];

			$.ajax({
				type: 'post',
				data: formArray,
				url: CCM_TOOLS_PATH + '/conversations/delete_message',
				success: function(html) {
					var $parent = $('div[data-conversation-message-id=' + msgID + ']');

					if ($parent.length) {
						$parent.after(html).remove();
					}
					obj.updateCount();
					if (obj.$deletedialog.dialog)
						obj.$deletedialog.dialog('close');
					obj.publish('conversationDeleteMessage',{msgID:msgID});
				},
				error: function(e) {
					obj.publish('conversationDeleteMessageError',{msgID:msgID,error:arguments});
					window.alert('Something went wrong while deleting this message, please refresh and try again.');
				}
			});
		},
		addMessageFromJSON: function($form, json) {
			var obj = this;
			obj.publish('conversationBeforeAddMessageFromJSON',{json:json,form:$form});
			var enablePosting = (obj.options.posttoken != '') ? 1 : 0;
			var	formArray = [{
				'name': 'cnvMessageID',
				'value': json.cnvMessageID
			}, {
				'name': 'enablePosting',
				'value': enablePosting
			},  {
				'name': 'displayMode',
				'value': obj.options.displayMode
			}];

			$.ajax({
				type: 'post',
				data: formArray,
				url: CCM_TOOLS_PATH + '/conversations/message_detail',
				success: function(html) {

					var $parent = $('div[data-conversation-message-id=' + json.cnvMessageParentID + ']');

					if ($parent.length) {
						$parent.after(html);
						obj.$replyholder.appendTo(obj.$element);
						obj.$replyholder.hide();
					} else {
						if (obj.options.insertNewMessages == 'bottom') {
							obj.$messages.append(html);
						} else {
							obj.$messages.prepend(html);
						}
						obj.$element.find('.ccm-conversation-no-messages').hide();
					}

					obj.publish('conversationAddMessageFromJSON',{json:json,form:$form});
					obj.updateCount();
					window.location = '#cnvMessage' + json.cnvMessageID; 
				}
			});
		},
		updateCount: function() {
			var obj = this;
			obj.publish('conversationBeforeUpdateCount');
			obj.$messagecnt.load(CCM_TOOLS_PATH + '/conversations/count_header', {
				'cnvID': obj.options.cnvID,
			},function(){
				obj.publish('conversationUpdateCount');
			});
		},
		submitForm: function($btn) {
			var obj = this;
			obj.publish('conversationBeforeSubmitForm');
			var $form = $btn.closest('form');

			$btn.prop('disabled', true);
			$form.parent().addClass('ccm-conversation-form-submitted');
			var formArray = $form.serializeArray();
			var parentID = $btn.attr('data-post-parent-id');

			formArray.push({
				'name': 'token',
				'value': obj.options.posttoken
			}, {
				'name': 'cnvID',
				'value': obj.options.cnvID
			}, {
				'name': 'cnvMessageParentID',
				'value': parentID
			});
			$.ajax({
				dataType: 'json',
				type: 'post',
				data: formArray,
				url: CCM_TOOLS_PATH + '/conversations/add_message',
				success: function(r) {
					if (!r) {
						obj.handlePostError($form);
						return false;
					}
					if (r.error) {
						obj.handlePostError($form, r.messages);
						return false;
					}
					obj.addMessageFromJSON($form, r);
					obj.publish('conversationSubmitForm');
				},
				error: function(r) {
					obj.handlePostError($form);
					return false;
				},
				complete: function(r) {
					$btn.prop('disabled', false);
					$form.parent().closest('.ccm-conversation-form-submitted').removeClass('ccm-conversation-form-submitted');
				}
			});
		},
		tool:{
			setCaretPosition:function(elem, caretPos) {
				// http://stackoverflow.com/a/512542/950669
				if(elem != null) {
					if(elem.createTextRange) {
						var range = elem.createTextRange();
						range.move('character', caretPos);
						range.select();
					}
					else {
						if(elem.selectionStart) {
							elem.focus();
							elem.setSelectionRange(caretPos, caretPos);
						}
						else
							elem.focus();
					}
				}
			},
			getCaretPosition: function(elem) {
				// http://stackoverflow.com/a/263796/950669
				if (elem.selectionStart) { 
					return elem.selectionStart; 
				} else if (document.selection) { 
					elem.focus(); 

					var r = document.selection.createRange(); 
					if (r == null) { 
					return 0; 
					} 

					var re = elem.createTextRange(), 
					rc = re.duplicate(); 
					re.moveToBookmark(r.getBookmark()); 
					rc.setEndPoint('EndToStart', re); 

					return rc.text.length; 
				}  
				return 0; 
			},
			testMentionString: function(s) {
				return /^@[a-z0-9]+$/.test(s);
			},
			getMentionMatches: function(s,u) {
				return u.filter(function(d){return(d.indexOf(s)>=0)});
			},
			isSameConversation: function(o,n) {
				return (o.options.blockID === n.options.blockID && o.options.cnvID === n.options.cnvID);
			},

			// MentionUser class, use this to pass around data with your @mention names.
			MentionUser: function(name) {
				this.getName = function() { return name; };
			}
		}
	};
})(jQuery,window);
