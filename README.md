# CaGo

A web page to parse and play go gibo(圍棋棋譜) 

## Requirement

* File type: sgf
* Size: 19X19

## Usage

In index.html, find *cago.go* and modify its argument.

	$(document).ready(function(){
		$(".container").cago("./example.sgf");
		$(".container2").cago("./example.sgf");
	});

## Todo

* Decrease the memory usage when using multiple cago in a page.

## Library version
 
* JQuery: 1.7.1
* Bootstrap: 2.0.4

## Screenshot

![screenshot](http://i.minus.com/ibbWnsJd0vf02S.png)
![screenshot2](http://i.minus.com/ixDnLOfgU74Wq.png)

## Authors and License
The ``CaGo`` package is written by Chien-Wei Huang. It’s MIT licensed and freely available.

Feel free to improve this package and send a pull request to GitHub.

