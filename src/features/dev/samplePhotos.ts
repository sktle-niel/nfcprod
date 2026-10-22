/** Table colors for the made-up photos: dark wood, pale wood, slate and so on, so the pictures differ from item to item. */
const TABLES = ['#5a3b2a', '#c9a77c', '#2f4a3a', '#8a5a44', '#d8c7ad', '#3b3f4a'] as const
/** What sits on the plate, as an HSL hue: coffee brown, berry red, matcha green, cream and so on. */
const FOODS = [28, 350, 95, 42, 18, 200] as const

/**
 * A made-up food photo for the developer gallery (`?photos=1`): a plate seen from above on a table, drawn on a canvas and
 * given as a PNG data URL (the kind of address the menu accepts for a picture). It is a rectangle with no transparency, like a
 * photo from a phone, so the gallery can show how each picture shape crops one. Null where the browser cannot draw (a test).
 */
export function samplePhoto(index: number): string | null {
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 360
  const context = canvas.getContext('2d')
  if (!context) return null
  const table = TABLES[index % TABLES.length] ?? TABLES[0]
  const hue = FOODS[index % FOODS.length] ?? FOODS[0]

  const ground = context.createLinearGradient(0, 0, 480, 360)
  ground.addColorStop(0, table)
  ground.addColorStop(1, '#00000066')
  context.fillStyle = table
  context.fillRect(0, 0, 480, 360)
  context.fillStyle = ground
  context.fillRect(0, 0, 480, 360)

  // The plate: a soft shadow, a white disc and its inner ring.
  context.fillStyle = '#00000040'
  context.beginPath()
  context.ellipse(250, 200, 150, 140, 0, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#f7f5f0'
  context.beginPath()
  context.arc(240, 186, 142, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = '#d9d4c8'
  context.lineWidth = 6
  context.beginPath()
  context.arc(240, 186, 108, 0, Math.PI * 2)
  context.stroke()

  // The food: a mound in a color of its own, with a light spot and a few crumbs.
  const mound = context.createRadialGradient(215, 160, 8, 240, 186, 86)
  mound.addColorStop(0, `hsl(${hue} 70% 62%)`)
  mound.addColorStop(1, `hsl(${hue} 65% 34%)`)
  context.fillStyle = mound
  context.beginPath()
  context.arc(240, 186, 86, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#ffffff55'
  context.beginPath()
  context.ellipse(212, 156, 26, 14, -0.5, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = `hsl(${hue} 60% 28%)`
  for (const [x, y] of [[300, 150], [182, 214], [262, 236], [204, 128]] as const) {
    context.beginPath()
    context.arc(x, y, 6, 0, Math.PI * 2)
    context.fill()
  }
  return canvas.toDataURL('image/png')
}
