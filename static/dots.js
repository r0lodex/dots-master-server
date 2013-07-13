var PLAYER1_COLOR = "#ff0000";
var PLAYER2_COLOR = "#0000ff";
var PLAYER1_COLOR_NAME = "red";
var PLAYER2_COLOR_NAME = "blue";

function Game(width, height) {
	this.width = width;
	this.height = height;
	this.player1 = new Player(PLAYER1_COLOR);
	this.player2 = new Player(PLAYER2_COLOR);
	this.lastDot;
	this.currentPlayer = this.player1;
	this.history = new Array();//array of dots and arrays of linked cells in order of appearing

	//init map
	this.map = new Array(width);
	for (var i = 0; i < width; i++) {
    	this.map[i] = new Array(height);
  	}
  	for (var x = 0; x < this.width; x++) {
  		for (var y = 0; y < this.height; y++) {
  			this.map[x][y] = new Cell(x, y);
  		};
  	};
}

Game.prototype.makeAIDecision = function () {
	for (var x = 0; x < this.width; x++) {
  		for (var y = 0; y < this.height; y++) {
  			var cell = this.map[x][y];
  			cell.checked = false;
  			cell.open = false;
  			cell.capturedRegion = false;
  			cell.cost = 0;
  			cell.lastCost = 0;
  		};
  	};

  	var that = this;
  	var clearMap = function() {
  		for (var x = 0; x < that.width; x++) {
	  		for (var y = 0; y < that.height; y++) {
	  			var cell = that.map[x][y];
	  			cell.checked = false;
	  		};
	  	};
  	}

  	var summarizeCost = function() {
  		for (var x = 0; x < that.width; x++) {
	  		for (var y = 0; y < that.height; y++) {
	  			var cell = that.map[x][y];
	  			cell.cost = Math.max(cell.lastCost, cell.cost);
	  			cell.lastCost = 0;
	  		};
	  	};
  	}

  	var enemyColor = this.getEnemyColor(this.currentPlayer.color);
  	for (var x = 0; x < this.width; x++) {
  		for (var y = 0; y < this.height; y++) {
  			var cell = this.map[x][y];
  			if (cell.color === this.currentPlayer.color && !cell.captured) {
  				clearMap();
  				this.findPossibleCapturesForStartingCell(cell, enemyColor);
  				summarizeCost();
  			}
  		};
  	};

  	for (var x = 0; x < this.width; x++) {
  		for (var y = 0; y < this.height; y++) {
  			var cell = this.map[x][y];
  			if (cell.color === enemyColor && !cell.captured) {
  				clearMap();
  				this.findPossibleCapturesForStartingCell(cell, this.currentPlayer.color);
  				summarizeCost();
  			}
  		};
  	};
	
	var bestChoises = [];
	for (var x = 0; x < this.width; x++) {
  		for (var y = 0; y < this.height; y++) {
  			var cell = this.map[x][y];
  			if (cell.color) {
  				continue;
  			}
  			if (bestChoises.length == 0 || bestChoises[0].cost < cell.cost) {
  				bestChoises = [];
  				bestChoises.push(cell);
  			} else if (bestChoises[0].cost == cell.cost) {
  				bestChoises.push(cell);
  			}
  		};
  	};
  	console.log("best choises length:" + bestChoises.length);
  	console.log("maxCellCost: " + bestChoises[0].cost);
	return {x:bestChoises[0].x, y:bestChoises[0].y};
}

Game.prototype.getEnemyColor = function (friendColor) {
	return friendColor == PLAYER1_COLOR ? PLAYER2_COLOR : PLAYER1_COLOR;
}

