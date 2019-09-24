var CreateWebPivot = (domElement) => {

  var canvas = document.createElement('canvas')
  domElement.appendChild(canvas)

  let dpi = window.devicePixelRatio

  let w = domElement.clientWidth
  let h = domElement.clientHeight
  canvas.width = w * dpi
  canvas.height = h * dpi
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  canvas.getContext('2d').scale(dpi, dpi)

  return Pivot(canvas)
}
