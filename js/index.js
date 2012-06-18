var base = 400;
var width = base + (base / 10);
var height = width; 
var space = base / 20;
var twoSpace = space << 1;
var SIZE = 21;
var tokenList = ["PW", "PB", "RE", "DT", "KM"];
var optionalTokenList = ["WR", "BR"];
var stepVector = [[0, 1], [1, 0], [-1, 0], [0, -1]]; // Used for easy traverse and find dead stones
var fastStepNum = 10; // one click with 10 steps
var displayNum = false;
var metaList = new Array(); // Store file meta info 
var exMoveList = new Array();
var map = new Array(SIZE);
for(var i = 0; i < SIZE; i++)
{
	map[i] = new Array(SIZE);
}
var exMapList = new Array();
var exMapCount = 0;
var exMapIndex = 0;

function GoMap()
{
	this.count = 0;
	this.index = 0;
	this.mapList = new Array();

	this.moveList = new Array();
	this.moveList.push([0, 0]);


	this.insert = function(m, mv)
	{
		this.insertMap(m);
		this.insertMove(mv);
		this.count ++;
	};

	this.insertMap = function(m)
	{
		this.mapList[this.count] = copyMap(m);
	};

	this.insertMove = function(mv)
	{
		this.moveList.push(mv);
	};

	this.getCurrentMap = function()
	{
		return this.mapList[this.index];
	};

	this.getCurrentMapCellColor = function(i, j)
	{
		return this.mapList[this.index][i][j].color;
	};

	this.getCurrentMoveX = function()
	{
		return this.moveList[this.index][0];
	};
	
	this.getCurrentMoveY = function()
	{
		return this.moveList[this.index][1];
	};

	this.getCurrentMapCellNum = function(i, j)
	{
		return this.mapList[this.index][i][j].num;
	}

	this.init = function()
	{
		var map = new Array(SIZE);
		for(var i = 0; i < SIZE; i++)
		{
			map[i] = new Array(SIZE);
			for(var j = 0; j < SIZE; j++)
			{
				map[i][j] = new Move(-1, 0);
			}
		}

		this.mapList[this.count++] = copyMap(map); // Initilize a empty map first
	};
	this.init();
}
GoMap.prototype.getinfo = function()
{
	return 'hello';
}
var goMap = new GoMap();

function Move(t, n)
{
	this.color = t;
	this.num = n;
}
Move.prototype.getinfo = function()
{
	return this.color + " " + this.num;
}

/* moveList.push([0, 0]); */
for(var i = 0; i < SIZE; i++)
{
	for(var j = 0; j < SIZE; j++)
	{
		map[i][j] = new Move(-1, 0);
	}
}

// My Bool object to check dead stone
function Dead(v)
{
	this.value = v;
}
Dead.prototype.getinfo = function()
{
	return this.value;
}


function go()
{
	addToolTip();
	getFile();
	$("#myCanvas").click(putGo);
}

/*
* Return a clone of the 2d array
*/
function copyMap(m)
{
	var tmpMap = new Array(SIZE);
	for(var i = 0; i < m.length; i++)
	{
		tmpMap[i] = new Array(SIZE);
		for(var j = 0; j < m[i].length; j++)
		{
			var tmp = new Move(m[i][j].color, m[i][j].num);
			tmpMap[i][j] = tmp;
		}
	}
	return tmpMap;
}

/*
* Use ajax to get gibo
*/ 
function getFile()
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
		var t = data[i] + data[i + 1];
		t = t.toUpperCase();
		if(tokenList.indexOf(t) != -1 || optionalTokenList.indexOf(t) != -1)
		{
			if(data[i + 2] == "[") // 要確定接下來是'['不然可能是一般字串
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
		$("#" + key).text(metaList[key]);
	}
	$("#meta").show();

	for(; i < data.length; i++)
	{
		var t = data[i] + data[i + 1];
		t = t.toUpperCase();
		if(t == ";B" || t == ";W")
		{
			var result = getTokenData(data, i + 3);
			var d = result[0];
			if(d == "") continue;
			i = result[1];

			var color = -1;
			if(t == ";B") color = 1;
			else if(t == ";W") color = 0;

			var x = d.charCodeAt(0) - "a".charCodeAt(0) + 1;
			var y = d.charCodeAt(1) - "a".charCodeAt(0) + 1;
			var move = [x, y];
			map[x][y].color = color;
			map[x][y].num = goMap.count;
			findDeadStone(map, x, y);

			goMap.insert(map, move);
		}
	}
	console.log(metaList);
	paint();
}