Game.prototype.findSameDotsGroup = function (startingDot) {
	for (var x = 0; x < this.width; x++) {
  		for (var y = 0; y < this.height; y++) {
  			this.map[x][y].capturedRegion = false;
  		}
  	}
	var result = new Array();
	var cellsToCheck = new Array();
	cellsToCheck.push(startingDot);
	startingDot.capturedRegion = true;
	var friendCells = new Array();
	var freeBorders = new Array();
	var isNearMapBorder = false;
	var that = this;
	var tryAddCellToGroup = function(x, y) {
		if (that.isOutOfMap(x, y)) {
			isNearMapBorder = true;
			return;
		}
		var cell = that.map[x][y];
		if (cell.capturedRegion || cell.checked) {
			return;
		}
		cell.capturedRegion = true;
		if (!cell.color) {
			freeBorders.push(cell);
			return;
		}
		if (cell.color == startingDot.color || cell.captured) {			
			friendCells.push(cell);
		}
	}
	while (cellsToCheck.length > 0) {
		friendCells = [];
		for (var i = cellsToCheck.length - 1; i >= 0; i--) {
			var cell = cellsToCheck[i];
			tryAddCellToGroup(cell.x + 1, cell.y);
			tryAddCellToGroup(cell.x - 1, cell.y);
			tryAddCellToGroup(cell.x, cell.y + 1);
			tryAddCellToGroup(cell.x, cell.y - 1);
		};
		result.push.apply(result, cellsToCheck);
		cellsToCheck = friendCells;
	}
	return {"cells": result, "freeBorders": freeBorders, "isNearMapBorder": isNearMapBorder };
}

Game.prototype.findPossibleCapturesForStartingCell = function (cell, byColor) {
	var capturedCells = new Array();
	var cellsToCheck = new Array();

	var friendCells = new Array();
	var freeCells = new Array();

	var optimalFreeCells = new Array();
	var optimalFriendCells = new Array();
	var tmpFreeCells = new Array();
	var optimalCell = undefined;
	var optimalCost = 0;

	var initialRegion = this.findSameDotsGroup(cell);
	if (initialRegion.isNearMapBorder) {
		return;
	}
	
	var cost = initialRegion.cells.length  / (initialRegion.freeBorders.length * initialRegion.freeBorders.length * initialRegion.freeBorders.length);
	optimalCost = cost;
	optimalFreeCells = initialRegion.freeBorders;
	optimalFriendCells = initialRegion.cells;
	optimalCell = cell;
	
	var capturedFreeCellsCount = -1;
	var that = this;
	var tryAddCellToGroup = function (x, y) {
		if (that.isOutOfMap(x, y)) {
			return false;
		}
		var cell = that.map[x][y];
		if (!cell.checked) {			
			if (!cell.color && !cell.captured) {
				tmpFreeCells.push(cell);
			} else if ((cell.color != byColor && !cell.captured) ||
				(cell.color == byColor && cell.captured)) {
				var region = that.findSameDotsGroup(cell);
				if (region.isNearMapBorder) {
					return false;
				}
				tmpFreeCells.push.apply(tmpFreeCells, region.freeBorders);
				friendCells.push.apply(friendCells, region.cells);
			}
		}
		return true;
	}
	while (true) {
		
		if (optimalCell) {
			capturedFreeCellsCount++;
			for (var i = cellsToCheck.length - 1; i >= 0; i--) {
				if (cellsToCheck[i] === optimalCell) {
					cellsToCheck.splice(i, 1);
					break;
				}
			}
			for (var i = optimalFreeCells.length - 1; i >= 0; i--) {
				optimalFreeCells[i].checked = true;
			};
			for (var i = optimalFriendCells.length - 1; i >= 0; i--) {
				optimalFriendCells[i].checked = true;
			};
			cellsToCheck.push.apply(cellsToCheck, optimalFreeCells);
			capturedCells.push.apply(capturedCells, optimalFriendCells);
			for (var i = cellsToCheck.length - 1; i >= 0; i--) {
				if (cellsToCheck[i].lastCost < optimalCost) {
					cellsToCheck[i].lastCost = optimalCost;
				}
			};
		} else {
			break;
		}
		
		if (cellsToCheck.length == 0) {
			break;
		}
		
		optimalFreeCells = [];
		optimalFriendCells = [];
		optimalCell = undefined;
		optimalCost = 0;
		var isFoundNextStep = false;
		for (var i = 0; i < cellsToCheck.length; i++) {
			var cellTocheck = cellsToCheck[i];	
			tmpFreeCells = [];
			friendCells = [];
			if (tryAddCellToGroup(cellTocheck.x-1, cellTocheck.y) &&
				tryAddCellToGroup(cellTocheck.x+1, cellTocheck.y) &&
				tryAddCellToGroup(cellTocheck.x, cellTocheck.y+1) &&
				tryAddCellToGroup(cellTocheck.x, cellTocheck.y-1)) {
				var wallLength = cellsToCheck.length - 1 + tmpFreeCells.length;
				var cost = (capturedCells.length + friendCells.length + (capturedFreeCellsCount + 1) * 0.25)/ (wallLength * wallLength * wallLength);
				if (!isFoundNextStep || cost > optimalCost) {
					optimalCost = cost;
					isFoundNextStep = true;
					optimalFreeCells = tmpFreeCells;
					optimalFriendCells = friendCells;
					tmpFreeCells = [];
					friendCells = [];
					optimalCell = cellTocheck;
				}
			}
		};
	}
}

