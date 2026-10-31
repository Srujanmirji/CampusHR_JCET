"""Export checked design specimens; run using the bundled Python runtime (Pillow/reportlab/pypdf)."""
from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader
root=Path(__file__).resolve().parent
font=ImageFont.truetype(str(root.parent/'faculty-screens/assets/inter-semibold.ttf'),22)
for platform,count in [('hod',8),('ios',12),('android',12)]:
    base=root/platform; rows=json.loads((base/'screenshots/manifest.json').read_text());assert len(rows)==count
    title='CampusHR V2 - '+platform.upper()+' review specimens'
    c=canvas.Canvas(str(base/(platform.upper()+'_SCREENS.pdf')));c.setTitle(title);c.setAuthor('CampusHR');c.setSubject('Synthetic design review only; not native app screenshots or real operations')
    width=4*300+5*24; maxh=max(round(r['height']*300/r['width']) for r in rows); cellh=maxh+64
    board=Image.new('RGB',(width,80+((count+3)//4)*cellh),'#F1F5F9');draw=ImageDraw.Draw(board);draw.text((24,24),title,font=font,fill='#111827')
    for i,row in enumerate(rows):
        im=Image.open(base/'screenshots'/f"{row['id']}.png").convert('RGB')
        assert abs(im.width/row['width']-2)<.02
        c.setPageSize((row['width'],row['height']));c.bookmarkPage(row['id']);c.addOutlineEntry(row['id'],row['id']);c.drawImage(ImageReader(im),0,0,width=row['width'],height=row['height']);c.showPage()
        thumb=im.resize((300,round(row['height']*300/row['width'])),Image.Resampling.LANCZOS);x=24+(i%4)*324;y=80+(i//4)*cellh;board.paste(thumb,(x,y));draw.text((x,y+thumb.height+12),row['id'],font=font,fill='#1E3A8A')
    c.save();pdf=PdfReader(str(base/(platform.upper()+'_SCREENS.pdf')));assert len(pdf.pages)==count
    for page in pdf.pages:assert len(page.images)==1
    board.save(base/'overview.png');print(platform,count,'PDF pages verified')
