function extend(Child, Parent) {
	var F = function() { }
	F.prototype = Parent.prototype
	Child.prototype = new F()
	Child.prototype.constructor = Child
	Child.superclass = Parent.prototype
}

function UI() {
	var that = this;
	this.currentView = undefined;
	this.currentController = undefined;
	this.screenStack = [];

	this.displayModalView = function (screenId, onDone) {
		var view = $('#' + screenId).clone();
		$('#content').append(view);
		view.addClass('modalDialog');
		that.currentView.show();
		onDone(view);
	}

	this.changeView = function (screenId, onDone) {
		if (that.currentView) {
			that.currentView.fadeOut(400,function(){
				that.currentView.remove();
				that.displayView(screenId, onDone);
			});
		} else {
			that.displayView(screenId, onDone);
		}
	}

	this.displayView = function (screenId, onDone) {
		if (screenId == '') {
			onDone();
			return;
		}
		that.currentView = $('#' + screenId).clone();
		$('#content').append(that.currentView);
		that.currentView.fadeIn(400, onDone);
	}

	this.pushController = function(newController) {
		if (that.currentController) {
			that.currentController.onGone();
		}
		that.screenStack.push(newController);
		that.currentController = newController;
		that.currentController.onShow();
	}

	this.popController = function(count) {
		if (!count) {
			count = 1;
		}
		while (count > 0) {
			that.screenStack.pop();
			count--;
		}
		if (that.currentController) {
			that.currentController.onGone();
		}
		var controller = that.screenStack[that.screenStack.length - 1];
		controller.onRestoreState();
		that.currentController = controller;
	}

	this.showActionBar = function(buttons) {
		var bar = $('#actionBar');
		bar.fadeIn();
		bar.children().hide();
		for (var i = buttons.length - 1; i >= 0; i--) {
			var button = bar.children('#'+buttons[i].id);
			button.show();
			button.click(buttons[i].action);
		};
	}

	this.freeActionBar = function() {
		$('#actionBar').hide();
	}

	this.showHint = function(text) {
		$('#hintWindow').html(text);
		$('#hintWindow').fadeIn(400, function() {
			setTimeout(function(){
				$('#hintWindow').fadeOut(400);
			}, 3000);
		});
	}
}

var ui = new UI();

function ViewController() {

}

ViewController.prototype.getTitle = function () {
	return "Dots";
}

ViewController.prototype.onGone = function () {

}

ViewController.prototype.onShow = function () {

}

ViewController.prototype.onRestoreState = function () {
	this.onShow();
}

function MainMenuScreen() {
	MainMenuScreen.superclass.constructor.apply(this, []);
}
extend(MainMenuScreen, ViewController);

MainMenuScreen.prototype.onShow = function () {
	game = new Game(200, 200);
	gameView.game = game;
	gameView.xOffset = 0;
	gameView.yOffset = 0;
	gameView.draw();
	ui.changeView('menuScreen', function(){
		$('#miPlayOnline').click(function(){
			ui.pushController(new GameConfigScreen('network'));
		});
		$('#miPlayWithAI').click(function(){
			ui.pushController(new GameConfigScreen('ai'));
		});
		$('#miPlayHotSeat').click(function(){
			ui.pushController(new GameConfigScreen('hotseat'));
		});
		$('#miHelp').click(function(){
			window.open('http://en.wikipedia.org/wiki/Dots_(game)')
		});
		$('#miAbout').click(function(){
			ui.pushController(new AboutScreen());
		});
	});
}

function AboutScreen() {
	AboutScreen.superclass.constructor.apply(this, []);
}
extend(AboutScreen, ViewController);

AboutScreen.prototype.onShow = function () {
	var that = this;
	ui.changeView('aboutScreen', function(){
		ui.showActionBar([
			{id:"panelBtnHome", action:function(){
				ui.popController();
			}}
		]);
	});
}

AboutScreen.prototype.onGone = function () {
	ui.freeActionBar();
}

function GameConfigScreen(gameMode) {
	GameConfigScreen.superclass.constructor.apply(this, []);
	this.mapWidth = undefined;
	this.mapHeight = undefined;
	this.gameMode = gameMode;
}
extend(GameConfigScreen, ViewController);