Game.prototype.appendHistory = function (eventType, data) {
	this.history.push({"event":eventType, "data": data});
}

Game.prototype.switchPlayer = function () {
	if (this.currentPlayer == this.player1) {
		this.currentPlayer = this.player2;
	} else {
		this.currentPlayer = this.player1;
	}
}

Game.prototype.putDot = function (x, y, checkCaptures) {
	if (this.map[x][y].color || this.map[x][y].captured) {
		return false;
	}
	var dot = this.map[x][y];
	dot.color = this.currentPlayer.color;
	if (checkCaptures) {
		this.checkForNewCaptures(dot);
	}
	this.lastDot = dot;
	this.appendHistory("dot", dot);
	return true;
}

Game.prototype.clearCheckedFlagForColor = function (color) {
	for (var x = 0; x < this.width; x++) {
  		for (var y = 0; y < this.height; y++) {
  			var cell = this.map[x][y];
  			if (cell.color == color) {
  				cell.checked = false;
  			}
  		};
  	};
}

Game.prototype.checkForNewCaptures = function (byDot) {
	for (var x = 0; x < this.width; x++) {
  		for (var y = 0; y < this.height; y++) {
  			var cell = this.map[x][y];
  			cell.checked = false;
  			cell.open = false;
  			cell.capturedRegion = false;
  		};
  	};
  	this.checkIsDotGroupCaptured(byDot.x+1, byDot.y, byDot.color);
  	this.clearCheckedFlagForColor(byDot.color);
  	this.checkIsDotGroupCaptured(byDot.x-1, byDot.y, byDot.color);
  	this.clearCheckedFlagForColor(byDot.color);
  	this.checkIsDotGroupCaptured(byDot.x, byDot.y+1, byDot.color);
  	this.clearCheckedFlagForColor(byDot.color);
  	this.checkIsDotGroupCaptured(byDot.x, byDot.y-1, byDot.color);
  	this.clearCheckedFlagForColor(byDot.color);
  	 if (this.lastDot) {
  		this.checkIsDotGroupCaptured(this.lastDot.x, this.lastDot.y, byDot.color);
	}
}

Game.prototype.markCellArraysAsOpen = function () {
	for (var i = arguments.length - 1; i >= 0; i--) {
		for (var j = arguments[i].length - 1; j >= 0; j--) {
			arguments[i][j].open = true;
		};
	};
}

Game.prototype.checkIsDotGroupCaptured = function (startX, startY, byColor) {
	if (this.isOutOfMap(startX, startY)) {
		return;
	}
	var cell = this.map[startX][startY];
	if (cell.checked || (byColor == cell.color && !cell.captured)) {
		return;
	}
	var capturedCells = new Array();
	var cellsToCheck = new Array();
	var nearCells = new Array();
	var wallCells = new Array();

	cell.checked = true;
	cellsToCheck.push(cell);
	var that = this;
	var tryAddCellToGroup = function (x, y) {
		if (that.isOutOfMap(x, y)) {
			that.markCellArraysAsOpen(cellsToCheck, capturedCells, nearCells);
			return false;
		}
		var cell = that.map[x][y];
		if (cell.checked) {
			if (cell.open) {
				that.markCellArraysAsOpen(cellsToCheck, capturedCells, nearCells);
				return false;
			}
		} else {
			cell.checked = true;
			if (byColor == cell.color && !cell.captured) {
				wallCells.push(cell);
			} else {				
				nearCells.push(cell);
			}
		}
		return true;
	}
	while (cellsToCheck.length > 0) {
		for (var i = 0; i < cellsToCheck.length; i++) {
			var cellTocheck = cellsToCheck[i];			
			if (!tryAddCellToGroup(cellTocheck.x-1, cellTocheck.y)) return;
			if (!tryAddCellToGroup(cellTocheck.x+1, cellTocheck.y)) return;
			if (!tryAddCellToGroup(cellTocheck.x, cellTocheck.y+1)) return;
			if (!tryAddCellToGroup(cellTocheck.x, cellTocheck.y-1)) return ;
			capturedCells.push(cellTocheck);
		};
		cellsToCheck = nearCells;
		nearCells = [];
	}
	var hasCapturedDots = false;
	for (var i = capturedCells.length - 1; i >= 0; i--) {
		if (capturedCells[i].color) {
			hasCapturedDots = true;
			break;
		}
	};
	if (!hasCapturedDots) {
		return;
	}
	for (var i = 0; i < capturedCells.length; i++) {
		if (capturedCells[i].color == byColor) {
			capturedCells[i].captured = false;
		} else {
			capturedCells[i].captured = byColor;
		}
	};
	this.optimizeWalls(wallCells, capturedCells);
	return;
}

