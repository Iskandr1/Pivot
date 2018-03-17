function Pivot( canvas ) {

    const CONFIG = {

        COLOR_FONT : '#000000',
        COLOR_BACKGROUND : '#AAAAAA',
        COLOR_CELL : '#FFFFFF',
        COLOR_CELL_SELECTED : '#F0F0F0',
        COLOR_HEADER : '#F0F0F0',
        SIGN_MAP : {

            0 : '  ',//none
            1 : '+ ',//expand
            2 : '- ',//collapse
            3 : '',//edit
            4 : ''//no_edit
        },
        CELL_W : 102,
        CELL_H : 26,
        FONT_VALUE : '10px Roboto Mono',
        FONT_HEADER : '10px Roboto Mono'
    };

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

    var header_of_rows = null;
    var header_of_cols = null;

    function bars( size, size_limit ) {

        function bar( size ) {

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
        var f_item = bar( size );

        while ( ret.length == 0 || ret[ ret.length - 1].in( size_limit ) ) {

            ret.push( new f_item( ret.length ) );
        }

        ret.at = function( px ) {

            for ( var i = 0; i < ret.length; i++) {

                var axis = ret[ i ];
                if ( px >= axis.pos && px <= axis.pos + axis.size )
                    return axis;
            }
        };

        ret.go = function( from, n, f ) {

            n = n || this.length - from;
            for ( var i = from; i < from + n; i++ )
                f( this[ i ], i );
        };

        return ret;
    }

    var cols = bars( CONFIG.CELL_W, canvas.width );
    var rows = bars( CONFIG.CELL_H, canvas.height );

    function col_to_idx( col ) {

        return col + dx - data.cols.from - header_of_rows.fix;
    }

    function row_to_idx( row ) {

        return row + dy - data.rows.from - header_of_cols.fix;
    }

    function data_col( c ) {

        return data && header_of_cols.in( c.j ) && !header_of_rows.in( c.i ) && data.cols.get( col_to_idx( c.i ), c.j );
    }

    function data_row( c ) {

        return data && header_of_rows.in( c.i ) && !header_of_cols.in( c.j ) && data.rows.get( c.i, row_to_idx( c.j ) );
    }

    function data_value( c ) {

        return data && !header_of_cols.in( c.j ) && !header_of_rows.in( c.i ) && data.values.get( col_to_idx( c.i ), row_to_idx( c.j ) );
    }

    function data_any( c ) {

        return c && ( data_row( c ) ||
              data_col( c ) ||
             data_value( c ) );
    }

    function Cell( i, j ) {

        this.i = i || 0;
        this.j = j || 0;
        this.absi = i + dx || 0;
        this.absj = j + dy || 0;

        return this;
    }

    Cell.prototype = {

        constructor : Cell,

        setXY : function( x, y ) {

            var col = cols.at( x ),
                row = rows.at( y );

            this.i = col.n;
            this.j = row.n;
            this.absi = col.n + dx;
            this.absj = row.n + dy;

            return this;
        },

        isVisible : function() {

            var col = cols[ this.i ],
                row = rows[ this.j ];

            return col && col.in( canvas.width ) && row && row.in( canvas.height );
        }
    };

    var grid = function ( w, h ) {

        var ctx = canvas.getContext( '2d' );
        //var ctx = canvas.getContext('2d', { alpha: false });
        ctx.textBaseline = 'middle';

        var style_header_col = {

            margin_x : 7,
            align : 'start',
            border : 1,
            color : CONFIG.COLOR_HEADER,
            font : CONFIG.FONT_HEADER,
            format : function( obj ) {

                return obj && obj.txt && CONFIG.SIGN_MAP[ obj.sign ] + obj.txt || '';
            }
        };

        var style_header_row = {

            margin_x : 7,
            align : 'start',
            border : 1,
            color : CONFIG.COLOR_HEADER,
            font : CONFIG.FONT_HEADER,
            format : function( obj ) {

                return obj && obj.txt && CONFIG.SIGN_MAP[ 0 ].repeat( obj.lvl - 1 ) + CONFIG.SIGN_MAP[ obj.sign ] + obj.txt || '';
            }
        };

        var style_value = {

            margin_x : 5,
            align : 'end',
            border : 1,
            color : CONFIG.COLOR_CELL,
            font : CONFIG.FONT_VALUE,
            format : function( obj ) {

                return obj && obj.txt && obj.txt.toLocaleString() || '';                                                    //TODO:not fast enough
            }
        };

        var style_value_selected = Object.assign( {}, style_value );
        style_value_selected.color = CONFIG.COLOR_CELL_SELECTED;

        function format( obj, s, c1, r1, c2, r2 ) {

            c2 = c2 || c1;
            r2 = r2 || r1;

            return {

                txt : {

                    s : s.format( obj ),
                    x : s.align == 'end' && c2.pos + c2.size - s.margin_x || c1.pos + s.margin_x,
                    y : r1.pos + ( r2.pos + r2.size - r1.pos ) * 0.5,
                    align : s.align,
                    color : CONFIG.COLOR_FONT,
                    font : s.font
                },
                cell : {

                    x: c1.pos + s.border,
                    y: r1.pos + s.border,
                    w: c2.pos - c1.pos + c2.size - s.border,
                    h: r2.pos - r1.pos + r2.size - s.border,
                    color : s.color
                }
            }
        }

        function cell_left( c ) {

            return new Cell( c.i - 1, c.j );
        }

        function cell_right( c ) {

            return new Cell( c.i + 1, c.j );
        }

        function cell_up( c ) {

            return new Cell( c.i, c.j - 1 );
        }

        function cell_down( c ) {

            return new Cell( c.i, c.j + 1 );
        }

        /*function cell_visible( c ) {

            var col = cols[ c.i ],
                row = rows[ c.j ];

            return col && col.in( w ) && row && row.in( h );
        }*/

        function cell_eq( c1, c2, f ) {

            if ( c1.i == c2.i && c1.j == c2.j )
                return true;

            var d1 = c1 && f( c1 );
            var d2 = c2 && f( c2 );

            return d1 && d2 && d1.id == d2.id;
        }

        function cell_geom( c ) {

            //TODO: selection pass up header!!!
            var col = cols[ Math.max( c.i, header_of_rows.fix ) ];
            var row = rows[ Math.max( c.j, header_of_cols.fix ) ];

            return {

                x : col && col.pos || 0,
                y : row && row.pos || 0,
                w : col && col.size || 0,
                h : row && row.size || 0
            }
        }

        function get_draw_cell( c, s, f, cell_prev, cell_next, cell_parent ) {

            var cr = cell_next( c );
            var p = cell_parent( c );
            var pr = cell_next( cell_parent( c ) );

            //break - draw merged cell
            //if ( !cell_visible( cr ) || !cell_eq( c, cr, f ) || ( cell_visible( p ) && !cell_eq( p, pr, f ) ) ) {
            if ( !cr.isVisible() || !cell_eq( c, cr, f ) || ( p.isVisible() && !cell_eq( p, pr, f ) ) ) {

                var cl = c;
                var pl = cell_parent( cl );
                //search for start of merged cell
                while ( cl.isVisible() && cell_eq( c, cell_prev( cl ), f ) && ( !pl.isVisible() || cell_eq( p, cell_prev( pl ), f ) ) ) {

                    cl = cell_prev( cl );
                    pl = cell_parent( cl );
                }

                paint_obj( f( c ), s, cl.i, cl.j, c.i, c.j );
            }
        }

        function paint_obj( obj, s, i, j, i2, j2 ) {

            var c1 = cols[ i ];
            var r1 = rows[ j ];
            var c2 = cols[ i2 ] || c1;
            var r2 = rows[ j2 ] || r1;
            var f = format( obj, s, c1, r1, c2, r2 );

            if ( !obj )
                return;

            ctx.fillStyle = f.cell.color;
            ctx.fillRect( f.cell.x, f.cell.y, f.cell.w, f.cell.h );

            ctx.fillStyle = f.txt.color;
            ctx.textAlign = f.txt.align;
            ctx.font = f.txt.font;
            ctx.fillText( f.txt.s, f.txt.x, f.txt.y );
        }

        function paint_selection() {

            var selection_box = selection.box();
            if ( selection_box ) {

                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = 'rgba(200,200,200,0.5)';
                var g1 = cell_geom( selection_box.from );
                var g2 = cell_geom( selection_box.to );
                ctx.fillRect( g1.x, g1.y, g2.x + g2.w - g1.x, g2.y + g2.h - g1.y );

                ctx.globalCompositeOperation = 'source-over';//default
            }
        }

        return function() {

            //TODO:performance temp tip
            var log_start_time = new Date();

            //ctx.clearRect( 0, 0, w, h );
            ctx.fillStyle = CONFIG.COLOR_BACKGROUND;
            ctx.fillRect( 0, 0, w, h );


            /*
            ctx.beginPath();
            cols.go( 0, 0, function ( col, i ) {

                ctx.moveTo( col.pos, 0 );
                ctx.lineTo( col.pos, h );
            });

            rows.go( 0, 0, function ( row, j ) {

                ctx.moveTo( 0, row.pos );
                ctx.lineTo( w, row.pos );
            });
            ctx.stroke();
            */
            //values
            cols.go( header_of_rows.fix, 0, function ( col, i ) {

                rows.go( header_of_cols.fix, 0, function ( row, j ) {

                    var c = new Cell( i, j );
                    paint_obj(
                        data_value( c ),
                        style_value,//selection.contains( c ) && style_value_selected || style_value,
                        col.n,
                        row.n
                    );
                });
            });

            //col headers
            cols.go( header_of_rows.fix, 0, function ( col, i ) {

                rows.go( 0, header_of_cols.fix, function ( row, j ) {

                    get_draw_cell(
                        new Cell( i, j ),
                        style_header_col,
                        data_col,
                        cell_left,
                        cell_right,
                        cell_up
                    );
                });
            });

            //row headers
            cols.go( 0, header_of_rows.fix, function ( col, i ) {

                rows.go( header_of_cols.fix, 0, function ( row, j ) {

                    get_draw_cell(
                        new Cell( i, j ),
                        style_header_row,
                        data_row,
                        cell_up,
                        cell_down,
                        cell_left
                    );
                });
            });

            selection && paint_selection();

            //TODO:performance temp tip
            var time = new Date() - log_start_time;
            document.getElementById( "stat" ).innerHTML = time+" ms";
        }
    };

    var draw = new grid( canvas.width, canvas.height );

    var controls = {

        mouse_down_cell : null,
        is_mouse_down : false,
        is_shift_down : false,
        is_ctrl_down : false,

        set_mouse_down : function( x, y ) {

            this.is_mouse_down = true;
            this.mouse_down_cell = new Cell().setXY( x, y );

            return this;
        },
        set_mouse_up : function( x, y ) {

            this.is_mouse_down = false;
            this.mouse_down_cell = null;

            return this;
        },

        is_selection : function() {

            return this.is_mouse_down && this.is_shift_down;
        },

        move : function( x, y ) {

            if ( ! ( this.mouse_down_cell && !this.is_shift_down && !this.is_ctrl_down && this.is_mouse_down ) )
                return;

            var c = new Cell().setXY( x, y );
            var mx = this.mouse_down_cell.i - c.i;
            var my = this.mouse_down_cell.j - c.j;

            /*var h = ( Math.abs( mx ) > Math.abs( my ) ) + 0;
            mx *= h;
            my *= ( 1 - h );*/

            var dx_local = this.mouse_down_cell.absi - this.mouse_down_cell.i;
            var dy_local = this.mouse_down_cell.absj - this.mouse_down_cell.j;
            mx += dx_local;
            my += dy_local;

            return ( mx || my ) && {

                x : mx,
                y : my
            }
        }
    };

    var selection = {

        c1 : null,
        c2 : null,
        values : null,

        add : function( c ) {

            this.c1 = this.c1 || c;
            this.c2 = this.c1 && c;

            this.values = this.get_visible_text();

            return this;
        },

        clear : function() {

            this.c1 = null;
            this.c2 = null;

            return this;
        },

        box : function() {

            var c1 = this.c1;
            var c2 = this.c2;

            return c1 && c2 && {

                from : new Cell(
                    Math.min( c1.absi - dx, c2.absi - dx ),
                    Math.min( c1.absj - dy, c2.absj - dy )
                ),
                to : new Cell(
                    Math.max( c1.absi - dx, c2.absi - dx ),
                    Math.max( c1.absj - dy, c2.absj - dy )
                )
            };
        },

        get_visible_text : function() {

            var b = this.box();
            var ret = [];

            b && rows.go( b.from.j, b.to.j - b.from.j + 1, function( row, j ) {

                ret.push( [] );
                cols.go( b.from.i, b.to.i - b.from.i + 1, function( col, i ) {

                    ret[ ret.length - 1].push( data_any( new Cell( i, j ) ).txt );
                });
            });

            return ret;
        }
    };

    var on_data_demand_callback = null;
    var on_header_col_click_callback = null;
    var on_header_row_click_callback = null;
    var on_data_click_callback = null;
    var data = null;

    this.on_data_demand = function( f ) {

        on_data_demand_callback = f;
    };

    this.on_header_col_click = function( f ) {

        on_header_col_click_callback = f;
    };

    this.on_header_row_click = function( f ) {

        on_header_row_click_callback = f;
    };

    this.on_data_click = function( f ) {

        on_data_click_callback = f;
    };

    this.set_data = function( d ) {

        data = d;
        header_of_cols = header( d.cols.headers );
        header_of_rows = header( d.rows.headers );

        draw();
    };

    this.update = function( reset ) {

        var frame_width = 10;
        var frame_height = 10;

        var fix_cols = header_of_rows && header_of_rows.fix || 0;
        var fix_rows = header_of_cols && header_of_cols.fix || 0;

        if ( !data ||
            reset ||
            dx < data.cols.from ||
            dy < data.rows.from ||
            Math.min( data.cols.total, dx + cols.length - fix_cols ) > data.cols.from + data.cols.count ||
            Math.min( data.rows.total, dy + rows.length - fix_rows ) > data.rows.from + data.rows.count ) {

            var col1 = Math.max( 0, dx - frame_width );
            var row1 = Math.max( 0, dy - frame_height );
            var n_cols = cols.length - fix_cols + frame_width * 2;
            var n_rows = rows.length - fix_rows + frame_height * 2;

            on_data_demand_callback && on_data_demand_callback( col1, row1, n_cols, n_rows );
        } else
            draw();
    };

    this.scroll = function( x, y, set ) {

        var dx0 = dx;
        var dy0 = dy;

        dx = Math.max( 0, ( !set && dx ) + x );
        dy = Math.max( 0, ( !set && dy ) + y );

        if ( dx != dx0 || dy != dy0 )
            this.update();
    };

    this.mouse_click = function( x, y ) {

        var c = new Cell().setXY( x, y );

        if ( !c )
            return;

        var i = c.i,
            j = c.j;

        var item = data_any( c );

        var col = i + dx - header_of_rows.fix;                                                                          //data grid pos
        var row = j + dy - header_of_cols.fix;                                                                          //data grid pos

        i < header_of_rows.fix && on_header_row_click_callback && on_header_row_click_callback( item, i, row );
        j < header_of_cols.fix && on_header_col_click_callback && on_header_col_click_callback( item, col, j );
        i >= header_of_cols.fix && j >= header_of_rows.fix && on_data_click_callback && on_data_click_callback( item, col, row );
    };

    this.mouse_down = function( x, y ) {

        controls.set_mouse_down( x, y );

        var c = new Cell().setXY( x, y );

        if ( controls.is_shift_down ) {

            selection.add( c );
        } else {

            selection.clear().add( c );
        }
    };

    this.mouse_up = function( x, y ) {

        if ( controls.is_selection() )
            selection.cell2 = new Cell().setXY( x, y ) || selection.cell2;

        controls.set_mouse_up( x, y );

        draw();
    };

    this.mouse_move = function( x, y ) {

        var mv = controls.move( x, y );
        mv && this.scroll( mv.x, mv.y, true );
    };

    this.mouse_wheel = function( y ) {

        y && this.scroll( 0, Math.floor( 10 * y / canvas.height ) );
    };

    this.key_up = function( e ) {

        controls.is_ctrl_down  = ( e.ctrlKey || e.metaKey );
        controls.is_shift_down = e.shiftKey;

        var c = e.keyCode;

        if ( controls.is_ctrl_down && c == 67 )//ctrl+c
            copy_to_clipboard();
        //if (ctrlDown && c == 86) return false //ctrl+v
        //if (ctrlDown && c == 88) return false //ctrl+x
    };

    this.key_down = function( e ) {

        controls.is_ctrl_down  = e.ctrlKey || e.metaKey;
        controls.is_shift_down  = e.shiftKey;
    };

    function copy_to_clipboard() {

        function to_clipboard( s ){

            var tmp = document.createElement( 'textarea' );

            document.body.appendChild( tmp );
            //tmp.setAttribute( 'value', s );
            tmp.innerHTML = s;
            tmp.select();
            document.execCommand( 'Copy' );
            document.body.removeChild( tmp );
        }

        function format_jagged_array( a ) {

            var ret = '',
                sep = '\t';

            a && a.forEach( function( row, j ) {

                ret += ( j > 0 && '\n' ) || '';

                row.forEach( function( d, i ) {

                    ret += ( i > 0 && sep || '' ) + d;
                });
            });

            return ret;
        }

        return to_clipboard(
            format_jagged_array(
                selection.values
            )
        );
    }


}