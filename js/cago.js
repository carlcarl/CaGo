var cago = (function($){

	var base = 400;
	var width = base + (base / 10);
	var height = width; 
	var space = base / 20;
	var twoSpace = space << 1;
	var SIZE = 19;
	var FIXED_SIZE = SIZE + 2;
	var tokenList = ["PW", "PB", "RE", "DT", "KM"];
	var optionalTokenList = ["WR", "BR"];
	var stepVector = [[0, 1], [1, 0], [-1, 0], [0, -1]]; // Used for easy traverse and find dead stones
	var fastStepNum = 10; // one click with 10 steps
	var displayNum = false;
	var auto = false;
	var timeInterval = 2000; // 2000ms
	var metaList = new Array(); // Store file meta info 
	var map = new Array(FIXED_SIZE);

	function GoMap()
	{
		this.count = 0;
		this.index = 0;
		this.mapList = new Array();
		this.moveList = new Array();
	}
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
	GoMap.prototype.getCurrentMap = function()
	{
		return this.mapList[this.index];
	}
	GoMap.prototype.getCurrentMapCellColor = function(i, j)
	{
		return this.mapList[this.index][i][j].color;
	}
	GoMap.prototype.getCurrentMove = function()
	{
		return this.moveList[this.index];
	}
	GoMap.prototype.getCurrentMapCellNum = function(i, j)
	{
		return this.mapList[this.index][i][j].num;
	}
	GoMap.prototype.insertEmptyMap = function()
	{
		var map = new Array(FIXED_SIZE);
		for(var i = 0; i < FIXED_SIZE; i++)
		{
			map[i] = new Array(FIXED_SIZE);
			for(var j = 0; j < FIXED_SIZE; j++)
			{
				if(i === 0 || i === FIXED_SIZE - 1 || j === 0 || j === FIXED_SIZE - 1) map[i][j] = new MapMove(-2, 0);
				else map[i][j] = new MapMove(-1, 0);
			}
		}
		this.insert(map, new Move(0, 0));
	}
	var goMap = new GoMap();
	goMap.insertEmptyMap();
	var exGoMap = new GoMap();

	function MapMove(t, n)
	{
		this.color = t;
		this.num = n;
	}

	function Move(x, y)
	{
		this.x = x;
		this.y = y;
	}

	for(var i = 0; i < FIXED_SIZE; i++)
	{
		map[i] = new Array(FIXED_SIZE);
		for(var j = 0; j < FIXED_SIZE; j++)
		{
			if(i === 0 || i === FIXED_SIZE - 1 || j === 0 || j === FIXED_SIZE - 1) map[i][j] = new MapMove(-2, 0);
			else map[i][j] = new MapMove(-1, 0);
		}
	}

	// My Bool object to check dead stone
	function Dead(v)
	{
		this.value = v;
	}

	/*
	* Return a clone of the 2d array
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
	* Use ajax to get gibo
	*/ 
	function getFile(filePath)
	{
		$.get(filePath, readData);
	}

	/*
	* Parse the gibo data
	*/
	function readData(data)
	{
		var metaEnd = data.indexOf(";B");

		var i = 0;
		for(i = 0; i < metaEnd - 1; i++)
		{
			var t = data.substring(i, i + 2).toUpperCase();
			if($.inArray(t, tokenList) != -1 || $.inArray(t, optionalTokenList) != -1)
			{
				if(data[i + 2] === "[") // 要確定接下來是'['不然可能是一般字串 
				{
					var result = getTokenData(data, i + 3);
					var d = result[0];
					i = result[1];
					metaList[t] = d;
				}
			}
		}

		// Add meta info in web page
		for(var key in metaList)
		{
			document.getElementById(key).innerHTML = metaList[key];
		}
		$("#meta").show();

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
		changeButtonState();
		paint();
	}

	function putGo(e)
	{
		var x = e.pageX - $("#myCanvas").offset().left;
		var y = e.pageY - $("#myCanvas").offset().top;
		x -= twoSpace;
		y -= twoSpace;

		if(x < 0 || y < 0 || x > base || y > base)
			return;
		var moveX = x / space + 1;
		var baseMoveX = Math.floor(moveX);
		var moveY = y / space + 1;
		var baseMoveY = Math.floor(moveY);

		// Check the position belong to where 
		if(moveX - baseMoveX >= 0.8) moveX = baseMoveX + 1;
		else if(moveX - baseMoveX <= 0.4) moveX = baseMoveX;
		else return;
		if(moveY - baseMoveY >= 0.8) moveY = baseMoveY + 1;
		else if(moveY - baseMoveY <= 0.4) moveY = baseMoveY;
		else return;

		if(exGoMap.count === 0)
		{
			var currentMove = goMap.getCurrentMove();

			// If the position I put is not empty, then ignore it
			if(goMap.getCurrentMapCellColor(moveX, moveY) === 1 || goMap.getCurrentMapCellColor(moveX, moveY) === 0)
			{
				return;
			}
			else if(currentMove.x != 0 && currentMove.y != 0)
			{
				exGoMap.insertMap(goMap.getCurrentMap());
				exGoMap.mapList[exGoMap.count][moveX][moveY].color = 1 - goMap.getCurrentMapCellColor(currentMove.x, currentMove.y);
			}
			else if(currentMove.x === 0 && currentMove.y === 0) // First click
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
		paint();
	}

	/*
	* return an array with [0]:token data, [1]: the index after the token data
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
	*/
	function traverse(m, x, y, color, dead)
	{
		m[x][y].color = -2; // Tag to avoid traversing the same position twice.

		for(var i in stepVector)
		{
			var xx = x + stepVector[i][0];
			var yy = y + stepVector[i][1];
			if(m[xx][yy].color === 1 - color)
			{
				traverse(m, xx, yy, color, dead);
			}
			else if(m[xx][yy].color === -1)
			{
				dead.value = false;
				return;
			}
		}
	}

	/*
	* Recursive delete stones
	*/
	function deleteDeadStone(m, x, y, color)
	{
		m[x][y].color = -1;

		for(var i in stepVector)
		{
			var xx = x + stepVector[i][0];
			var yy = y + stepVector[i][1];

			if(m[xx][yy].color === 1 - color)
			{
				deleteDeadStone(m, xx, yy, color);
			}
		}
	}

	function paint()
	{
		var c = document.getElementById("myCanvas");
		var ctx = c.getContext("2d");

		// Draw color and lines of the board
		ctx.beginPath();
		ctx.fillStyle = "#D6B66F";
		ctx.fillRect(0, 0, width, height);
		for(var i = 1; i < FIXED_SIZE - 1; i++)
		{
			ctx.moveTo(twoSpace, space * (i + 1));
			ctx.lineTo(width - twoSpace, space * (i + 1));
			ctx.moveTo(space * (i + 1), twoSpace);
			ctx.lineTo(space * (i + 1), height - twoSpace);
		}
		ctx.stroke();
		ctx.closePath();

		// Draw string of the board 
		ctx.beginPath();
		ctx.fillStyle = "black";
		ctx.font = "bold 12px sans-serif";
		ctx.textBaseline = "bottom";
		for(var i = 1; i < FIXED_SIZE - 1; i++)
		{
			var baseCode = "A".charCodeAt(0);
			var code = baseCode + i - 1;

			ctx.fillText(String.fromCharCode(code), space * (i + 0.75), space + space * 0.25);
			ctx.fillText(String.fromCharCode(code), space * (i + 0.75), height - space * 0.5);

			var t1 = space * (i + 1.25);
			if(i < 11)
			{
				ctx.fillText(String(20 - i), space >> 3, t1);
				ctx.fillText(String(20 - i), width - space, t1);
			}
			else
			{
				ctx.fillText(String(20 - i), space >> 1 , t1);
				ctx.fillText(String(20 - i), width - space, t1);
			}
		}
		ctx.closePath();

		if(exGoMap.count != 0)
		{
			// Draw stone
			for(var i = 1; i < FIXED_SIZE - 1; i++)
			{
				for(var j = 1; j < FIXED_SIZE - 1; j++)
				{
					if(exGoMap.mapList[exGoMap.count - 1][i][j].color === 0)
					{
						ctx.fillStyle = "white";
					}
					else if(exGoMap.mapList[exGoMap.count - 1][i][j].color === 1)
					{
						ctx.fillStyle = "black";
					}

					if(exGoMap.mapList[exGoMap.count - 1][i][j].color === 0 || exGoMap.mapList[exGoMap.count - 1][i][j].color === 1)
					{
						ctx.beginPath();
						ctx.arc(space * ( i + 1 ), space * (j + 1), space >> 1, 0, Math.PI * 2, true);
						ctx.fill();
						ctx.closePath();
					}
				}
			}
		}
		else
		{
			// Draw stone
			for(var i = 1; i < FIXED_SIZE - 1; i++)
			{
				for(var j = 1; j < FIXED_SIZE - 1; j++)
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
						ctx.arc(space * i + space, space * (j + 1), space >> 1, 0, Math.PI * 2, true);
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
			ctx.arc(space * (m.x + 1), space * (m.y + 1), space >> 2, 0, Math.PI * 2, true);
			ctx.fill();
			ctx.closePath();

		}
		if(displayNum)
		{
			for(var i = 0; i < FIXED_SIZE - 1; i++)
			{
				for(var j = 0; j < FIXED_SIZE - 1; j++)
				{
					var c = goMap.getCurrentMapCellColor(i, j);
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
						ctx.font = "10px sans-serif";

						var fix = 0;
						var num = goMap.getCurrentMapCellNum(i, j);
						if(num >= 100)
						{ 
							fix = space >> 1;
						}
						else if(num < 10)
						{
							fix = space * 0.85;
						}
						else if(num < 100)
						{
							fix = space * 0.625;
						}
						else
						{
							fix = space * 0.75;
						}
						ctx.fillText(num, space * i + fix, space * (j + 1.25));
						ctx.closePath();
					}
				}
			}
		}
	}

	function changeButtonState()
	{
		if(auto === true) 
		{
			document.getElementById("begin").disabled = auto;
			document.getElementById("backward").disabled = auto;
			document.getElementById("fastBackward").disabled = auto;
			document.getElementById("end").disabled = auto;
			document.getElementById("forward").disabled = auto;
			document.getElementById("fastForward").disabled = auto;
			return;
		}

		if((goMap.index === 0) && (exGoMap.count === 0)) 
		{ 
			document.getElementById("begin").disabled = true;
			$("#begin").tooltip("hide");
			document.getElementById("backward").disabled = true;
			$("#backward").tooltip("hide");
			document.getElementById("fastBackward").disabled = true;
			$("#fastBackward").tooltip("hide");

			document.getElementById("end").disabled = false;
			document.getElementById("forward").disabled = false;
			document.getElementById("fastForward").disabled = false;
		}
		else if((goMap.index === goMap.count - 1) || (exGoMap.count > 0)) 
		{
			document.getElementById("begin").disabled = false;
			document.getElementById("backward").disabled = false;
			document.getElementById("fastBackward").disabled = false;

			document.getElementById("end").disabled = true;
			$("#end").tooltip("hide");
			document.getElementById("forward").disabled = true;
			$("#forward").tooltip("hide");
			document.getElementById("fastForward").disabled = true;
			$("#fastForward").tooltip("hide");
		}
		else
		{
			// TODO: Improve this in the future zzz
			document.getElementById("begin").disabled = false;
			document.getElementById("backward").disabled = false;
			document.getElementById("fastBackward").disabled = false;
			document.getElementById("end").disabled = false;
			document.getElementById("forward").disabled = false;
			document.getElementById("fastForward").disabled = false;
		}
	}

	function autoPlay()
	{
		if(auto && goMap.index < goMap.count - 1)
		{
			LIB.forward(1);
			setTimeout(function(){autoPlay();}, timeInterval);
		}
	}

	// Public API
	var LIB = {

		"go" : function(filePath)
		{
			$(function(){
				addToolTip();
				getFile(filePath);
				$("#myCanvas").click(putGo);
			});
		},


		"begin" : function()
		{
			goMap.index = 0;
			exGoMap.remove(exGoMap.count);
			changeButtonState();
			paint();
		},

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

		"forward" : function(num)
		{
			if(goMap.index === goMap.count - 1) return;

			if(goMap.index + num >= goMap.count) goMap.index = goMap.count - 1;
			else goMap.index += num;
			changeButtonState();
			paint();
		},

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

		"setAuto" : function()
		{
			auto = !auto;
			changeButtonState();
			autoPlay();
		}
	};

	return LIB;
})(jQuery);