Game.prototype.optimizeWalls = function (wallCells, capturedCells) {
	for (var i = wallCells.length - 1; i >= 0; i--) {
		wallCells[i].capturedRegion = true;
	};
	for (var i = capturedCells.length - 1; i >= 0; i--) {
		capturedCells[i].capturedRegion = true;
	};

	var that = this;
	var isWayFree = function(x, y) {
		if (that.isOutOfMap(x, y)) {
			return true;
		}
		return !that.map[x][y].capturedRegion;
	}

	var checkIsCellInsideRegion = function(x, y) {
		if (isWayFree(x + 1, y) ||
			isWayFree(x - 1, y) ||
			isWayFree(x, y + 1) ||
			isWayFree(x, y - 1)) {
			return false;
		}
		return true;
	}

	var realWalls = new Array();
	for (var i = wallCells.length - 1; i >= 0; i--) {
		var wall = wallCells[i];
		if (!checkIsCellInsideRegion(wall.x, wall.y)) {
			realWalls.push(wall);
		}
	};

	this.linkWalls(realWalls);
}

Game.prototype.linkWalls = function (wallCells) {
	var sorted = false;
	for (var i = wallCells.length - 1; i >= 0; i--) {
		var first = wallCells[i];
		for (var j = wallCells.length - 1; j >= 0; j--) {
			var second = wallCells[j];
			if (first === second) {
				continue;
			}
			var dx = first.x - second.x;
			var dy = first.y - second.y;
			if (dx >= -1 && dx <= 1 && dy >= -1 && dy <= 1) {
				first.makeLink(second);
			}
		};
	};

	var sortedWallCels = new Array();
	sortedWallCels.push(wallCells[0]);
	while (wallCells.length > 0) {
		var lastWall = sortedWallCels[sortedWallCels.length - 1];
		var foundNext = false;
		for (var i = wallCells.length - 1; i >= 0; i--) {
			var nextWall = wallCells[i];
			if (lastWall.findLinkTo(nextWall) || nextWall.findLinkTo(lastWall)) {
				sortedWallCels.push(nextWall);
				wallCells.splice(i, 1);
				foundNext = true;
				break;
			}			
		};
		if (!foundNext) {
			break;
		}
	}
	this.appendHistory("links", sortedWallCels);
}

Game.prototype.isOutOfMap = function (x, y) {
	return x < 0 || x >= this.width || y < 0 || y >= this.height;
}

Game.prototype.isGameOver = function (friendColor) {
	var gameOver = true;
	for (var x = 0; x < this.width; x++) {
  		for (var y = 0; y < this.height; y++) {
  			var cell = this.map[x][y];
  			if (!cell.color && !cell.captured) {
  				gameOver = false;
  				break;
  			}
  		};
  		if (!gameOver) {
  			break;
  		}
  	};
  	return gameOver;
}

Game.prototype.countCapturedDots = function (friendColor) {
	var captured = new Array();
	captured[PLAYER1_COLOR] = 0;
	captured[PLAYER2_COLOR] = 0;
	for (var x = 0; x < this.width; x++) {
  		for (var y = 0; y < this.height; y++) {
  			var cell = this.map[x][y];
  			if (cell.color && cell.captured) {
  				captured[cell.color]++;
  			}
  		};
  	};
  	return captured;
}

function Cell(x, y, color) {
	this.x = x;
	this.y = y;
	this.color = color;
	this.captured = false;
	this.links = new Array();
	//fields used by algorithms
	this.checked = false;
	this.open = false;
	this.capturedRegion = false;
	this.cost = 0;
	this.lastCost = 0;
}

