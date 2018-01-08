'use strict';

const apiai = require('apiai');
const config = require('./config');
const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const uuid = require('uuid');
const pg = require('pg');
pg.defaults.ssl = true;


// Messenger API parameters
if (!config.FB_PAGE_TOKEN) {
	throw new Error('missing FB_PAGE_TOKEN');
}
if (!config.FB_VERIFY_TOKEN) {
	throw new Error('missing FB_VERIFY_TOKEN');
}
if (!config.API_AI_CLIENT_ACCESS_TOKEN) {
	throw new Error('missing API_AI_CLIENT_ACCESS_TOKEN');
}
if (!config.FB_APP_SECRET) {
	throw new Error('missing FB_APP_SECRET');
}
if (!config.SERVER_URL) { //used for ink to static files
	throw new Error('missing SERVER_URL');
}
if (!config.PG_CONFIG) { //postgre SQL cofig missing
	throw new Error('missing PG_CONFIG');
}




app.set('port', (process.env.PORT || 5000))

//verify request came from facebook
app.use(bodyParser.json({
	verify: verifyRequestSignature
}));

//serve static files in the public directory
app.use(express.static('public'));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
	extended: false
}))

// Process application/json
app.use(bodyParser.json())




const apiAiService = apiai(config.API_AI_CLIENT_ACCESS_TOKEN, {
	language: "en",
	requestSource: "fb"
});
const sessionIds = new Map();

// Index route
app.get('/', function (req, res) {
	res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
	console.log("request");
	if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === config.FB_VERIFY_TOKEN) {
		res.status(200).send(req.query['hub.challenge']);
	} else {
		console.error("Failed validation. Make sure the validation tokens match.");
		res.sendStatus(403);
	}
})

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook/', function (req, res) {
	var data = req.body;
	console.log(JSON.stringify(data));



	// Make sure this is a page subscription
	if (data.object == 'page') {
		// Iterate over each entry
		// There may be multiple if batched
		data.entry.forEach(function (pageEntry) {
			var pageID = pageEntry.id;
			var timeOfEvent = pageEntry.time;

			// Iterate over each messaging event
			pageEntry.messaging.forEach(function (messagingEvent) {
				if (messagingEvent.optin) {
					receivedAuthentication(messagingEvent);
				} else if (messagingEvent.message) {
					receivedMessage(messagingEvent);
				} else if (messagingEvent.delivery) {
					receivedDeliveryConfirmation(messagingEvent);
				} else if (messagingEvent.postback) {
					receivedPostback(messagingEvent);
				} else if (messagingEvent.read) {
					receivedMessageRead(messagingEvent);
				} else if (messagingEvent.account_linking) {
					receivedAccountLink(messagingEvent);
				} else {
					console.log("Webhook received unknown messagingEvent: ", messagingEvent);
				}
			});
		});

		// Assume all went well.
		// You must send back a 200, within 20 seconds
		res.sendStatus(200);
	}
});





function receivedMessage(event) {

	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var timeOfMessage = event.timestamp;
	var message = event.message;

	if (!sessionIds.has(senderID)) {
		sessionIds.set(senderID, uuid.v1());
	}
	//console.log("Received message for user %d and page %d at %d with message:", senderID, recipientID, timeOfMessage);
	//console.log(JSON.stringify(message));

	var isEcho = message.is_echo;
	var messageId = message.mid;
	var appId = message.app_id;
	var metadata = message.metadata;

	// You may get a text or attachment but not both
	var messageText = message.text;
	var messageAttachments = message.attachments;
	var quickReply = message.quick_reply;

	if (isEcho) {
		handleEcho(messageId, appId, metadata);
		return;
	} else if (quickReply) {
		handleQuickReply(senderID, quickReply, messageId);
		return;
	}


	if (messageText) {
		//send message to api.ai
		sendToApiAi(senderID, messageText);
	} else if (messageAttachments) {
		handleMessageAttachments(messageAttachments, senderID);
	}
}


function handleMessageAttachments(messageAttachments, senderID){
	//for now just reply
	sendTextMessage(senderID, "Attachment received. Thank you.");	
}

function handleQuickReply(senderID, quickReply, messageId) {
	var quickReplyPayload = quickReply.payload;
	console.log("Quick reply for message %s with payload %s", messageId, quickReplyPayload);
	//send payload to api.ai
	sendToApiAi(senderID, quickReplyPayload);
}

//https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-echo
function handleEcho(messageId, appId, metadata) {
	// Just logging message echoes to console
	console.log("Received echo for message %s and app %d with metadata %s", messageId, appId, metadata);
}

