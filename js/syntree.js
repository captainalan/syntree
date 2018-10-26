// By Miles Shang <mail@mshang.ca>
// Converted to ES6 by Alan Wong <captainalan@gmail.com>
// MIT license

const debug = true;
const margin = 15; // Number of pixels from tree to edge on each side.
const padding_above_text = 6; // Lines will end this many pixels above text.
const padding_below_text = 6;

class Node {

    constructor() {
	this.value = null;
	this.step = null; // Horizontal distance between children.
	this.draw_triangle = null;
	this.label = null; // Head of movement.
	this.tail = null; // Tail of movement.
	this.max_y = null; // Distance of the descendent of this node that is farthest from root.
	this.children = [];
	this.has_children;
	this.first = null;
	this.last = null;
	this.parent = null;
	this.next = null;
	this.previous = null;
	this.x = null; // Where the node will eventually be drawn.
	this.y = null;
	this.head_chain = null;
	this.tail_chain = null;
	this.starred = null;
    }

    set_siblings(parent) {
	for (let i = 0; i < this.children.length; i++)
		this.children[i].set_siblings(this);
	
	this.has_children = (this.children.length > 0);
	this.parent = parent;
	
	if (this.has_children) {
		this.first = this.children[0];
		this.last = this.children[this.children.length - 1];
	}
	
	for (let i = 0; i < this.children.length - 1; i++)
		this.children[i].next = this.children[i+1];
	
	for (let i = 1; i < this.children.length; i++)
		this.children[i].previous = this.children[i-1];
    }

    check_triangle() {
	this.draw_triangle = 0;
	if ((!this.has_children) && (this.parent.starred))
		this.draw_triangle = 1;

	for (let child = this.first; child != null; child = child.next)
		child.check_triangle();
    }

    set_width(ctx, vert_space, hor_space, term_font, nonterm_font) {
	ctx.font = term_font;
	if (this.has_children)
		ctx.font = nonterm_font;

	let val_width = ctx.measureText(this.value).width;

	for (let child = this.first; child != null; child = child.next)
		child.set_width(ctx, vert_space, hor_space, term_font, nonterm_font);
	
	if (!this.has_children) {
		this.left_width = val_width / 2;
		this.right_width = val_width / 2;
		return;
	}
	
	// Figure out how wide apart the children should be placed.
	// The spacing between them should be equal.
	this.step = 0;
	for (let child = this.first; (child != null) && (child.next != null); child = child.next) {
		let space = child.right_width + hor_space + child.next.left_width;
		this.step = Math.max(this.step, space);
	}
	
	this.left_width = 0.0;
	this.right_width = 0.0;
	
	if (this.has_children) {
		let sub = ((this.children.length - 1) / 2) * this.step;
		this.left_width = sub + this.first.left_width;
		this.right_width = sub + this.last.right_width;
	}
	
	this.left_width = Math.max(this.left_width, val_width / 2);
	this.right_width = Math.max(this.right_width, val_width / 2);
    }

    find_height() {
	this.max_y = this.y;
	for (let child = this.first; child != null; child = child.next)
		this.max_y = Math.max(this.max_y, child.find_height());
	return this.max_y;
    }

    assign_location(x, y, font_size, term_lines) {
	// floor + 0.5 for antialiasing
	this.x = Math.floor(x) + 0.5;
	this.y = Math.floor(y) + 0.5;
	
	if (this.has_children) {
		let left_start = x - (this.step)*((this.children.length-1)/2);
		for (let i = 0; i < this.children.length; i++)
			this.children[i].assign_location(left_start + i*(this.step), y + vert_space, font_size, term_lines);
	} else {
		if ((this.parent) && (!term_lines) && (this.parent.children.length == 1) && (!this.draw_triangle))
			this.y = this.parent.y + padding_above_text + padding_below_text + font_size;
	}
    }

    draw(ctx, font_size, term_font, nonterm_font, color, term_lines) {
	ctx.font = term_font;
	if (this.has_children)
		ctx.font = nonterm_font;
		
	ctx.fillStyle = "black";
	if (color) {
		ctx.fillStyle = "green";
		if (this.has_children)
			ctx.fillStyle = "blue";
	}
	
	ctx.fillText(this.value, this.x, this.y);
	for (let child = this.first; child != null; child = child.next)
		child.draw(ctx, font_size, term_font, nonterm_font, color, term_lines);
	
	if (!this.parent) return;
	
	if (this.draw_triangle) {
		ctx.moveTo(this.parent.x, this.parent.y + padding_below_text);
		ctx.lineTo(this.x - this.left_width, this.y - font_size - padding_above_text);
		ctx.lineTo(this.x + this.right_width, this.y - font_size - padding_above_text);
		ctx.lineTo(this.parent.x, this.parent.y + padding_below_text);
		ctx.stroke();
		return;
	}
	
	if ((!this.has_children) && (!term_lines) && (this.parent.children.length == 1)) return;
	
	ctx.moveTo(this.parent.x, this.parent.y + padding_below_text);
	ctx.lineTo(this.x, this.y - font_size - padding_above_text);
	ctx.stroke();
    }

