# CaGo

A jQuery plugin to parse and play go gibo(圍棋棋譜) 

## Requirement

* File type: sgf
* Size: 19X19

## Usage

In index.html, find *cago.go* and modify its argument.

	$(function(){
		$(".container").cago("./example.sgf");
		$(".container2").cago("./example.sgf");
	});

## Todo

* Separate the core part from bootstrap elements

## Library version
 
* JQuery: 1.11.3
* Bootstrap: 3.3.5

## Screenshot

![screenshot](http://i.imgur.com/DPAqafy.png)

## Authors and License
The ``CaGo`` package is written by Chien-Wei Huang. It’s MIT licensed and freely available.

Feel free to improve this package and send a pull request to GitHub.