function handleApiAiAction(sender, action, responseText, contexts, parameters) {
	switch (action) {
		default:
		case jobs:


		let job=[
		{
			"title": "NodeJS ",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            "subtitle": "| Full Stack Web Developer | 2+ Years",
            "buttons": [
            {

                       "type": "postback",
                "payload": "NodeJS",
                "title": "Know More"
                              
                            
            },
              {
              	 "type": "element_share",
                "share_contents": { 
                  "attachment": {
                    "type": "template",
                    "payload": {
                      "template_type": "generic",
                      "elements": [
                       {
                          "title": "NodeJS",
                          
                          "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
                          
                          "buttons": [
                            {
                            	 "type": "web_url",
                "url": "http://www.fluidonomics.com/nodejs/",
                "title": "Know more",
                "webview_height_ratio": "tall"
                              
                            }
                          ]
                        }
                      ]

             }
         }
     }

              }
            ]

		},
		{
			"title": "QA Engineer",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
           "subtitle": "2+ Years",
            "buttons": [
              {
              "type": "postback",
                "payload": "Testing",
                "title": "Know More"
			
              },
               {
              	 "type": "element_share",
                "share_contents": { 
                  "attachment": {
                    "type": "template",
                    "payload": {
                      "template_type": "generic",
                      "elements": [
                       {
                          "title": "QA Engineer",
                          
                          "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
                          
                          "buttons": [
                            {
                        "type": "web_url",
                "url": "http://www.fluidonomics.com/software-testing-pune/",
                "title": "Apply now",
                "webview_height_ratio": "tall"
                              
                            }
                          ]
                        }
                      ]

             }
         }
     }

              }
            ]

		},
		{
			"title": "Sr. Java Developer ",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            "subtitle": "4+ Years",
            
            "buttons": [
              {
               "type": "web_url",
                "url": "http://www.fluidonomics.com/sr-java-developer-4-years/",
                "title": "Know More",
                "webview_height_ratio": "tall"
                

              },
              {
              	 "type": "element_share",
                "share_contents": { 
                  "attachment": {
                    "type": "template",
                    "payload": {
                      "template_type": "generic",
                      "elements": [
                       {
                          "title": "Java Developer",
                          
                          "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
                          
                          "buttons": [
                            {
                            	"type": "web_url",
                "url": "http://www.fluidonomics.com/sr-java-developer-4-years/",
                "title": "Know More",
                "webview_height_ratio": "tall"
                              
                            }
                          ]
                        }
                      ]

             }
         }
     }

              }

            ]

		},
	{
			"title": "HR | Internship",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            
            "buttons": [
              {
               "type": "web_url",
                "url": "http://www.fluidonomics.com/hr-internship-pune/",
                "title": "Know More",
                "webview_height_ratio": "tall"
                

              },
               {
              	 "type": "element_share",
                "share_contents": { 
                  "attachment": {
                    "type": "template",
                    "payload": {
                      "template_type": "generic",
                      "elements": [
                       {
                          "title": "HR Internship",
                          
                          "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
                          
                          "buttons": [
                            {
                            "type": "web_url",
                "url": "http://www.fluidonomics.com/hr-internship-pune/",
                "title": "Apply now",
                "webview_height_ratio": "tall"
                              
                            }
                          ]
                        }
                      ]

             }
         }
     }

              }
            ]

		},
{
			
"title": "Security Testing",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            "subtitle": "3+ Years",
            "buttons": [
              {
               "type": "web_url",
                "url": "http://www.fluidonomics.com/security-testing-3-years/",
                "title": "Apply now",
                "webview_height_ratio": "tall"
                

              },
              {
              	 "type": "element_share",
                "share_contents": { 
                  "attachment": {
                    "type": "template",
                    "payload": {
                      "template_type": "generic",
                      "elements": [
                       {
                          "title": "Security Testing",
                          
                          "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
                          
                          "buttons": [
                            {
                            "type": "web_url",
                "url": "http://www.fluidonomics.com/security-testing-3-years/",
                "title": "Know More",
                "webview_height_ratio": "tall"
                              
                            }
                          ]
                        }
                      ]

             }
         }
     }

              }
            ]

		}


		];
		sendGenericMessage(senderID,job);
		let reply =[
		
		{
        "content_type":"text",
        "title":"Apply Now",
        "payload":"Apply"
      }			
		
		];
		sendQuickReply(sender,responseText,reply);

		break;
			//unhandled action, just send back the text
			sendTextMessage(sender, responseText);
	}
}