    find_head(label) {
	for (let child = this.first; child != null; child = child.next) {
		let res = child.find_head(label);
		if (res != null) return res;
	}
	
	if (this.label == label) return this;
	return null;
    }

    find_movement(mlarr, root) {
	for (let child = this.first; child != null; child = child.next)
		child.find_movement(mlarr, root);
	
	if (this.tail != null) {
		let m = new MovementLine;
		m.tail = this;
		m.head = root.find_head(this.tail);
		mlarr.push(m);
	}
    }

    reset_chains() {
	this.head_chain = null;
	this.tail_chain = null;
	
	for (let child = this.first; child != null; child = child.next)
		child.reset_chains();
    }

    find_intervening_height(leftwards) {
	let max_y = this.y;
	
	let n = this;
	while (true) {
		if (leftwards) {n = n.previous;} else {n = n.next;}
		if (!n) break;
		if ((n.head_chain) || (n.tail_chain)) return max_y;
		max_y = Math.max(max_y, n.max_y);
	}
	
	max_y = Math.max(max_y, 
		this.parent.find_intervening_height(leftwards));
	return max_y;
    }   


}

class MovementLine {
    constructor() {
	this.head = null;
	this.tail = null;
	this.lca = null;
	this.dest_x = null;
	this.dest_y = null;
	this.bottom_y = null;
	this.max_y = null;
	this.should_draw = null;
	this.leftwards = null;
    }

    set_up() {
	this.should_draw = 0;
	if ((this.tail == null) || (this.head == null)) return;
	
	// Check to see if head is parent of tail,
	if (!this.check_head()) return;
	
	// Find the last common ancestor.
	this.find_lca();
	if (this.lca == null) return;
	
	// Find out the greatest intervening height.
	this.find_intervening_height();
	
	this.dest_x = this.head.x;
	this.dest_y = this.head.max_y;
	this.bottom_y = this.max_y + vert_space;
	this.should_draw = 1;
	return;
    }

    check_head() {
	let n = this.tail;
	n.tail_chain = 1;
	while (n.parent != null) {
		n = n.parent;
		if (n == this.head) return 0;
		n.tail_chain = 1;
	}
	return 1;
    }

    find_lca() {
	let n = this.head;
	n.head_chain = 1;
	this.lca = null;
	while (n.parent != null) {
		n = n.parent;
		n.head_chain = 1;
		if (n.tail_chain) {
			this.lca = n;
			break;
		}
	}
    }

    find_intervening_height() {
	for (let child = this.lca.first; child != null; child = child.next) {
		if ((child.head_chain) || (child.tail_chain)) {
			this.leftwards = false;
			if (child.head_chain) this.leftwards = true;
			break;
		}
	}
	
	this.max_y = Math.max(this.tail.find_intervening_height( this.leftwards), 
	                      this.head.find_intervening_height(!this.leftwards),
						  this.head.max_y);
    }

    draw(ctx) {
	let tail_x = this.tail.x + 3;
	this.dest_x -= 3;
	if (this.leftwards) {
		tail_x -= 6;
		this.dest_x += 6;
	}
	
	ctx.moveTo(tail_x, this.tail.y + padding_below_text);
	ctx.quadraticCurveTo(tail_x, this.bottom_y, (tail_x + this.dest_x) / 2, this.bottom_y);
	ctx.quadraticCurveTo(this.dest_x, this.bottom_y, this.dest_x, this.dest_y + padding_below_text);
	ctx.stroke();
	// Arrowhead
	ctx.beginPath();
	ctx.lineTo(this.dest_x + 3, this.dest_y + padding_below_text + 10);
	ctx.lineTo(this.dest_x - 3, this.dest_y + padding_below_text + 10);
	ctx.lineTo(this.dest_x, this.dest_y + padding_below_text);
	ctx.closePath();
	ctx.fillStyle = "#000000";
	ctx.fill();
    }
}



