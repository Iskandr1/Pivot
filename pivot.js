var Pivot = (_canvas) => {

  var Config = {

    textcolor: '#000000',
    COLOR_BACKGROUND: '#AAAAAA',
    COLOR_GRID: '#AAAAAA',
    cellcolor: '#FFFFFF',
    COLOR_EDIT: '#FFFFFF',
    COLOR_CELL_SELECTED: '#F0F0F0',
    // COLOR_HEADER: '#F0F0F0',
    HEADER_COL_COLOR: '#F0F0F0',
    HEADER_ROW_COLOR: '#F0F0F0',
    SIGN_MAP: {

      0: 'ﾠﾠ', // none
      1: '\uFEFF＋ ', // expand
      2: '\uFEFF－ ', // collapse
      3: '', // edit
      4: '' // no_edit
    },
    CELL_W: 102,
    CELL_H: 26,
    CELL_EDIT_UNDERLINE_MARGIN: 5,
    CELL_EDIT_CURSOR_MARGIN: 3,
    FONT_VALUE: '11px Arial',
    FONT_VALUE_UNDERLINE: false,
    FONT_HEADER: '11px Arial',
    FONT_HEADER_UNDERLINE: false,
    ALIGN_HEADER: 'start',
    ALIGN_VALUE: 'end',
    SELECTION_ENABLED: true,
    BORDER_WIDTH: 1,
    FONT_UNDERLINE_WIDTH: 1,
    LABEL: undefined,
    set: function (cfg) {
      Object.assign(this, cfg)

      return this
    }
  }

  function assign (dst, src) {
    return Object.assign(Object.assign({}, dst), src)
  }

  var canvas = null
  var dom_stat = null

  var set_canvas = function (dom) {
    canvas = dom

    inputTextArea = document.createElement('textarea')
    inputTextArea.setAttribute('style', 'clip: rect(1px, 1px, 1px, 1px); position: absolute !important; height: 1px; width: 1px; overflow: hidden; opacity: 0')
    inputTextArea.addEventListener('input', function () {
      draw()                                                                                                     // TODO:repaint one only cell
    })

    document.body.appendChild(inputTextArea)

    canvas.addEventListener('click', MouseClick, false)
    canvas.addEventListener('dblclick', MouseDblClick, false)
    canvas.addEventListener('mousemove', MouseMove, false)
    canvas.addEventListener('mousedown', MouseDown, false)
    canvas.addEventListener('mouseup', MouseUp, false)
    canvas.addEventListener('wheel', MouseWheel, false)
    canvas.ownerDocument.addEventListener('keyup', KeyUp, false)
    canvas.ownerDocument.addEventListener('keydown', KeyDown, false)

    dom_stat = document.getElementById('stat')

    resize()

    return this
  }

  function bars (size, size_limit) {
    function bar (size) {
      return function (n, prev) {
        this.n = n
        // this.size = size[ Math.min(n, size.length - 1) ] || size
        var fSize = size[ Math.min(n, size.length - 1) ] || size
        this.size = typeof fSize === 'function' ? fSize() : fSize
        // this.pos = this.n * this.size;
        this.pos = prev ? prev.pos + prev.size : 0
        this.in = function (size) {
          return this.pos < size
        }
      }
    }

    var ret = []
    var Bar = bar(size)

    while (ret.length === 0 || ret[ ret.length - 1 ].in(size_limit)) {
      ret.push(new Bar(ret.length, ret[ ret.length - 1 ]))
    }

    ret.at = function (px) {
      for (var i = 0; i < ret.length; i++) {
        var axis = ret[ i ]
        if (px >= axis.pos && px <= axis.pos + axis.size)
        {return axis;}
      }
    }

    ret.go = function (from, n, f) {
      n = n || this.length - from
      for (var i = from; i < from + n; i++)
      {f( this[ i ], i );}
    }

    return ret
  }

  var cols = null
  var rows = null

  function Cell (i, j) {
    this.i = i || 0
    this.j = j || 0

    return this
  }

  Cell.prototype = {

    constructor: Cell,

    setXY: function (x, y) {
      var col = cols.at(x)
      var row = rows.at(y)

      this.i = col.n
      this.j = row.n

      return this
    },

    isVisible: function () {
      var col = cols[ this.i ]
      var row = rows[ this.j ]

      return col && col.in(canvas.width) && row && row.in(canvas.height)
    },

    setShift: function (di, dj) {
      this.i += di
      this.j += dj

      return this
    },

    set: function (i, j) {
      this.i = i
      this.j = j

      return this
    },

    setI: function (i) {
      this.i = i

      return this
    },

    setJ: function (j) {
      this.j = j

      return this
    },

    clone: function () {
      return new this.constructor(this.i, this.j)
    },

    add: function (c) {
      this.i += c.i
      this.j += c.j

      return this
    },

    sub: function (c) {
      this.i -= c.i
      this.j -= c.j

      return this
    },

    min: function (c) {
      this.i = Math.min(this.i, c.i)
      this.j = Math.min(this.j, c.j)

      return this
    },

    max: function (c) {
      this.i = Math.max(this.i, c.i)
      this.j = Math.max(this.j, c.j)

      return this
    },

    clamp: function (min, max) {
      this.i = Math.max(min.i, Math.min(max.i, this.i))
      this.j = Math.max(min.j, Math.min(max.j, this.j))

      return this

    },

    equals: function (c) {
      return c && (c.i === this.i && c.j === this.j)
    }
  }

  var cell_zero = new Cell()
  var cell_left = new Cell(-1, 0)
  var cell_right = new Cell(1, 0)
  var cell_up = new Cell(0, -1)
  var cell_down = new Cell(0, 1)
  var cell_one = new Cell(1, 1)

  function Area (c1, c2) {
    this.c1 = c1 && c1.clone()
    this.c2 = c2 && c2.clone() || c1

    this.c1.min(this.c2)
    this.c2.max(c1)

    return this
  }

  Area.prototype = {

    constructor: Area,

    distTo: function (c) {
      var max = c.clone().sub(this.c2).max(cell_zero)
      var min = c.clone().sub(this.c1).min(cell_zero)

      return min.add(max)
    },

    shift: function (c) {
      this.c1.add(c)
      this.c2.add(c)

      return this
    },

    contains: function (a) {
      var c1 = a.c1 || a
      var c2 = a.c2 || a

      return this.c1.i <= c1.i &&
                this.c1.j <= c1.j &&
                this.c2.i >= c2.i &&
                this.c2.j >= c2.j
    },

    clone: function () {
      return new this.constructor(this.c1, this.c2)
    },

    size: function () {
      return this.c2.clone().sub(this.c1)
    },

    shrink: function (c) {
      this.c1.add(c)
      this.c2.sub(c)

      return this
    },

    expand: function (c) {
      this.c1.sub(c)
      this.c2.add(c)

      return this
    },

    clamp: function (a) {
      this.c1.max(a.c1).min(a.c2)
      this.c2.max(a.c1).min(a.c2)

      return this
    }
  }

  function Vec (x, y) {
    this.x = x
    this.y = y

    return this
  }

  Vec.prototype = {

    constructor: Vec,

    clone: function () {
      return new this.constructor(this.x, this.y)
    }
  }

  function Rect (a) {
    var c1 = cols[ a.c1.i ]
    var c2 = cols[ a.c2.i ]
    var r1 = rows[ a.c1.j ]
    var r2 = rows[ a.c2.j ]

    if (!c1 || !c2 || !r1 || !r2) return

    this.x = c1.pos
    this.y = r1.pos
    this.width = c2.pos - c1.pos + c2.size
    this.height = r2.pos - r1.pos + r2.size

    return this
  }

  Rect.prototype = {

    constructor: Rect,

    shrink: function (x1, y1, x2, y2) {
      y1 = y1 || 0
      x2 = x2 || 0
      y2 = y2 || 0

      this.x += x1
      this.y += y1
      this.width -= x1 + x2
      this.height -= y1 + y2

      return this
    },

    getCenter: function () {
      return new Vec(this.x + this.width * 0.5, this.y + this.height * 0.5)
    },

    getFarCorner: function () {
      return new Vec(this.x + this.width, this.y + this.height)
    }
  }

  var project = function (c) {
    return c.clone().sub(Range.scroll).add(Range.header)
  };

  var unproject = function (c) {
    var s = c.clone().add(Range.scroll).sub(Range.header)

    is_in_row_header(c) && s.setI(c.i)
    is_in_col_header(c) && s.setJ(c.j)

    return s
  };

  function is_in_row_header (c) {
    return c.i < Range.header.i && c.j >= Range.header.j
  }

  function is_in_col_header (c) {
    return c.j < Range.header.j && c.i >= Range.header.i
  }

  function is_in_values (c) {
    return c.i >= Range.header.i && c.j >= Range.header.j
  }

  var Range = {

    scroll: new Cell(),
    header: null,
    data: null,
    values: null,
    grid: new Cell(),
    width: 0,
    height: 0,
    update: function () {
      if (Range.data) {
        var area = Range.data.c2.clone().max(new Cell(data.buffer.values.length, data.buffer.values[0].length))
        this.scroll.min(area.sub(this.grid.sub(this.header).sub(new Cell(5, 5))))
      }
      this.scroll.max(cell_zero)
      this.header = data.buffer && new Cell(data.buffer.rows[ 0 ].length, data.buffer.cols[ 0 ].length) || cell_zero.clone()
      this.data = data.buffer && new Area(cell_zero, new Cell(data.buffer.cols.length - 1, data.buffer.rows.length - 1))
      this.values = new Area(this.header || cell_zero, new Cell(cols.at(canvas.width).n, rows.at(canvas.height).n))
      this.grid = new Cell(cols.length, rows.length)
      var farCell = Range.data && project(Range.data.c2).min(new Cell(cols.length - 1, rows.length - 1)) || cell_zero
      this.width = cols[farCell.i].pos + cols[farCell.i].size + Config.BORDER_WIDTH
      this.height = rows[farCell.j].pos + rows[farCell.j].size + Config.BORDER_WIDTH
    }
  }

  var Grid = function (w, h) {

    var ctx = canvas.getContext('2d')
    // var ctx = canvas.getContext('2d', { alpha: false });
    ctx.textBaseline = 'middle'

    ctx.font = Config.FONT_VALUE
    var letter_width = ctx.measureText('1234567910abcdeABCDE').width * 0.05

    var style_value = {

      margin_x: 5,
      // align: 'end',
      align: Config.ALIGN_VALUE,
      border: Config.BORDER_WIDTH,
      cellcolor: Config.cellcolor,
      font: Config.FONT_VALUE,
      textcolor: Config.textcolor,
      underline: Config.FONT_VALUE_UNDERLINE,
      format: function (obj) {
        return obj && obj.txt && obj.txt.toLocaleString()// || '';                                             //TODO:toLocaleString is not fast enough
      }
    }

    var style_header_col = assign(style_value, {

      margin_x: 5,
      // align: 'start',
      align: Config.ALIGN_HEADER,
      cellcolor: Config.HEADER_COL_COLOR,
      font: Config.FONT_HEADER,
      underline: Config.FONT_HEADER_UNDERLINE,
      format: function (obj) {
        return obj && obj.txt && Config.SIGN_MAP[ obj.sign ] + obj.txt
      }
    })

    var style_header_row = assign(style_header_col, {

      cellcolor: Config.HEADER_ROW_COLOR,
      format: function (obj) {
        return obj && obj.txt && Config.SIGN_MAP[ 0 ].repeat(obj.lvl - 1) + Config.SIGN_MAP[ obj.sign ] + obj.txt
      }
    })

    var style_edit = assign(style_value, {

      cellcolor: Config.COLOR_EDIT,
      format: function (obj) {
        return obj && obj.txt || obj
      }
    })

    function format (obj, s, cell1, cell2) {
      cell2 = cell2 || cell1

      var r = new Rect(new Area(cell1, cell2))
        .shrink(s.border, s.border)

      var r_center = r.getCenter()
      var r_far = r.getFarCorner()
      var s_txt = s.format(obj)

      s_txt = s_txt && s_txt.substring(0, Math.floor(r.width / letter_width) - 1)

      return {

        txt: {

          s: s_txt,
          vec: new Vec(s.align === 'end' ? r_far.x - s.margin_x : r.x + s.margin_x, r_center.y),
          align: s.align,
          textcolor: (obj && obj.textcolor) || s.textcolor,
          font: s.font,
          underline: (obj && obj.underline) || s.underline
        },
        cell: {

          rect: r,
          cellcolor: (obj && obj.cellcolor) || s.cellcolor
        }
      }
    }

    function get_draw_cell (c, s, f, prev, next, parent) {
      function cell_eq (c1, c2, f) {
        if (c1.equals(c2))
        {return true;}

        var d1 = c1 && f(unproject(c1))
        var d2 = c2 && f(unproject(c2))

        return d1 && d2 && d1.id === d2.id
      }

      function get (c, dir) {
        return c.clone().add(dir)
      }

      var cr = get(c, next)
      var p = get(c, parent)
      var pr = get(get(c, parent), next)

      // break - draw merged cell
      if (!cr.isVisible() || !cell_eq(c, cr, f) || (p.isVisible() && !cell_eq(p, pr, f))) {
        var cl = c
        var pl = get(cl, parent)
        // search for start of merged cell
        while (cl.isVisible() && cell_eq(c, get(cl, prev), f) && (!pl.isVisible() || cell_eq(p, get(pl, prev), f))) {
          cl = get(cl, prev)
          pl = get(cl, parent)
        }

        while (cl.isVisible() && cell_eq(cl, pl, f)) {
          cl = pl.clone()
          pl = get(pl, parent)
        }

        paint_obj(format(f(unproject(c)), s, cl, c))
      }
    }

    function paint_obj (f) {
      if (f.txt.s === undefined) {
        return
      }

      ctx.fillStyle = f.cell.cellcolor
      ctx.fillRect(f.cell.rect.x, f.cell.rect.y, f.cell.rect.width, f.cell.rect.height)

      ctx.fillStyle = f.txt.textcolor
      ctx.textAlign = f.txt.align
      ctx.font = f.txt.font
      ctx.fillText(f.txt.s, f.txt.vec.x, f.txt.vec.y)

      f.txt.underline && paint_stroke(f, true)
    }

    function paint_selection () {
      var c1 = project(selection.a.c1)
      var c2 = project(selection.a.c2)

      if (Range.values.contains(c1) || Range.values.contains(c2)) {
        ctx.globalCompositeOperation = 'multiply'
        ctx.fillStyle = 'rgba(200,200,200,0.5)'

        var r = new Rect(
          // new Area( c1, c2 ).clamp( values_area )
          new Area(c1, c2).clamp(Range.values)
        )
        ctx.fillRect(r.x, r.y, r.width, r.height)

        ctx.globalCompositeOperation = 'source-over'// default
      }
    }

    function paint_stroke (fmt, underline) {

      var far_corner = fmt.cell.rect.getFarCorner()
      var text_width = (fmt.txt.align === 'end' ? 1 : -1) * Math.floor(ctx.measureText(fmt.txt.s).width)

      var u0 = new Vec(fmt.txt.vec.x - text_width, far_corner.y - Config.CELL_EDIT_UNDERLINE_MARGIN)
      var u1 = new Vec(fmt.txt.vec.x, u0.y)
      var c0 = new Vec(far_corner.x - Config.CELL_EDIT_CURSOR_MARGIN, fmt.cell.rect.y + Config.CELL_EDIT_UNDERLINE_MARGIN)
      var c1 = new Vec(c0.x, far_corner.y - Config.CELL_EDIT_UNDERLINE_MARGIN)
      var v0 = (underline && u0) || c0
      var v1 = (underline && u1) || c1

      ctx.beginPath()
      ctx.moveTo(v0.x, v0.y)
      ctx.lineTo(v1.x, v1.y)
      ctx.strokeStyle = Config.textcolor
      ctx.lineWidth = Config.FONT_UNDERLINE_WIDTH
      ctx.stroke()
    }

    function paint_label (txt) {
      var f = format(undefined, style_header_col, new Cell(0, 0), new Cell(Range.header.i - 1, Range.header.j - 1))
      f.txt.s = txt
      paint_obj(f)
    }

    function paint_edit () {
      var fmt = format(
        edit.get_text(),
        style_edit,
        project(edit.c)
      )

      paint_obj(fmt)

      var sel = edit.get_selection()
      var underline = sel[ 0 ] !== sel[ 1 ]

      paint_stroke(fmt, underline)
      /*
      var far_corner = fmt.cell.rect.getFarCorner()
      var text_width = Math.floor(ctx.measureText(fmt.txt.s).width)

      var u0 = new Vec(fmt.txt.vec.x - text_width, far_corner.y - Config.CELL_EDIT_UNDERLINE_MARGIN)
      var u1 = new Vec(fmt.txt.vec.x, u0.y)
      var c0 = new Vec(far_corner.x - Config.CELL_EDIT_CURSOR_MARGIN, fmt.cell.rect.y + Config.CELL_EDIT_UNDERLINE_MARGIN)
      var c1 = new Vec(c0.x, far_corner.y - Config.CELL_EDIT_UNDERLINE_MARGIN)
      var v0 = underline && u0 || c0
      var v1 = underline && u1 || c1

      ctx.beginPath()
      ctx.moveTo(v0.x, v0.y)
      ctx.lineTo(v1.x, v1.y)
      ctx.strokeStyle = Config.textcolor
      ctx.lineWidth = 1
      ctx.stroke()
      */
    }

    function get_col (c) {
      return data.get_col(c)
    }

    function get_row (c) {
      return data.get_row(c)
    }

    function get_value (c) {
      return data.get_value(c)
    }

    function get_row_data (j) {
      return data.get_row_data(j)
    }

    return function () {
      var log_start_time = new Date()

      // ctx.clearRect( 0, 0, w, h );
      ctx.fillStyle = Config.COLOR_BACKGROUND
      ctx.fillRect(0, 0, w, h)

      // far corner
      ctx.fillStyle = Config.COLOR_GRID
      ctx.fillRect(0, 0, Range.width, Range.height)

      // values
      cols.go(Range.header.i, 0, function (col, i) {
        rows.go(Range.header.j, 0, function (row, j) {
          var c = new Cell(i, j)
          paint_obj(
            format(
              get_value(unproject(c)),
              style_value,
              c
            )
          )
        })
      })

      selection.a && Range.data.contains(selection.a) && paint_selection()

      edit.c && Range.values.contains(project(edit.c)) && paint_edit()

      // col headers
      cols.go(Range.header.i, 0, function (col, i) {
        rows.go(0, Range.header.j, function (row, j) {
          var c = new Cell(i, j)
          get_draw_cell(
            c,
            style_header_col,
            get_col,
            cell_left,
            cell_right,
            cell_up
          )
        })
      })

      // row headers
      cols.go(0, Range.header.i, function (col, i) {
        rows.go(Range.header.j, 0, function (row, j) {
          var c = new Cell(i, j)
          get_draw_cell(
            c,
            style_header_row,
            get_row,
            cell_up,
            cell_down,
            cell_left
          )
        })
      })

      // top left cell
      Config.LABEL && paint_label(Config.LABEL)      

      var time = new Date() - log_start_time
      dom_stat && (dom_stat.innerHTML = time + ' ms')
    }
  }

  // var draw = null
  var selection = {
    a: null,
    set: function (a) {
      if (!Config.SELECTION_ENABLED) {
        return
      }

      edit.clear()

      this.a = a.clone().clamp(Range.data)
      // this.a = a.clone();

      inputTextArea.value = get_text(this.a)

      return this
    }
  }
  var edit = {

    c: null,
    orig_txt: null,

    set: function (c) {
      var obj = data.get_value(c)
      if (!obj || obj.sign != 3)
      {return;}

      this.c = c.clone()

      inputTextArea.focus()
      inputTextArea.select()

      this.orig_txt = this.get_text()

      return this
    },

    clear: function () {
      // save
      this.c &&
                this.orig_txt != this.get_text() &&
                on_data_change_callback && on_data_change_callback(this.orig_txt, this.c.i, this.c.j)

      this.c = null
      this.orig_txt = null

      return this
    },

    get_text: function () {
      // var s = inputTextArea.value;
      // var p = this.get_selection();
      // return p[ 0 ] === p[ 1 ] && [ s.slice( 0, p[ 0 ] ), s.slice( p[ 0 ] ) ].join( '' ) || s;
      return inputTextArea.value
    },

    get_selection: function () {
      return [ inputTextArea.selectionStart, inputTextArea.selectionEnd ]
    }
  }

  var controls = {

    mouse_down_cell: null,
    mouse_move_cell: null,
    is_mouse_down: false,
    is_shift_down: false,
    is_ctrl_down: false,
    is_alt_down: false,

    check_keys: function (e) {
      this.is_ctrl_down = e.ctrlKey || e.metaKey
      this.is_shift_down = e.shiftKey
      this.is_alt_down = e.altKey
    },

    set_mouse_down: function (v) {
      this.is_mouse_down = true

      var c = new Cell().setXY(v.x, v.y)

      if (!is_in_values(c))
      {return;}

      this.mouse_down_cell = c.clone()
      this.mouse_move_cell = c.clone()

      c = unproject(c).max(cell_zero)

      selection.a && new Area(c).contains(selection.a) && edit.set(c) || selection.set(new Area(c))

      update()

      return this
    },

    set_mouse_up: function (v) {
      this.is_mouse_down = false
      this.mouse_down_cell = null

      return this
    },

    set_mouse_move: function (v) {
      if (!this.is_mouse_down || !this.mouse_down_cell)
      {return this;}

      var c = new Cell().setXY(v.x, v.y)

      if (this.mouse_move_cell && this.mouse_move_cell.equals(c))
      {return;}

      this.mouse_move_cell = c

      selection.set(new Area(unproject(this.mouse_down_cell), unproject(this.mouse_move_cell)))

      update()

      return this
    },

    set_mouse_wheel: function (y) {
      y = Math.floor(10 * y / canvas.height)

      y && Range.scroll.setShift(0, y) && update()

      return this
    },

    set_mouse_click: function (v) {
      var c = new Cell().setXY(v.x, v.y)

      if (!c)
      {return;}

      var s = unproject(c)

      is_in_row_header(c) &&
            on_header_row_click_callback &&
            on_header_row_click_callback(data.get_row(s), s.i, s.j)

      is_in_col_header(c) &&
            on_header_col_click_callback &&
            on_header_col_click_callback(data.get_col(s), s.i, s.j)

      is_in_values(c) &&
            on_data_click_callback &&
            on_data_click_callback(data.get_value(s), s.i, s.j)

      return this
    },

    set_mouse_dblclick: function (v) {

      // var c = new Cell().setXY( x, y );
      // edit_cell = is_in_values( c ) && unproject( c );
      // cols[ 0 ].size *= 2;
      // update();
    },

    set_key_down: function (e) {
      this.check_keys(e)

      if (this.is_ctrl_down || this.is_alt_down)
      {return;}

      function cursor (c) {
        var abc = selection.a && selection.a.c1.clone().add(c)

        if (selection.a.c1.equals(abc))
        {return;}

        selection.set(new Area(abc))

        var va = Range.values.clone()
        va.c2.sub(cell_one)
        Range.scroll.add(va.distTo(project(abc)))
      }

      switch (e.key) {
        case 'ArrowDown' :
          cursor(cell_down)
          break;
        case 'ArrowLeft' :
          cursor(cell_left)
          break;
        case 'ArrowRight' :
          cursor(cell_right)
          break;
        case 'ArrowUp' :
          cursor(cell_up)
          break;
        default :

          selection.a && !edit.c && (
            selection.a.c1.equals(selection.a.c2) ||
                        selection.set(new Area(selection.a.c1))
          ) && edit.set(selection.a.c1)

          break;
      }

      update()

      return this
    },

    set_key_up: function (e) {
      function copy_to_clipboard () {
        inputTextArea.select()
        document.execCommand('Copy')
      }

      var c = e.key

      this.check_keys(e)

      if (this.is_ctrl_down && c == 'c') // ctrl+c {
      {copy_to_clipboard();}
      // if (ctrlDown && c == 86) return false //ctrl+v
      // if (ctrlDown && c == 88) return false //ctrl+x
      return this
    }
  }

  var on_header_col_click_callback = null
  var on_header_row_click_callback = null
  var on_data_click_callback = null
  var on_data_change_callback = null

  var on_data_change = function (f) {
    on_data_change_callback = f

    return this
  }

  var on_header_col_click = function (f) {
    on_header_col_click_callback = f

    return this
  }

  var on_header_row_click = function (f) {
    on_header_row_click_callback = f

    return this
  }

  var on_data_click = function (f) {
    on_data_click_callback = f

    return this
  }

  var data = {

    buffer: null,

    get_value: function (c) {
      return this.buffer && this.buffer.values && this.buffer.values[ c.i ] && this.buffer.values[ c.i ][ c.j ]
    },

    get_col: function (c) {
      return this.buffer && this.buffer.cols && this.buffer.cols[ c.i ] && this.buffer.cols[ c.i ][ c.j ]
    },

    get_row: function (c) {
      return this.buffer && this.buffer.rows && this.buffer.rows[ c.j ] && this.buffer.rows[ c.j ][ c.i ]
    },

    get_row_data: function (j) {
      var rows = (this.buffer && this.buffer.rows && this.buffer.rows[ j ]) || []
      var values = []
      this.buffer && this.buffer.values.forEach(colvals => values.push(colvals[ j ]))
      return rows.concat(values)
    }
  }

  var set_data = function (d) {
    data.buffer = d

    return this
  }

  function get_text (a) {
    function format_jagged_array (a) {
      var ret = ''
      var sep = '\t'

      a && a.forEach(function (row, j) {
        ret += (j > 0 && '\n') || ''

        row.forEach(function (d, i) {
          ret += (i > 0 && sep || '') + d
        })
      })

      return ret
    }

    var ret = []

    for (var j = a.c1.j; j <= a.c2.j; j++) {
      ret.push([])
      for (var i = a.c1.i; i <= a.c2.i; i++) {
        var c = new Cell(i, j)
        var cell_data = data.get_value(c)
        ret[ ret.length - 1 ].push(cell_data && cell_data.txt || '')
      }
    }

    return format_jagged_array(ret)
  }

  var draw = function () {
    Config.CELL_W.length && resize()
    draw()
  }

  var update = function () {
    Range.update()

    draw()

    return this
  }

  var resize = function () {
    var xScroll = Range.scroll.i
    var xHeader = Range.header ? Range.header.i : 0
    var widths = Config.CELL_W.length ? Config.CELL_W.slice(0, xHeader).concat(Config.CELL_W.slice(xHeader + xScroll)) : Config.CELL_W

    cols = bars(widths, canvas.width)
    rows = bars(Config.CELL_H, canvas.height)
    draw = new Grid(canvas.width, canvas.height)

    return this
  }

  function coords (event) {
    return new Vec(event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop)
  }

  function KeyUp (event) {
    controls.set_key_up(event)
  }

  function KeyDown (event) {
    controls.set_key_down(event)
  }

  function MouseClick (event) {
    event.preventDefault()

    event && controls.set_mouse_click(coords(event))
  }

  function MouseDblClick (event) {
    event.preventDefault()

    event && controls.set_mouse_dblclick(coords(event))
  }

  function MouseDown (event) {
    event.preventDefault()

    event && controls.set_mouse_down(coords(event))
  }

  function MouseUp (event) {
    event.preventDefault()

    event && controls.set_mouse_up(coords(event))
  }

  function MouseMove (event) {
    event.preventDefault()

    event && controls.set_mouse_move(coords(event))
  }

  function MouseWheel (event) {
    event.preventDefault()

    event && controls.set_mouse_wheel(event.deltaY)
  }

  var inputTextArea = null

  set_canvas(_canvas)

  return {
    controls,
    inputTextArea,
    // set_canvas,
    resize,
    set_data,
    on_data_change,
    on_header_col_click,
    on_header_row_click,
    on_data_click,
    project,
    unproject,
    update,
    Cell,
    Area,
    data,
    Range,
    Config
  }
}