GameConfigScreen.prototype.onShow = function () {
	var that = this;
	ui.changeView('gameConfScreen', function(){
		$('#cancelBtn').click(function(){
			ui.pushController(new MainMenuScreen());
		});
		$('#okBtn').click(function(){
			switch ($('#mapSize').val()) {
				case 'small':
					that.mapWidth = 15;
					that.mapHeight = 20;
					break;
				case 'middle':
					that.mapWidth = 25;
					that.mapHeight = 30;
					break;
				case 'large':
					that.mapWidth = 30;
					that.mapHeight = 35;
					break;
			}

			switch (that.gameMode) {
				case 'hotseat':
					ui.pushController(new HotseatGameScreen(that));
					break;
				case 'ai':
					ui.pushController(new AIGameScreen(that));
					break;
				case 'network':
					ui.pushController(new NetworkGameScreen(that));
					break;
			}	
		});
	});
}

function GameOverScreen(msg, currentPlayerColor) {
	GameOverScreen.superclass.constructor.apply(this, []);
	this.msg = msg;
	this.currentPlayerColor = currentPlayerColor;
}
extend(GameOverScreen, ViewController);

GameOverScreen.prototype.onShow = function () {
	var that = this;
	var captured = game.countCapturedDots();
	var gameOverDlgTitle = this.msg != '' ? this.msg : "Game Over";
	var gameStatistics = "Scores:<br>" +
		"<b>" + PLAYER1_COLOR_NAME + "</b> captured " + captured[PLAYER2_COLOR] + " dots<br>" + 
		"<b>" + PLAYER2_COLOR_NAME + "</b> captured " + captured[PLAYER1_COLOR] + " dots<br>";
	var gameResult = "";
	if (captured[PLAYER1_COLOR] == captured[PLAYER2_COLOR]) {
		gameResult = "Standoff :|";
	} else if (this.currentPlayerColor) {
		if (((captured[PLAYER1_COLOR] > captured[PLAYER2_COLOR]) && this.currentPlayerColor == PLAYER1_COLOR) ||
			((captured[PLAYER2_COLOR] > captured[PLAYER1_COLOR]) && this.currentPlayerColor == PLAYER2_COLOR)) {
			gameResult = "You Win! =)";
		} else {
			gameResult = "You Lose... ;(";
		}
	} else {
		if (captured[PLAYER1_COLOR] > captured[PLAYER2_COLOR]) {
			gameResult = PLAYER1_COLOR + " Win!";
		} else {
			gameResult = PLAYER2_COLOR + " Win!";
		}
	}
	$('#gameOverDlgTitle').html(gameOverDlgTitle);
	$('#gameResult').html(gameResult);
	$('#gameStatistics').html(gameStatistics);
	ui.changeView('gameOverDialog', function(){
		$('#gameOverMenuBtn').click(function(){
			ui.pushController(new MainMenuScreen());
		});
		$('#analizeBtn').click(function(){
			ui.changeView('', function(){

			});
		});
	});
}

function HotseatGameScreen(config) {
	HotseatGameScreen.superclass.constructor.apply(this, []);
	this.config = config;
}
extend(HotseatGameScreen, ViewController);

HotseatGameScreen.prototype.onShow = function () {
	game = new Game(this.config.mapWidth, this.config.mapHeight);
	game.player1.name = "player1";
	game.player2.name = "player2";
	gameView.game = game;
	gameView.centerViewOnPage();
	gameView.draw();

	gameView.onClickCell = function(x, y) {
		if (game.putDot(x, y, true)) {
			game.switchPlayer();
		}
		gameView.draw();

		if (game.isGameOver()) {
			ui.pushController(new GameOverScreen(''));
		}
	};

	ui.changeView('',function() {
		ui.showActionBar([
			{id:"panelBtnHome", action:function(){
				ui.popController(2);
			}}
		]);
	});	
}

HotseatGameScreen.prototype.onGone = function () {
	ui.freeActionBar();
}

function AIGameScreen(config) {
	AIGameScreen.superclass.constructor.apply(this, []);
	this.config = config;
}
extend(AIGameScreen, ViewController);