Cell.prototype.findLinkTo = function (dot) {
	for (var i = this.links.length - 1; i >= 0; i--) {
		if (this.links[i].to === dot) {
			return true;
		}
	};
	return false;
}

Cell.prototype.makeLink = function (to) {
	var link = this.findLinkTo(to);
	if (link) {
		return link;
	}
	link = to.findLinkTo(this);
	if (link) {
		return link;
	}
	link = new Link(this, to);
	this.links.push(link);
	return link;
}

function Link(dot, to) {
	this.dot = dot;
	this.to = to;
}

function Player(color) {
	this.color = color;
	this.name = 'player';
}


function GameView(game, canvas) {
	this.game = game;
	this.canvas = canvas;
	this.cellWidth = 30;
	this.xOffset = 0;
	this.yOffset = 0;
	this.enabled = true;

	this.startMousePosX = 0;
	this.startMousePosY = 0;
	this.clickDetectDelta = 5;
	this.mx = 0;
	this.my = 0;
	this.drag = false;

	var that = this;
	if ('onmousemove' in document.documentElement) {
		this.canvas.addEventListener("mousedown", function(e){ that.onMouseDown(e) }, false);
		this.canvas.addEventListener("mouseup", function(e){ that.onMouseUp(e) }, false);
		this.canvas.addEventListener("mousemove", function(e){ that.onMouseMove(e) }, false);
	} else {
		this.canvas.addEventListener("touchstart", function(e){ that.onMouseDown(e) }, false);
		this.canvas.addEventListener("touchend", function(e){ that.onMouseUp(e) }, false);
		this.canvas.addEventListener("touchmove", function(e){ that.onMouseMove(e) }, false);
	}
}

GameView.prototype.centerViewOnPage = function () {
	this.xOffset = this.canvas.width / 2 - this.game.width * this.cellWidth / 2;
	this.yOffset = this.canvas.height / 2 - this.game.height * this.cellWidth / 2;
}

GameView.prototype.onClickCell = function (x, y) {
	alert('Clicked: x = ' + x + ' y = ' + y);
}

GameView.prototype.onMouseDown = function (event) {
	if (!this.enabled) {
		return;
	}
	if (event.button != 2 && event.button != 1) {
		event.preventDefault();
		var pageX = event.touches ? event.touches[0].pageX : event.pageX;
		var pageY = event.touches ? event.touches[0].pageY : event.pageY;
		this.mx = pageX;
		this.my = pageY;
		this.startMousePosX = pageX;
		this.startMousePosY = pageY;
		this.canvas.style.cursor = "url('images/closedhand.cur'), auto";
		this.drag = true;
	}
}

GameView.prototype.onMouseUp = function (event) {
	if (!this.enabled) {
		return;
	}
	if (this.drag) {
		event.preventDefault();
		var pageX = event.touches ? this.mx : event.pageX;
		var pageY = event.touches ? this.my : event.pageY;
		this.canvas.style.cursor = "auto";
		this.drag = false;
		if (Math.abs(pageX - this.startMousePosX) < this.clickDetectDelta &&
			Math.abs(pageY - this.startMousePosY) < this.clickDetectDelta) {
			var clientRect = this.canvas.getBoundingClientRect();
			var x = Math.round((pageX -clientRect.left - this.xOffset) / this.cellWidth);
			var y = Math.round((pageY - clientRect.top - this.yOffset) / this.cellWidth);
			if (x >= 0 && y >= 0 && x < this.game.width && y < this.game.height) {
				this.onClickCell(x, y);
			}
		}
		this.draw();
	} else {
		event.preventDefault();
		this.game.makeAIDecision();
		this.draw();
	}
}

GameView.prototype.onMouseMove = function (event) {
	if (!this.enabled) {
		return;
	}
	if (this.drag) {
		event.preventDefault();
		var pageX = event.touches ? event.touches[0].pageX : event.pageX;
		var pageY = event.touches ? event.touches[0].pageY : event.pageY;
		this.xOffset += pageX - this.mx;
		this.yOffset += pageY - this.my;
		this.mx = pageX;
		this.my = pageY;
		this.draw();
	}	
}