function handleMessage(message, sender) {
	switch (message.type) {
		case 0: //text
			sendTextMessage(sender, message.speech);
			break;
		case 2: //quick replies
			let replies = [];
			for (var b = 0; b < message.replies.length; b++) {
				let reply =
				{
					"content_type": "text",
					"title": message.replies[b],
					"payload": message.replies[b]
				}
				replies.push(reply);
			}
			sendQuickReply(sender, message.title, replies);
			break;
		case 3: //image
			sendImageMessage(sender, message.imageUrl);
			break;
		case 4:
			// custom payload
			var messageData = {
				recipient: {
					id: sender
				},
				message: message.payload.facebook

			};

			callSendAPI(messageData);

			break;
	}
}


function handleCardMessages(messages, sender) {

	let elements = [];
	for (var m = 0; m < messages.length; m++) {
		let message = messages[m];
		let buttons = [];
		for (var b = 0; b < message.buttons.length; b++) {
			let isLink = (message.buttons[b].postback.substring(0, 4) === 'http');
			let button;
			if (isLink) {
				button = {
					"type": "web_url",
					"title": message.buttons[b].text,
					"url": message.buttons[b].postback
				}
			} else {
				button = {
					"type": "postback",
					"title": message.buttons[b].text,
					"payload": message.buttons[b].postback
				}
			}
			buttons.push(button);
		}


		let element = {
			"title": message.title,
			"image_url":message.imageUrl,
			"subtitle": message.subtitle,
			"buttons": buttons
		};
		elements.push(element);
	}
	sendGenericMessage(sender, elements);
}


function handleApiAiResponse(sender, response) {
	let responseText = response.result.fulfillment.speech;
	let responseData = response.result.fulfillment.data;
	let messages = response.result.fulfillment.messages;
	let action = response.result.action;
	let contexts = response.result.contexts;
	let parameters = response.result.parameters;

	sendTypingOff(sender);

	if (isDefined(messages) && (messages.length == 1 && messages[0].type != 0 || messages.length > 1)) {
		let timeoutInterval = 1100;
		let previousType ;
		let cardTypes = [];
		let timeout = 0;
		for (var i = 0; i < messages.length; i++) {

			if ( previousType == 1 && (messages[i].type != 1 || i == messages.length - 1)) {

				timeout = (i - 1) * timeoutInterval;
				setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
				cardTypes = [];
				timeout = i * timeoutInterval;
				setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
			} else if ( messages[i].type == 1 && i == messages.length - 1) {
				cardTypes.push(messages[i]);
                		timeout = (i - 1) * timeoutInterval;
                		setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
                		cardTypes = [];
			} else if ( messages[i].type == 1 ) {
				cardTypes.push(messages[i]);
			} else {
				timeout = i * timeoutInterval;
				setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
			}

			previousType = messages[i].type;

		}
	} else if (responseText == '' && !isDefined(action)) {
		//api ai could not evaluate input.
		console.log('Unknown query' + response.result.resolvedQuery);
	sendTextMessage(sender, "I'm not sure what you want. Can you be more specific?");
		
	} else if (isDefined(action)) {
		handleApiAiAction(sender, action, responseText, contexts, parameters);
	} else if (isDefined(responseData) && isDefined(responseData.facebook)) {
		try {
			console.log('Response as formatted message' + responseData.facebook);
			sendTextMessage(sender, responseData.facebook);
		} catch (err) {
			sendTextMessage(sender, err.message);
		}
	} else if (isDefined(responseText)) {

		sendTextMessage(sender, responseText);
	}
}

function sendToApiAi(sender, text) {

	sendTypingOn(sender);
	let apiaiRequest = apiAiService.textRequest(text, {
		sessionId: sessionIds.get(sender)
	});

	apiaiRequest.on('response', (response) => {
		if (isDefined(response.result)) {
			handleApiAiResponse(sender, response);
		}
	});

	apiaiRequest.on('error', (error) => console.error(error));
	apiaiRequest.end();
}




function sendTextMessage(recipientId, text) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			text: text
		}
	}
	callSendAPI(messageData);
}

/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage(recipientId, imageUrl) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "image",
				payload: {
					url: imageUrl
				}
			}
		}
	};

	callSendAPI(messageData);
}

/*
 * Send a Gif using the Send API.
 *
 */
function sendGifMessage(recipientId) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "image",
				payload: {
					url: config.SERVER_URL + "/assets/instagram_logo.gif"
				}
			}
		}
	};

	callSendAPI(messageData);
}

/*
 * Send audio using the Send API.
 *
 */
function sendAudioMessage(recipientId) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "audio",
				payload: {
					url: config.SERVER_URL + "/assets/sample.mp3"
				}
			}
		}
	};

	callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 * example videoName: "/assets/allofus480.mov"
 */
