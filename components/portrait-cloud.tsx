"use client"

import { useEffect, useRef, useState } from "react"

/**
 * PortraitCloud
 *
 * Samples a 2D portrait into a grid of points, places the grid in 3D and
 * sweeps a sphere across it. Points inside the sphere's footprint are lifted
 * onto its surface, so the flat portrait wraps into a dome and, seen from the
 * side, the grid rows read as the contour lines of a bust.
 *
 * Pixels with alpha below 50% are dropped, so a PNG with a transparent
 * background gives a clean silhouette. For an opaque image, near-black pixels
 * are dropped instead, which works for portraits painted on a dark ground.
 *
 * Drag to orbit. Drop an image file onto the canvas to swap the portrait.
 *
 * The camera has a short depth of field. Points are drawn in two passes through one
 * program: pass 0 draws the points inside the focal band as crisp opaque discs with
 * depth writes, pass 1 draws the out-of-focus points as larger, softer, dimmer discs
 * blended over them. A per-point bokeh suits a sparse cloud better than a screen blur.
 *
 * The bundled /portrait.png is Picasso's 1907 self-portrait with the studio
 * background keyed out. Replace that file to change the default portrait.
 */

type Props = {
  src?: string
  /** Approximate number of grid columns sampled from the image. */
  columns?: number
  className?: string
}

const VERT = `
precision highp float;

attribute vec2 aPos;
attribute vec3 aColor;
attribute float aLum;
attribute vec3 aRand;

uniform mat4 uView;
uniform mat4 uProj;
uniform vec4 uSphere;   // xy centre, z unused, w radius (grid units)
uniform float uRelief;  // z offset per unit of luminance
uniform float uDome;    // scale of the spherical lift
uniform float uPointSize;
uniform float uCamDist;  // camera distance, so fog and size are relative to it
uniform float uTime;
uniform float uFocus;    // distance from the camera to the focal plane
uniform float uSharp;    // half-depth of the band that stays crisp
uniform float uRange;    // depth beyond that band at which blur is strongest
uniform float uMaxBlur;  // how many pixels an out-of-focus disc grows
uniform float uPass;     // 0: in-focus points, 1: out-of-focus points

varying vec3 vColor;
varying float vFade;
varying float vAlpha;
varying float vSoft;

void main() {
  vec3 p = vec3(aPos, (aLum - 0.5) * uRelief);

  // Lift points inside the sphere's footprint onto its surface.
  vec2 dxy = aPos - uSphere.xy;
  float d2 = dot(dxy, dxy);
  float R = uSphere.w;
  float d = sqrt(d2);
  if (d2 < R * R) {
    p.z += uDome * sqrt(R * R - d2);
  }

  // Scatter a few points around the rim where the dome tears off the plane.
  float rim = exp(-pow((d - R) / (R * 0.05), 2.0));
  float burst = rim * step(0.7, aRand.z);
  p += (aRand - 0.5) * burst * vec3(0.12, 0.12, 0.5);
  p.z += burst * 0.03 * sin(uTime * 3.0 + aRand.x * 40.0);

  vec4 view = uView * vec4(p, 1.0);
  float dist = -view.z;

  float coc = clamp((abs(dist - uFocus) - uSharp) / uRange, 0.0, 1.0);
  bool blurred = coc > 0.001;
  if ((uPass < 0.5) == blurred) {
    // Not this pass's point: park it outside the clip volume.
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  gl_Position = uProj * view;
  float base = uPointSize * (uCamDist / dist);
  float size = base + coc * uMaxBlur;
  gl_PointSize = size;
  vAlpha = pow(base / size, 1.5);
  vSoft = coc;
  vFade = clamp(1.05 - (dist - uCamDist) * 0.4, 0.45, 1.0);
  vColor = min(aColor * 1.18, 1.0);
}
`

const FRAG = `
precision mediump float;

varying vec3 vColor;
varying float vFade;
varying float vAlpha;
varying float vSoft;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c) * 4.0;
  if (r2 > 1.0) discard;
  float soft = 1.0 - smoothstep(0.2, 1.0, r2);
  float a = mix(1.0, soft, vSoft) * vAlpha;
  gl_FragColor = vec4(vColor * vFade * a, a);
}
`

type Cloud = {
  count: number
  pos: Float32Array
  color: Float32Array
  lum: Float32Array
  rand: Float32Array
  aspect: number
}

