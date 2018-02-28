var element_grid = document.getElementById( 'grid' );
var element_canvas = document.createElement( 'canvas' );
document.getElementById( 'grid' ).appendChild( element_canvas );
//TODO:size
element_canvas.width = window.innerWidth - 20;
element_canvas.height = window.innerHeight - 20;




/**private implementation**/
var fConnector = function PrivateConnector() {

    this.info = {

        columnsCaptionCount : session_info.columns.length,
        rowsCaptionCount : session_info.rows.length
    };

    var to_obj = function(x) {

        var map_type = {
            'expanded' : 2,
            'collapsed' : 1,
            'leaf' : 0,
            'edit' : 3,
            'no_edit' : 4
        };

        var obj = {};
        obj.id = x.id;
        obj.txt = x.name || x.value;
        obj.sign = map_type[x.type];
        obj.lvl = x.level;
        return obj;
    };

    this.data = {
        cols : {
            items: [],
            get: function (c,r) {
                var x = this.items[c] && this.items[c][r];
                return x && to_obj(x);
            }
        }
        ,
        rows : {
            items : [],
            get : function(c,r) {
                var x = this.items[r] && this.items[r][c];
                return x && to_obj(x);
            }
        },
        values : {
            items : [],
            get : function(c,r) {
                var x = this.items[c] && this.items[c][r];
                return x && to_obj(x[0]);                                                                               //TODO:multivalues
            }
        }
    };

    this.get = function( col1, row1, cols, rows ) {

        console.log( 'load' );
        //TODO: call API by params
        this.data.cols.items = session_data.columns.items;
        this.data.rows.items = session_data.rows.items;
        this.data.values.items = session_data.data.items;

        return this.data;
    };
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

pivot.draw();

function Pivot( canvas, fConnector ) {

    var ctx = canvas.getContext( '2d' );
    ctx.font = '12px Calibri';

    var connector = new fConnector;

    var dx = 0,
        dy = 0;

     function header( size ) {

        return {

            fix : size,
            in : function( i ) {

                return i < this.fix;
            }
        }
    }

    var header_of_rows = header( connector.info.rowsCaptionCount );
    var header_of_cols = header( connector.info.columnsCaptionCount );

    function style( obj, col, row ) {

        this.style_header = {

            margin_x : 3,
            margin_y : 4,
            align : 'start',
            format : function( obj ) {

                var sign_map = {

                    0 : '  ',
                    1 : '+ ',
                    2 : '- ',
                    3 : '',
                    4 : ''
                };

                return obj && obj.txt && sign_map[obj.sign] + obj.txt || '';
            }
        };
        this.style_value = {

            margin_x : 3,
            margin_y : 4,
            align : 'end',
            format : function( obj ) {

                return obj && obj.txt && obj.txt.toLocaleString() || '';                                                //TODO:not fast enough
            }
        };

        var s = header_of_cols.in( row.n ) || header_of_rows.in( col.n ) ? this.style_header : this.style_value;

        return {

            txt : s.format( obj ),
            x : s.align == 'end' && col.pos + col.size - s.margin_x || col.pos + s.margin_x,
            y : row.pos + row.size - s.margin_y,
            align : s.align
        }
    }

    function axes( size, size_limit ) {

        function axis( size ) {

            return function( n ) {

                this.n = n;
                this.size = size;
                this.pos = this.n * this.size;
                this.in = function( size ) {

                    return this.pos < size;
                }
            };
        }

        var ret = [];
        var f_item = axis( size );

        while ( ret.length == 0 || ret[ ret.length - 1].in( size_limit ) ) {

            ret.push( new f_item( ret.length ) );
        }

        return ret;
    }

    var cols = axes( 102, canvas.width );
    var rows = axes( 25, canvas.height );

    this.draw = function() {

        update();

        var w = ctx.canvas.width;
        var h = ctx.canvas.height;
        ctx.clearRect( 0, 0, w, h );

        var i = 0;
        while ( cols[ i ].in( w ) ) {

            var j = 0;
            while ( rows[ j ].in( h ) ) {

                var obj =
                    header_of_rows.in( i ) && !header_of_cols.in( j ) && buffer.data.rows.get( i, j + dy - header_of_cols.fix ) ||
                    header_of_cols.in( j ) && !header_of_rows.in( i ) && buffer.data.cols.get( i + dx - header_of_rows.fix, j ) ||
                    !header_of_cols.in( j ) && !header_of_rows.in( i ) && buffer.data.values.get( i + dx - header_of_rows.fix, j + dy - header_of_cols.fix );

                var s = style( obj, cols[ i ], rows[ j ] );

                ctx.textAlign = s.align;
                ctx.fillText( s.txt, s.x, s.y );

                j++;
            }
            i++;
        }
    };

    var buffer = {

        col1 : 0,
        row1 : 0,
        n_cols : 0,
        n_rows : 0,
        data : null
    };

    var update = function() {

        var b = buffer;
        var fix_cols = header_of_rows.fix;
        var fix_rows = header_of_cols.fix;

        if ( !b.data || dx < b.col1 || dy < b.row1 || dx + cols.length - fix_cols > b.col1 + b.n_cols || dy + rows.length - fix_rows > b.row1 + b.n_rows ) {

            b.col1 = dx - 10;
            b.row1 = dy - 10;
            b.n_cols = cols.length - fix_cols + 20;
            b.n_rows = rows.length - fix_rows + 20;
            b.data = connector.get( b.col1, b.row1, b.n_cols, b.n_rows );                                               //TODO: in b?
        }
    };

    this.scroll = function( x, y ) {

        dx = Math.max( 0, dx + x );
        dy = Math.max( 0, dy + y );
    };
}