function sendVideoMessage(recipientId, videoName) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "video",
				payload: {
					url: config.SERVER_URL + videoName
				}
			}
		}
	};

	callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 * example fileName: fileName"/assets/test.txt"
 */
function sendFileMessage(recipientId, fileName) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "file",
				payload: {
					url: config.SERVER_URL + fileName
				}
			}
		}
	};

	callSendAPI(messageData);
}



/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId, text, buttons) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "template",
				payload: {
					template_type: "button",
					text: text,
					buttons: buttons
				}
			}
		}
	};

	callSendAPI(messageData);
}


function sendGenericMessage(recipientId, elements) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "template",
				payload: {
					template_type: "generic",
					elements: elements
				}
			}
		}
	};

	callSendAPI(messageData);
}


function sendReceiptMessage(recipientId, recipient_name, currency, payment_method,
							timestamp, elements, address, summary, adjustments) {
	// Generate a random receipt ID as the API requires a unique ID
	var receiptId = "order" + Math.floor(Math.random() * 1000);

	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "template",
				payload: {
					template_type: "receipt",
					recipient_name: recipient_name,
					order_number: receiptId,
					currency: currency,
					payment_method: payment_method,
					timestamp: timestamp,
					elements: elements,
					address: address,
					summary: summary,
					adjustments: adjustments
				}
			}
		}
	};

	callSendAPI(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
function sendQuickReply(recipientId, text, replies, metadata) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			text: text,
			metadata: isDefined(metadata)?metadata:'',
			quick_replies: replies
		}
	};

	callSendAPI(messageData);
}

/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt(recipientId) {

	var messageData = {
		recipient: {
			id: recipientId
		},
		sender_action: "mark_seen"
	};

	callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {


	var messageData = {
		recipient: {
			id: recipientId
		},
		sender_action: "typing_on"
	};

	callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {


	var messageData = {
		recipient: {
			id: recipientId
		},
		sender_action: "typing_off"
	};

	callSendAPI(messageData);
}

/*
 * Send a message with the account linking call-to-action
 *
 */
function sendAccountLinking(recipientId) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "template",
				payload: {
					template_type: "button",
					text: "Welcome. Link your account.",
					buttons: [{
						type: "account_link",
						url: config.SERVER_URL + "/authorize"
          }]
				}
			}
		}
	};

	callSendAPI(messageData);
}


function greetUserText(userId) {
	//first read user firstname
	request({
		uri: 'https://graph.facebook.com/v2.7/' + userId,
		qs: {
			access_token: config.FB_PAGE_TOKEN
		}

	}, function (error, response, body) {
		if (!error && response.statusCode == 200) {

			var user = JSON.parse(body);

			if (user.first_name) {

var pool = new pg.Pool(config.PG_CONFIG);
pool.connect(function(err, client, done) {
	if (err) {
		return console.error('Error acquiring client', err.stack);
	}
	var rows = [];
	console.log('fetching user');
	client.query(`SELECT id FROM users WHERE fb_id='${userId}' LIMIT 1`,
		function(err, result) {
			console.log('query result ' + result);
			if (err) {
				console.log('Query error: ' + err);
			} else {
				console.log('rows: ' + result.rows.length);
				if (result.rows.length === 0) {
					let sql = 'INSERT INTO users (fb_id, first_name, last_name, profile_pic, ' +
						'locale, timezone, gender) VALUES ($1, $2, $3, $4, $5, $6, $7)';
					console.log('sql: ' + sql);
					client.query(sql,
						[
							userId,
							user.first_name,
							user.last_name,
							user.profile_pic,
							user.locale,
							user.timezone,
							user.gender
						]);
				}
			}
		});

});
pool.end();
				console.log("FB user: %s %s, %s",
					user.first_name, user.last_name, user.gender);

				sendTextMessage(userId, "Hello!! " + user.first_name + ' , welcome to Fluidonomics, how can i help you today');
			} else {
				console.log("Cannot get data for fb user with id",
					userId);
			}
		} else {
			console.error(response.error);
		}

	});
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData) {
	request({
		uri: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {
			access_token: config.FB_PAGE_TOKEN
		},
		method: 'POST',
		json: messageData

	}, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var recipientId = body.recipient_id;
			var messageId = body.message_id;

			if (messageId) {
				console.log("Successfully sent message with id %s to recipient %s",
					messageId, recipientId);
			} else {
				console.log("Successfully called Send API for recipient %s",
					recipientId);
			}
		} else {
			console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
		}
	});
}