function sampleImage(img: HTMLImageElement, columns: number): Cloud {
  const cols = Math.min(columns, img.naturalWidth)
  const rows = Math.round((cols * img.naturalHeight) / img.naturalWidth)
  const canvas = document.createElement("canvas")
  canvas.width = cols
  canvas.height = rows
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, cols, rows)
  const data = ctx.getImageData(0, 0, cols, rows).data

  let hasAlpha = false
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) {
      hasAlpha = true
      break
    }
  }

  const aspect = cols / rows
  const pos: number[] = []
  const color: number[] = []
  const lum: number[] = []
  const rand: number[] = []

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4
      const r = data[i] / 255
      const g = data[i + 1] / 255
      const b = data[i + 2] / 255
      const a = data[i + 3] / 255
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
      if (hasAlpha ? a < 0.5 : l < 0.08) continue

      pos.push(((x + 0.5) / cols) * 2 * aspect - aspect, 1 - ((y + 0.5) / rows) * 2)
      color.push(r, g, b)
      lum.push(l)
      rand.push(Math.random(), Math.random(), Math.random())
    }
  }

  return {
    count: lum.length,
    pos: new Float32Array(pos),
    color: new Float32Array(color),
    lum: new Float32Array(lum),
    rand: new Float32Array(rand),
    aspect,
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load ${src}`))
    img.src = src
  })
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile failed: ${log}`)
  }
  return shader
}

function perspective(fovY: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovY / 2)
  const nf = 1 / (near - far)
  // column-major
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ])
}

/** View matrix: rotate model by rx (about X) then ry (about Y), then move camera back. */
function view(rx: number, ry: number, distance: number) {
  const cx = Math.cos(rx)
  const sx = Math.sin(rx)
  const cy = Math.cos(ry)
  const sy = Math.sin(ry)
  // R = Rx * Ry, column-major, then translate by -distance on z
  return new Float32Array([
    cy, sx * sy, -cx * sy, 0,
    0, cx, sx, 0,
    sy, -sx * cy, cx * cy, 0,
    0, 0, -distance, 1,
  ])
}

