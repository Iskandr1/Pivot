var element_grid = document.getElementById( 'grid' );
var element_canvas = document.createElement( 'canvas' );
document.getElementById( 'grid' ).appendChild( element_canvas );
//TODO:size
element_canvas.width = window.innerWidth - 20;
element_canvas.height = window.innerHeight - 20;




/**private implementation!!**/
var fConnector = function PrivateConnector() {

	this.value = function(col, row) {

		return 1;
	};

	this.caption = function( col ) {

		return 'label';
	}
};

var pivot = new Pivot( element_canvas, fConnector );

var actions = {

	key_map : {

		100: [1, 0],
		97: [-1, 0],
		115: [0, 1],
		119: [0, -1]
	},

	keypressed : function( key ) {

		return key in this.key_map && this.key_map[ key ] || [ 0, 0 ];
	}
};

pivot.draw();

function KeyPressed() {


	var log_start_time = new Date();
	///---->


	var d = actions.keypressed( event.keyCode );
	pivot.scroll( d[ 0 ], d[ 1 ] );
	pivot.draw();


	///<----
	var time = new Date() - log_start_time;
	document.getElementById("stat").innerHTML = time+" ms";
	console.log( time + " ms" );
}


function Pivot( canvas, fConnector ) {

	var ctx = canvas.getContext( '2d' );
	ctx.font = '10px Arial';
	ctx.textAlign = 'end';

	var connector = new fConnector;

	var style = {

		cell : {

			width: 102,
			height: 25,
			margin_x: 3,
			margin_y: 4
		}
	};

	//viewport
	var v = {

		col1 : 0,
		row1 : 0,
		cols : 0,
		rows : 0,

		init : function( cols, rows ) {

			this.cols = cols;
			this.rows = rows;
		}
	};

	//buffer
	var b = {

		size_x : null,
		size_y : null,
		offset_x : null,
		offset_y : null,
		data : null,
		caption : null,

		init : function( cols, rows ) {

			this.size_x = cols;
			this.size_y = rows;

			this.data = new Array( this.size_x );
			for ( var x = 0; x < this.size_x; x++ )
				this.data[ x ] = new Array( this.size_y );

			this.caption = new Array( this.size_x );
		},

		load : function() {

			for ( var x = 0; x < this.size_x; x++ )
				this.caption[ x ] = connector.caption( x + this.offset_x );

			for ( var y = 0; y < this.size_y; y++ )
				for ( var x = 0; x < this.size_x; x++ )
					this.data[ x ][ y ] = connector.value( x + this.offset_x, y + this.offset_y );
		}
	};

	v.init( Math.ceil( canvas.width / style.cell.width ), Math.ceil( canvas.height / style.cell.height ) );
	b.init( v.cols + 10, v.rows + 10 );

	var update = function() {

		if ( v.cols > b.size_x || v.rows > b.size_y )
			throw Error( 'window buffer mismatch' );

		if ( v.col1 < b.offset_x || v.row1 < b.offset_y || v.col1 + v.cols > b.offset_x + b.size_x || v.row1 + v.rows > b.offset_y + b.size_y || b.offset_x == null || b.offset_y == null ) {

			b.offset_x = Math.max( 0, v.col1 - Math.floor( ( b.size_x - v.cols ) * 0.5 ) );
			b.offset_y = Math.max( 0, v.row1 - Math.floor( ( b.size_y - v.rows ) * 0.5 ) );

			b.load();
			console.log( 'load' );
		}
	};

	this.scroll = function( dx, dy ) {

		v.col1 += dx;
		v.row1 += dy;
	};

	this.draw = function() {

		update();

		ctx.clearRect( 0, 0, ctx.canvas.width, ctx.canvas.height );

		for ( var i = 0; i < v.cols; i++ ) {

			//caption
			ctx.fillText(b.caption[i + v.col1 - b.offset_x], ( i + 1 ) * style.cell.width - style.cell.margin_x, 10);

			for (var j = 0; j < v.rows; j++) {

				//values
				ctx.fillText(b.data[i + v.col1 - b.offset_x][j + v.row1 - b.offset_y], ( i + 1 ) * style.cell.width - style.cell.margin_x, ( j + 1 ) * style.cell.height - style.cell.margin_y);
			}
		}
	};


}