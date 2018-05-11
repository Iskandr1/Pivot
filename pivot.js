var Pivot = (function( exports ) {

    var Config = {

        COLOR_FONT : '#000000',
        COLOR_BACKGROUND : '#AAAAAA',
        COLOR_CELL : '#FFFFFF',
        COLOR_EDIT : '#FFFFFF',
        COLOR_CELL_SELECTED : '#F0F0F0',
        COLOR_HEADER : '#F0F0F0',
        SIGN_MAP : {

            0 : '  ',       //none
            1 : '+ ',       //expand
            2 : '- ',       //collapse
            3 : '',         //edit
            4 : ''          //no_edit
        },
        CELL_W : 102,
        CELL_H : 26,
        CELL_EDIT_UNDERLINE_MARGIN : 5,
        CELL_EDIT_CURSOR_MARGIN : 3,
        FONT_VALUE : '11px Arial',
        FONT_HEADER : '11px Arial',
        set : function( cfg ) {

            Object.assign( this, cfg );

            return this;
        }
    };

    function assign( dst, src ) {

        return Object.assign( Object.assign( {}, dst ), src );
    }

    var canvas = null,
        dom_stat = null;

    var set_canvas = function( dom ) {

        canvas = dom;

        input_text_area = document.createElement( 'textarea' );
        input_text_area.setAttribute( 'style', 'clip: rect(1px, 1px, 1px, 1px); position: absolute !important; height: 1px; width: 1px; overflow: hidden; opacity: 0' );
        input_text_area.addEventListener( 'input', function () {

            draw();                                                                                                     //TODO:repaint one only cell
        } );

        document.body.appendChild( input_text_area );

        canvas.addEventListener( 'click', MouseClick, false );
        canvas.addEventListener( 'dblclick', MouseDblClick, false );
        canvas.addEventListener( 'mousemove', MouseMove, false );
        canvas.addEventListener( 'mousedown', MouseDown, false );
        canvas.addEventListener( 'mouseup', MouseUp, false );
        canvas.addEventListener( 'wheel', MouseWheel, false );
        canvas.ownerDocument.addEventListener( 'keyup', KeyUp, false );
        canvas.ownerDocument.addEventListener( 'keydown', KeyDown, false );

        dom_stat = document.getElementById( "stat" );

        this.resize();

        return this;
    };

    function bars( size, size_limit ) {

        function bar( size ) {

            return function ( n ) {

                this.n = n;
                this.size = size;
                this.pos = this.n * this.size;
                this.in = function ( size ) {

                    return this.pos < size;
                }
            };
        }

        var ret = [];
        var f_item = bar( size );

        while ( ret.length == 0 || ret[ ret.length - 1 ].in( size_limit ) ) {

            ret.push( new f_item( ret.length ) );
        }

        ret.at = function ( px ) {

            for ( var i = 0; i < ret.length; i++ ) {

                var axis = ret[ i ];
                if ( px >= axis.pos && px <= axis.pos + axis.size )
                    return axis;
            }
        };

        ret.go = function ( from, n, f ) {

            n = n || this.length - from;
            for ( var i = from; i < from + n; i++ )
                f( this[ i ], i );
        };

        return ret;
    }

    var cols = null;
    var rows = null;

    function Cell( i, j ) {

        this.i = i || 0;
        this.j = j || 0;

        return this;
    }

    Cell.prototype = {

        constructor : Cell,

        setXY : function ( x, y ) {

            var col = cols.at( x ),
                row = rows.at( y );

            this.i = col.n;
            this.j = row.n;

            return this;
        },

        isVisible : function () {

            var col = cols[ this.i ],
                row = rows[ this.j ];

            return col && col.in( canvas.width ) && row && row.in( canvas.height );
        },


        setShift : function ( di, dj ) {

            this.i += di;
            this.j += dj;

            return this;
        },

        set : function ( i, j ) {

            this.i = i;
            this.j = j;

            return this;
        },

        setI : function ( i ) {

            this.i = i;

            return this;
        },

        setJ : function ( j ) {

            this.j = j;

            return this;
        },

        clone : function () {

            return new this.constructor( this.i, this.j );
        },

        add : function ( c ) {

            this.i += c.i;
            this.j += c.j;

            return this;
        },

        sub : function ( c ) {

            this.i -= c.i;
            this.j -= c.j;

            return this;
        },

        min : function ( c ) {

            this.i = Math.min( this.i, c.i );
            this.j = Math.min( this.j, c.j );

            return this;
        },

        max : function ( c ) {

            this.i = Math.max( this.i, c.i );
            this.j = Math.max( this.j, c.j );

            return this;
        },

        clamp : function ( min, max ) {

            this.i = Math.max( min.i, Math.min( max.i, this.i ) );
            this.j = Math.max( min.j, Math.min( max.j, this.j ) );

            return this;

        },

        equals : function ( c ) {

            return c && ( c.i === this.i && c.j === this.j );
        }
    };

    var
        cell_zero = new Cell(),
        cell_left = new Cell( -1, 0 ),
        cell_right = new Cell( 1, 0 ),
        cell_up = new Cell( 0, -1 ),
        cell_down = new Cell( 0, 1 ),
        cell_one = new Cell( 1, 1 );


    function Area( c1, c2 ) {

        this.c1 = c1 && c1.clone();
        this.c2 = c2 && c2.clone() || c1;

        this.c1.min( this.c2 );
        this.c2.max( c1 );

        return this;
    }

    Area.prototype = {

        constructor : Area,

        distTo : function ( c ) {

            var max = c.clone().sub( this.c2 ).max( cell_zero );
            var min = c.clone().sub( this.c1 ).min( cell_zero );

            return min.add( max );
        },

        shift : function ( c ) {

            this.c1.add( c );
            this.c2.add( c );

            return this;
        },

        contains : function ( a ) {

            var c1 = a.c1 || a;
            var c2 = a.c2 || a;

            return this.c1.i <= c1.i &&
                this.c1.j <= c1.j &&
                this.c2.i >= c2.i &&
                this.c2.j >= c2.j;
        },

        clone : function () {

            return new this.constructor( this.c1, this.c2 );
        },

        size : function () {

            return this.c2.clone().sub( this.c1 );
        },

        shrink : function ( c ) {

            this.c1.add( c );
            this.c2.sub( c );

            return this;
        },

        expand : function ( c ) {

            this.c1.sub( c );
            this.c2.add( c );

            return this;
        },

        clamp : function ( a ) {

            this.c1.max( a.c1 ).min( a.c2 );
            this.c2.max( a.c1 ).min( a.c2 );

            return this;
        }
    };

    function Vec( x, y ) {

        this.x = x;
        this.y = y;

        return this;
    }

    Vec.prototype = {

        constructor : Vec,

        clone : function () {

            return new this.constructor( this.x, this.y );
        }
    };

    function Rect( a ) {

        var c1 = cols[ a.c1.i ];
        var c2 = cols[ a.c2.i ];
        var r1 = rows[ a.c1.j ];
        var r2 = rows[ a.c2.j ];

        this.x = c1.pos;
        this.y = r1.pos;
        this.width = c2.pos - c1.pos + c2.size;
        this.height = r2.pos - r1.pos + r2.size;

        return this;
    }

    Rect.prototype = {

        constructor : Rect,

        shrink : function ( x1, y1, x2, y2 ) {

            y1 = y1 || 0;
            x2 = x2 || 0;
            y2 = y2 || 0;

            this.x += x1;
            this.y += y1;
            this.width -= x1 + x2;
            this.height -= y1 + y2;

            return this;
        },

        getCenter : function () {

            return new Vec( this.x + this.width * 0.5, this.y + this.height * 0.5 );
        },

        getFarCorner : function () {

            return new Vec( this.x + this.width, this.y + this.height );
        }
    };

    var project = function( c ) {

        return c.clone().sub( exports.Range.scroll ).add( exports.Range.header );
    };

    var unproject = function( c ) {

        var s = c.clone().add( exports.Range.scroll ).sub( exports.Range.header );

        is_in_row_header( c ) && s.setI( c.i );
        is_in_col_header( c ) && s.setJ( c.j );

        return s;
    };

    function is_in_row_header( c ) {

        return c.i < exports.Range.header.i && c.j >= exports.Range.header.j;
    }

    function is_in_col_header( c ) {

        return c.j < exports.Range.header.j && c.i >= exports.Range.header.i;
    }

    function is_in_values( c ) {

        return c.i >= exports.Range.header.i && c.j >= exports.Range.header.j;
    }

     var Range = {

        scroll : new Cell(),
        header : null,
        data : null,
        values : null,
        update : function() {

            this.scroll.max( cell_zero, this.scroll );
            this.header = data.buffer && new Cell( data.buffer.rows[ 0 ].length, data.buffer.cols[ 0 ].length ) || cell_zero.clone();
            this.data = data.buffer && new Area( cell_zero, new Cell( data.buffer.cols.length - 1, data.buffer.rows.length - 1 ) );
            this.values = new Area( this.header || cell_zero, new Cell( cols.at( canvas.width ).n, rows.at( canvas.height ).n ) );
        }
    };

    var grid = function ( w, h ) {

        var ctx = canvas.getContext( '2d' );
        //var ctx = canvas.getContext('2d', { alpha: false });
        ctx.textBaseline = 'middle';

        var letter_width = ctx.measureText( '1234567910abcdeABCDE' ).width * 0.05;

        var style_value = {

            margin_x : 5,
            align : 'end',
            border : 1,
            color : Config.COLOR_CELL,
            font : Config.FONT_VALUE,
            format : function ( obj ) {

                return obj && obj.txt && obj.txt.toLocaleString();// || '';                                             //TODO:toLocaleString is not fast enough
            }
        };

        var style_header_col = assign( style_value, {

            margin_x : 7,
            align : 'start',
            color : Config.COLOR_HEADER,
            font : Config.FONT_HEADER,
            format : function ( obj ) {

                return obj && obj.txt && Config.SIGN_MAP[ obj.sign ] + obj.txt;
            }
        });

        var style_header_row = assign( style_header_col, {

            format : function ( obj ) {

                return obj && obj.txt && Config.SIGN_MAP[ 0 ].repeat( obj.lvl - 1 ) + Config.SIGN_MAP[ obj.sign ] + obj.txt;
            }
        });

        var style_edit = assign( style_value, {

            color : Config.COLOR_EDIT,
            format : function ( obj ) {

                return obj && obj.txt || obj;
            }
        });

        function format( obj, s, cell1, cell2 ) {

            cell2 = cell2 || cell1;

            var r = new Rect( new Area( cell1, cell2 ) )
                .shrink( s.border, s.border );
            var r_center = r.getCenter();
            var r_far = r.getFarCorner();
            var s_txt = s.format( obj );
            s_txt = s_txt && s_txt.substring( 0, Math.floor( r.width / letter_width ) - 1 );

            return {

                txt : {

                    s : s_txt,
                    vec : new Vec( s.align == 'end' && r_far.x - s.margin_x || r.x + s.margin_x, r_center.y ),
                    align : s.align,
                    color : Config.COLOR_FONT,
                    font : s.font
                },
                cell : {

                    rect : r,
                    color : s.color
                }
            }
        }

        function get_draw_cell( c, s, f, prev, next, parent ) {

            function cell_eq( c1, c2, f ) {

                if ( c1.equals( c2 ) )
                    return true;

                var d1 = c1 && f( unproject( c1 ) );
                var d2 = c2 && f( unproject( c2 ) );

                return d1 && d2 && d1.id == d2.id;
            }

            function get( c, dir ) {

                return c.clone().add( dir );
            }

            var cr = get( c, next );
            var p = get( c, parent );
            var pr = get( get( c, parent ), next );

            //break - draw merged cell
            if ( !cr.isVisible() || !cell_eq( c, cr, f ) || ( p.isVisible() && !cell_eq( p, pr, f ) ) ) {

                var cl = c;
                var pl = get( cl, parent );
                //search for start of merged cell
                while ( cl.isVisible() && cell_eq( c, get( cl, prev ), f ) && ( !pl.isVisible() || cell_eq( p, get( pl, prev ), f ) ) ) {

                    cl = get( cl, prev );
                    pl = get( cl, parent );
                }

                paint_obj( format( f( unproject( c ) ), s, cl, c ) );
            }
        }

        function paint_obj( f ) {

            if ( f.txt.s === undefined )
                return;

            ctx.fillStyle = f.cell.color;
            ctx.fillRect( f.cell.rect.x, f.cell.rect.y, f.cell.rect.width, f.cell.rect.height );

            ctx.fillStyle = f.txt.color;
            ctx.textAlign = f.txt.align;
            ctx.font = f.txt.font;
            ctx.fillText( f.txt.s, f.txt.vec.x, f.txt.vec.y );
        }

        function paint_selection() {

            var c1 = project( selection.a.c1 );
            var c2 = project( selection.a.c2 );

            if ( exports.Range.values.contains( c1 ) || exports.Range.values.contains( c2 ) ) {

                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = 'rgba(200,200,200,0.5)';

                var r = new Rect(
                    //new Area( c1, c2 ).clamp( values_area )
                    new Area( c1, c2 ).clamp( exports.Range.values )
                );
                ctx.fillRect( r.x, r.y, r.width, r.height );

                ctx.globalCompositeOperation = 'source-over';//default
            }
        }

        function paint_edit() {

            var fmt = format(
                edit.get_text(),
                style_edit,
                project( edit.c )
            );

            paint_obj( fmt );

            var sel = edit.get_selection(),
                underline = sel[ 0 ] != sel[ 1 ],

                far_corner = fmt.cell.rect.getFarCorner(),
                text_width = Math.floor( ctx.measureText( fmt.txt.s ).width ),

                u0 = new Vec( fmt.txt.vec.x - text_width, far_corner.y - Config.CELL_EDIT_UNDERLINE_MARGIN ),
                u1 = new Vec( fmt.txt.vec.x, u0.y ),
                c0 = new Vec( far_corner.x - Config.CELL_EDIT_CURSOR_MARGIN, fmt.cell.rect.y + Config.CELL_EDIT_UNDERLINE_MARGIN ),
                c1 = new Vec( c0.x, far_corner.y - Config.CELL_EDIT_UNDERLINE_MARGIN ),
                v0 = underline && u0 || c0,
                v1 = underline && u1 || c1;

            ctx.beginPath();
            ctx.moveTo( v0.x, v0.y );
            ctx.lineTo( v1.x, v1.y );
            ctx.strokeStyle = Config.COLOR_FONT;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        function get_col( c ) {

            return exports.data.get_col( c );
        }

        function get_row( c ) {

            return exports.data.get_row( c );
        }

        function get_value( c ) {

            return exports.data.get_value( c );
        }

        return function () {


            var log_start_time = new Date();

            //ctx.clearRect( 0, 0, w, h );
            ctx.fillStyle = Config.COLOR_BACKGROUND;
            ctx.fillRect( 0, 0, w, h );

            //values
            cols.go( exports.Range.header.i, 0, function ( col, i ) {

                rows.go( exports.Range.header.j, 0, function ( row, j ) {

                    var c = new Cell( i, j );
                    paint_obj(
                        format(
                            get_value( unproject( c ) ),
                            style_value,
                            c
                        )
                    );
                } );
            } );

            selection.a && exports.Range.data.contains( selection.a ) && paint_selection();

            edit.c && exports.Range.values.contains( project( edit.c ) ) && paint_edit();

            //col headers
            cols.go( exports.Range.header.i, 0, function ( col, i ) {

                rows.go( 0, exports.Range.header.j, function ( row, j ) {

                    var c = new Cell( i, j );
                    get_draw_cell(
                        c,
                        style_header_col,
                        get_col,
                        cell_left,
                        cell_right,
                        cell_up
                    );
                } );
            } );

            //row headers
            cols.go( 0, exports.Range.header.i, function ( col, i ) {

                rows.go( exports.Range.header.j, 0, function ( row, j ) {

                    var c = new Cell( i, j );
                    get_draw_cell(
                        c,
                        style_header_row,
                        get_row,
                        cell_up,
                        cell_down,
                        cell_left
                    );
                } );
            } );

            var time = new Date() - log_start_time;
            dom_stat && ( dom_stat.innerHTML = time + " ms" );
        }
    };

    var draw = null;

    var selection = {

            a : null,

            set : function ( a ) {

                edit.clear();

                this.a = a.clone().clamp( exports.Range.data );
                //this.a = a.clone();

                input_text_area.value = get_text( this.a );

                return this;
            }
        },

        edit = {

            c : null,
            orig_txt : null,

            set : function ( c ) {

                var obj = exports.data.get_value( c );
                if ( !obj || obj.sign != 3 )
                    return;

                this.c = c.clone();

                input_text_area.focus();
                input_text_area.select();

                this.orig_txt = this.get_text();

                return this;
            },

            clear : function () {

                //save
                this.c &&
                this.orig_txt != this.get_text() &&
                on_data_change_callback && on_data_change_callback( this.orig_txt, this.c.i, this.c.j );

                this.c = null;
                this.orig_txt = null;

                return this;
            },

            get_text : function () {

                //var s = input_text_area.value;
                //var p = this.get_selection();
                //return p[ 0 ] === p[ 1 ] && [ s.slice( 0, p[ 0 ] ), s.slice( p[ 0 ] ) ].join( '' ) || s;
                return input_text_area.value;
            },

            get_selection : function () {

                return [ input_text_area.selectionStart, input_text_area.selectionEnd ];
            }
        };

    var controls = {

        mouse_down_cell : null,
        mouse_move_cell : null,
        is_mouse_down : false,
        is_shift_down : false,
        is_ctrl_down : false,
        is_alt_down : false,

        check_keys : function ( e ) {

            this.is_ctrl_down = e.ctrlKey || e.metaKey;
            this.is_shift_down = e.shiftKey;
            this.is_alt_down = e.altKey;
        },

        set_mouse_down : function ( v ) {

            this.is_mouse_down = true;

            var c = new Cell().setXY( v.x, v.y );

            if ( !is_in_values( c ) )
                return;

            this.mouse_down_cell = c.clone();
            this.mouse_move_cell = c.clone();

            c = unproject( c ).max( cell_zero );

            selection.a && new Area( c ).contains( selection.a ) && edit.set( c ) || selection.set( new Area( c ) );

            exports.update();

            return this;
        },

        set_mouse_up : function ( v ) {

            this.is_mouse_down = false;
            this.mouse_down_cell = null;

            return this;
        },

        set_mouse_move : function ( v ) {

            if ( !this.is_mouse_down || !this.mouse_down_cell )
                return this;

            var c = new Cell().setXY( v.x, v.y );

            if ( this.mouse_move_cell && this.mouse_move_cell.equals( c ) )
                return;

            this.mouse_move_cell = c;

            selection.set( new Area( unproject( this.mouse_down_cell ), unproject( this.mouse_move_cell ) ) );

            exports.update();

            return this;
        },

        set_mouse_wheel : function ( y ) {

            y = Math.floor( 10 * y / canvas.height );

            y && exports.Range.scroll.setShift( 0, y ) && exports.update();

            return this;
        },

        set_mouse_click : function ( v ) {

            var c = new Cell().setXY( v.x, v.y );

            if ( !c )
                return;

            var s = unproject( c );

            is_in_row_header( c ) &&
            on_header_row_click_callback &&
            on_header_row_click_callback( exports.data.get_row( s ), s.i, s.j );

            is_in_col_header( c ) &&
            on_header_col_click_callback &&
            on_header_col_click_callback( exports.data.get_col( s ), s.i, s.j );

            is_in_values( c ) &&
            on_data_click_callback &&
            on_data_click_callback( exports.data.get_value( s ), s.i, s.j );

            return this;
        },

        set_mouse_dblclick : function ( v ) {

            //var c = new Cell().setXY( x, y );
            //edit_cell = is_in_values( c ) && unproject( c );
        },

        set_key_down : function ( e ) {

            this.check_keys( e );

            if ( this.is_ctrl_down || this.is_alt_down )
                return;

            function cursor( c ) {

                var abc = selection.a && selection.a.c1.clone().add( c );

                if ( selection.a.c1.equals( abc ) )
                    return;

                selection.set( new Area( abc ) );

                var va = exports.Range.values.clone();
                va.c2.sub( cell_one );
                exports.Range.scroll.add( va.distTo( project( abc ) ) );
            }

            switch ( e.key ) {

                case 'ArrowDown' :
                    cursor( cell_down );
                    break;
                case 'ArrowLeft' :
                    cursor( cell_left );
                    break;
                case 'ArrowRight' :
                    cursor( cell_right );
                    break;
                case 'ArrowUp' :
                    cursor( cell_up );
                    break;
                default :

                    selection.a && !edit.c && (
                        selection.a.c1.equals( selection.a.c2 ) ||
                        selection.set( new Area( selection.a.c1 ) )
                    ) && edit.set( selection.a.c1 );

                    break;
            }

            exports.update();

            return this;
        },

        set_key_up : function ( e ) {

            function copy_to_clipboard() {

                input_text_area.select();
                document.execCommand( 'Copy' );
            }

            var c = e.key;

            this.check_keys( e );

            if ( this.is_ctrl_down && c == 'c' ) //ctrl+c {
                copy_to_clipboard();
            //if (ctrlDown && c == 86) return false //ctrl+v
            //if (ctrlDown && c == 88) return false //ctrl+x
            return this;
        }
    };

    var on_header_col_click_callback = null,
        on_header_row_click_callback = null,
        on_data_click_callback = null,
        on_data_change_callback = null;

    var on_data_change = function ( f ) {

        on_data_change_callback = f;

        return this;
    };

    var on_header_col_click = function ( f ) {

        on_header_col_click_callback = f;

        return this;
    };

    var on_header_row_click = function ( f ) {

        on_header_row_click_callback = f;

        return this;
    };

    var on_data_click = function ( f ) {

        on_data_click_callback = f;

        return this;
    };

    var data = {

        buffer : null,

        get_value : function ( c ) {

            return this.buffer && this.buffer.values && this.buffer.values[ c.i ] && this.buffer.values[ c.i ][ c.j ];
        },

        get_col : function ( c ) {

            return this.buffer && this.buffer.cols && this.buffer.cols[ c.i ] && this.buffer.cols[ c.i ][ c.j ];
        },

        get_row : function ( c ) {

            return this.buffer && this.buffer.rows && this.buffer.rows[ c.j ] && this.buffer.rows[ c.j ][ c.i ];
        }
    };

    var set_data = function ( d ) {

        exports.data.buffer = d;

        return this;
    };

    function get_text( a ) {

        function format_jagged_array( a ) {

            var ret = '',
                sep = '\t';

            a && a.forEach( function ( row, j ) {

                ret += ( j > 0 && '\n' ) || '';

                row.forEach( function ( d, i ) {

                    ret += ( i > 0 && sep || '' ) + d;
                } );
            } );

            return ret;
        }

        var ret = [];

        for ( var j = a.c1.j; j <= a.c2.j; j++ ) {

            ret.push( [] );
            for ( var i = a.c1.i; i <= a.c2.i; i++ ) {

                var c = new Cell( i, j );
                var cell_data = exports.data.get_value( c );
                ret[ ret.length - 1 ].push( cell_data && cell_data.txt || '' );
            }
        }

        return format_jagged_array( ret );
    }

    exports.draw = function (  ) {

        draw();
    };

    exports.update = function() {

        exports.Range.update();

        exports.draw();

        return this;
    };

    var resize = function () {

        cols = bars( Config.CELL_W, canvas.width );
        rows = bars( Config.CELL_H, canvas.height );
        draw = new grid( canvas.width, canvas.height );

        return this;
    };

    function coords( event ) {

        return new Vec( event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop );
    }

    function KeyUp() {

        controls.set_key_up( event );
    }

    function KeyDown() {

        controls.set_key_down( event );
    }

    function MouseClick( e ) {

        event.preventDefault();

        event && controls.set_mouse_click( coords( e ) );
    }

    function MouseDblClick( e ) {

        event.preventDefault();

        event && controls.set_mouse_dblclick( coords( e ) );
    }

    function MouseDown( e ) {

        event.preventDefault();

        event && controls.set_mouse_down( coords( e ) );
    }

    function MouseUp( e ) {

        event.preventDefault();

        event && controls.set_mouse_up( coords( e ) );
    }

    function MouseMove( e ) {

        event.preventDefault();

        event && controls.set_mouse_move( coords( e ) );
    }

    function MouseWheel( e ) {

        event.preventDefault();

        event && controls.set_mouse_wheel( e.deltaY );
    }

    var input_text_area = null;

    exports.set_canvas = set_canvas;
    exports.resize = resize;
    exports.set_data = set_data;
    exports.on_data_change = on_data_change;
    exports.on_header_col_click = on_header_col_click;
    exports.on_header_row_click = on_header_row_click;
    exports.on_data_click = on_data_click;
    exports.project = project;
    exports.unproject = unproject;
    exports.Cell = Cell;
    exports.Area = Area;
    exports.data = data;
    exports.Range = Range;
    exports.Config = Config;

    return exports;

}( Pivot || {} ));