export default function PortraitCloud({ src = "/portrait.png", columns = 240, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageSrc, setImageSrc] = useState(src)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" })
    if (!gl) {
      setError("WebGL is not available in this browser.")
      return
    }

    let disposed = false
    let raf = 0
    let cloud: Cloud | null = null

    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setError(`Program link failed: ${gl.getProgramInfoLog(program)}`)
      return
    }
    gl.useProgram(program)

    const attribs = {
      aPos: gl.getAttribLocation(program, "aPos"),
      aColor: gl.getAttribLocation(program, "aColor"),
      aLum: gl.getAttribLocation(program, "aLum"),
      aRand: gl.getAttribLocation(program, "aRand"),
    }
    const uniforms = {
      uView: gl.getUniformLocation(program, "uView"),
      uProj: gl.getUniformLocation(program, "uProj"),
      uSphere: gl.getUniformLocation(program, "uSphere"),
      uRelief: gl.getUniformLocation(program, "uRelief"),
      uDome: gl.getUniformLocation(program, "uDome"),
      uPointSize: gl.getUniformLocation(program, "uPointSize"),
      uCamDist: gl.getUniformLocation(program, "uCamDist"),
      uTime: gl.getUniformLocation(program, "uTime"),
      uFocus: gl.getUniformLocation(program, "uFocus"),
      uSharp: gl.getUniformLocation(program, "uSharp"),
      uRange: gl.getUniformLocation(program, "uRange"),
      uMaxBlur: gl.getUniformLocation(program, "uMaxBlur"),
      uPass: gl.getUniformLocation(program, "uPass"),
    }

    const buffers = {
      pos: gl.createBuffer()!,
      color: gl.createBuffer()!,
      lum: gl.createBuffer()!,
      rand: gl.createBuffer()!,
    }

    const bind = (buffer: WebGLBuffer, attrib: number, size: number, data?: Float32Array) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      if (data) gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
      gl.enableVertexAttribArray(attrib)
      gl.vertexAttribPointer(attrib, size, gl.FLOAT, false, 0, 0)
    }

    gl.enable(gl.DEPTH_TEST)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0.067, 0.067, 0.067, 1)

    // Orbit state: auto rotation plus drag with inertia.
    let dragging = false
    let lastX = 0
    let lastY = 0
    let velX = 0
    let velY = 0
    let dragRotY = 0
    let dragRotX = 0
    let autoRotY = 0
    let lastFrame = performance.now()
    const start = lastFrame

    const onPointerDown = (e: PointerEvent) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      velX = 0
      velY = 0
      canvas.setPointerCapture(e.pointerId)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      velX = dx * 0.005
      velY = dy * 0.005
      dragRotY += velX
      dragRotX += velY
    }
    const onPointerUp = (e: PointerEvent) => {
      dragging = false
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
    }
    canvas.addEventListener("pointerdown", onPointerDown)
    canvas.addEventListener("pointermove", onPointerMove)
    canvas.addEventListener("pointerup", onPointerUp)
    canvas.addEventListener("pointercancel", onPointerUp)

    let width = 1
    let height = 1
    let dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      height = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, width, height)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const upload = (c: Cloud) => {
      cloud = c
      bind(buffers.pos, attribs.aPos, 2, c.pos)
      bind(buffers.color, attribs.aColor, 3, c.color)
      bind(buffers.lum, attribs.aLum, 1, c.lum)
      bind(buffers.rand, attribs.aRand, 3, c.rand)
    }

    const isMobile = window.matchMedia("(max-width: 640px)").matches
    loadImage(imageSrc)
      .then((img) => {
        if (disposed) return
        upload(sampleImage(img, isMobile ? Math.round(columns * 0.7) : columns))
        setError(null)
      })
      .catch((err: Error) => setError(err.message))

    const frame = (now: number) => {
      if (disposed) return
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - lastFrame) / 1000, 0.05)
      lastFrame = now
      const t = (now - start) / 1000

      if (!dragging) {
        dragRotY += velX
        dragRotX += velY
        velX *= 0.95
        velY *= 0.95
      }
      autoRotY += dt * 0.28
      dragRotX = Math.max(-1.2, Math.min(1.2, dragRotX))

      gl.depthMask(true)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      if (!cloud) return

      const aspect = width / height
      const fov = 0.7
      // Fit the portrait's width on narrow screens, otherwise sit at a fixed distance.
      const distance = Math.max(3.5, 1.15 / (Math.tan(fov / 2) * aspect))
      const tilt = 0.12 * Math.sin(t * 0.21)
      gl.uniformMatrix4fv(uniforms.uProj, false, perspective(fov, aspect, 0.1, 40))
      gl.uniformMatrix4fv(uniforms.uView, false, view(tilt + dragRotX, autoRotY + dragRotY, distance))

      // Sphere sweeps linearly across the portrait and back (triangle wave).
      const radius = 1.3
      const span = cloud.aspect + radius
      const period = 16
      const phase = (t % period) / period
      const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2
      const cx = -span + tri * 2 * span
      gl.uniform4f(uniforms.uSphere, cx, 0.05, 0, radius)
      gl.uniform1f(uniforms.uRelief, 0.16)
      gl.uniform1f(uniforms.uDome, 0.55)
      gl.uniform1f(uniforms.uPointSize, 2.4 * dpr)
      gl.uniform1f(uniforms.uCamDist, distance)
      gl.uniform1f(uniforms.uTime, t)

      // Short depth of field: the focal plane sits between the flat portrait and the front
      // of the dome, a 0.4-unit band either side stays crisp, and blur peaks 0.8 beyond it.
      gl.uniform1f(uniforms.uFocus, distance - 0.3)
      gl.uniform1f(uniforms.uSharp, 0.4)
      gl.uniform1f(uniforms.uRange, 0.8)
      gl.uniform1f(uniforms.uMaxBlur, 16 * dpr)

      // Pass 0: in-focus points, opaque, with depth writes.
      gl.uniform1f(uniforms.uPass, 0)
      gl.disable(gl.BLEND)
      gl.drawArrays(gl.POINTS, 0, cloud.count)

      // Pass 1: out-of-focus points as soft discs, depth-tested against the crisp ones.
      gl.uniform1f(uniforms.uPass, 1)
      gl.depthMask(false)
      gl.enable(gl.BLEND)
      gl.drawArrays(gl.POINTS, 0, cloud.count)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener("pointerdown", onPointerDown)
      canvas.removeEventListener("pointermove", onPointerMove)
      canvas.removeEventListener("pointerup", onPointerUp)
      canvas.removeEventListener("pointercancel", onPointerUp)
      Object.values(buffers).forEach((b) => gl.deleteBuffer(b))
      gl.deleteProgram(program)
    }
  }, [imageSrc, columns])

  // Drop any image onto the canvas to swap the portrait.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onDragOver = (e: DragEvent) => e.preventDefault()
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer?.files?.[0]
      if (!file || !file.type.startsWith("image/")) return
      setImageSrc((prev) => {
        if (prev.startsWith("blob:")) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
    }
    canvas.addEventListener("dragover", onDragOver)
    canvas.addEventListener("drop", onDrop)
    return () => {
      canvas.removeEventListener("dragover", onDragOver)
      canvas.removeEventListener("drop", onDrop)
    }
  }, [])

  return (
    <div className={className}>
      <canvas ref={canvasRef} className="block h-full w-full touch-none cursor-grab active:cursor-grabbing" aria-hidden />
      {error && (
        <p className="absolute inset-x-0 bottom-4 text-center text-xs text-neutral-500">{error}</p>
      )}
    </div>
  )
}
