// Design specimen assets only. Native iOS must use Image(systemName:), not these raster exports.
import AppKit
let root = URL(fileURLWithPath: CommandLine.arguments[1])
let mapping = try JSONDecoder().decode([String:String].self, from: Data(contentsOf: root.appendingPathComponent("icons.json")))
for (key, name) in mapping {
    guard let symbol = NSImage(systemSymbolName: name, accessibilityDescription: nil) else { fatalError("Missing SF Symbol: \(name)") }
    let config = NSImage.SymbolConfiguration(pointSize: 24, weight: .regular)
    let image = symbol.withSymbolConfiguration(config)!
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 96, pixelsHigh: 96, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let size = image.size
    let scale = min(88 / size.width, 88 / size.height)
    image.draw(in: NSRect(x: (96-size.width*scale)/2, y: (96-size.height*scale)/2, width: size.width*scale, height: size.height*scale))
    NSGraphicsContext.restoreGraphicsState()
    try rep.representation(using: .png, properties: [:])!.write(to: root.appendingPathComponent("assets/sf/\(key).png"))
}
print("Exported \(mapping.count) system symbols for design review; iOS availability still requires device validation.")