/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
function receivedPostback(event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var timeOfPostback = event.timestamp;

	// The 'payload' param is a developer-defined field which is set in a postback 
	// button for Structured Messages. 
	var payload = event.postback.payload;

	switch (payload) {
		case"Welcome":
		greetUserText(senderID);
		sendTypingOn(sender);

		let delements=[
		{
			"title": "Fluidonomics",
            "image_url": "https://drive.google.com/uc?export=view&id=1qzPbg6mX-tZMCLD54IhVtV9_K95LDFUm",
            "subtitle": "Technology Solutions company",
            "buttons": [
              {
               "type": "postback",
                "payload": "About_us",
                "title": "About us"

              },
              {
           
                "type": "web_url",
                "url": "http://www.fluidonomics.com/",
                "title": "Website",
                "webview_height_ratio": "tall"

              }
            ]

		},
		{
			"title": "Jobs",
            "image_url": "https://drive.google.com/uc?export=view&id=1cLkmfptrOYzOM5rtH_T70Mlx29yfIsUC",
            "subtitle": "Find Current Openings and Apply for Jobs",
            "buttons": [
              {
               "type": "postback",
                "payload": "Openings",
                "title": "Current Opening"

              }
            ]

		},
		{
			"title": "Contact",
            "image_url": "https://drive.google.com/uc?export=view&id=1APXbC8pvW2QChj1sWmSOQiMtsgKirhLU",
            "subtitle": "Conatct Us",
            "buttons": [
              {
               "type": "postback",
                "payload": "Email",
                "title": "Email"

              },
              {
                "type": "postback",
                "payload": "Contact_man",
                "title": "Management"
              }
            ]

		},
		{
			"title": "Offices",
            "image_url": "https://drive.google.com/uc?export=view&id=1mrJrLQ3S7WSXhtr2NdTweJRsTdmdLv9q",
            "subtitle": "Pune, Indore and Ujjain",
            "buttons": [
              {
               "type": "postback",
                "payload": "Offices",
                "title": "Details"

              }
             
                
              
            ]

		},
		{
			"title": "Services",
            "image_url": "https://drive.google.com/uc?export=view&id=19cU9Z7kl2nUVsOkiWwMv4m1YcRlI0wP_",
            "subtitle": "Services Provided by Fluidonomics",
            "buttons": [
              {
               "type": "postback",
                "payload": "services",
                "title": "Services"

              }
            ]

		}
		];
		sendGenericMessage(senderID,delements);

		break;
		case"About_us":
		let about_fluid=[
		{
			"title": "Welcome to Fluidonomics",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            
		}
        
		];

		sendGenericMessage(senderID,about_fluid);
		sendTypingOn(senderID);
		sendTextMessage(senderID,"Technology Solutions company with modern techno-creative fluid blend as its principle."+" Developing economically feasible, artistically adaptable, and technically cutting edge solutions as its focus.");
sendTextMessage(senderID, "Based on stage goals of organization we serve through choice of tracks. Acceleration, Build, Change, Direct and Economize"+" We promise no box-pushing, no hyper-specialization cacophony and no take your pick selling"+" We are a Perfect Fluid Blend of Art and Science");

		break;
		case"Contact":
		sendToApiAi(senderID,"Contact");
		break;
		case"Contact_man":
		let elements=[
		{
			"title": "Deepesh Sodhi",
            "image_url": "http://www.fluidonomics.com/wp-content/uploads/2016/05/sodhi.jpg",
            "subtitle": "Ceo Fluidonomics",
            "buttons": [
              {
                "type": "web_url",
                "url": "https://www.linkedin.com/in/deepeshsodhi/",
                "title": "Linkedin",
                "webview_height_ratio": "tall"
              }
            ]

		},
			{
			"title": "Aditya Shastri",
            "image_url": "https://media-exp1.licdn.com/mpr/mpr/shrinknp_200_200/p/2/000/07b/2d5/3377ec7.jpg",
            "subtitle": "Ceo Fluidonomics",
            "buttons": [
              {
                "type": "web_url",
                "url": "https://www.linkedin.com/in/adishastri/",
                "title": "Linkedin",
                "webview_height_ratio": "tall"
              }
              ]
          }

		];
		sendGenericMessage(senderID,elements);
		break;
		case"Openings":

		let jbopening=[
		{
			"title": "NodeJS ",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            "subtitle": "| Full Stack Web Developer | 2+ Years",
            "buttons": [
            {

                       "type": "postback",
                "payload": "NodeJS",
                "title": "Know More"
                              
                            
            },
              {
              	 "type": "element_share",
                "share_contents": { 
                  "attachment": {
                    "type": "template",
                    "payload": {
                      "template_type": "generic",
                      "elements": [
                       {
                          "title": "NodeJS",
                          
                          "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
                          
                          "buttons": [
                            {
                            	 "type": "web_url",
                "url": "http://www.fluidonomics.com/nodejs/",
                "title": "Know more",
                "webview_height_ratio": "tall"
                              
                            }
                          ]
                        }
                      ]

             }
         }
     }

              }
            ]

		},
		{
			"title": "QA Engineer",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
           "subtitle": "2+ Years",
            "buttons": [
              {
              "type": "postback",
                "payload": "Testing",
                "title": "Know More"
			
              },
               {
              	 "type": "element_share",
                "share_contents": { 
                  "attachment": {
                    "type": "template",
                    "payload": {
                      "template_type": "generic",
                      "elements": [
                       {
                          "title": "QA Engineer",
                          
                          "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
                          
                          "buttons": [
                            {
                        "type": "web_url",
                "url": "http://www.fluidonomics.com/software-testing-pune/",
                "title": "Apply now",
                "webview_height_ratio": "tall"
                              
                            }
                          ]
                        }
                      ]

             }
         }
     }

              }
            ]

		},
		{
			"title": "Sr. Java Developer ",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            "subtitle": "4+ Years",
            
            "buttons": [
              {
               "type": "web_url",
                "url": "http://www.fluidonomics.com/sr-java-developer-4-years/",
                "title": "Know More",
                "webview_height_ratio": "tall"
                

              },
              {
              	 "type": "element_share",
                "share_contents": { 
                  "attachment": {
                    "type": "template",
                    "payload": {
                      "template_type": "generic",
                      "elements": [
                       {
                          "title": "Java Developer",
                          
                          "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
                          
                          "buttons": [
                            {
                            	"type": "web_url",
                "url": "http://www.fluidonomics.com/sr-java-developer-4-years/",
                "title": "Know More",
                "webview_height_ratio": "tall"
                              
                            }
                          ]
                        }
                      ]

             }
         }
     }

              }

            ]

		},
	{
			"title": "HR | Internship",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            
            "buttons": [
              {
               "type": "web_url",
                "url": "http://www.fluidonomics.com/hr-internship-pune/",
                "title": "Know More",
                "webview_height_ratio": "tall"
                

              },
               {
              	 "type": "element_share",
                "share_contents": { 
                  "attachment": {
                    "type": "template",
                    "payload": {
                      "template_type": "generic",
                      "elements": [
                       {
                          "title": "HR Internship",
                          
                          "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
                          
                          "buttons": [
                            {
                            "type": "web_url",
                "url": "http://www.fluidonomics.com/hr-internship-pune/",
                "title": "Apply now",
                "webview_height_ratio": "tall"
                              
                            }
                          ]
                        }
                      ]

             }
         }
     }

              }
            ]

		},
{
			
"title": "Security Testing",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            "subtitle": "3+ Years",
            "buttons": [
              {
               "type": "web_url",
                "url": "http://www.fluidonomics.com/security-testing-3-years/",
                "title": "Apply now",
                "webview_height_ratio": "tall"
                

              },
              {
              	 "type": "element_share",
                "share_contents": { 
                  "attachment": {
                    "type": "template",
                    "payload": {
                      "template_type": "generic",
                      "elements": [
                       {
                          "title": "Security Testing",
                          
                          "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
                          
                          "buttons": [
                            {
                            "type": "web_url",
                "url": "http://www.fluidonomics.com/security-testing-3-years/",
                "title": "Know More",
                "webview_height_ratio": "tall"
                              
                            }
                          ]
                        }
                      ]

             }
         }
     }

              }
            ]

		}


		];
		sendGenericMessage(senderID,jbopening);
		let replies =
		{

		}
		break;
		case"services":
		let fluidservices=[
		{
			"title": "Branding and Designing",
			"subtitle": "Branding, Logo Designing, Corporate Identity, Corporate Presentations, Concept Creations, Marketing Material for Offline and Online Mediums,  Info-graphics",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            
		},
		{"title": "Web and Mobile Development",
			"subtitle": "Designing and Developing Web and Mobile interfaces. User Experiences with simple information display or complex back end solutions",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            

		},
		{"title": "Backoffice Operations",
			"subtitle": "The iPad, the app, the cloud, the x-commerce, the content and everything to do with the digital life that we lead…",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            

		},
		{
		"title": "Market Research",
			"subtitle": "Primary and Secondary Research, Market Segmentation, Customer Profiling, Data Verification, Data Enrichment, Contact Details Verfication",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            
        },
        {
        	"title": "Digitial Marketing",
			"subtitle": "Content development and Campaign Management for micro targeted and result oriented digital marketing through Social Media Channels, Mobile Applications, Emails, SMSs etc.",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            
        },
        {
        	"title": "Lead Generation",
			"subtitle": "Qualified Sales Lead Generation and Appointment Setting through extensive marketing research and focused digital marketing",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            
        }
		];
		let fluidreplies=[
		{
			"content_type":"Text",
        "title":"Main Menu",
        "payload":"default"
		}

		]

		sendGenericMessage(senderID,fluidservices);
		sendQuickReply(senderID,fluidreplies);

		break;


		case"participate":
		sendToApiAi(senderID,"participate");
		break;
		default:
			//unindentified payload
			let ele=[
	{
			"title": "Fluidonomics",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            "subtitle": "Technology Solutions company",
            "buttons": [
              {
               "type": "postback",
                "payload": "About_us",
                "title": "About us"

              },
              {
           
                "type": "web_url",
                "url": "http://www.fluidonomics.com/",
                "title": "Website",
                "webview_height_ratio": "tall"

              }
            ]

		},
		{
			"title": "Jobs",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            "subtitle": "Find Current Openings and Apply for Jobs",
            "buttons": [
              {
               "type": "postback",
                "payload": "Openings",
                "title": "Current Opening"

              }
            ]

		},
		{
			"title": "Contact",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            "subtitle": "Conatct Us",
            "buttons": [
              {
               "type": "postback",
                "payload": "Email",
                "title": "Email"

              },
              {
                "type": "postback",
                "payload": "Contact_man",
                "title": "Management"
              }
            ]

		},
		{
			"title": "Offices",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            "subtitle": "Pune, Indore and Ujjain",
            "buttons": [
              {
               "type": "postback",
                "payload": "Offices",
                "title": "Details"

              }
             
                
              
            ]

		},
		{
			"title": "Services",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            "subtitle": "Services Provided by Fluidonomics",
            "buttons": [
              {
               "type": "postback",
                "payload": "services",
                "title": "Services"

              },
              {
              	"type": "postback",
                "payload": "Client",
                "title": "Our Clients"
                
              }
            ]

		}


		];
		sendGenericMessage(senderID,ele);
			
			break;
			case"Offices":
			let officefluid = [
			{
			"title": "Pune ",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            "subtitle": "Office #3, Surya Suman Building, Lane #2 / Road #15, Kalyani Nagar, Pune, Maharashtra 411006",
            "buttons": [
            {

                            	 "type": "web_url",
                "url": "https://www.google.co.in/maps/dir/''/fluidonomics/@18.5489811,73.8310685,12z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3bc2c1109b7970ef:0x4e67ea53344e83b7!2m2!1d73.901109!2d18.548994",
                "title": "Get Directions",
                "webview_height_ratio": "tall"
                              
                            
            },
              {
              	 "type": "element_share",
                "share_contents": { 
                  "attachment": {
                    "type": "template",
                    "payload": {
                      "template_type": "generic",
                      "elements": [
                       {
                          "title": "NodeJS",
                          
                          "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
                          
                          "buttons": [
                            {
                            	 "type": "web_url",
                "url": "https://www.google.co.in/maps/dir/''/fluidonomics/@18.5489811,73.8310685,12z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3bc2c1109b7970ef:0x4e67ea53344e83b7!2m2!1d73.901109!2d18.548994",
                "title": "Get Directions",
                "webview_height_ratio": "tall"
                              
                              
                            }
                          ]
                        }
                      ]

             }
         }
     }

              }
            ]

		},
		{
			"title": "Indore",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
           "subtitle": "Rajani Bhawan, Mahatma Gandhi Rd, Nehru Park 2, Shivaji Nagar, Indore",
            "buttons": [
              {
              "type": "web_url",
                "url": "https://www.google.co.in/maps/place/Rajani+Bhawan,+Mahatma+Gandhi+Rd,+Nehru+Park+2,+Shivaji+Nagar,+Indore,+Madhya+Pradesh+452003/@22.7208446,75.8713118,17z/data=!3m1!4b1!4m5!3m4!1s0x3962fd144b8d04e7:0x99df3c68ccdcb57d!8m2!3d22.7208446!4d75.8735004?hl=en",
                "title": "Get Directions",
                "webview_height_ratio": "tall"
			
              },
               {
              	 "type": "element_share",
                "share_contents": { 
                  "attachment": {
                    "type": "template",
                    "payload": {
                      "template_type": "generic",
                      "elements": [
                       {
                          "title": "QA Engineer",
                          
                          "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
                          
                          "buttons": [
                            {
                         "type": "web_url",
                "url": "https://www.google.co.in/maps/place/Rajani+Bhawan,+Mahatma+Gandhi+Rd,+Nehru+Park+2,+Shivaji+Nagar,+Indore,+Madhya+Pradesh+452003/@22.7208446,75.8713118,17z/data=!3m1!4b1!4m5!3m4!1s0x3962fd144b8d04e7:0x99df3c68ccdcb57d!8m2!3d22.7208446!4d75.8735004?hl=en",
                "title": "Get Directions",
                "webview_height_ratio": "tall"
                              
                            }
                          ]
                        }
                      ]

             }
         }
     }

              }
            ]

		},
		{
			"title": "Ujjain",
            "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
            "subtitle": "74 Sakhipura, Indore Gate, Ujjain Madhya Pardesh ",
            
            "buttons": [
              {
               "type": "web_url",
                "url": "https://www.google.com/maps/place/23%C2%B010'43.6%22N+75%C2%B046'33.8%22E/@23.178774,75.7738743,17z/data=!3m1!4b1!4m5!3m4!1s0x0:0x0!8m2!3d23.178774!4d75.776063?hl=en",
                "title": "Get Directions",
                "webview_height_ratio": "tall"
                

              },
              {
              	 "type": "element_share",
                "share_contents": { 
                  "attachment": {
                    "type": "template",
                    "payload": {
                      "template_type": "generic",
                      "elements": [
                       {
                          "title": "Java Developer",
                          
                          "image_url": "https://media-exp2.licdn.com/media/AAEAAQAAAAAAAAi8AAAAJGQ2YjdlM2JjLTQ2ZWEtNGE5Zi04NTRlLTA4YzliODk0ODYyNA.png",
                          
                          "buttons": [
                            {
                          "type": "web_url",
                "url": "https://www.google.com/maps/place/23%C2%B010'43.6%22N+75%C2%B046'33.8%22E/@23.178774,75.7738743,17z/data=!3m1!4b1!4m5!3m4!1s0x0:0x0!8m2!3d23.178774!4d75.776063?hl=en",
                "title": "Get Directions",
                "webview_height_ratio": "tall"
                              
                            }
                          ]
                        }
                      ]

             }
         }
     }

              }

            ]

		}
];
sendGenericMessage(senderID,officefluid);
	let jobreply =[
		
		{
        "content_type":"text",
        "title":"Apply Now",
        "payload":"Apply"
      }			
		
		];
		sendQuickReply(sender,responseText,jobreply);

			break;

	}

	console.log("Received postback for user %d and page %d with payload '%s' " +
		"at %d", senderID, recipientID, payload, timeOfPostback);

}