AIGameScreen.prototype.onShow = function () {
	game = new Game(this.config.mapWidth, this.config.mapHeight);
	game.player1.name = "Human";
	game.player2.name = "Bender";
	gameView.game = game;
	gameView.centerViewOnPage();
	gameView.draw();

	gameView.onClickCell = function(x, y) {
		if (game.currentPlayer.name == 'Human') {
			if (game.putDot(x, y, true)) {
				game.switchPlayer();
				if (!game.isGameOver()) {
					var decision = game.makeAIDecision();
					game.putDot(decision.x, decision.y, true);
					game.switchPlayer();
				}
			}
		}
		gameView.draw();

		if (game.isGameOver()) {
			ui.pushController(new GameOverScreen('', game.player1.color));
		}
	};

	ui.changeView('',function() {
		ui.showActionBar([
			{id:"panelBtnHome", action:function(){
				ui.popController(2);
			}}
		]);
	});	
}

AIGameScreen.prototype.onGone = function () {
	ui.freeActionBar();
}

var NETWORK_GAME_ADDRESS = "localhost:8080/connect-user";
var	MSG_TYPE_ERROR = "error";
var	MSG_TYPE_USERINFO = "UserInfo";
var	MSG_TYPE_NEWGAME_REQUEST = "RequestNewGame";
var	MSG_TYPE_GAMESTARTED = "GameStarted";
var	MSG_TYPE_OPPONENT_DISCONNECTED = "OpponentDisconnected";
var	MSG_TYPE_GAME_MOVE = "GameMove";
var	MSG_TYPE_GAME_CHAT_MESSAGE = "GameChatMessage";
function NetworkGameScreen(config) {
	NetworkGameScreen.superclass.constructor.apply(this, []);
	this.socket = undefined;
	this.preferredConfig = config;
	this.currentGameConfig = undefined;
	this.currentPlayerColor = undefined;
	this.gameStarted = false;
	this.chatPanel = undefined;
	this.unreadMsgs = 0;
}
extend(NetworkGameScreen, ViewController);

NetworkGameScreen.prototype.onShow = function () {
	var that = this;
	game = new Game(this.preferredConfig.mapWidth, this.preferredConfig.mapHeight);
	game.player1.name = "guest";
	game.player2.name = "guest";
	gameView.game = game;
	gameView.centerViewOnPage();
	gameView.draw();

	gameView.onClickCell = function(x, y) { that.onClickCell(x, y); };

	this.initChatPanel();
	ui.changeView('waitingDialog',function() { that.onReadyToConnect(); });	
}

NetworkGameScreen.prototype.onGone = function () {
	ui.freeActionBar();
	this.chatPanel.remove();
}

NetworkGameScreen.prototype.onClickCell = function (x, y) {
	if (!this.gameStarted) {
		return;
	}
	if (this.currentPlayerColor != game.currentPlayer.color) {
		ui.showHint('Not your turn!');
		return;
	}
	if (game.putDot(x, y, true)) {
		this.socket.send(JSON.stringify({Type:MSG_TYPE_GAME_MOVE, Data: JSON.stringify({X: x, Y: y})}));
		game.switchPlayer();
	}
	this.onAfterGameMove();
}

NetworkGameScreen.prototype.onAfterGameMove = function () {
	gameView.draw();
	if (game.isGameOver()) {
		ui.pushController(new GameOverScreen('', this.currentPlayerColor));
		this.socket.close();
	}
}

NetworkGameScreen.prototype.onReadyToConnect = function () {
	$('#waitingDialogMessage').text('Connecting to server...');
	var that = this;
	this.socket = new WebSocket("ws://" + NETWORK_GAME_ADDRESS);
	this.socket.onopen = function() { that.onConnect();	};
	this.socket.onerror = function(error) { that.onError(error); };
	this.socket.onmessage = function(event) { that.onMessage(event); };
	this.socket.onclose = function(event) { that.onClose(event); };
}

NetworkGameScreen.prototype.onConnect = function () {
	console.log('ws connected');
	var user = {Name: 'guest', ProtocolVersion: 1, PreferredGameOptions: {MapWidth: this.preferredConfig.mapWidth, MapHeight: this.preferredConfig.mapHeight, Inited: true}};
	this.socket.send(JSON.stringify({Type:MSG_TYPE_USERINFO, Data: JSON.stringify(user) }));
	this.socket.send(JSON.stringify({Type:MSG_TYPE_NEWGAME_REQUEST, Data: "" }));
	$('#waitingDialogMessage').text('Waiting for opponent...');
}