function go(str, font_size, term_font, nonterm_font, vert_space, hor_space, color, term_lines) {	
	// Clean up the string
	str = str.replace(/^\s+/, "");
	let open = 0;
	for (let i = 0; i < str.length; i++) {
		if (str[i] == "[") open++;
		if (str[i] == "]") open--;
	}
	while (open < 0) {
		str = "[" + str;
		open++;
	}
	while (open > 0) {
		str = str + "]";
		open--;
	}
	
	let root = parse(str);
	root.set_siblings(null);
	root.check_triangle();
	
	let canvas;
	let ctx;
	
	try {
		// Make a new canvas. Required for IE compatability.
		canvas = document.createElement("canvas");
		ctx = canvas.getContext('2d');
	} catch (err) {
		throw "canvas";
	}

	// Find out dimensions of the tree.
	root.set_width(ctx, vert_space, hor_space, term_font, nonterm_font);
	root.assign_location(0, 0, font_size, term_lines);
	root.find_height();
	
	let movement_lines = [];
	root.find_movement(movement_lines, root);
	for (let i = 0; i < movement_lines.length; i++) {
		root.reset_chains();
		movement_lines[i].set_up();
	}
	
	// Set up the canvas.
	let width = root.left_width + root.right_width + 2 * margin;
	let height = root.max_y + font_size + 2 * margin;
	// Problem: movement lines may protrude from bottom.
	for (let i = 0; i < movement_lines.length; i++)
		if (movement_lines[i].max_y == root.max_y) {
			height += vert_space; break;
		}
	
	canvas.id = "canvas";
	canvas.width = width;
	canvas.height = height;
	ctx.fillStyle = "rgb(255, 255, 255)";
	ctx.fillRect(0, 0, width, height);
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.textAlign = "center";
	let x_shift = Math.floor(root.left_width + margin);
	let y_shift = Math.floor(font_size + margin);
	ctx.translate(x_shift, y_shift);
	
	root.draw(ctx, font_size, term_font, nonterm_font, color, term_lines);
	for (let i = 0; i < movement_lines.length; i++)
		if (movement_lines[i].should_draw) movement_lines[i].draw(ctx);
	
	// Swap out the image
	return Canvas2Image.saveAsPNG(canvas, true);
}

function subscriptify(in_str) {
	let out_str = "";
	for (let i = 0; i < in_str.length; ++i) {
		switch (in_str[i]) {
		case "0": out_str = out_str + "₀"; break;
		case "1": out_str = out_str + "₁"; break;
		case "2": out_str = out_str + "₂"; break;
		case "3": out_str = out_str + "₃"; break;
		case "4": out_str = out_str + "₄"; break;
		case "5": out_str = out_str + "₅"; break;
		case "6": out_str = out_str + "₆"; break;
		case "7": out_str = out_str + "₇"; break;
		case "8": out_str = out_str + "₈"; break;
		case "9": out_str = out_str + "₉"; break;
		}
	}
	return out_str;
}

function parse(str) {
	let n = new Node();
	
	if (str[0] != "[") { // Text node
		// Get any movement information.
		// Make sure to collapse any spaces around <X> to one space, even if there is no space.	
		str = str.replace(/\s*<(\w+)>\s*/, 
			function(match, tail) {
				n.tail = tail;
				return " ";
			});
		str = str.replace(/^\s+/, "");
		str = str.replace(/\s+$/, "");
		n.value = str;
		return n;
	}

	let i = 1;
	while ((str[i] != " ") && (str[i] != "[") && (str[i] != "]")) i++;
	n.value = str.substr(1, i-1)
	n.value = n.value.replace(/\^/, 
		function () {
			n.starred = true;
			return "";
		});
	n.value = n.value.replace(/_(\w+)$/,
		function(match, label) {
			n.label = label;
			if (n.label.search(/^\d+$/) != -1)
				return subscriptify(n.label);
			return "";
		});
	
	while (str[i] == " ") i++;
	if (str[i] != "]") {
		let level = 1;
		let start = i;
		for (; i < str.length; i++) {
			let temp = level;
			if (str[i] == "[") level++;
			if (str[i] == "]") level--;
			if (((temp == 1) && (level == 2)) || ((temp == 1) && (level == 0))) {
				if (str.substring(start, i).search(/[^\s]/) > -1)
					n.children.push(parse(str.substring(start, i)));
				start = i;
			}
			if ((temp == 2) && (level == 1)) {
				n.children.push(parse(str.substring(start, i+1)));
				start = i+1;
			}
		}
	}
	return n;
}
