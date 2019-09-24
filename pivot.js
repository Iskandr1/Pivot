var Pivot = (canvas) => {

  canvas.screenWidth = Math.round(canvas.width / window.devicePixelRatio)
  canvas.screenHeight = Math.round(canvas.height / window.devicePixelRatio)

  var Config = {

    TEXT_LINE_SPACING: 4,
    BORDER_FRAME: [0, 0, 0, 0],
    COLOR_FRAME: '#EEEEEE',
    fontOver: null,
    textcolor: '#000000',
    COLOR_BACKGROUND: '#AAAAAA',
    COLOR_GRID: '#AAAAAA',
    cellcolor: '#FFFFFF',
    COLOR_EDIT: '#0000FF',
    COLOR_CELL_SELECTED: '#F0F0F0',
    COLOR_SCROLL: '#50505070',
    SCROLL_WIDTH: 10,
    COLOR_SCROLL_ACTIVE: '#505050A0',
    HEADER_COL_COLOR: '#F0F0F0',
    HEADER_ROW_COLOR: '#F0F0F0',
    SIGN_MAP: {

      0: 'ﾠﾠ', // none
      1: '\uFEFF＋ ', // expand
      2: '\uFEFF－ ', // collapse
      3: '', // edit
      4: '' // no_editis
    },
    BOOLEAN_TEXT: {
      true: '☑ YES',
      false: '☐ No'
    },
    CELL_W: 102,
    CELL_H: 26,
    //CELL_EDIT_UNDERLINE_MARGIN: 5,
    //CELL_EDIT_CURSOR_MARGIN: 3,
    TEXT_MARGIN: 5,
    FONT_VALUE: '11px Arial',
    FONT_VALUE_UNDERLINE: false,
    FONT_ROW_HEADER: '11px Arial',
    FONT_ROW_HEADER_UNDERLINE: false,
    FONT_COL_HEADER: '11px Arial',
    FONT_COL_HEADER_UNDERLINE: false,
    ALIGN_HEADER: 'start',
    ALIGN_VALUE: 'end',
    SELECTION_ENABLED: true,
    BORDER_WIDTH: 1,
    BORDER_HEIGHT: 1,
    FONT_UNDERLINE_WIDTH: 1,
    LABEL: undefined,
    set: function (cfg) {
      Object.assign(this, cfg)

      this.BORDER_FRAME = this.BORDER_FRAME.length > 0 ? this.BORDER_FRAME : new Array(4).fill(this.BORDER_FRAME)

      return this
    }
  }

  var editMode

  function assign(dst, src) {
    return Object.assign(Object.assign({}, dst), src)
  }

  var started

  var init = function () {
    if (started) {
      return
    }
    started = true

    hScrollGrip = scrollGrip(cell_right)
    vScrollGrip = scrollGrip(cell_down)

    editMode && InputControls.init()

    window.addEventListener('mousemove', MouseMove, false)
    window.addEventListener('mouseup', MouseUp, false)

    canvas.addEventListener('click', MouseClick, false)
    canvas.addEventListener('dblclick', MouseDblClick, false)
    canvas.addEventListener('mousedown', MouseDown, false)
    canvas.addEventListener('wheel', MouseWheel, false)
    canvas.addEventListener('mouseout', MouseOut, false)
    canvas.ownerDocument.addEventListener('keyup', KeyUp, false)
    canvas.ownerDocument.addEventListener('keydown', KeyDown, false)

    resize()    

    return this
  }

  var bars = (barSize, p0, p2) => {
    var bar = (n, prev) => {
      var size = typeof barSize === 'function' ? barSize() : barSize[Math.min(n, barSize.length - 1)] || barSize
      var pos = prev ? prev.pos + prev.size : p0
      return {
        n,
        size,
        pos,
        in: function (from, to) {
          return this.pos >= from && this.pos <= to
        }
      }
    }

    var ret = []

    while (ret.length === 0 || ret[ret.length - 1].in(p0, p2)) {
      var b = bar(ret.length, ret[ret.length - 1])
      ret.push(b)
    }

    ret.at = function (px) {
      for (var i = 0; i < ret.length; i++) {
        var axis = ret[i]
        if (px >= axis.pos && px <= axis.pos + axis.size) { return axis; }
      }
    }

    ret.go = function (from, n, f) {
      n = n || this.length - from
      for (var i = from; i < from + n; i++) { f(this[i], i); }
    }

    return ret
  }

  var cols = null
  var rows = null

  function Cell(i, j) {
    this.i = i || 0
    this.j = j || 0

    return this
  }

  Cell.prototype = {

    constructor: Cell,

    setXY: function (x, y) {

      if (!x || !y) {
        return
      }

      var col = cols.at(x)
      var row = rows.at(y)

      if (!col || !row) {
        return null
      }

      this.i = col.n
      this.j = row.n

      return this
    },

    isVisible: function () {
      var col = cols[this.i]
      var row = rows[this.j]

      return col && col.in(frame.x, frame.x2) && row && row.in(frame.y, frame.y2)
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
    },

    dot: function (c) {
      return c.i * this.i + c.j * this.j
    },

    mul: function (s) {
      this.i *= s
      this.j *= s

      return this
    },

    /*
    pt1: function () {
      new Area(this)
      return new Vec(cols[this.i].pos + Config.BORDER_WIDTH,
        rows[this.j].pos + Config.BORDER_HEIGHT)
    },

    pt2: function () {
      return new Vec(cols[this.i].size - Config.BORDER_WIDTH,
        rows[this.j].size - Config.BORDER_HEIGHT).add(this.pt1())
    //return new Vec(cols[this.i].size,
       // rows[this.j].size).add(this.pt1())
    }
    */
  }

  var cell_zero = new Cell()
  var cell_left = new Cell(-1, 0)
  var cell_right = new Cell(1, 0)
  var cell_up = new Cell(0, -1)
  var cell_down = new Cell(0, 1)
  var cell_one = new Cell(1, 1)

  function Area(c1, c2) {
    this.c1 = c1 && c1.clone()
    this.c2 = c2 && c2.clone() || c1

    this.c1.min(this.c2)
    this.c2.max(c1)

    return this
  }

  Area.prototype = {

    constructor: Area,

    joinCell: function (c) {
      this.c1.min(c)
      this.c2.max(c)

      return this
    },

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

  function Vec(x, y) {
    this.x = x
    this.y = y

    return this
  }

  Vec.prototype = {

    constructor: Vec,

    clone: function () {
      return new this.constructor(this.x, this.y)
    },

    sub: function (v) {
      this.x -= v.x
      this.y -= v.y

      return this
    },

    add: function (v) {
      this.x += v.x
      this.y += v.y

      return this
    },

    dot: function (x, y) {
      return x * this.x + y * this.y
    },

    dotVec: function (v) {
      this.x *= v.x
      this.y *= v.y

      return this
    }
  }

  function Rect(a) {
    var c1 = cols[a.c1.i]
    var c2 = cols[a.c2.i]
    var r1 = rows[a.c1.j]
    var r2 = rows[a.c2.j]

    if (!c1 || !c2 || !r1 || !r2) {
      return
    }

    var x = c1.pos
    var y = r1.pos
    var width = c2.pos - c1.pos + c2.size
    var height = r2.pos - r1.pos + r2.size
    var space = new Space(x, y, width, height)
    
    return space
  }

  function Space (x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.x2 = this.x + this.width
    this.y2 = this.y + this.height

    return this
  }

  Space.prototype = {
    constructor: Space,

    contains: function (vec) {
      return vec.x >= this.x && vec.x <= this.x2 && vec.y >= this.y && vec.y <= this.y2
    },

    clone: function () {
      return new Space(this.x, this.y, this.width, this.height)
    },

    clamp: function (space) {
      this.x = Math.max(this.x, space.x)
      this.y = Math.max(this.y, space.y)
      //this.x = Math.min(this.x, space.x2)
      //this.y = Math.min(this.y, space.y2)

      this.x2 = Math.min(this.x2, space.x2)
      this.y2 = Math.min(this.y2, space.y2)
      //this.x2 = Math.max(this.x2, space.x)
      //this.y2 = Math.max(this.y2, space.y)

      this.width = this.x2 - this.x
      this.height = this.y2 - this.y

      return this
    },

    shrink: function (dx, dy) {
      var w = Math.floor(dx * 0.5)
      var h = Math.floor(dy * 0.5)
      var x = dx - w
      var y = dy - h
  
      var shrinkSpace = new Space(this.x + x, this.y + y, this.width - x - w, this.height - y - h)
      this.clamp(shrinkSpace)

      return this
    },

    getCenter: function () {
      return new Vec(this.x + this.width * 0.5 + 0.5, this.y + this.height * 0.5 + 0.5)
    },

    getFarCorner: function () {
      return new Vec(this.x + this.width, this.y + this.height)
    },

    getCorner: function () {
      return new Vec(this.x, this.y)
    }
  }

  function Obj(id, lvl = 1, sign = 3) {
    this.id = id
    this.lvl = lvl
    this.sign = sign
    this.txt = ''
    return this
  }

  Obj.prototype = {
    constructor: Obj,

    setId: function (id) {
      this.id = id
      return this
    },

    setCellArea: function (cell) {
      this.area = this.area ? this.area.joinCell(cell) : new Area(cell)
      return this
    },

    setTxt: function (s) {
      this.txt = s || ''
      return this
    },

    isoDate: function (d) {
      var tzo = -d.getTimezoneOffset(),
          dif = tzo >= 0 ? '+' : '-',
          pad = function(num) {
              var norm = Math.floor(Math.abs(num))
              return (norm < 10 ? '0' : '') + norm
          }
      return d.getFullYear() +
          '-' + pad(d.getMonth() + 1) +
          '-' + pad(d.getDate()) +
          'T' + pad(d.getHours()) +
          ':' + pad(d.getMinutes()) +
          ':' + pad(d.getSeconds()) +
          dif + pad(tzo / 60) +
          ':' + pad(tzo % 60)
    },

    setDateString: function (s) {
      this.date = new Date(s)
      this.dateString = this.isoDate(this.date)
      this.txt = this.date.toLocaleDateString()
      return this
    },

    setDateTimeString: function (s) {
      this.datetime = new Date(s)
      this.dateString = this.isoDate(this.datetime)
      this.txt = `${this.datetime.toLocaleDateString()} ${this.datetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      return this
    },

    setNumber: function (n) {
      this.number = Number.parseFloat(n)
      this.txt = this.number.toLocaleString()
      return this
    },

    setEditType: function (type) {
      this.editType = type
      return this
    },

    setLvl: function (l) {
      this.lvl = l
      return this
    },

    setSign: function (s) {
      this.sign = s
      return this
    },

    setAlign: function (a) {
      this.align = a
      return this
    },

    setMultiLine: function (allowMultiLine = true) {
      this.multiLine = allowMultiLine
      
      return this
    },

    setCellColor: function (s) {
      this.cellcolor = s
      return this
    },

    setTextColor: function (s) {
      this.textcolor = s
      return this
    },

    setFont: function (s) {
      this.font = s
      this.font_ = s
      return this
    },

    setBorderColor: function (color) {
      this.border_color = color
      return this
    },

    setBorderBottom: function (width) {
      this.border_bottom = width
      return this
    },

    setBorderTop(width) {
      this.border_top = width
      return this
    },

    setBorderLeft: function (width) {
      this.border_left = width
      return this
    },

    setBorderRight: function (width) {
      this.border_right = width
      return this
    },

    //setHyperlink: function (obj) {
    //  this.hyperlink = obj
    //  return this
    //},

    //setMeta: function (obj) {
    //  this.meta = obj
    //  return this
    //},

    setCursor: function (style) {
      this.cursor = style
      return this
    },

    setFontOver: function (font) {
      this.fontOver_ = font
      return this
    },

    setImg: function (img) {
      this.img = img
      return this
    },

    setImgAlpha: function (alpha) {
      this.imgAlpha = alpha
      this.imgAlpha_ = alpha
      return this
    },

    setImgHorizontalAlign: function (align) {
      this.imgHorizontalAlign = align
      
      return this
    },

    setImgVerticalAlign: function (align) {
      this.imgVerticalAlign = align
      
      return this
    },

    setTextOffset: function (x, y) {
      this.txtOffsetX = x
      this.txtOffsetY = y
      return this
    },

    setTextOffsetX: function (x) {
      this.txtOffsetX = x
      return this
    },

    setTextOffsetY: function (y) {
      this.txtOffsetY = y
      return this
    },

    setLink: function (obj) {
      this.link = obj
      return this
    },

    copy: function (newId) {
      var newObj = new Obj()

      Object.assign(newObj, this)
      newObj.id = newId || newObj.id

      return newObj
    },

    setDotColor: function (color) {
      this.dotcolor = color
      return this
    },

    setDotRadius: function (radius) {
      this.dotradius = radius
      return this
    },

    setAttribute: function (attribute, value) {
      this[attribute] = value
      return this
    },

    getSpace: function () {
      if (!this.area) {
        return
      }
      var c1 = project(this.area.c1)
      var c2 = project(this.area.c2)
      var area = new Area(c1, c2).clamp(Range.visibleArea)
      var rect = Rect(area)
      
      return rect 
    }
  }

  //var project = function (c) {
  //  return c.clone().sub(Range.scroll).add(Range.header)
  //}
  var project = function (absoluteCell) {
    var c = absoluteCell.clone().sub(Range.scroll).add(Range.header)

    is_in_row_header(absoluteCell) && c.setI(absoluteCell.i)
    is_in_col_header(absoluteCell) && c.setJ(absoluteCell.j)

    return c
  }

  var unproject = function (relativeCell) {
    var s = relativeCell.clone().add(Range.scroll).sub(Range.header)

    is_in_row_header(relativeCell) && s.setI(relativeCell.i)
    is_in_col_header(relativeCell) && s.setJ(relativeCell.j)

    return s
  }

  function is_in_row_header(c) {
    return c.i < Range.header.i && c.j >= Range.header.j
  }

  function is_in_col_header(c) {
    return c.j < Range.header.j && c.i >= Range.header.i
  }

  function is_in_values(c) {
    return c.i >= Range.header.i && c.j >= Range.header.j
  }

  function get_object(c) {
    if (!c)
      return

    var s = unproject(c)

    if (is_in_values(c))
      return data.get_value(s)

    if (is_in_col_header(c))
      return data.get_col(s)

    if (is_in_row_header(c))
      return data.get_row(s)
  }

  var Range = {

    scroll: new Cell(),
    scrollLast: new Cell(),
    header: new Cell(),
    data: null,
    values: null,
    scrollAreaSize: new Cell(),
    width: 0,
    height: 0,
    scrollableContentWidth: 0,
    scrollableContentHeight: 0,
    scrollableVisibleWidth: 0,
    scrollableVisibleHeight: 0,
    scrolledContentWidth: 0,
    scrolledContentHeight: 0,

    totalSize: new Cell(),

    visibleArea: new Area(cell_zero),

    update: function () {
      this.header = data.buffer && new Cell(data.buffer.rows[0].length, data.buffer.cols[0].length) || cell_zero.clone()
      this.data = data.buffer && new Area(cell_zero, new Cell(data.buffer.cols.length - 1, data.buffer.rows.length - 1))

      // this.sizeValues = new Cell(data.buffer.values.length, data.buffer.values[0].length)

      this.totalSize = new Cell(
        Math.max(data.buffer.cols.length, data.buffer.values.length),
        Math.max(data.buffer.rows.length, data.buffer.values[0].length)
      )

      var farCell = new Cell(cols.length - 1, rows.length - 1)
      this.values = new Area(this.header || cell_zero, new Cell(cols.at(frame.x2).n, rows.at(frame.y2).n))
      this.scrollAreaSize = farCell.clone().sub(this.header)

      if (Range.data) {
        var area = this.totalSize.clone() // Range.data.c2.clone().max(this.sizeValues)
        this.scroll.min(area.sub(this.scrollAreaSize).add(cell_one))//one cell is not visible fully
      }
      this.scroll.max(cell_zero)

      // var farCell = project(this.sizeValues.clone().sub(cell_one).max(this.data.c2)).min(this.values.c2)
      var farCellFilled = project(this.totalSize.clone()).sub(cell_one).min(this.values.c2)
      var farRect = Rect(new Area(farCellFilled))
      //this.width = farCell.pt2().x
      //this.height = farCell.pt2().y
      this.width = farRect.getFarCorner().x
      this.height = farRect.getFarCorner().y


      // Headers of rows
      var rowsQty = data.buffer.rows[0].length 
      // Total columns
      var xCellsQty = data.buffer.values.length || data.buffer.cols.length 
      // Total rows
      var yCellsQty = data.buffer.values[0].length || data.buffer.rows.length 
      // Headers of cols
      var colsQty = data.buffer.cols[0].length 

      // Scroll content width
      this.scrollableContentWidth = Config.CELL_W.length 
        ? Config.CELL_W.slice(rowsQty).reduce((a,v) => a+v, 0) 
        : Config.CELL_W * xCellsQty
      // Scroll content height
      this.scrollableContentHeight = Config.CELL_H * yCellsQty

      // Fix area width
      var scrollableFixWidth = Config.CELL_W.length 
        ? Config.CELL_W.slice(0, rowsQty).reduce((a,v) => a+v, 0)  
        : Config.CELL_W * rowsQty
      // Fix area height
      var scrollableFixHeight = Config.CELL_H * colsQty
      
      // Scroll area visible part
      this.scrollableVisibleWidth = frame.width - scrollableFixWidth
      this.scrollableVisibleHeight = frame.height - scrollableFixHeight

      // Scrolled content
      this.scrolledContentWidth = Config.CELL_W.length
        ? Config.CELL_W.slice(0, this.scroll.i).reduce((a,v) => a+v, 0) 
        : Config.CELL_W * this.scroll.i
      this.scrolledContentHeight = Config.CELL_H * this.scroll.j

      // Visible area
      this.visibleArea = new Area(cell_zero, farCell)

      !this.scrollLast.equals(this.scroll) && on_scroll_callback()
      this.scrollLast = this.scroll.clone()
    }
  }

  var Grid = function () {

    var ctx = canvas.getContext('2d')
    // var ctx = canvas.getContext('2d', { alpha: false });
    ctx.textBaseline = 'middle'

    ctx.font = Config.FONT_VALUE

    var letter_width = ctx.measureText('1234567910abpdjABCDE').width * 0.05
    var letter_height = parseInt(ctx.font)
    var letter_line_height = letter_height + Config.TEXT_LINE_SPACING

    var style_value = {

      margin_x: Config.TEXT_MARGIN,
      align: Config.ALIGN_VALUE,
      borderX: Config.BORDER_WIDTH,
      borderY: Config.BORDER_HEIGHT,
      cellcolor: Config.cellcolor,
      font: Config.FONT_VALUE,
      textcolor: Config.textcolor,
      underline: Config.FONT_VALUE_UNDERLINE,
      formatTxt: function (obj) {
        if (obj.txt === undefined) {
          return ''
        }
        var isBool = obj.editType === 'boolean'// || typeof obj.txt === 'boolean'

        return isBool ? Config.BOOLEAN_TEXT[obj.txt] : obj.txt + ''
      },
      format: function (obj) {
        return this.formatTxt(obj)
      }
    }

    var style_header_col = assign(style_value, {

      align: Config.ALIGN_HEADER,
      cellcolor: Config.HEADER_COL_COLOR,
      font: Config.FONT_COL_HEADER,
      underline: Config.FONT_COL_HEADER_UNDERLINE,
      format: function (obj) {
        var sign = obj.sign ? Config.SIGN_MAP[obj.sign] : ''
        return sign + this.formatTxt(obj)
      }
    })

    var style_header_row = assign(style_header_col, {

      cellcolor: Config.HEADER_ROW_COLOR,
      font: Config.FONT_ROW_HEADER,
      underline: Config.FONT_ROW_HEADER_UNDERLINE,
      format: function (obj) {
        var lvl = obj.lvl ? Config.SIGN_MAP[0].repeat(obj.lvl - 1)  : ''
        var sign = obj.sign ? Config.SIGN_MAP[obj.sign] : ''
        return lvl + sign + this.formatTxt(obj)
      }
        //return obj && obj.txt && Config.SIGN_MAP[0].repeat(obj.lvl - 1) + Config.SIGN_MAP[obj.sign] + obj.txt
    })

    /*
    var style_edit = assign(style_value, {

      cellcolor: Config.COLOR_EDIT,
      format: function (obj) {
        return obj && obj.txt || obj
      }
    })
    */

    var style_over = assign(style_value, {
      font: Config.fontOver
    })

    function format(obj, s, cell1, cell2) {
      cell2 = cell2 || cell1

      var r = Rect(new Area(cell1, cell2))
        .shrink(s.borderX, s.borderY)

      var r_center = r.getCenter()
      var r_far = r.getFarCorner()
      var s_txt = obj && s.format(obj)
      var align = (obj && obj.align) || s.align
      var txtOffset = new Vec(obj && obj.txtOffsetX || 0, obj && obj.txtOffsetY || 0)

      if (obj && obj.multiLine) {
        var charsLimit = Math.floor((r.width - txtOffset.x - 2*s.margin_x) / letter_width)
        var linesLimit = Math.max(Math.floor((r.height - 2 * txtOffset.y) / letter_line_height), 1)

        //multiline text
        var splitStr = s_txt && s_txt.split(/\r?\n/)
        var splitStr = charsLimit === 0 || linesLimit === 1 ? splitStr : splitStr && splitStr.reduce((a, v, i) => {
          var splitByLimit = v ? v.match(new RegExp('.{1,' + charsLimit + '}', 'g')) : ' '
          a.push(...splitByLimit)
          return a
        }, [])
      } else {
        splitStr = s_txt && [s_txt]
      }

      if (splitStr) {
        if (splitStr.length > linesLimit) {
          splitStr[linesLimit - 1] = splitStr[linesLimit - 1].length >= charsLimit ? splitStr[linesLimit - 1].slice(0, -3) + '...' : splitStr[linesLimit - 1]
          splitStr.splice(linesLimit, splitStr.length)
        }

        //positioning
        var vecs = splitStr.slice().map((v, i, arr) => 
        new Vec(align === 'end' 
          ? r_far.x - s.margin_x - txtOffset.x 
            : align === 'center' 
              ? r_center.x 
                : r.x + s.margin_x + txtOffset.x, 
          r_center.y + txtOffset.y - (letter_line_height * (arr.length - 1) * 0.5) + i * letter_line_height))
      }      

      if (obj && obj.img) {
        let x = obj.imgHorizontalAlign || 0
        let y = obj.imgVerticalAlign || 0
        let imgW = obj.img.width
        let imgH = obj.img.height
        let imgOffset = new Vec( x * 0.5 * (r.width - imgW - s.borderX), y * 0.5 * (r.height - imgH - s.borderY) )
        let cornerVec = new Vec(imgW * 0.5, imgH * 0.5)
        var imgVec = r_center.clone().sub(cornerVec).add(imgOffset)
      }

      return {
        obj,
        txt: {
          s: splitStr,
          vec: vecs,
          align: align,
          textcolor: (obj && obj.textcolor) || s.textcolor,
          font: (obj && obj.font) || s.font,
          underline: (obj && obj.underline) || s.underline
        },
        cell: {

          rect: r,
          cellcolor: (obj && obj.cellcolor) || s.cellcolor,
          border_bottom: obj && obj.border_bottom,
          border_top: obj && obj.border_top,
          border_left: obj && obj.border_left,
          border_right: obj && obj.border_right,
          border_color: obj && obj.border_color || Config.COLOR_GRID,
          dotcolor: obj && obj.dotcolor,
          dotradius: obj && obj.dotradius,
          img: obj && obj.img,
          imgAlpha: obj && obj.imgAlpha || 1,
          imgVec: imgVec
        }
      }
    }

    function get_draw_cell(c, s, f, prev, next, parent) {
      function cell_eq(c1, c2, f) {
        if (c1.equals(c2)) { return true; }

        var d1 = c1 && f(unproject(c1))
        var d2 = c2 && f(unproject(c2))

        return d1 && d2 && d1.id === d2.id
      }

      function get(c, dir) {
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

    function paint_obj(f) {
      if (f.txt.s === undefined) {
        return
      }

      ctx.fillStyle = f.cell.cellcolor
      ctx.fillRect(f.cell.rect.x, f.cell.rect.y, f.cell.rect.width, f.cell.rect.height)

      if (f.obj === Edit.obj) {
        return
      }
      if (f.txt.s.length) {
        ctx.fillStyle = f.txt.textcolor
        ctx.textAlign = f.txt.align
        ctx.font = f.txt.font
        ctx.textBaseline = "middle"//"top" || "hanging" || "middle" || "alphabetic" || "ideographic" || "bottom"
        f.txt.s.forEach((v, i) => {
          var vec = f.txt.vec[i]
          ctx.fillText(v, vec.x, vec.y)
        })
      }
      // ctx.fillText(f.txt.s, f.txt.vec.x, f.txt.vec.y)
      /*
      f.txt.arr && f.txt.arr.forEach((s, i) => {
        ctx.fillText(s, f.txt.vec.x, f.txt.vec.y + i * f.cell.rect.height)
      })
      */
      /*
      ctx.beginPath()
         ctx.moveTo(f.txt.vec.x, f.txt.vec.y)
         ctx.lineTo(f.txt.vec.x + 100, f.txt.vec.y)
         ctx.strokeStyle = '#FF0000'
         ctx.lineWidth = 1
       ctx.stroke()
       */

      f.txt.width = Math.floor(ctx.measureText(f.txt.s).width)

      f.txt.underline && paint_stroke(f, true)

      paint_border(f)
      f.cell.dotcolor && f.cell.dotradius && paint_dot(f)
      f.cell.img && paint_img(f)
    }

    function paint_selection() {

      if (!Config.SELECTION_ENABLED)
        return

      var c1 = project(selection.a.c1)
      var c2 = project(selection.a.c2)

      if (Range.values.contains(c1) || Range.values.contains(c2)) {
        ctx.globalCompositeOperation = 'multiply'
        ctx.fillStyle = 'rgba(200,200,200,0.5)'

        var r = Rect(
          // new Area( c1, c2 ).clamp( values_area )
          new Area(c1, c2).clamp(Range.values)
        )
        ctx.fillRect(r.x, r.y, r.width, r.height)

        ctx.globalCompositeOperation = 'source-over'// default
      }
    }

    function paint_frame_border () {
      var borders = Config.BORDER_FRAME
      borders.forEach((width, i) => {
        if (width === 0) {
          return
        }
        ctx.beginPath()
        ctx.moveTo(frame.x + (i === 1 || i === 2 ? frame.width - 0.5 : 0.5), frame.y + (i === 2 || i === 3 ? frame.height - 0.5 : 0.5))
        ctx.lineTo(frame.x + (i === 0 || i === 1 ? frame.width - 0.5 : 0.5), frame.y + (i === 1 || i === 2 ? frame.height - 0.5 : 0.5))
        ctx.lineWidth = width
        ctx.strokeStyle = Config.COLOR_FRAME
        ctx.stroke()
      })
    }

    function paint_border(fmt) {

      function line(x0, y0, x1, y1, w) {
        if (!w)
          return

        ctx.beginPath()
        ctx.moveTo(x0, y0 - 0.5)
        ctx.lineTo(x1, y1 - 0.5)
        ctx.lineWidth = w
        ctx.strokeStyle = fmt.cell.border_color
        ctx.stroke()
      }

      var v0 = fmt.cell.rect.getCorner()
      var v1 = fmt.cell.rect.getFarCorner()

      line(v0.x, v1.y, v1.x, v1.y, fmt.cell.border_bottom)
      line(v0.x, v0.y, v1.x, v0.y, fmt.cell.border_top)
      line(v0.x, v0.y, v0.x, v1.y, fmt.cell.border_left)
      line(v1.x, v0.y, v1.x, v1.y, fmt.cell.border_right)
    }

    function paint_dot(fmt) {
      var radius = Math.abs(fmt.cell.dotradius)
      // var startPos = fmt.txt.align === 'end' ? fmt.txt.vec.x - fmt.txt.width - radius * 2 : fmt.txt.vec.x + fmt.txt.width + radius * 2
      var startPos = fmt.txt.align === 'end' ? fmt.txt.vec[0].x - fmt.txt.width - radius * 2 : fmt.txt.vec[0].x - radius * 2
      ctx.fillStyle = fmt.cell.dotcolor
      ctx.strokeStyle = fmt.cell.dotcolor
      ctx.beginPath()
      ctx.arc(startPos, /*fmt.txt.vec[0].y*/ fmt.cell.rect.getCenter().y, radius, 0, 2 * Math.PI)
      ctx.lineWidth = radius * 0.25
      fmt.cell.dotradius < 0 ? ctx.stroke() : ctx.fill()
    }

    function paint_img(fmt) {
      var cell = fmt.cell
      var img = cell.img
      //var rect = cell.rect
      var defaultAlpha = ctx.globalAlpha
      ctx.globalAlpha = cell.imgAlpha
      //ctx.drawImage(img, rect.x, rect.y + rect.height - img.height, img.width, img.height)
      ctx.drawImage(img, cell.imgVec.x, cell.imgVec.y, img.width, img.height)
      ctx.globalAlpha = defaultAlpha
    }

    function paint_label(txt) {
      var f = format(undefined, style_header_col, new Cell(0, 0), new Cell(Range.header.i - 1, Range.header.j - 1))
      f.txt.s = txt
      paint_obj(f)
    }

    function paint_over() {
      var s = unproject(controls.mouseMoveCell())

      var fmt = format(data.get_value(s), style_over, controls.mouseMoveCell())

      paint_obj(fmt)
    }

    function paintScroll(grip) {
      var gripRect = grip.bounds()
      var highlightScroll = grip.selectedScroll || grip.overScroll
      var dir = new Vec(grip.dir.j, grip.dir.i)
      var delta = highlightScroll ? 0 : Config.SCROLL_WIDTH * 0.5 
      var deltaPos = new Vec(delta,  delta).dotVec(dir)
      var deltaSize = new Vec(-delta , -delta).dotVec(dir)
      
      ctx.beginPath()
      ctx.fillStyle = highlightScroll ? Config.COLOR_SCROLL_ACTIVE : Config.COLOR_SCROLL
      ctx.fillRect(gripRect.x + deltaPos.x, gripRect.y + deltaPos.y, gripRect.w + deltaSize.x, gripRect.h + deltaSize.y)
      ctx.stroke()
    }

    function get_col(c) {
      return data.get_col(c)
    }

    function get_row(c) {
      return data.get_row(c)
    }

    function get_value(c) {
      return data.get_value(c)
    }

    function get_row_data(j) {
      return data.get_row_data(j)
    }

    return function () {
      // ctx.clearRect( 0, 0, w, h );

      ctx.save() // save the context
      // define new dirty zone
      ctx.beginPath()
      ctx.rect(frame.x, frame.y, frame.width, frame.height)
      ctx.clip()

      ctx.fillStyle = Config.COLOR_BACKGROUND
      ctx.fillRect(frame.x, frame.y, frame.width, frame.height)

      // far corner
      ctx.fillStyle = Config.COLOR_GRID
      ctx.fillRect(frame.x, frame.y, Range.width - frame.x + Config.BORDER_WIDTH, Range.height - frame.y + Config.BORDER_HEIGHT)

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

      controls.mouseMoveCell() && paint_over()

      selection.a && Range.data.contains(selection.a) && paint_selection()

      ////edit.c && Range.values.contains(project(edit.c)) && paint_edit()

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

      paintScroll(vScrollGrip)
      paintScroll(hScrollGrip)

      paint_frame_border()

      ctx.restore() // restore the context
    }
  }

  var scrollGrip = (dir) => {
    const thickness = Config.SCROLL_WIDTH
    const minSize = frame.width * 0.10

    var inBounds = (x, y, w, h, px, py) => x <= px && y <= py && x + w >= px && y + h >= py
    var totalCells = () => Range.totalSize.clone().add(cell_one).dot(dir)

    var totalWidth = () => new Vec(Range.scrollableContentWidth, Range.scrollableContentHeight).dot(dir.i, dir.j)
    var screenWidth = () => new Vec(Range.scrollableVisibleWidth, Range.scrollableVisibleHeight).dot(dir.i, dir.j)
  
    var cnvs = () => new Vec(frame.width, frame.height)
    var cnvs0 = () => new Vec(frame.x, frame.y)
    var cnvsStart = () => cnvs0().dot(dir.j, dir.i)
    var cnvsMargin = () => cnvs0().dot(dir.i, dir.j)
    var canvasWidth = () => cnvs().dot(dir.i, dir.j)
    var canvasEnd = () => cnvs().dot(dir.j, dir.i) + cnvsStart()


    var gripLen = () => Math.max(0, 1.0 * canvasWidth() * screenWidth() / totalWidth())

    var gripLenPx = () => {
      var len = gripLen()
      return len >= canvasWidth() || len <= 0 ? 0 : Math.max(minSize, len)
    }

    return {
      dir,
      selectedScroll: null,
      overScroll: null,
      bounds: function (px, py) {
        var scroll = new Vec(Range.scrolledContentWidth, Range.scrolledContentHeight).dot(dir.i, dir.j)

        var start = new Vec(cnvsMargin() + 1.0 * canvasWidth() * scroll / totalWidth(), canvasEnd() - thickness)
        var x = start.dot(dir.i, dir.j)
        var y = start.dot(dir.j, dir.i)
        var r = new Vec(gripLenPx(), thickness)
        var w = r.dot(dir.i, dir.j)
        var h = r.dot(dir.j, dir.i)
        var rect = { x, y, w, h }

        return (inBounds(...Object.values(rect), px, py) || !px && !py) && rect
      },
      getScroll: function (vec) {
        var dist = vec.dot(dir.i, dir.j)
        var y = 1.0 * dist / canvasWidth()

        var scrolled = dir.clone().mul(Math.floor(y * totalCells()))

        return this.selectedScroll.clone().add(scrolled)
      },
      start: function (vec) {
        this.selectedScroll = this.bounds(vec.x, vec.y) && Range.scroll.clone()
        return this.selectedScroll
      },
      over: function (vec) {
        var inBounds = this.bounds(vec.x, vec.y)
        var wasOver = this.overScroll
        this.overScroll = inBounds
        if (!wasOver && inBounds) {
          Draw.render()
        }
        
        return this.overScroll
      },
      stop: function () {
        this.selectedScroll = null
      }
    }
  }

  var vScrollGrip = null
  var hScrollGrip = null

  var selection = {
    a: null,
    set: function (a) {
      if (!Range.data) {
        return this
      }

      var size = Range.data.size();
      this.a = size.i + size.j > 0 ? a.clone().clamp(Range.data) : a.clone()

      return this
    }
  }

  var Edit = {

    area: null,
    element: null,
    type: null,
    obj: null,

    save: function () {
      var obj = this.obj

      switch (this.element.type) {
        case 'date': 
          obj.setDateString(this.element.value)
          break
        case 'number':
          obj.setNumber(this.element.valueAsNumber)
          break
        default:
          obj.txt = this.element.value
      }

      Draw.render()

      on_data_change_callback(obj)
    },

    stop: function () {

      if (!editMode ||!this.area || !this.element) {
        return
      }
      this.area && this.save()

      this.element.hide()
      this.area = null
      this.element = null
      this.type = null
      this.obj = null
    },

    start: function (c) {

      this.stop()

      var obj = get_object(c)
      
      if (!editMode || !obj || obj.sign !== 3) {
        return
      }
      this.obj = obj
      
      const defaultType = 'text'
      this.type = obj.editType || defaultType
      this.element = InputControls.elements[this.type] || InputControls.elements[defaultType]

      function getArea() {
        var move = (c0, dir) => {
          var ret
          var cell = c0.clone()
          var o = get_object(cell)
          while (o && o.id === obj.id) {
            ret = cell.clone()
            cell.setShift(dir.i, dir.j)
            o = get_object(cell)
          }
          return ret
        }

        var x1 = move(c, cell_left)
        var x2 = move(c, cell_right)
        var y1 = move(x1, cell_up)
        var y2 = move(x2, cell_down)

        return new Area(y1, y2)
      }

      function setStyle(element) {
        var isRow = is_in_row_header(c)
        var isCol = is_in_col_header(c)
        var font = obj.font || isCol && Config.FONT_COL_HEADER || isRow && Config.FONT_ROW_HEADER || Config.FONT_VALUE
        var cellcolor = obj.cellcolor || isCol && Config.HEADER_COL_COLOR || isRow && Config.HEADER_ROW_COLOR || Config.cellcolor
        var textcolor = obj.textcolor || Config.textcolor

        element.style.color = textcolor
        element.style.backgroundColor = '#00000000' // cellcolor//'rgba(255,0,0,0.3)'
        element.style.borderColor = Config.COLOR_EDIT
        element.style.font = font
      }

      function setBounds(element) {
        var rect = Rect(this_area).shrink(Config.BORDER_WIDTH, Config.BORDER_HEIGHT)

        var pt1 = rect.getCorner()

        var y = pt1.y + canvas.offsetTop
        var x = pt1.x + canvas.offsetLeft

        var w = rect.width
        var h = rect.height

        var clipX2 = Math.max(0, frame.x + Config.BORDER_FRAME[3] - pt1.x)
        var clipY1 = Math.max(0, frame.y + Config.BORDER_FRAME[0] - pt1.y)
        var clipX1 = frame.x2 - Config.BORDER_FRAME[1] - pt1.x 
        var clipY2 = frame.y2 - Config.BORDER_FRAME[2] - pt1.y

        element.style.clip = `rect(${clipY1}px,${clipX1}px,${clipY2}px,${clipX2}px)`

        var padding = Config.TEXT_MARGIN + (obj.txtOffsetX || 0)
        element.style.paddingLeft = `${padding}px`
        element.style.paddingRight = element.style.paddingLeft
        element.style.paddingTop = `0`
        element.style.paddingBottom = `0`

        //w = w - padding * 2

        element.style.top = `${y}px`
        element.style.left = `${x}px`
        element.style.width = `${w}px`
        element.style.height = `${h}px`
      }

      var this_area = getArea()
      this.area = this_area

      setStyle(this.element)
      setBounds(this.element)

      switch (obj.editType) {
        case 'date': 
          this.element.value = obj.dateString.substr(0, 10)
          break;
        case 'number': 
          this.element.value = obj.number
          break;
        default:
            this.element.value = obj.txt
      }
      
      this.element.style.visibility = 'visible'
      this.element.focus()
      //element.select()
      Draw.render()

      return this
    }
  }

  var controls = {

    mouseDownPt: null,
    mouseMovePt: null,
    mouseDownCell: () => controls.mouseDownPt && new Cell().setXY(controls.mouseDownPt.x, controls.mouseDownPt.y),
    mouseMoveCell: () => controls.mouseMovePt && new Cell().setXY(controls.mouseMovePt.x, controls.mouseMovePt.y),
    is_shift_down: false,
    is_ctrl_down: false,
    is_alt_down: false,
    preventClickEvent: false,

    check_keys: function (e) {
      this.is_ctrl_down = e.ctrlKey || e.metaKey
      this.is_shift_down = e.shiftKey
      this.is_alt_down = e.altKey
    },

    set_mouse_down: function (coords) {
      var v = coords.vec
      if (!frame.contains(v)) {
        return
      }
      this.mouseDownPt = v.clone()
      this.mouseMovePt = v.clone()

      if (vScrollGrip.start(v) || hScrollGrip.start(v)) {
        this.preventClickEvent = true
        return
      }

      var c = new Cell().setXY(v.x, v.y)

      s = unproject(c).max(cell_zero)

      !(selection.a && new Area(s).contains(selection.a)) && selection.set(new Area(s))

      Edit.start(c) || update()
    },

    set_mouse_up: function (coords) {
      var v = coords.vec
      this.mouseDownPt = null

      vScrollGrip.stop()
      hScrollGrip.stop()
    },

    set_mouse_move: function (coords) {
      var v = coords.vec
      var oldCell = this.mouseMoveCell()

      this.mouseMovePt = v.clone()

      vScrollGrip.over(v)
      hScrollGrip.over(v)
      if (vScrollGrip.selectedScroll || hScrollGrip.selectedScroll) {
        var grip = vScrollGrip.selectedScroll ? vScrollGrip : hScrollGrip
        Range.scroll = grip.getScroll(this.mouseMovePt.clone().sub(this.mouseDownPt))    
        update()
        return
      }

      var c = this.mouseMoveCell()
      if (!c) {
        return
      }

      var inScrollGripBounds = vScrollGrip.bounds(this.mouseMovePt.x, this.mouseMovePt.y) || hScrollGrip.bounds(this.mouseMovePt.x, this.mouseMovePt.y)
      var obj = get_object(c)
      var cursorStyle = (obj && obj.cursor) || (is_in_values(c) ? 'text' : 'default')
      canvas.style.cursor = obj && !inScrollGripBounds ? cursorStyle : 'default'

      if (!Edit.area && this.mouseDownCell() && !this.mouseDownCell().equals(this.mouseMoveCell())) {
        selection.set(new Area(unproject(this.mouseDownCell()), unproject(this.mouseMoveCell())))
        update()
      }

      if (!coords.insideCanvas) {
        return
      }

      var c = new Cell().setXY(v.x, v.y)

      if (!c) {
        return
      }

      var s = unproject(c)

      is_in_row_header(c) && on_header_row_mouseover_callback(data.get_row(s), s.i, s.j)
      is_in_col_header(c) && on_header_col_mouseover_callback(data.get_col(s), s.i, s.j)
      is_in_values(c) && on_data_mouseover_callback(data.get_value(s), s.i, s.j)

      if (!c.equals(oldCell)) {
        Draw.render()
      }
    },

    set_mouse_wheel: function (y) {
      y = Math.floor(10 * y / frame.height)

      if (controls.is_shift_down) {
        y && Range.scroll.setShift(y, 0) && update()
      } else {
        y && Range.scroll.setShift(0, y) && update()
      }
      //on_scroll_callback(Range.scroll.j)
    },

    set_mouse_out: function () {
      on_mouseout_callback()
      //
    },

    set_mouse_click: function (coords) {
      var v = coords.vec
      var c = new Cell().setXY(v.x, v.y)

      if (!c) {
        return
      }

      if (this.preventClickEvent) {
        this.preventClickEvent = false
        return
      }

      var s = unproject(c)

      is_in_row_header(c) && on_header_row_click_callback(data.get_row(s), s.i, s.j)
      is_in_col_header(c) && on_header_col_click_callback(data.get_col(s), s.i, s.j)
      is_in_values(c) && on_data_click_callback(data.get_value(s), s.i, s.j)
    },

    set_mouse_dblclick: function (coords) {
      var v = coords.vec
      var c = new Cell().setXY(v.x, v.y)

      if (!c) {
        return
      }

      var s = unproject(c)

      is_in_row_header(c) && on_header_row_dblclick_callback(data.get_row(s), s.i, s.j)
      is_in_col_header(c) && on_header_col_dblclick_callback(data.get_col(s), s.i, s.j)
      is_in_values(c) && on_data_dblclick_callback(data.get_value(s), s.i, s.j)
    },

    set_key_down: function (e) {
      this.check_keys(e)

      if (this.is_ctrl_down || this.is_alt_down) {
        return
      }

      function cursor(c) {
        var abc = selection.a && selection.a.c1.clone().add(c)

        if (selection.a.c1.equals(abc)) { return; }

        selection.set(new Area(abc))

        var va = Range.values.clone()
        va.c2.sub(cell_one)
        Range.scroll.add(va.distTo(project(abc)))
        //on_scroll_callback(Range.scroll.j)

        update()
      }

      switch (e.key) {
        case 'ArrowDown':
          cursor(cell_down)
          break;
        case 'ArrowLeft':
          cursor(cell_left)
          break;
        case 'ArrowRight':
          cursor(cell_right)
          break;
        case 'ArrowUp':
          cursor(cell_up)
          break;
        default:

          /*
            selection.a && !edit.c && (
              selection.a.c1.equals(selection.a.c2) ||
                          selection.set(new Area(selection.a.c1))
            ) && edit.set(selection.a.c1)
            */

          break;
      }
    },

    set_key_up: function (e) {
      /*
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
      */
    }
  }

  const fEmpty = () => undefined
  var on_header_col_mouseover_callback = fEmpty
  var on_header_row_mouseover_callback = fEmpty
  var on_data_mouseover_callback = fEmpty
  var on_header_col_click_callback = fEmpty
  var on_header_row_click_callback = fEmpty
  var on_data_click_callback = fEmpty
  var on_header_col_dblclick_callback = fEmpty
  var on_header_row_dblclick_callback = fEmpty
  var on_data_dblclick_callback = fEmpty
  var on_data_change_callback = fEmpty
  var on_scroll_callback = fEmpty
  var on_mouseout_callback = fEmpty
  var on_edit_lookup_callback = fEmpty
  var on_file_change_callback = fEmpty

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

  var on_header_col_mouseover = function (f) {
    on_header_col_mouseover_callback = f

    return this
  }

  var on_header_row_mouseover = function (f) {
    on_header_row_mouseover_callback = f

    return this
  }

  var on_data_mouseover = function (f) {
    on_data_mouseover_callback = f

    return this
  }

  var on_header_col_dblclick = function (f) {
    on_header_col_dblclick_callback = f

    return this
  }

  var on_header_row_dblclick = function (f) {
    on_header_row_dblclick_callback = f

    return this
  }

  var on_data_dblclick = function (f) {
    on_data_dblclick_callback = f

    return this
  }
  var on_scroll = function (f) {
    on_scroll_callback = f

    return this
  }

  var on_mouseout = function (f) {
    on_mouseout_callback = f

    return this
  }

  var on_edit_lookup = function (f) {
    on_edit_lookup_callback = f

    return this
  }

  var on_file_change = function (f) {
    on_file_change_callback = f

    return this
  }

  var data = {

    buffer: null,

    get_value: function (c) {
      return this.buffer && this.buffer.values && this.buffer.values[c.i] && this.buffer.values[c.i][c.j]
    },

    get_col: function (c) {
      return this.buffer && this.buffer.cols && this.buffer.cols[c.i] && this.buffer.cols[c.i][c.j]
    },

    get_row: function (c) {
      return this.buffer && this.buffer.rows && this.buffer.rows[c.j] && this.buffer.rows[c.j][c.i]
    },

    get_row_data: function (j) {
      var rows = (this.buffer && this.buffer.rows && this.buffer.rows[j]) || []
      var values = []
      this.buffer && this.buffer.values.forEach(colvals => values.push(colvals[j]))
      return rows.concat(values)
    }
  }

  function resolveObjCells () {
    data.buffer.cols.forEach((col, i) => {
      col.forEach((obj, j) => {
        obj.setCellArea(new Cell(i, j))
      })
    })

    data.buffer.rows.forEach((row, j) => {
      row.forEach((obj, i) => {
        obj.setCellArea(new Cell(i, j))
      })
    })

    data.buffer.values.forEach((value, i) => {
      value.forEach((obj, j) => {
        obj.setCellArea(new Cell(i, j))
      })
    })

    return this
  }

  var set_data = function (d) {
    data.buffer = d

    return this
  }

  /*
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
  */

  var Draw = {
    func: null,
    
    render: function () {
      //this.func && this.func()
      canvas.pivotDraw.forEach(draw => draw.func && draw.func())
    },

    set: function (f) {
      this.func = f
    }
  }

  canvas.pivotDraw = canvas.pivotDraw || []
  canvas.pivotDraw.push(Draw)

  //var draw
  
  /* = function () {
    Config.CELL_W.length && resize()
    Draw.render()
  }
  */


  var update = function () {
    !started && init()
    
    //Edit.stop()

    Range.update()

    //Config.CELL_W.length && resize()
    resize()
    Draw.render()

    return this
  }

  var resize = function () {

    var xScroll = Range.scroll.i
    var xHeader = Range.header ? Range.header.i : 0
    var widths = Config.CELL_W.length ? Config.CELL_W.slice(0, xHeader).concat(Config.CELL_W.slice(xHeader + xScroll)) : Config.CELL_W

    cols = bars(widths, frame.x, frame.x2)
    rows = bars(Config.CELL_H, frame.y, frame.y2)

    //draw = new Grid()
    Draw.set(new Grid())

    Edit.stop()

    return this
  }

  function coords(event) {
    return {
      vec: new Vec(event.layerX, event.layerY),
      insideCanvas: canvas === event.toElement
    }
  }

  function KeyUp(event) {
    controls.set_key_up(event)
  }

  function KeyDown(event) {
    controls.set_key_down(event)
  }

  function MouseClick(event) {
    event.preventDefault()

    event && controls.set_mouse_click(coords(event))
  }

  function MouseDblClick(event) {
    event.preventDefault()

    event && controls.set_mouse_dblclick(coords(event))
  }

  function MouseDown(event) {
    event.preventDefault()

    event && controls.set_mouse_down(coords(event))
  }

  function MouseUp(event) {
    event.preventDefault()

    event && controls.set_mouse_up(coords(event))
  }

  function MouseMove(event) {
    event.preventDefault()

    event && controls.set_mouse_move(coords(event))
  }

  function MouseWheel(event) {
    event.preventDefault()

    event && controls.set_mouse_wheel(event.deltaY)
  }

  function MouseOut(event) {
    event.preventDefault()

    event && controls.set_mouse_out()
  }

  var InputControls = {
    elements: {},
    init: function() {
      var addInputElement = (type) => {
        var el = document.createElement('input')
        el.setAttribute('style', `position: absolute; visibility: hidden;`)
        el.type = type
        el.hide = () => {
          el.style.visibility = 'hidden'
        }
        canvas.parentElement.appendChild(el)
        return el
      }

      var lookup = addInputElement('search')
      lookup.readOnly = true
      var inputBoolean = addInputElement('text')
      var boolean = {
        style: {},
        value: null,
        hide: function () {
          inputBoolean.hide()
        },
        focus: function () {
          this.style.backgroundColor = 'transparent'
          this.style.color = 'transparent'
          this.style.cursor = 'pointer'
          Object.assign(inputBoolean.style, this.style)
          
          Edit.save()
        }
      }
      var text = addInputElement('text')
      var date = addInputElement('date')
      var number = addInputElement('number')

      var inputFile = addInputElement('file')
      var file = {
        style: {},
        value: null,
        hide: function () {
          inputFile.hide()
        },
        focus: function () {
          this.style.backgroundColor = 'transparent'
          this.style.color = 'transparent'
          this.style.cursor = 'pointer'
          Object.assign(inputFile.style, this.style)
          inputFile.click()
          Edit.stop()
        }
      }

      this.elements = { text, date, boolean, lookup, number, file }

      inputBoolean.addEventListener('click', function() {
        boolean.value = !!!boolean.value
        boolean.focus()
      })

      inputFile.addEventListener('change', function(e) {
        on_file_change_callback(e.target.files)
      })

      lookup.addEventListener('click', function (event) {
        this.selectionStart = this.selectionEnd //disable selection
        on_edit_lookup_callback(Edit.obj, (newObj) => {
          Edit.obj = newObj
          Edit.element.value = newObj.txt
          update()
        })
      })

      //lookup.addEventListener('input', function () {
      //  lookup.value.indexOf('*') != -1 && on_edit_lookup_callback(Edit.obj, lookup.value)
      //})
    }
  }

  function setEditMode (canEdit) {
    editMode = canEdit === undefined ? true : canEdit
    return this
  }

  function getEditMode () {
    return editMode
  }

  var canvasSpace = new Space(0, 0, canvas.screenWidth, canvas.screenHeight)
  var frame = canvasSpace.clone()

  function setFrame (space) {
    
    frame = new Space(space.x, space.y, space.width, space.height).clamp(canvasSpace)

    resize()

    return this
  }

  function getFrame () {
    return frame
  }

  return {
    controls,
    resize,
    set_data,
    setEditMode,
    getEditMode,
    setFrame,
    getFrame,
    resolveObjCells,
    on_data_change,
    on_edit_lookup,
    on_file_change,
    on_header_col_click,
    on_header_row_click,
    on_data_click,
    on_header_col_mouseover,
    on_header_row_mouseover,
    on_data_mouseover,
    on_header_col_dblclick,
    on_header_row_dblclick,
    on_data_dblclick,
    on_scroll,
    on_mouseout,
    project,
    unproject,
    update,
    Cell,
    Area,
    data,
    Range,
    Config,
    selection,
    canvas,
    Space,
    Obj
  }
}