/*
* return an array with [0]:token data, [1]: the index after the token data
*/
function getTokenData(data, index)
{
	var d = "";
	while(data[index] != "]")
	{
		d += data[index];
		index++;

		if(index > data.length) // If something terrible happen...
		{
			alert("error");
			exit(1);
		}
	}
	return [d, index];
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

	if(m[x + 1][y].color == 1 - color)
	{
		traverse(m, x + 1, y, color, right);
		if(right.value == true)
		{
			deleteDeadStone(map, x + 1, y, color);
			return;
		}
	}

	if(m[x][y + 1].color == 1 - color)
	{
		traverse(m, x, y + 1, color, down);
		if(down.value == true)
		{
			deleteDeadStone(map, x, y + 1, color);
			return;
		}
	}

	if(m[x - 1][y].color == 1 - color)
	{
		traverse(m, x - 1, y, color, left);
		if(left.value == true)
		{
			deleteDeadStone(map, x - 1, y, color);
			return;
		}
	}

	if(m[x][y - 1].color == 1 - color)
	{
		traverse(m, x, y - 1, color, up);
		if(up.value == true)
		{
			deleteDeadStone(map, x, y - 1, color);
			return;
		}
	}
}

/*
* Recursive traverse to find dead stones
*/
function traverse(m, x, y, color, dead)
{
	m[x][y].color = -2; // Tag to avoid traversing the same position twice.

	for(var i = 0; i < stepVector.length; i++)
	{
		var xx = x + stepVector[i][0];
		var yy = y + stepVector[i][1];
		if(m[xx][yy].color == 1 - color)
		{
			traverse(m, xx, yy, color, dead);
		}
		else if(m[xx][yy].color == -1)
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

	for(var i = 0; i < stepVector.length; i++)
	{
		var xx = x + stepVector[i][0];
		var yy = y + stepVector[i][1];

		if(m[xx][yy].color == 1 - color)
		{
			deleteDeadStone(m, xx, yy, color);
		}
	}
}

function paint()
{
	changeButtonState();
	var c = document.getElementById("myCanvas");
	var ctx = c.getContext("2d");

	// Draw color and lines of the board
	ctx.beginPath();
	ctx.fillStyle = "#D6B66F";
	ctx.fillRect(0, 0, width, height);
	for(var i = 1; i < SIZE - 1; i++)
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
	for(var i = 1; i < SIZE - 1; i++)
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

	if(exMapCount != 0)
	{
		// Draw stone
		for(var i = 1; i < SIZE - 1; i++)
		{
			for(var j = 1; j < SIZE - 1; j++)
			{
				if(exMapList[exMapCount - 1][i][j].color == 0)
				{
					ctx.fillStyle = "white";
				}
				else if(exMapList[exMapCount - 1][i][j].color == 1)
				{
					ctx.fillStyle = "black";
				}

				if(exMapList[exMapCount - 1][i][j].color == 0 || exMapList[exMapCount - 1][i][j].color == 1)
				{
					ctx.beginPath();
					ctx.arc(space * i + space, space * j + space, space / 2, 0, Math.PI * 2, true);
					ctx.fill();
					ctx.closePath();
				}
			}
		}
	}

	else
	{
		// Draw stone
		for(var i = 1; i < SIZE - 1; i++)
		{
			for(var j = 1; j < SIZE - 1; j++)
			{
				var c = goMap.getCurrentMapCellColor(i, j);
				if(c == 0)
				{
					ctx.fillStyle = "white";
				}
				else if(c == 1)
				{
					ctx.fillStyle = "black";
				}

				if(c == 0 || c == 1)
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
		ctx.arc(space * (goMap.getCurrentMoveX() + 1), space * (goMap.getCurrentMoveY() + 1), space >> 2, 0, Math.PI * 2, true);
		ctx.fill();
		ctx.closePath();

	}
	if(displayNum)
	{
		for(var i = 0; i < SIZE - 1; i++)
		{
			for(var j = 0; j < SIZE - 1; j++)
			{
				var c = goMap.getCurrentMapCellColor(i, j);
				if(c == 0 || c == 1)
				{
					ctx.beginPath();

					if(c == 0)
					{
						ctx.fillStyle = "black";
					}
					else if(c == 1)
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
						fix = space * 0.75;
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

function putGo(e)
{
	var x = e.pageX-$("#myCanvas").offset().left;
	var y = e.pageY-$("#myCanvas").offset().top;
	x -= twoSpace;
	y -= twoSpace;

	if(x < 0 || y < 0 || x > base || y > base)
		return;
	var moveX = x / space + 1;
	var baseMoveX = Math.floor(moveX);
	var moveY = y / space + 1;
	var baseMoveY = Math.floor(moveY);
	if(moveX - baseMoveX >= 0.8) moveX = baseMoveX + 1;
	else if(moveX - baseMoveX <= 0.4) moveX = baseMoveX;
	else return;
	if(moveY - baseMoveY >= 0.8) moveY = baseMoveY + 1;
	else if(moveY - baseMoveY <= 0.4) moveY = baseMoveY;
	else return;
	if(exMapCount == 0)
	{
		var tmpX = goMap.getCurrentMoveX();
		var tmpY = goMap.getCurrentMoveY();
		if(goMap.getCurrentMapCellColor(moveX, moveY) == 1 || goMap.getCurrentMapCellColor(moveX, moveY) == 0)
		{
			return;
		}
		else if(tmpX != 0 && tmpY != 0) 
		{
			exMapList[exMapCount] = copyMap(goMap.getCurrentMap());
			exMapList[exMapCount][moveX][moveY].color = 1 - goMap.getCurrentMapCellColor(tmpX, tmpY);
		}
		else if(tmpX == 0 && tmpY == 0)
		{
			exMapList[exMapCount] = copyMap(goMap.getCurrentMap());
			exMapList[exMapCount][moveX][moveY].color = 1;
		}
	}
	else
	{
		var tmpX = exMoveList[exMapCount - 1][0];
		var tmpY = exMoveList[exMapCount - 1][1];

		if(exMapList[exMapCount - 1][moveX][moveY].color == 1 || exMapList[exMapCount - 1][moveX][moveY].color == 0)
		{
			return;
		}
		else if(tmpX != 0 && tmpY != 0) 
		{
			exMapList[exMapCount] = copyMap(exMapList[exMapCount - 1]);
			exMapList[exMapCount][moveX][moveY].color = 1 - exMapList[exMapCount - 1][tmpX][tmpY].color;
		}
	}

	exMoveList.push([moveX, moveY]);
	console.log(exMapList[exMapCount][moveX][moveY]);
	exMapCount ++;
	console.log(moveX + ' ' + moveY);
	paint();
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
}

function changeButtonState()
{
	if(goMap.index == 0) 
	{ 
		$("#begin").attr("disabled", true); 
		$("#begin").tooltip("hide");
		$("#backward").attr("disabled", true); 
		$("#backward").tooltip("hide");
		$("#fastBackward").attr("disabled", true); 
		$("#fastBackward").tooltip("hide");
		$("#end").attr("disabled", false);
		$("#forward").attr("disabled", false);
		$("#fastForward").attr("disabled", false);
	}
	else if(goMap.index == goMap.count - 1) 
	{
		$("#begin").attr("disabled", false); 
		$("#backward").attr("disabled", false); 
		$("#fastBackward").attr("disabled", false); 
		$("#end").attr("disabled", true);
		$("#end").tooltip("hide");
		$("#forward").attr("disabled", true);
		$("#forward").tooltip("hide");
		$("#fastForward").attr("disabled", true);
		$("#fastForward").tooltip("hide");
	}
	else
	{
		// TODO: Improve this in the future zzz
		$("#begin").attr("disabled", false); 
		$("#backward").attr("disabled", false); 
		$("#fastBackward").attr("disabled", false); 
		$("#end").attr("disabled", false);
		$("#forward").attr("disabled", false);
		$("#fastForward").attr("disabled", false);
	}
}

function begin()
{
	goMap.index = 0;
	paint();
}

function backward(num)
{
	if(exMapCount > 0)
	{
		if(exMapCount - num < 0) exMapCount = 0;
		else exMapCount -= num;
	}
	else
	{
		if(goMap.index == 0) return;

		if(goMap.index - num < 0) goMap.index = 0;
		else goMap.index -= num;
	}
	paint();
}

function forward(num)
{
	if(goMap.index == goMap.count - 1) return;

	if(goMap.index + num >= goMap.count) goMap.index = goMap.count - 1;
	else goMap.index += num;
	paint();
}

function end()
{
	goMap.index = goMap.count - 1;
	paint();
}

function flag()
{
	displayNum = !displayNum;
	paint();
}

