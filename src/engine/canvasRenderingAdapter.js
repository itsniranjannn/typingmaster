import { stableHash } from "./replayConsumerValidation"

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((name) => freezeDeep(value[name]))
    Object.freeze(value)
  }
  return value
}

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value)

const normalizeViewport = (viewport = {}) => {
  const start = Math.max(0, Number(viewport.start) || 0)
  const end = Math.max(start, Number(viewport.end) || start)
  return { start, end }
}

const buildTextLayout = (event, index, viewport) => freezeDeep({
  id: `text-${index}`,
  text: typeof event.label === "string" ? event.label : event.type,
  x: 16 + (index % 12) * 84,
  y: 24 + Math.floor(index / 12) * 28,
  width: 76,
  height: 18,
  clip: viewport,
  kind: event.type,
  t: event.t
})

const buildDrawOrdering = (layout) => layout.map((node, index) => freezeDeep({
  id: node.id,
  order: index,
  layer: node.layer,
  kind: node.kind,
  zIndex: node.zIndex ?? index
}))

export function createCanvasRenderingAdapter(options = {}) {
  const adapterKind = typeof options.kind === "string" ? options.kind : "canvas"
  const offscreenSupported = Boolean(options.offscreenSupported ?? true)
  const webglCompatible = Boolean(options.webglCompatible ?? true)

  function projectFrame(renderFrame, viewport = {}) {
    const normalizedViewport = normalizeViewport(viewport)
    const timeline = Array.isArray(renderFrame?.renderTree?.sceneGraph?.layers)
      ? renderFrame.renderTree.sceneGraph.layers.find((layer) => layer.id === "timeline")?.nodes || []
      : []
    const ghostLayer = renderFrame?.renderTree?.sceneGraph?.layers.find((layer) => layer.id === "ghost")?.nodes || []
    const correctionLayer = renderFrame?.renderTree?.sceneGraph?.layers.find((layer) => layer.id === "correction")?.nodes || []
    const pacingLayer = renderFrame?.renderTree?.sceneGraph?.layers.find((layer) => layer.id === "pacing")?.nodes || []
    const clipping = freezeDeep({ viewport: normalizedViewport, clipRect: normalizedViewport, clippedEventCount: timeline.length })
    const textLayout = timeline.map((event, index) => buildTextLayout(event, index, normalizedViewport))
    const renderTree = freezeDeep({
      adapterKind,
      viewport: normalizedViewport,
      offscreenSupported,
      webglCompatibilityBoundary: webglCompatible,
      clipping,
      drawOrdering: buildDrawOrdering(textLayout),
      textLayoutProjection: textLayout,
      ghostOverlayRendering: freezeDeep({ nodes: ghostLayer, nodeCount: ghostLayer.length }),
      correctionHeatmapRendering: freezeDeep({ nodes: correctionLayer, nodeCount: correctionLayer.length }),
      pacingVisualizationRendering: freezeDeep({ nodes: pacingLayer, nodeCount: pacingLayer.length }),
      frameLevelRenderMetrics: freezeDeep({
        commandCount: Array.isArray(renderFrame?.renderTree?.renderCommands) ? renderFrame.renderTree.renderCommands.length : 0,
        batchCount: Array.isArray(renderFrame?.renderTree?.renderBatches) ? renderFrame.renderTree.renderBatches.length : 0
      })
    })
    const drawCommands = freezeDeep((renderFrame?.renderTree?.renderCommands || []).map((command, index) => ({
      id: command.id,
      order: index,
      layer: command.layer,
      kind: command.kind,
      zIndex: command.zIndex,
      payload: command.payload,
      clip: normalizedViewport
    })))
    return freezeDeep({
      renderTree,
      drawCommands,
      frameHash: stableHash({ viewport: normalizedViewport, drawCommands, textLayout })
    })
  }

  function createCanvasRenderer(renderFrame, viewport = {}) {
    const projection = projectFrame(renderFrame, viewport)
    return freezeDeep({
      adapterKind,
      offscreenSupported,
      webglCompatible,
      projection,
      commandCount: projection.drawCommands.length,
      deterministicDrawOrdering: projection.drawCommands.map((command) => command.id),
      replayTextLayoutProjection: projection.renderTree.textLayoutProjection,
      viewportClipping: projection.renderTree.clipping
    })
  }

  function getAdapterContracts() {
    return freezeDeep({
      adapterKind,
      offscreenSupported,
      webglCompatible,
      deterministicDrawOrdering: true,
      replayTextLayoutProjection: true,
      viewportClipping: true,
      ghostOverlayRendering: true,
      correctionHeatmapRendering: true,
      pacingVisualizationRendering: true
    })
  }

  return Object.freeze({
    projectFrame,
    createCanvasRenderer,
    getAdapterContracts
  })
}

export default { createCanvasRenderingAdapter }