GameView.prototype.draw = function () {
		var context = this.canvas.getContext("2d");
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.fillStyle = "#fff";
		context.fillRect(0, 0, this.canvas.width, this.canvas.height);
		//context.clearRect(0,0,this.canvas.width,this.canvas.height);
		context.translate(this.xOffset, this.yOffset);

		var clipLeft = -this.xOffset;
		var clipTop = -this.yOffset;
		var clipRight = clipLeft + this.canvas.width;
		var clipBottom = clipTop + this.canvas.height;
		//draw cross field
		context.strokeStyle = "#aaaaaa";
		context.lineWidth = 1;		
		var x = Math.floor(clipLeft / this.cellWidth) * this.cellWidth;
		while (x <= clipRight) {
			context.beginPath();
			context.moveTo(x, clipTop);
			context.lineTo(x, clipBottom);
			context.stroke();
			x += this.cellWidth;
		}

		var y = Math.floor(clipTop / this.cellWidth) * this.cellWidth;
		while (y <= clipBottom) {
			context.beginPath();
			context.moveTo(clipLeft, y);
			context.lineTo(clipRight, y);
			context.stroke();
			y += this.cellWidth;
		}
		//draw links
		var minCellX = Math.max(0, Math.floor(clipLeft / this.cellWidth));
		var maxCellX = Math.min(this.game.width - 1, Math.floor(clipRight / this.cellWidth) + 1);
		var minCellY = Math.max(0, Math.floor(clipTop / this.cellWidth));
		var maxCellY = Math.min(this.game.height - 1, Math.floor(clipBottom / this.cellWidth) + 1);
		context.lineWidth = 2;
		for (var i = this.game.history.length - 1; i >= 0; i--) {
			var historyEntry = this.game.history[i];
			if (historyEntry.event == "links") {
				var walls = historyEntry.data;
				context.strokeStyle = walls[0].color;
				context.fillStyle = walls[0].color;
				context.beginPath();
				context.moveTo(walls[0].x * this.cellWidth, walls[0].y * this.cellWidth);
				for (var j = walls.length - 1; j >= 0; j--) {
					context.lineTo(walls[j].x * this.cellWidth, walls[j].y * this.cellWidth);
				};
				context.stroke();
				context.globalAlpha = 0.5;
				context.fill();
				context.globalAlpha = 1.0;
			}
		};

		//draw points	
		var maxCellCost = 0;
		for (x = minCellX; x <= maxCellX; x++) {
			for (y = minCellY; y <= maxCellY; y++) {
				var cell = this.game.map[x][y];
				if (cell.cost > maxCellCost) {
					maxCellCost = cell.cost;
				}
			}
		}

		var cellRadius = this.cellWidth / 4;
		var capturedCellRadius = this.cellWidth / 6;
		for (x = minCellX; x <= maxCellX; x++) {
			for (y = minCellY; y <= maxCellY; y++) {
				var cell = this.game.map[x][y];
				if (cell.color) {
					context.fillStyle = cell.color;
					context.beginPath();
					context.arc(x * this.cellWidth, y * this.cellWidth, cell.captured ? capturedCellRadius : cellRadius, 0, 2*Math.PI);
					context.fill();
					if (this.game.lastDot == cell) {
						context.strokeStyle = cell.color;
						context.lineWidth = 1;
						context.beginPath();
						context.arc(x * this.cellWidth, y * this.cellWidth, this.cellWidth / 3, 0, 2*Math.PI);
						context.stroke();
					}
				} else {
					/*if (maxCellCost == 0) continue;
					var fillStyle = "Rgb(0," + Math.floor(cell.cost/maxCellCost * 255) + ",0)";
					context.fillStyle = fillStyle;
					context.beginPath();
					context.arc(x * this.cellWidth, y * this.cellWidth, this.cellWidth / 8, 0, 2*Math.PI);
					context.fill();*/
				}
			};
		};
		//draw borders
		if (context.setLineDash) {
    		context.setLineDash([5]);
    	}
    	context.strokeStyle = "#444444";
		context.lineWidth = 2;
		context.beginPath();
		context.moveTo(-1 * this.cellWidth, -1 * this.cellWidth);
		context.lineTo(this.game.width * this.cellWidth, -1 * this.cellWidth);
		context.lineTo(this.game.width * this.cellWidth, this.game.height * this.cellWidth);
		context.lineTo(-1 * this.cellWidth, this.game.height * this.cellWidth);
		context.closePath();
		context.stroke();
		if (context.setLineDash) {
    		context.setLineDash([]);
    	}
	}