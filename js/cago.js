
(function ($) {
	"use strict";
	/*jslint browser:true */
	/*jslint es5: true */
	/*global $, jQuery*/
	function Cago() {

		// Your setting variable
		var BOARD_BASE_LENGTH = 400, LINE_NUM = 19,
			FAST_STEP_NUM = 10, // One click with 10 steps
			TIME_INTERVAL = 2000, // 2000ms
			displayNum = false,
			auto = false,
			// DOM
			container, content, metaTable,
			bgCanvas, bgContext,
			stoneCanvas, stoneContext,
			numberCanvas, numberContext,
			tmpNumberCanvas, tmpNumberContext,
			btnList, // Store all the buttons in the html
			metaTr, // tr row in metaTable which show meta data
			// Program const variable
			BOARD_LENGTH = BOARD_BASE_LENGTH + (BOARD_BASE_LENGTH / 10),
			SPACE = BOARD_BASE_LENGTH / (LINE_NUM + 1),
			FIXED_SIZE = LINE_NUM + 2,
			TOKEN_LIST = ["PW", "PB", "RE", "DT", "KM"], // The token needed to be found in the gibo file
			OPTIONAL_TOKEN_LIST = ["WR", "BR"],
			STEP_VECTOR = [[0, 1], [1, 0], [-1, 0], [0, -1]], // Used for easy traverse and find dead stones
			// Improve performance
			FS = LINE_NUM + 1,
			S = SPACE / 2,
			S2 = SPACE / 4,
			TS = SPACE * 2,
			MP = Math.PI * 2,
			// Data structure
			goMap,
			exGoMap, // Store the steps made by user click
			metaList, // Store file meta info 
			map,
			API;

		function GoMap() {
			this.totalMoveCount = 0;
			this.currentMoveIndex = 0;
			this.prevMoveIndex = 0;
			this.mapList = [];
			this.moveList = [];
			this.insertEmptyMap();
		}

		/*
		 * A unit in GoMap.mapList
		 */
		function MapMove(t, n) {
			this.color = t;
			this.num = n;
		}

		/*
		 * A unit in GoMap.moveList
		 */
		function Move(x, y) {
			this.x = x;
			this.y = y;
		}

		/*
		 * Copy a 2D array with FIXED_SIZE
		 *
		 * @param {Array} m A 2D array of MapMove object
		 * @return {Array} Returns a clone of the 2D array of MapMove object
		 */
		function copyMap(m) {
			var tmpMap = [], i, j;
			for (i in m) {
				if (m.hasOwnProperty(i)) {
					tmpMap[i] = [];
					for (j in m[i]) {
						if (m[i].hasOwnProperty(j)) {
							tmpMap[i][j] = new MapMove(m[i][j].color, m[i][j].num);
						}
					}
				}
			}
			return tmpMap;

		}

		/*
		 * Insert move with totalMoveCount++
		 *
		 * @param {Array} m 2D array of MapMove object which include processed information of 'move'
		 * @param {Move} move Move object
		 */
		GoMap.prototype.insert = function (m, move) {
			this.insertMap(m);
			this.insertMove(move);
			this.totalMoveCount += 1;
		};

		GoMap.prototype.insertMap = function (m) {
			this.mapList.push(copyMap(m));
		};

		GoMap.prototype.insertMove = function (move) {
			this.moveList.push(move);
		};

		/*
		 * Remove n maps, this function only be used with exGoMap
		 *
		 * @param {Int} n number of maps to be removed
		 */
		GoMap.prototype.remove = function (n) {
			var i;
			for (i = 0; i < n; i += 1) {
				// GoMap will insert a empty map at first, so keep at least one
				if (this.totalMoveCount <= 1) {
					break;
				}
				this.mapList.pop();
				this.moveList.pop();
				this.totalMoveCount -= 1;
			}
		};

		/*
		 * @return {Array} Return current map(2D array) of MapMove object
		 */
		GoMap.prototype.getCurrentMap = function () {
			return this.mapList[this.currentMoveIndex];
		};

		GoMap.prototype.getCurrentMapCellColor = function (i, j) {
			return this.mapList[this.currentMoveIndex][i][j].color;
		};

		/*
		 * @return {Move} Return current move
		 */
		GoMap.prototype.getCurrentMove = function () {
			return this.moveList[this.currentMoveIndex];
		};

		/*
		 * @return {Move} Return Previous move
		 */
		GoMap.prototype.getPrevMove = function () {
			return this.moveList[this.prevMoveIndex];
		};

		/*
		 * @return {Int} Return the step number of the position of current mapList
		 */
		GoMap.prototype.getCurrentMapCellNum = function (i, j) {
			return this.mapList[this.currentMoveIndex][i][j].num;
		};

		/*
		 * Track previous state to render changed part
		 *
		 * @return {Int} Return the step number of the position of previous mapList
		 */
		GoMap.prototype.getPrevMapCellColor = function (i, j) {
			return this.mapList[this.prevMoveIndex][i][j].color;
		};

		/*
		 * Just put a empty map as the first map, totalMoveCount will plus 1
		 */
		GoMap.prototype.insertEmptyMap = function () {
			var map = [], i, j;
			for (i = 0; i < FIXED_SIZE; i += 1) {
				map[i] = [];
				for (j = 0; j < FIXED_SIZE; j += 1) {
					if (i === 0 || i === FS || j === 0 || j === FS) {
						map[i][j] = new MapMove(-2, 0);
					} else {
						map[i][j] = new MapMove(-1, 0);
					}
				}
			}
			this.insert(map, new Move(0, 0));
		};


		/* 
		 * My Bool object to check dead stone
		 */
		function Dead(v) {
			this.value = v;
		}


		/*
		 * Add tooltip to these buttons
		 */
		function addToolTip() {
			var key;
			for (key in btnList) {
				if (btnList.hasOwnProperty(key)) {
					btnList[key].tooltip({placement: "bottom"});
				}
			}
		}

		/*
		 * Initialization
		 */
		function init() {
			goMap = new GoMap();
			exGoMap = new GoMap();
			metaList = [];
			map = [];
			var i, j,
				toolBar,
				group1, group2, group3,
				row;

			for (i = 0; i < FIXED_SIZE; i += 1) {
				map[i] = [];
				for (j = 0; j < FIXED_SIZE; j += 1) {
					if (i === 0 || i === FS || j === 0 || j === FS) {
						map[i][j] = new MapMove(-2, 0);
					} else {
						map[i][j] = new MapMove(-1, 0);
					}
				}
			}

			container.css({"width": "500px", "margin": "5px"});

			toolBar = $("<div>").addClass("btn-toolbar");

			btnList = {};
			btnList.begin = $('<button class="btn" data-original-title="第一手"><i class="icon-step-backward"></i> </button>');
			btnList.fastBackward = $('<button class="btn" data-original-title="向前十手"><i class="icon-backward"></i> </button>');
			btnList.backward = $('<button class="btn" data-original-title="向前一手"><i class="icon-chevron-left"></i> </button>');
			btnList.forward = $('<button class="btn" data-original-title="向後一手"><i class="icon-chevron-right"></i> </button>');
			btnList.fastForward = $('<button class="btn" data-original-title="向後十手"><i class="icon-forward"></i> </button>');
			btnList.end = $('<button class="btn" data-original-title="最後一手"><i class="icon-step-forward"></i> </button>');
			btnList.flag = $('<button class="btn" data-original-title="顯示手數"><i class="icon-flag"></i> </button>');
			btnList.auto = $('<button class="btn" data-original-title="自動播放"><i class="icon-play-circle"></i> </button>');

			group1 = $('<div class="btn-group">');
			group2 = $('<div class="btn-group">');
			group3 = $('<div class="btn-group">');

			content = $("<div>").css({"width": BOARD_LENGTH, "height": BOARD_LENGTH});

			bgCanvas = $("<canvas>").css({"position": "absolute", "border": "1px solid black", "z-index": "0"});
			bgCanvas[0].width = BOARD_LENGTH;
			bgCanvas[0].height = BOARD_LENGTH;
			bgContext = bgCanvas[0].getContext("2d");

			stoneCanvas = $("<canvas>").css({"position": "absolute", "border": "1px solid black", "z-index": "1"});
			stoneCanvas[0].width = BOARD_LENGTH;
			stoneCanvas[0].height = BOARD_LENGTH;
			stoneContext = stoneCanvas[0].getContext("2d");

			numberCanvas = $("<canvas>").css({"position": "absolute", "border": "1px solid black", "z-index": "2"});
			numberCanvas[0].width = BOARD_LENGTH;
			numberCanvas[0].height = BOARD_LENGTH;
			numberContext = numberCanvas[0].getContext("2d");

			tmpNumberCanvas = document.createElement("canvas");
			tmpNumberCanvas.width = BOARD_LENGTH;
			tmpNumberCanvas.height = BOARD_LENGTH;
			tmpNumberContext = tmpNumberCanvas.getContext("2d");

			metaTable = $(
				'<table>\
					<tr>\
					<th>持黑</th>\
					<th>棋力</th>\
					<th>持白</th>\
					<th>棋力</th>\
					<th>讓子</th>\
					<th>結果</th>\
					<th>日期</th>\
					</tr>\
					</table>'
			).addClass("table table-striped").css({"width": String(BOARD_LENGTH) + "px", "display": "none"});
			row = $("<tr>");
			metaTr = [];
			metaTr.PB = $("<td>");
			metaTr.BR = $("<td>");
			metaTr.PW = $("<td>");
			metaTr.WR = $("<td>");
			metaTr.KM = $("<td>");
			metaTr.RE = $("<td>");
			metaTr.DT = $("<td>");

			// Compose components
			group1.append(btnList.begin).append(btnList.fastBackward).append(btnList.backward).append(btnList.forward).append(btnList.fastForward).append(btnList.end);
			group2.append(btnList.flag);
			group3.append(btnList.auto);
			toolBar.append(group1).append(group2).append(group3);
			content.append(bgCanvas).append(stoneCanvas).append(numberCanvas);
			row.append(metaTr.PB).append(metaTr.BR).append(metaTr.PW).append(metaTr.WR).append(metaTr.KM).append(metaTr.RE).append(metaTr.DT);
			metaTable.append(row);
			container.append(toolBar).append(content).append(metaTable);
		}

		/*
		 * Get the data with the token
		 *
		 * @param {String} data the data string in the gibo file
		 * @param {Int} index The current index in the data string
		 * @return {Array} Returns an array with [0]:token data, [1]: the index after the token data
		 */
		function getTokenData(data, index) {
			var i = index;
			while (data[index] !== "]") {
				index += 1;

				// If something terrible happen...
				if (index > data.length) {
					alert("error");
					return "error";
				}
			}
			return [data.substring(i, index), index];
		}

		/*
		 * Recursive traverse to find dead stones
		 *
		 * @param {Array} m 2D array of MapMove object
		 * @param {Int} x The first index of m
		 * @param {Int} y The second index of m
		 * @param {Int} color The color of the stone you put, so the function has to traverse the other color
		 * @param {Dead} dead A boolean object to check if the stones are dead
		 */
		function traverse(m, x, y, color, dead) {
			m[x][y].color = -2; // Tag to avoid traversing the same position twice.

			var xx, yy,
				i;
			for (i in STEP_VECTOR) {
				if (STEP_VECTOR.hasOwnProperty(i)) {
					xx = x + STEP_VECTOR[i][0];
					yy = y + STEP_VECTOR[i][1];
					if (m[xx][yy].color === 1 - color) {
						traverse(m, xx, yy, color, dead);
					} else if (m[xx][yy].color === -1) {// If find empty, then the stones are alive
						dead.value = false;
						return;
					}

				}
			}
		}

		/*
		 * Recursive delete stones
		 *
		 * @param {Array} m 2D array of MapMove object
		 * @param {Int} x The first index of m
		 * @param {Int} y The second index of m
		 * @param {Int} color The color of the stone you put, so the function has to traverse the other color
		 */
		function deleteDeadStone(m, x, y, color) {
			m[x][y].color = -1;
			m[x][y].num = -1;

			var xx, yy,
				i;
			for (i in STEP_VECTOR) {
				if (STEP_VECTOR.hasOwnProperty(i)) {
					xx = x + STEP_VECTOR[i][0];
					yy = y + STEP_VECTOR[i][1];

					if (m[xx][yy].color === 1 - color) {
						deleteDeadStone(m, xx, yy, color);
					}
				}
			}
		}

		/*
		 * Find dead stone groups from 4 sides
		 * If found, delete them
		 *
		 * @param {Array} m 2D array of MapMove object
		 * @param {Int} x The first index of m
		 * @param {Int} y The second index of m
		 */
		function findDeadStone(map, x, y) {
			var m = copyMap(map),
				color = m[x][y].color,
				up = new Dead(true),
				down = new Dead(true),
				left = new Dead(true),
				right = new Dead(true);

			if (m[x + 1][y].color === 1 - color) {
				traverse(m, x + 1, y, color, right);
				if (right.value === true) {
					deleteDeadStone(map, x + 1, y, color);
				}
			}

			if (m[x][y + 1].color === 1 - color) {
				traverse(m, x, y + 1, color, down);
				if (down.value === true) {
					deleteDeadStone(map, x, y + 1, color);
				}
			}

			if (m[x - 1][y].color === 1 - color) {
				traverse(m, x - 1, y, color, left);
				if (left.value === true) {
					deleteDeadStone(map, x - 1, y, color);
				}
			}

			if (m[x][y - 1].color === 1 - color) {
				traverse(m, x, y - 1, color, up);
				if (up.value === true) {
					deleteDeadStone(map, x, y - 1, color);
				}
			}
		}

		/*
		 * Parse the gibo data
		 *
		 * @param {String} data The data string in the gibo file
		 */
		function readData(data) {
			var metaEnd = data.indexOf(";B"), i = 0,
				t, result, d,
				m,
				x, y, move, color;

			for (m = metaEnd - 1; i < m; i += 1) {
				t = data.substring(i, i + 2).toUpperCase();
				if ($.inArray(t, TOKEN_LIST) !== -1 || $.inArray(t, OPTIONAL_TOKEN_LIST) !== -1) {
					// Have to check this is a token with '[', or it may be a normal string
					if (data[i + 2] === "[") {
						result = getTokenData(data, i + 3);
						d = result[0];
						i = result[1];
						metaList[t] = d;
					}
				}
			}

			for (i; i < data.length; i += 1) {
				t = data.substring(i, i + 2).toUpperCase();
				if (t === ";B" || t === ";W") {
					result = getTokenData(data, i + 3);
					d = result[0];
					if (d === "") {
						continue;
					}
					i = result[1];

					color = -1;
					if (t === ";B") {
						color = 1;
					} else if (t === ";W") {
						color = 0;
					}

					x = d.charCodeAt(0) - "a".charCodeAt(0) + 1;
					y = d.charCodeAt(1) - "a".charCodeAt(0) + 1;
					move = new Move(x, y);
					map[x][y].color = color;
					map[x][y].num = goMap.totalMoveCount;
					findDeadStone(map, x, y);

					goMap.insert(map, move);
				}
			}
		}

		/*
		 * Enable or disable the buttons according to 
		 * 1. auto setting
		 * 2. If at the begin or end
		 */
		function changeButtonState() {
			if (auto === true) {
				btnList.begin.prop("disabled", auto);
				btnList.backward.prop("disabled", auto);
				btnList.fastBackward.prop("disabled", auto);
				btnList.end.prop("disabled", auto);
				btnList.forward.prop("disabled", auto);
				btnList.fastForward.prop("disabled", auto);
				return;
			}

			if ((goMap.currentMoveIndex === 0) && (exGoMap.currentMoveIndex === 0)) { // Beginning
				btnList.begin.prop("disabled", true);
				btnList.begin.tooltip("hide");
				btnList.backward.prop("disabled", true);
				btnList.backward.tooltip("hide");
				btnList.fastBackward.prop("disabled", true);
				btnList.fastBackward.tooltip("hide");

				btnList.end.prop("disabled", false);
				btnList.forward.prop("disabled", false);
				btnList.fastForward.prop("disabled", false);
				btnList.auto.prop("disabled", false);
			} else if ((goMap.currentMoveIndex === goMap.totalMoveCount - 1) || (exGoMap.currentMoveIndex > 0)) {// If at the end or after user put stones
				btnList.begin.prop("disabled", false);
				btnList.backward.prop("disabled", false);
				btnList.fastBackward.prop("disabled", false);

				btnList.end.prop("disabled", true);
				btnList.end.tooltip("hide");
				btnList.forward.prop("disabled", true);
				btnList.forward.tooltip("hide");
				btnList.fastForward.prop("disabled", true);
				btnList.fastForward.tooltip("hide");
				btnList.auto.prop("disabled", true);
				btnList.auto.tooltip("hide");
			} else {
				btnList.begin.prop("disabled", false);
				btnList.backward.prop("disabled", false);
				btnList.fastBackward.prop("disabled", false);
				btnList.end.prop("disabled", false);
				btnList.forward.prop("disabled", false);
				btnList.fastForward.prop("disabled", false);
				btnList.auto.prop("disabled", false);
				btnList.auto.tooltip("hide");
			}
		}

		/*
		 * Paint background color, lines, letters and numbers on the board
		 */
		function paintBoard() {
			var wts = BOARD_LENGTH - TS, hts = BOARD_LENGTH - TS,
				i,
				ss, hs, ws, baseCode, s3, code, t1;
			// Draw color and lines of the board
			bgContext.beginPath();
			bgContext.fillStyle = "#D6B66F";
			bgContext.fillRect(0, 0, BOARD_LENGTH, BOARD_LENGTH);
			for (i = 1; i < FS; i += 1) {
				bgContext.moveTo(TS, SPACE * (i + 1));
				bgContext.lineTo(wts, SPACE * (i + 1));
				bgContext.moveTo(SPACE * (i + 1), TS);
				bgContext.lineTo(SPACE * (i + 1), hts);
			}
			bgContext.stroke();
			bgContext.closePath();

			// Draw string of the board 
			bgContext.beginPath();
			bgContext.fillStyle = "black";
			bgContext.font = "bold 12px sans-serif";
			bgContext.textBaseline = "bottom";
			ss = SPACE + (SPACE * 0.25);
			hs = BOARD_LENGTH - (SPACE * 0.5);
			ws = BOARD_LENGTH - SPACE;
			s3 = SPACE / 8;
			baseCode = "A".charCodeAt(0);
			for (i = 1; i < FS; i += 1) {
				code = baseCode + i - 1;

				bgContext.fillText(String.fromCharCode(code), SPACE * (i + 0.75), ss);
				bgContext.fillText(String.fromCharCode(code), SPACE * (i + 0.75), hs);

				t1 = SPACE * (i + 1.25);
				if (i < 11) {
					bgContext.fillText(String(20 - i), s3, t1);
					bgContext.fillText(String(20 - i), ws, t1);
				} else {
					bgContext.fillText(String(20 - i), S, t1);
					bgContext.fillText(String(20 - i), ws, t1);
				}
			}
			bgContext.closePath();

		}

		/*
		 * Paint stone
		 */
		function paintStone(x, y, prevMove) {
			var tmpGoMap, c, c2,
				gradient;

			if (exGoMap.currentMoveIndex > 0) {
				tmpGoMap = exGoMap;
			} else {
				tmpGoMap = goMap;
			}

			c = tmpGoMap.getCurrentMapCellColor(x, y);
			c2 = (exGoMap.prevMoveIndex > 0) ? exGoMap.getPrevMapCellColor(x, y) : goMap.getPrevMapCellColor(x, y);

			if ((c2 === 0 || c2 === 1) && (c === -1)) { // Previous exist but now gone, so clear this part
				stoneContext.clearRect(SPACE * (x + 0.5), SPACE * (y + 0.5), SPACE, SPACE, SPACE * (x + 0.5), SPACE * (y + 0.5), SPACE, SPACE);
			} else if (((c2 === -1) && (c === 0 || c === 1)) || (prevMove.x === x && prevMove.y === y)) {
				if (c === 0) {
					stoneContext.fillStyle = "white";
					// gradient = stoneContext.createRadialGradient(SPACE * (x + 1), SPACE * (y + 1), S, SPACE * (x + 1) - 3.2, SPACE * (y + 1) - 3, 0.5);
					// gradient.addColorStop(0, "#FFFFFF");
					// gradient.addColorStop(1, "#D7D7D7");
					// stoneContext.fillStyle = gradient;
				} else if (c === 1) {
					gradient = stoneContext.createRadialGradient(SPACE * (x + 1), SPACE * (y + 1), S, SPACE * (x + 1) - 3.2, SPACE * (y + 1) - 3, 0.5);
					gradient.addColorStop(0, "#000000");
					gradient.addColorStop(1, "#4f4f4f");
					stoneContext.fillStyle = gradient;
				}

				if (c === 0 || c === 1) {
					stoneContext.beginPath();
					stoneContext.arc(SPACE * (x + 1), SPACE * (y + 1), S, 0, MP, true);
					stoneContext.fill();
					stoneContext.closePath();
				}
			}
		}

		/*
		 * Paint stones, current position and steps on the board
		 */
		function paint() {
			var c, c2,
				i, j,
				m,
				s85, s75, s625,
				fix, num,
				prevMove;

			prevMove = (exGoMap.prevMoveIndex > 0) ? exGoMap.getPrevMove() : goMap.getPrevMove();
			for (i = 1; i < FS; i += 1) {
				for (j = 1; j < FS; j += 1) {
					paintStone(i, j, prevMove);
				}
			}

			// Tag the current move
			if (goMap.currentMoveIndex > 0) {
				stoneContext.fillStyle = "red";
				stoneContext.beginPath();
				m = goMap.getCurrentMove();
				stoneContext.arc(SPACE * (m.x + 1), SPACE * (m.y + 1), S2, 0, MP, true);
				stoneContext.fill();
				stoneContext.closePath();

			}

			if (displayNum) {
				s85 = SPACE * 0.85;
				s75 = SPACE * 0.75;
				s625 = SPACE * 0.625;

				tmpNumberContext.font = "6px sans";
				for (i = 1; i < FS; i += 1) {
					for (j = 1; j < FS; j += 1) {
						c = (exGoMap.currentMoveIndex > 0) ? exGoMap.mapList[exGoMap.currentMoveIndex][i][j].color : goMap.getCurrentMapCellColor(i, j);
						c2 = (exGoMap.prevMoveIndex > 0) ? exGoMap.getPrevMapCellColor(i, j) : goMap.getPrevMapCellColor(i, j);
						if ((c2 === 0 || c2 === 1) && (c === -1)) { // Previous exist but now gone, so clear this part
							tmpNumberContext.clearRect(SPACE * (i + 0.5), SPACE * (j + 0.5), SPACE, SPACE, SPACE * (i + 0.5), SPACE * (j + 0.5), SPACE, SPACE);
							numberContext.clearRect(SPACE * (i + 0.5), SPACE * (j + 0.5), SPACE, SPACE, SPACE * (i + 0.5), SPACE * (j + 0.5), SPACE, SPACE);
						} else if ((c2 === -1) && (c === 0 || c === 1)) {

							if (c === 0) {
								tmpNumberContext.fillStyle = "black";
							} else if (c === 1) {
								tmpNumberContext.fillStyle = "white";
							}

							fix = 0;
							num = exGoMap.currentMoveIndex > 0 ? exGoMap.mapList[exGoMap.currentMoveIndex][i][j].num : goMap.getCurrentMapCellNum(i, j);
							if (num >= 100) {
								fix = S;
							} else if (num <= 0) {
								continue;
							} else if (num < 10) {
								fix = s85;
							} else if (num < 100) {
								fix = s625;
							} else {
								fix = s75;
							}
							tmpNumberContext.save();
							tmpNumberContext.scale(0.8, 1);
							tmpNumberContext.beginPath();
							tmpNumberContext.fillText(num, 1.25 * (SPACE * i + fix), SPACE * (j + 1.25));
							tmpNumberContext.closePath();
							tmpNumberContext.restore();
						}
					}
				}
				numberContext.clearRect(0, 0, BOARD_LENGTH, BOARD_LENGTH);
				numberContext.drawImage(tmpNumberCanvas, 0, 0);
			}
		}

		/*
		 * When you click on the board, the function will process it 
		 * and paint the stone on the board.
		 *
		 * @param {MouseEvent} e mouse event
		 */
		function putGo(e) {
			var x, y,
				moveX, baseMoveX, moveY, baseMoveY,
				currentMove,
				tmp;

			x = e.pageX - stoneCanvas.offset().left;
			y = e.pageY - stoneCanvas.offset().top;

			x -= TS;
			y -= TS;

			if (x < 0 || y < 0 || x > BOARD_BASE_LENGTH || y > BOARD_BASE_LENGTH) {
				return;
			}
			moveX = (x / SPACE) + 1;
			baseMoveX = Math.floor(moveX);
			moveY = (y / SPACE) + 1;
			baseMoveY = Math.floor(moveY);

			// Check the position belong to where 
			if (moveX - baseMoveX >= 0.8) {
				moveX = baseMoveX + 1;
			} else if (moveX - baseMoveX <= 0.4) {
				moveX = baseMoveX;
			} else {
				return;
			}

			if (moveY - baseMoveY >= 0.8) {
				moveY = baseMoveY + 1;
			} else if (moveY - baseMoveY <= 0.4) {
				moveY = baseMoveY;
			} else {
				return;
			}

			// First click on the board
			if (exGoMap.currentMoveIndex === 0) {
				currentMove = goMap.getCurrentMove();

				// If the position I put is not empty, just ignore it
				if (goMap.getCurrentMapCellColor(moveX, moveY) === 1 || goMap.getCurrentMapCellColor(moveX, moveY) === 0) {
					return;
				}
				
				if (currentMove.x !== 0 && currentMove.y !== 0) {// Already exist some stones on the board

					exGoMap.insertMap(goMap.getCurrentMap());
					exGoMap.mapList[exGoMap.currentMoveIndex + 1][moveX][moveY].color = 1 - goMap.getCurrentMapCellColor(currentMove.x, currentMove.y);
				} else if (currentMove.x === 0 && currentMove.y === 0) { // First click without any stone on the board
					exGoMap.insertMap(goMap.getCurrentMap());
					exGoMap.mapList[exGoMap.currentMoveIndex + 1][moveX][moveY].color = 1;
				}
			} else {
				tmp = exGoMap.moveList[exGoMap.currentMoveIndex];

				// If the position I put is not empty, then ignore it
				if (exGoMap.mapList[exGoMap.currentMoveIndex][moveX][moveY].color === 1 || exGoMap.mapList[exGoMap.currentMoveIndex][moveX][moveY].color === 0) {
					return;
				}

				if (tmp.x !== 0 && tmp.y !== 0) {
					exGoMap.insertMap(exGoMap.mapList[exGoMap.currentMoveIndex]);
					exGoMap.mapList[exGoMap.currentMoveIndex + 1][moveX][moveY].color = 1 - exGoMap.mapList[exGoMap.currentMoveIndex][tmp.x][tmp.y].color;
				}
			}

			exGoMap.insertMove(new Move(moveX, moveY));
			findDeadStone(exGoMap.mapList[exGoMap.currentMoveIndex + 1], moveX, moveY);
			exGoMap.prevMoveIndex = exGoMap.currentMoveIndex;

			exGoMap.currentMoveIndex += 1;
			exGoMap.totalMoveCount += 1; // Just for logic
			changeButtonState();
			paint();
		}

		/*
		 * Main process
		 */
		function main(data) {
			var key;
			init();
			readData(data);
			for (key in metaList) {
				if (metaList.hasOwnProperty(key)) {
					metaTr[key].html(metaList[key]);
				}
			}
			metaTable.show();
			paintBoard();
			paint();
			addToolTip();
			changeButtonState();
			addButtonEvent();
			numberCanvas.click(putGo); // Use jQuery to work with IE
		}

		/*
		 * Public API
		 */
		API = {

			/*
			 * Ajax get gibo file then execute main function
			 *
			 * @param filePath {String} filePath The path of gibo file
			 */
			"go" : function (c, filePath) {
				container = $(c);
				$.get(filePath).done(main);
			},

			/*
			 * Move to the beginning of the game
			 */
			"begin" : function () {
				goMap.prevMoveIndex = goMap.currentMoveIndex;
				goMap.currentMoveIndex = 0;
				if (exGoMap.currentMoveIndex > 0) {
					exGoMap.remove(exGoMap.currentMoveIndex);
					exGoMap.prevMoveIndex = 0;
					exGoMap.currentMoveIndex = 0;
				}

				// I think clearing the board here is better than sub rendering
				stoneContext.clearRect(0, 0, BOARD_LENGTH, BOARD_LENGTH);
				changeButtonState();
				paint();
			},

			/*
			 * Backward num steps
			 *
			 * @param {Int} num The number of steps
			 */
			"backward" : function (num) {
				if (exGoMap.currentMoveIndex <= 0) {
					goMap.prevMoveIndex = goMap.currentMoveIndex;
					if (goMap.currentMoveIndex === 0) {
						return;
					}

					if (goMap.currentMoveIndex - num <= 0) {
						goMap.currentMoveIndex = 0;
					} else {
						goMap.currentMoveIndex -= num;
					}
				} else {
					exGoMap.prevMoveIndex = exGoMap.currentMoveIndex;
					if (exGoMap.currentMoveIndex - num <= 0) {
						exGoMap.currentMoveIndex = 0;
					} else {
						exGoMap.currentMoveIndex -= num;
					}
				}
				changeButtonState();
				paint();
				if (exGoMap.prevMoveIndex > 0) {
					exGoMap.remove(num);
				}
				if (exGoMap.currentMoveIndex <= 0) {
					exGoMap.prevMoveIndex = 0;
				}
			},

			/*
			 * Forward num steps
			 *
			 * @param {Int} num The number of steps
			 */
			"forward" : function (num) {
				goMap.prevMoveIndex = goMap.currentMoveIndex;
				if (goMap.currentMoveIndex === goMap.totalMoveCount - 1) {
					return;
				}

				if (goMap.currentMoveIndex + num >= goMap.totalMoveCount) {
					goMap.currentMoveIndex = goMap.totalMoveCount - 1;
				} else {
					goMap.currentMoveIndex += num;
				}
				changeButtonState();
				paint();
			},

			/*
			 * Move to the end of the game
			 */
			"end" : function () {
				goMap.prevMoveIndex = goMap.currentMoveIndex;
				goMap.currentMoveIndex = goMap.totalMoveCount - 1;
				changeButtonState();
				paint();
			},

			/*
			 * Display step number or not
			 */
			"flag" : function () {
				displayNum = !displayNum;
				paint();
			},

			/*
			 * Set auto play or not
			 */
			"setAuto" : function () {
				auto = !auto;
				if (auto === true) {
					stoneCanvas.off("click");
				} else {
					stoneCanvas.click(putGo);
				}
				changeButtonState();
				autoPlay();
			}
		};

		/*
		 * Add click event on buttons
		 */
		function addButtonEvent() {
			btnList.begin.click(API.begin);
			btnList.fastBackward.click(function () {API.backward(FAST_STEP_NUM); });
			btnList.backward.click(function () {API.backward(1); });
			btnList.forward.click(function () {API.forward(1); });
			btnList.fastForward.click(function () {API.forward(FAST_STEP_NUM); });
			btnList.end.click(API.end);
			btnList.flag.click(API.flag);
			btnList.auto.click(API.setAuto);
		}

		/*
		 * Called by API.setAuto
		 */
		function autoPlay() {
			if (auto && goMap.currentMoveIndex < goMap.totalMoveCount - 1) {
				API.forward(1);
				setTimeout(function () {autoPlay(); }, TIME_INTERVAL);
			}
		}

		return API;
	}

	$.fn.cago = function (filePath) {
		this.each(function () {
			var c = new Cago();
			c.go(this, filePath);
		});
	};

}(jQuery));

