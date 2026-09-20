# ERP System 앱 아이콘(.ico) 생성 스크립트
from PIL import Image, ImageDraw

BASE = 512
img = Image.new("RGBA", (BASE, BASE), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

grad = Image.new("RGBA", (BASE, BASE))
gd = ImageDraw.Draw(grad)
for y in range(BASE):
    t = y / BASE
    gd.line([(0, y), (BASE, y)], fill=(int(79 + (37 - 79) * t),
                                       int(70 + (99 - 70) * t),
                                       int(229 + (235 - 229) * t), 255))

mask = Image.new("L", (BASE, BASE), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, BASE - 1, BASE - 1], radius=110, fill=255)
img.paste(grad, (0, 0), mask)

for x0, y0, x1, y1 in [(140, 300, 200, 400), (226, 230, 286, 400), (312, 180, 372, 400)]:
    d.rounded_rectangle([x0, y0, x1, y1], radius=16, fill=(255, 255, 255, 255))

d.line([(150, 275), (256, 200), (350, 145)], fill=(255, 255, 255, 235), width=18, joint="curve")
d.polygon([(350, 118), (388, 150), (336, 174)], fill=(255, 255, 255, 235))
d.rounded_rectangle([120, 410, 392, 426], radius=8, fill=(255, 255, 255, 200))

SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img.save(r"C:\Users\user\erp-desktop\build\icon.ico", format="ICO", sizes=SIZES)
img.resize((256, 256), Image.LANCZOS).save(r"C:\Users\user\erp-desktop\build\icon.png")

from PIL import Image as I
with I.open(r"C:\Users\user\erp-desktop\build\icon.ico") as ic:
    print("ICO sizes:", sorted(ic.info.get("sizes", [])))
print("ICON_OK")