NetworkGameScreen.prototype.onClose = function (event) {
	if (event.wasClean) {
	    //alert('Соединение закрыто чисто');
	  } else {
	    ui.pushController(new GameOverScreen('Connection is interrupted', this.currentPlayerColor));
	  }
	  //alert('Код: ' + event.code + ' причина: ' + event.reason);
}

NetworkGameScreen.prototype.onMessage = function (event) {
	var that = this;
	var message = $.parseJSON(event.data);
	switch (message.Type) {
		case MSG_TYPE_ERROR:
			break;
		case MSG_TYPE_GAMESTARTED:
			this.currentGameConfig = $.parseJSON(message.Data);
			this.currentPlayerColor = this.currentGameConfig.CurrentUserFirst ? PLAYER1_COLOR : PLAYER2_COLOR;
			game = new Game(this.currentGameConfig.MapWidth, this.currentGameConfig.MapHeight);
			game.player1.name = "guest";
			game.player2.name = "guest";
			gameView.game = game;
			gameView.centerViewOnPage();
			gameView.draw();
			$('#waitingDialogMessage').text('Starting game...');
			setTimeout(function(){
				ui.changeView('',function() {
					that.gameStarted = true;
					that.initActionBar();
				});
			}, 1000);
			break;
		case MSG_TYPE_OPPONENT_DISCONNECTED:
			ui.pushController(new GameOverScreen('Opponent disconnected', this.currentPlayerColor));
			this.socket.close();
			break;
		case MSG_TYPE_GAME_MOVE:
			var moveInfo = $.parseJSON(message.Data);
			if (game.putDot(moveInfo.X, moveInfo.Y, true)) {
				game.switchPlayer();
			}
			this.onAfterGameMove();
			break;
		case MSG_TYPE_GAME_CHAT_MESSAGE:
			var messageData = $.parseJSON(message.Data);
			if (!that.chatPanel.is(':visible')) {
				that.unreadMsgs++;
				var unreadMsgLabel = $('#unreadMsgLabel');
				unreadMsgLabel.text(that.unreadMsgs);
				if (!unreadMsgLabel.is(':visible')){
					unreadMsgLabel.show();
					unreadMsgLabel.fadeOut(400).fadeIn(400).fadeOut(400).fadeIn(400);
				}
			}
			this.appendChatMessage(messageData.Text, game.getEnemyColor(this.currentPlayerColor));
			break;
	}
}

NetworkGameScreen.prototype.onError = function (error) {
	console.log("ws error: " + error.message);
}

NetworkGameScreen.prototype.initActionBar = function (event) {
	var that = this;
	ui.showActionBar([
		{id:"panelBtnHome", action:function(){
			ui.popController(2);
		}}, 
		{id:"panelBtnChat", action: function(){
			that.unreadMsgs = 0;
			$('#unreadMsgLabel').hide();
			that.chatPanel.show();
			$("#networkChatOverlay").show();
			$('#networkChatPanel').slideDown(400);
		}}
	]);
}

NetworkGameScreen.prototype.initChatPanel = function (event) {
	var that = this;
	ui.displayModalView('networkChatDialog', function(view) {
		that.chatPanel = view;
		$("#chatCloseButton").click(function() {
			$("#networkChatOverlay").hide();
			$('#networkChatPanel').fadeOut(400, function(){
				that.chatPanel.hide();
			});			
		});
		$("#chatInputArea").keydown(function(ev){
			if (ev.which == 13 && !ev.shiftKey){
				ev.preventDefault();
				var inputArea = $("#chatInputArea");
				var text = inputArea.val();
				if ($.trim(text).length == 0) {
					return;
				}
				that.socket.send(JSON.stringify({Type:MSG_TYPE_GAME_CHAT_MESSAGE, Data: JSON.stringify({Text: text})}));
				that.appendChatMessage(text, that.currentPlayerColor);
			}
		});
	});
}

NetworkGameScreen.prototype.appendChatMessage = function (text, playerColor) {
	text = $('<div/>').text(text).html();
	text = text.replace(/\n/g,'<br>');
	var display = $("#chatDisplay");
	display.append('<p style="color:' + playerColor + '">' + text + "</p><hr>");
	var chatDisplayContainer = $("#chatDisplayContainer");
	chatDisplayContainer[0].scrollTop = chatDisplayContainer[0].scrollHeight;
	$("#chatInputArea").val('');
	if (display.height() > chatDisplayContainer.height()) {
		display.css('position', "relative");
	}	
}