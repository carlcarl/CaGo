# CaGo #

A web page to parse and play go gibo(圍棋棋譜) 

## Requirement ##

* File type: sgf
* Size: 19X19

## Usage ##

In index.html, find *cago.go* and modify its argument.

	$(document).ready(function(){
		$(".container").cago("./example.sgf");
		$(".container2").cago("./example.sgf");
	});

## Todo ##

* Decrease paint frequnecy on gradient stones.
* Pre draw 361 stones on two canvases(black and white), then draw stones using the two canvases.
* Decrease the memory usage when using multiple cago in a page.

## Library version ##
 
* JQuery: 1.7.1
* Bootstrap: 2.0.4

## Screenshot ##

![screenshot](http://i.minus.com/ibbWnsJd0vf02S.png)
![screenshot2](http://i.minus.com/ixDnLOfgU74Wq.png)

## Copyright and license ##
Copyright 2012 黃健瑋.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this work except in compliance with the License. You may obtain a copy of the License in the LICENSE file, or at:

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

