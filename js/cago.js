var cago = (function($){

	// Your setting variable
	var BASE = 400; // Base width of board
	var SIZE = 19;
	var FAST_STEP_NUM = 10; // One click with 10 steps
	var TIME_INTERVAL= 2000; // 2000ms
	var displayNum = false;
	var auto = false;

	// DOM
	var canvas;
	var context; // The context of canvas
	var tmpCanvas; // Canvas for pre-rendering
	var ctx; // The context of tmpCanvas
	var btn; // Store all the buttons in the html

	// Program const variable
	var WIDTH = BASE + (BASE / 10);
	var HEIGHT = WIDTH; 
	var SPACE = BASE / 20;
	var FIXED_SIZE = SIZE + 2;
	var TOKEN_LIST = ["PW", "PB", "RE", "DT", "KM"]; // The token needed to be found in the gibo file
	var OPTIONAL_TOKEN_LIST = ["WR", "BR"];
	var STEP_VECTOR = [[0, 1], [1, 0], [-1, 0], [0, -1]]; // Used for easy traverse and find dead stones

	// Improve performance
	var FS = FIXED_SIZE - 1;
	var S = SPACE >> 1;
	var S2 = SPACE >> 2;
	var TS = SPACE << 1;
	var MP = Math.PI * 2; // Cannot use <<, this will cause error

	// Data structure
	var goMap;
	var exGoMap; // Store the steps made by user click
	var metaList; // Store file meta info 
	var map;

	function GoMap()
	{
		this.count = 0;
		this.index = 0;
		this.mapList = new Array();
		this.moveList = new Array();
	}
	/*
	 * Insert move
	 *
	 * @param {Array} m 2D array of MapMove object which include processed information of 'move'
	 * @param {Move} move Move object
	 */
	GoMap.prototype.insert = function(m, move)
	{
		this.insertMap(m);
		this.insertMove(move);
		this.count ++;
	}
	GoMap.prototype.insertMap = function(m)
	{
		this.mapList[this.count] = copyMap(m);
	}
	GoMap.prototype.insertMove = function(move)
	{
		this.moveList.push(move);
	}
	/*
	 * Remove n maps, this function only be used with exGoMap
	 *
	 * @param {Int} n number of maps to be removed
	 */
	GoMap.prototype.remove = function(n)
	{
		for(var i = 0; i < n; i++)
		{
			if(this.count <= 0)
			{
				break;
			}
			delete this.mapList[this.count - 1];
			this.moveList.pop();
			this.count--;
		}
	}
	/*
	 * @return {Array} Return current map(2D array) of MapMove object
	 */
	GoMap.prototype.getCurrentMap = function()
	{
		return this.mapList[this.index];
	}
	GoMap.prototype.getCurrentMapCellColor = function(i, j)
	{
		return this.mapList[this.index][i][j].color;
	}
	/*
	 * @return {Move} Return current move
	 */
	GoMap.prototype.getCurrentMove = function()
	{
		return this.moveList[this.index];
	}
	/*
	 * @return {Int} Return the step number of the position of current mapList
	 */
	GoMap.prototype.getCurrentMapCellNum = function(i, j)
	{
		return this.mapList[this.index][i][j].num;
	}
	/*
	 * Just put a empty map as the first map
	 */
	GoMap.prototype.insertEmptyMap = function()
	{
		var map = new Array(FIXED_SIZE);
		for(var i = 0; i < FIXED_SIZE; i++)
		{
			map[i] = new Array(FIXED_SIZE);
			for(var j = 0; j < FIXED_SIZE; j++)
			{
				if(i === 0 || i === FS || j === 0 || j === FS) map[i][j] = new MapMove(-2, 0);
				else map[i][j] = new MapMove(-1, 0);
			}
		}
		this.insert(map, new Move(0, 0));
	}

	/*
	 * A unit in GoMap.mapList
	 */
	function MapMove(t, n)
	{
		this.color = t;
		this.num = n;
	}

	/*
	 * A unit in GoMap.moveList
	 */
	function Move(x, y)
	{
		this.x = x;
		this.y = y;
	}


	/* 
	 * My Bool object to check dead stone
	 */
	function Dead(v)
	{
		this.value = v;
	}


	/*
	 * Copy a 2D array with FIXED_SIZE
	 *
	 * @param {Array} m A 2D array of MapMove object
	 * @return {Array} Returns a clone of the 2D array of MapMove object
	 */
	function copyMap(m)
	{
		var tmpMap = new Array(FIXED_SIZE);
		for(var i in m)
		{
			tmpMap[i] = new Array(FIXED_SIZE);
			for(var j in m[i])
			{
				tmpMap[i][j] = new MapMove(m[i][j].color, m[i][j].num);
			}
		}
		return tmpMap;

	}

	/*
	 * Add tooltip to these buttons
	 */
	function addToolTip()
	{
		$("#begin").tooltip({placement: "bottom"});
		$("#fastBackward").tooltip({placement: "bottom"});
		$("#backward").tooltip({placement: "bottom"});
		$("#forward").tooltip({placement: "bottom"});
		$("#fastForward").tooltip({placement: "bottom"});
		$("#end").tooltip({placement: "bottom"});
		$("#flag").tooltip({placement: "bottom"});
		$("#auto").tooltip({placement: "bottom"});
	}


	/*
	* Parse the gibo data
	*
	* @param {String} data The data string in the gibo file
	*/
	function readData(data)
	{
		var metaEnd = data.indexOf(";B");

		var i = 0;
		for(var me = metaEnd - 1; i < me; i++)
		{
			var t = data.substring(i, i + 2).toUpperCase();
			if($.inArray(t, TOKEN_LIST) != -1 || $.inArray(t, OPTIONAL_TOKEN_LIST) != -1)
			{
				if(data[i + 2] === "[") // Have to check this is a token with '[', or it may be a normal string
				{
					var result = getTokenData(data, i + 3);
					var d = result[0];
					i = result[1];
					metaList[t] = d;
				}
			}
		}

		for(; i < data.length; i++)
		{
			var t = data.substring(i, i + 2).toUpperCase();
			if(t === ";B" || t === ";W")
			{
				var result = getTokenData(data, i + 3);
				var d = result[0];
				if(d == "") continue;
				i = result[1];

				var color = -1;
				if(t === ";B") color = 1;
				else if(t === ";W") color = 0;

				var x = d.charCodeAt(0) - "a".charCodeAt(0) + 1;
				var y = d.charCodeAt(1) - "a".charCodeAt(0) + 1;
				var move = new Move(x, y);
				map[x][y].color = color;
				map[x][y].num = goMap.count;
				findDeadStone(map, x, y);

				goMap.insert(map, move);
			}
		}
	}

	/*
	 * When you click on the board, the function will process it 
	 * and paint the stone on the board.
	 *
	 * @param {MouseEvent} e mouse event
	 */
	function putGo(e)
	{
		var x = e.pageX - canvas.offset().left;
		var y = e.pageY - canvas.offset().top;
		x -= TS;
		y -= TS;

		if(x < 0 || y < 0 || x > BASE || y > BASE)
			return;
		var moveX = (x / SPACE) + 1;
		var baseMoveX = Math.floor(moveX);
		var moveY = (y / SPACE) + 1;
		var baseMoveY = Math.floor(moveY);

		// Check the position belong to where 
		if(moveX - baseMoveX >= 0.8) moveX = baseMoveX + 1;
		else if(moveX - baseMoveX <= 0.4) moveX = baseMoveX;
		else return;
		if(moveY - baseMoveY >= 0.8) moveY = baseMoveY + 1;
		else if(moveY - baseMoveY <= 0.4) moveY = baseMoveY;
		else return;

		// First click on the board
		if(exGoMap.count === 0)
		{
			var currentMove = goMap.getCurrentMove();

			// If the position I put is not empty, just ignore it
			if(goMap.getCurrentMapCellColor(moveX, moveY) === 1 || goMap.getCurrentMapCellColor(moveX, moveY) === 0)
			{
				return;
			}
			else if(currentMove.x != 0 && currentMove.y != 0) // Already exist some stones on the board
			{
				exGoMap.insertMap(goMap.getCurrentMap());
				exGoMap.mapList[exGoMap.count][moveX][moveY].color = 1 - goMap.getCurrentMapCellColor(currentMove.x, currentMove.y);
			}
			else if(currentMove.x === 0 && currentMove.y === 0) // First click without any stone on the board
			{
				exGoMap.insertMap(goMap.getCurrentMap());
				exGoMap.mapList[exGoMap.count][moveX][moveY].color = 1;
			}
		}
		else
		{
			var tmp = exGoMap.moveList[exGoMap.count - 1];

			// If the position I put is not empty, then ignore it
			if(exGoMap.mapList[exGoMap.count - 1][moveX][moveY].color === 1 || exGoMap.mapList[exGoMap.count - 1][moveX][moveY].color === 0)
			{
				return;
			}
			else if(tmp.x != 0 && tmp.y != 0) 
			{
				exGoMap.insertMap(exGoMap.mapList[exGoMap.count - 1]);
				exGoMap.mapList[exGoMap.count][moveX][moveY].color = 1 - exGoMap.mapList[exGoMap.count - 1][tmp.x][tmp.y].color;
			}
		}

		exGoMap.insertMove(new Move(moveX, moveY));
		exGoMap.count++;
		findDeadStone(exGoMap.mapList[exGoMap.count - 1], moveX, moveY);
		changeButtonState();
		paint();
	}

	/*
	 * Get the data with the token
	 *
	 * @param {String} data the data string in the gibo file
	 * @param {Int} index The current index in the data string
	 * @return {Array} Returns an array with [0]:token data, [1]: the index after the token data
	 */
	function getTokenData(data, index)
	{
		var i = index;
		while(data[index] != "]")
		{
			index++;

			if(index > data.length) // If something terrible happen...
			{
				alert("error");
				return "error";
			}
		}
		return [data.substring(i, index), index];
	}

	/*
	* Find dead stone groups from 4 sides
	* If found, delete them
	*
	* @param {Array} m 2D array of MapMove object
	* @param {Int} x The first index of m
	* @param {Int} y The second index of m
	*/
	function findDeadStone(map, x, y)
	{
		var m = copyMap(map);
		var color = m[x][y].color;
		var up = new Dead(true);
		var down = new Dead(true);
		var left = new Dead(true);
		var right = new Dead(true);

		if(m[x + 1][y].color === 1 - color)
		{
			traverse(m, x + 1, y, color, right);
			if(right.value === true)
			{
				deleteDeadStone(map, x + 1, y, color);
			}
		}

		if(m[x][y + 1].color === 1 - color)
		{
			traverse(m, x, y + 1, color, down);
			if(down.value === true)
			{
				deleteDeadStone(map, x, y + 1, color);
			}
		}

		if(m[x - 1][y].color === 1 - color)
		{
			traverse(m, x - 1, y, color, left);
			if(left.value === true)
			{
				deleteDeadStone(map, x - 1, y, color);
			}
		}

		if(m[x][y - 1].color === 1 - color)
		{
			traverse(m, x, y - 1, color, up);
			if(up.value === true)
			{
				deleteDeadStone(map, x, y - 1, color);
			}
		}
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
	function traverse(m, x, y, color, dead)
	{
		m[x][y].color = -2; // Tag to avoid traversing the same position twice.

		for(var i in STEP_VECTOR)
		{
			var xx = x + STEP_VECTOR[i][0];
			var yy = y + STEP_VECTOR[i][1];
			if(m[xx][yy].color === 1 - color)
			{
				traverse(m, xx, yy, color, dead);
			}
			else if(m[xx][yy].color === -1) // If find empty, then the stones are alive
			{
				dead.value = false;
				return;
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
	function deleteDeadStone(m, x, y, color)
	{
		m[x][y].color = -1;
		m[x][y].num = -1;

		for(var i in STEP_VECTOR)
		{
			var xx = x + STEP_VECTOR[i][0];
			var yy = y + STEP_VECTOR[i][1];

			if(m[xx][yy].color === 1 - color)
			{
				deleteDeadStone(m, xx, yy, color);
			}
		}
	}

	/*
	 * Paint the whole board!
	 */
	function paint()
	{
		// Draw color and lines of the board
		ctx.beginPath();
		ctx.fillStyle = "#D6B66F";
		ctx.fillRect(0, 0, WIDTH, HEIGHT);
		for(var i = 1, wts = WIDTH - TS, hts = HEIGHT - TS; i < FS; i++)
		{
			ctx.moveTo(TS, SPACE * (i + 1));
			ctx.lineTo(wts, SPACE * (i + 1));
			ctx.moveTo(SPACE * (i + 1), TS);
			ctx.lineTo(SPACE * (i + 1), hts);
		}
		ctx.stroke();
		ctx.closePath();

		// Draw string of the board 
		ctx.beginPath();
		ctx.fillStyle = "black";
		ctx.font = "bold 12px sans-serif";
		ctx.textBaseline = "bottom";
		for(var i = 1, ss = SPACE + SPACE * 0.25, hs = HEIGHT - SPACE * 0.5, ws = WIDTH - SPACE, s3 = SPACE >> 3; i < FS; i++)
		{
			var baseCode = "A".charCodeAt(0);
			var code = baseCode + i - 1;

			ctx.fillText(String.fromCharCode(code), SPACE * (i + 0.75), ss);
			ctx.fillText(String.fromCharCode(code), SPACE * (i + 0.75), hs);

			var t1 = SPACE * (i + 1.25);
			if(i < 11)
			{
				ctx.fillText(String(20 - i), s3, t1);
				ctx.fillText(String(20 - i), ws, t1);
			}
			else
			{
				ctx.fillText(String(20 - i), S, t1);
				ctx.fillText(String(20 - i), ws, t1);
			}
		}
		ctx.closePath();

		if(exGoMap.count != 0)
		{
			// Draw stone
			var c = exGoMap.count - 1;
			for(var i = 1; i < FS; i++)
			{
				for(var j = 1; j < FS; j++)
				{
					if(exGoMap.mapList[c][i][j].color === 0)
					{
						ctx.fillStyle = "white";
					}
					else if(exGoMap.mapList[c][i][j].color === 1)
					{
						ctx.fillStyle = "black";
					}

					if(exGoMap.mapList[c][i][j].color === 0 || exGoMap.mapList[c][i][j].color === 1)
					{
						ctx.beginPath();
						ctx.arc(SPACE * ( i + 1 ), SPACE * (j + 1), S, 0, MP, true);
						ctx.fill();
						ctx.closePath();
					}
				}
			}
		}
		else
		{
			// I try to seperate into two for loops to reduce fillStyle change
			// But the performance is the same, I think getCurrentMapCellColor and redundent for loop still reduce performance
			for(var i = 1; i < FS; i++)
			{
				for(var j = 1; j < FS; j++)
				{
					var c = goMap.getCurrentMapCellColor(i, j);
					if(c === 0)
					{
						ctx.fillStyle = "white";
					}
					else if(c === 1)
					{
						ctx.fillStyle = "black";
					}

					if(c === 0 || c === 1)
					{
						ctx.beginPath();
						ctx.arc(SPACE * i + SPACE, SPACE * (j + 1), S, 0, MP, true);
						ctx.fill();
						ctx.closePath();
					}
				}
			}
		}

		// Tag the current move
		if(goMap.index > 0)
		{
			ctx.fillStyle = "red";
			ctx.beginPath();
			var m = goMap.getCurrentMove();
			ctx.arc(SPACE * (m.x + 1), SPACE * (m.y + 1), S2, 0, MP, true);
			ctx.fill();
			ctx.closePath();

		}
		if(displayNum)
		{
			var s85 = SPACE * 0.85;
			var s75 = SPACE * 0.75;
			var s625 = SPACE * 0.625;

			ctx.font = "10px sans-serif";
			for(var i = 0; i < FS; i++)
			{
				for(var j = 0; j < FS; j++)
				{
					var c = exGoMap.count != 0 ? exGoMap.mapList[exGoMap.count - 1][i][j].color : goMap.getCurrentMapCellColor(i, j);
					if(c === 0 || c === 1)
					{
						ctx.beginPath();

						if(c === 0)
						{
							ctx.fillStyle = "black";
						}
						else if(c === 1)
						{
							ctx.fillStyle = "white";
						}

						var fix = 0;
						var num = exGoMap.count != 0 ? exGoMap.mapList[exGoMap.count - 1][i][j].num : goMap.getCurrentMapCellNum(i, j);
						if(num >= 100)
						{ 
							fix = S;
						}
						else if(num <= 0) continue;
						else if(num < 10)
						{
							fix = s85;
						}
						else if(num < 100)
						{
							fix = s625;
						}
						else
						{
							fix = s75;
						}
						ctx.fillText(num, SPACE * i + fix, SPACE * (j + 1.25));
						ctx.closePath();
					}
				}
			}
		}
		context.drawImage(tmpCanvas, 0, 0);
	}

	/*
	 * Enable or disable the buttons according to 
	 * 1. auto setting
	 * 2. If at the begin or end
	 */
	function changeButtonState()
	{
		if(auto === true) 
		{
			btn.begin.prop("disabled", auto);
			btn.backward.prop("disabled", auto);
			btn.fastBackward.prop("disabled", auto);
			btn.end.prop("disabled", auto);
			btn.forward.prop("disabled", auto);
			btn.fastForward.prop("disabled", auto);
			return;
		}

		if((goMap.index === 0) && (exGoMap.count === 0)) 
		{ 
			btn.begin.prop("disabled", true);
			btn.begin.tooltip("hide");
			btn.backward.prop("disabled", true);
			btn.backward.tooltip("hide");
			btn.fastBackward.prop("disabled", true);
			btn.fastBackward.tooltip("hide");

			btn.end.prop("disabled", false);
			btn.forward.prop("disabled", false);
			btn.fastForward.prop("disabled", false);
		}
		else if((goMap.index === goMap.count - 1) || (exGoMap.count > 0)) 
		{
			btn.begin.prop("disabled", false);
			btn.backward.prop("disabled", false);
			btn.fastBackward.prop("disabled", false);

			btn.end.prop("disabled", true);
			btn.end.tooltip("hide");
			btn.forward.prop("disabled", true);
			btn.forward.tooltip("hide");
			btn.fastForward.prop("disabled", true);
			btn.fastForward.tooltip("hide");
		}
		else
		{
			btn.begin.prop("disabled", false);
			btn.backward.prop("disabled", false);
			btn.fastBackward.prop("disabled", false);
			btn.end.prop("disabled", false);
			btn.forward.prop("disabled", false);
			btn.fastForward.prop("disabled", false);
		}
	}

	/*
	 * Add click event on buttons
	 */
	function addButtonEvent()
	{
		btn.begin.click(API.begin);
		btn.fastBackward.click(function(){API.backward(FAST_STEP_NUM);});
		btn.backward.click(function(){API.backward(1);});
		btn.forward.click(function(){API.forward(1);});
		btn.fastForward.click(function(){API.forward(FAST_STEP_NUM);});
		btn.end.click(API.end);
		btn.flag.click(API.flag);
		btn.auto.click(API.setAuto);
	}

	/*
	 * Called by API.setAuto
	 */
	function autoPlay()
	{
		if(auto && goMap.index < goMap.count - 1)
		{
			API.forward(1);
			setTimeout(function(){autoPlay();}, TIME_INTERVAL);
		}
	}

	/*
	 * Main process
	 */
	function main(data)
	{
		goMap = new GoMap();
		goMap.insertEmptyMap();
		exGoMap = new GoMap();
		metaList = new Array();
		map = new Array(FIXED_SIZE);
		for(var i = 0; i < FIXED_SIZE; i++)
		{
			map[i] = new Array(FIXED_SIZE);
			for(var j = 0; j < FIXED_SIZE; j++)
			{
				if(i === 0 || i === FS || j === 0 || j === FS) map[i][j] = new MapMove(-2, 0);
				else map[i][j] = new MapMove(-1, 0);
			}
		}

		canvas = $("#myCanvas");
		canvas[0].width = WIDTH;
		canvas[0].height = WIDTH;
		context = canvas[0].getContext("2d");
		tmpCanvas = document.createElement("canvas");
		tmpCanvas.width = WIDTH;
		tmpCanvas.height = WIDTH;
		ctx = tmpCanvas.getContext("2d");

		btn = new Object();
		btn.begin = $("#begin");
		btn.backward = $("#backward");
		btn.fastBackward = $("#fastBackward");
		btn.end= $("#end");
		btn.forward= $("#forward");
		btn.fastForward= $("#fastForward");
		btn.flag = $("#flag");
		btn.auto = $("#auto");

		readData(data);

		// Add meta info in web page
		for(var key in metaList)
		{
			document.getElementById(key).innerHTML = metaList[key];
		}
		$("#meta").show();

		paint();
		addToolTip();
		changeButtonState();
		addButtonEvent();
		canvas.click(putGo); // Use jQuery to work with IE
	}

	/*
	 * Public API
	 */
	var API = {

		/*
		 * Ajax get gibo file then execute main function
		 *
		 * @param filePath {String} filePath The path of gibo file
		 */
		"go" : function(filePath)
		{
			$.get(filePath).done(main);
		},

		/*
		 * Move to the beginning of the game
		 */
		"begin" : function()
		{
			goMap.index = 0;
			exGoMap.remove(exGoMap.count);
			changeButtonState();
			paint();
		},

		/*
		 * Backward num steps
		 *
		 * @param {Int} num The number of steps
		 */
		"backward" : function(num)
		{
			if(exGoMap.count <= 0)
			{
				if(goMap.index === 0) return;

				if(goMap.index - num < 0) goMap.index = 0;
				else goMap.index -= num;
			}
			else
			{
				exGoMap.remove(num);
			}
			changeButtonState();
			paint();
		},

		/*
		 * Forward num steps
		 *
		 * @param {Int} num The number of steps
		 */
		"forward" : function(num)
		{
			if(goMap.index === goMap.count - 1) return;

			if(goMap.index + num >= goMap.count) goMap.index = goMap.count - 1;
			else goMap.index += num;
			changeButtonState();
			paint();
		},

		/*
		 * Move to the end of the game
		 */
		"end" : function()
		{
			goMap.index = goMap.count - 1;
			changeButtonState();
			paint();
		},

		/*
		 * Display step number or not
		 */
		"flag" : function()
		{
			displayNum = !displayNum;
			paint();
		},

		/*
		 * Set auto play or not
		 */
		"setAuto" : function()
		{
			auto = !auto;
			if(auto === true)
			{
				canvas.off("click");
			}
			else
			{
				canvas.click(putGo);
			}
			changeButtonState();
			autoPlay();
		}
	};

	return API;
})(jQuery);