/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 * 
 */
function receivedMessageRead(event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;

	// All messages before watermark (a timestamp) or sequence have been seen.
	var watermark = event.read.watermark;
	var sequenceNumber = event.read.seq;

	console.log("Received message read event for watermark %d and sequence " +
		"number %d", watermark, sequenceNumber);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 * 
 */
function receivedAccountLink(event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;

	var status = event.account_linking.status;
	var authCode = event.account_linking.authorization_code;

	console.log("Received account link event with for user %d with status %s " +
		"and auth code %s ", senderID, status, authCode);
}

/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about 
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var delivery = event.delivery;
	var messageIDs = delivery.mids;
	var watermark = delivery.watermark;
	var sequenceNumber = delivery.seq;

	if (messageIDs) {
		messageIDs.forEach(function (messageID) {
			console.log("Received delivery confirmation for message ID: %s",
				messageID);
		});
	}

	console.log("All message before %d were delivered.", watermark);
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var timeOfAuth = event.timestamp;

	// The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
	// The developer can set this to an arbitrary value to associate the 
	// authentication callback with the 'Send to Messenger' click event. This is
	// a way to do account linking when the user clicks the 'Send to Messenger' 
	// plugin.
	var passThroughParam = event.optin.ref;

	console.log("Received authentication for user %d and page %d with pass " +
		"through param '%s' at %d", senderID, recipientID, passThroughParam,
		timeOfAuth);

	// When an authentication is received, we'll send a message back to the sender
	// to let them know it was successful.
	sendTextMessage(senderID, "Authentication successful");
}

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
	var signature = req.headers["x-hub-signature"];

	if (!signature) {
		throw new Error('Couldn\'t validate the signature.');
	} else {
		var elements = signature.split('=');
		var method = elements[0];
		var signatureHash = elements[1];

		var expectedHash = crypto.createHmac('sha1', config.FB_APP_SECRET)
			.update(buf)
			.digest('hex');

		if (signatureHash != expectedHash) {
			throw new Error("Couldn't validate the request signature.");
		}
	}
}

function isDefined(obj) {
	if (typeof obj == 'undefined') {
		return false;
	}

	if (!obj) {
		return false;
	}

	return obj != null;
}

// Spin up the server
app.listen(app.get('port'), function () {
	console.log('running on port', app.get('port'))
})
