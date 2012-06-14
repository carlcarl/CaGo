var base = 400;
var width = base + (base / 10);
var height = width; 
var space = base / 20;
var twoSpace = space * 2;
var SIZE = 21;
var tokenList = ["PW", "PB", "RE", "DT"];
var optionalTokenList = ["WR", "BR"];
var stepVector = [[0, 1], [1, 0], [-1, 0], [0, -1]]; // Used for easy traverse and find dead stones
var fastStepNum = 10; // one click with 10 steps
var displayNum = true;
var metaList = new Array(); // Store file meta info 
var moveList = new Array();
var mapList = new Array();
var mapCount = 0;
var mapIndex = 0;
var map = new Array(SIZE);
for(var i = 0; i < SIZE; i++)
{
	map[i] = new Array(SIZE);
}

function Move(t, n)
{
	this.type = t;
	this.num = n;
}
Move.prototype.getinfo = function()
{
	return this.type + " " + this.num;
}

moveList.push([0, 0]);
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
	mapList[mapCount++] = copyMap(map); // Initilize a empty map first
	getFile();
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
			var tmp = new Move(m[i][j].type, m[i][j].num);
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
	$.get("../2010111301285100.sgf", readData);
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
	for(; i < data.length; i++)
	{
		var t = data[i] + data[i + 1];
		t = t.toUpperCase();
		if(t == ";B" || t == ";W")
		{
			var result = getTokenData(data, i + 3);
			var d = result[0];
			i = result[1];

			var type = -1;
			if(t == ";B") type = 1;
			else if(t == ";W") type = 0;

			var x = d.charCodeAt(0) - "a".charCodeAt(0) + 1;
			var y = d.charCodeAt(1) - "a".charCodeAt(0) + 1;
			var move = [x, y];
			moveList.push(move);
			map[x][y].type = type;
			map[x][y].num = mapCount;
			findDeadStone(map, x, y);

			mapList[mapCount++] = copyMap(map);
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
	var type = m[x][y].type;
	var up = new Dead(true);
	var down = new Dead(true);
	var left = new Dead(true);
	var right = new Dead(true);

	if(m[x + 1][y].type == 1 - type)
	{
		traverse(m, x + 1, y, type, right);
		if(right.value == true)
		{
			deleteDeadStone(map, x + 1, y, type);
			return;
		}
	}

	if(m[x][y + 1].type == 1 - type)
	{
		traverse(m, x, y + 1, type, down);
		if(down.value == true)
		{
			deleteDeadStone(map, x, y + 1, type);
			return;
		}
	}

	if(m[x - 1][y].type == 1 - type)
	{
		traverse(m, x - 1, y, type, left);
		if(left.value == true)
		{
			deleteDeadStone(map, x - 1, y, type);
			return;
		}
	}

	if(m[x][y - 1].type == 1 - type)
	{
		traverse(m, x, y - 1, type, up);
		if(up.value == true)
		{
			deleteDeadStone(map, x, y - 1, type);
			return;
		}
	}
}

/*
* Recursive traverse to find dead stones
*/
function traverse(m, x, y, type, dead)
{
	m[x][y].type = -2; // Tag to avoid traversing the same position twice.

	for(var i = 0; i < stepVector.length; i++)
	{
		var xx = x + stepVector[i][0];
		var yy = y + stepVector[i][1];
		if(m[xx][yy].type == 1 - type)
		{
			traverse(m, xx, yy, type, dead);
		}
		else if(m[xx][yy].type == -1)
		{
			dead.value = false;
			return;
		}
	}

}

/*
* Recursive delete stones
*/
function deleteDeadStone(m, x, y, type)
{
	m[x][y].type = -1;

	for(var i = 0; i < stepVector.length; i++)
	{
		var xx = x + stepVector[i][0];
		var yy = y + stepVector[i][1];

		if(m[xx][yy].type == 1 - type)
		{
			deleteDeadStone(m, xx, yy, type);
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
		ctx.moveTo(twoSpace, space * i + space);
		ctx.lineTo(width - twoSpace, space * i + space);
		ctx.moveTo(space * i + space, twoSpace);
		ctx.lineTo(space * i + space, height - twoSpace);
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

		ctx.fillText(String.fromCharCode(code), space * i + space / 2 + space / 4, space + space / 4);
		ctx.fillText(String.fromCharCode(code), space * i + space / 2 + space / 4, height - space / 2);

		if(i < 11)
		{
			ctx.fillText(String(20 - i), space / 8, space * i + space + space / 4);
			ctx.fillText(String(20 - i), width - space, space * i + space + space / 4);
		}
		else
		{
			ctx.fillText(String(20 - i), space / 2 , space * i + space + space / 4);
			ctx.fillText(String(20 - i), width - space, space * i + space + space / 4);
		}
	}
	ctx.closePath();


	// Draw stone
	for(var i = 1; i < SIZE - 1; i++)
	{
		for(var j = 1; j < SIZE - 1; j++)
		{
			if(mapList[mapIndex][i][j].type == 0)
			{
				ctx.fillStyle = "white";
			}
			else if(mapList[mapIndex][i][j].type == 1)
			{
				ctx.fillStyle = "black";
			}

			if(mapList[mapIndex][i][j].type == 0 || mapList[mapIndex][i][j].type == 1)
			{
				ctx.beginPath();
				ctx.arc(space * i + space, space * j + space, space / 2, 0, Math.PI * 2, true);
				ctx.fill();
				ctx.closePath();
			}
		}
	}

	// Tag the current move
	if(mapIndex > 0)
	{
		ctx.fillStyle = "red";
		ctx.beginPath();
		ctx.arc(space * moveList[mapIndex][0] + space, space * moveList[mapIndex][1] + space, space / 4, 0, Math.PI * 2, true);
		ctx.fill();
		ctx.closePath();

	}
	if(displayNum)
	{
		for(var i = 0; i < SIZE - 1; i++)
		{
			for(var j = 0; j < SIZE - 1; j++)
			{
				if(mapList[mapIndex][i][j].type == 0 || mapList[mapIndex][i][j].type == 1)
				{
					ctx.beginPath();

					if(mapList[mapIndex][i][j].type == 0)
					{
						ctx.fillStyle = "black";
					}
					else if(mapList[mapIndex][i][j].type == 1)
					{
						ctx.fillStyle = "white";
					}
					ctx.font = "10px sans-serif";

					var fix = 0;
					if(mapList[mapIndex][i][j].num >= 100)
					{ 
						fix = space / 2;
					}
					else if(mapList[mapIndex][i][j].num >= 10 && mapList[mapIndex][i][j].num < 100)
					{
						fix = space / 2 + space / 8;
					}
					else
					{
						fix = space / 2 + space / 4;
					}
					ctx.fillText(mapList[mapIndex][i][j].num, space * i + fix, space * j + space + space / 4);
					ctx.closePath();
				}
			}
		}
	}
}


function changeButtonState()
{
	if(mapIndex == 0) 
	{ 
		$("#begin").attr("disabled", true); 
		$("#backward").attr("disabled", true); 
		$("#fastBackward").attr("disabled", true); 
		$("#end").attr("disabled", false);
		$("#forward").attr("disabled", false);
		$("#fastForward").attr("disabled", false);
	}
	else if(mapIndex == mapCount - 1) 
	{
		$("#begin").attr("disabled", false); 
		$("#backward").attr("disabled", false); 
		$("#fastBackward").attr("disabled", false); 
		$("#end").attr("disabled", true);
		$("#forward").attr("disabled", true);
		$("#fastForward").attr("disabled", true);
	}
	else
	{
		//TODO: Improve this in the future zzz
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
	mapIndex = 0;
	paint();
}

function backward(num)
{
	if(mapIndex == 0) return;

	if(mapIndex - num < 0) mapIndex = 0;
	else mapIndex -= num;
	paint();
}

function forward(num)
{
	if(mapIndex == mapCount - 1) return;

	if(mapIndex + num >= mapCount) mapIndex = mapCount - 1;
	else mapIndex += num;
	paint();
}

function end()
{
	mapIndex = mapCount - 1;
	paint();
}

