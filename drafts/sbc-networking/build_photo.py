# Single credibility card: Ajith's portrait as the background, text over a fade. 1080x1350.
import subprocess, pathlib
from PIL import Image
MARK='<svg class="mark" viewBox="328 294 152 153" xmlns="http://www.w3.org/2000/svg"><rect x="398.7" y="294.3" width="11.7" height="59.4" fill="#f5ebe1"/><rect x="398.7" y="387" width="11.7" height="59.4" fill="#f5ebe1"/><rect x="328.5" y="364.5" width="59.4" height="11.7" fill="#e5604f"/><rect x="420.3" y="364.5" width="59.4" height="11.7" fill="#e5604f"/></svg>'
html=f'''<!doctype html><html><head><meta charset="utf-8"><style>
*{{box-sizing:border-box;margin:0}}
body{{width:1080px;height:1350px;background:#141311;font-family:"Helvetica Neue",Helvetica,Arial,"Liberation Sans",sans-serif;color:#f5ebe1;position:relative;overflow:hidden}}
.photo{{position:absolute;left:0;top:0;width:1080px;height:1080px;background:url(portrait.jpg) center top/1080px auto no-repeat}}
.fade{{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,19,17,.35) 0%,rgba(20,19,17,0) 22%,rgba(20,19,17,0) 34%,rgba(20,19,17,.85) 55%,#141311 70%)}}
.bar{{position:absolute;left:0;top:0;bottom:0;width:20px;background:#c0392b}}
.badge{{position:absolute;left:80px;top:64px;display:flex;align-items:center;gap:18px;font-size:26px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}}
.mark{{width:46px;height:46px}}
.txt{{position:absolute;left:80px;right:70px;top:690px}}
.name{{font-size:80px;font-weight:800;letter-spacing:-.02em;line-height:1}}
.role{{font-size:36px;font-weight:600;color:#ee8f82;margin-top:14px}}
ul{{list-style:none;margin-top:34px}}
li{{display:flex;gap:22px;align-items:flex-start;font-size:33px;line-height:1.25;font-weight:600;padding:9px 0}}
li:before{{content:"";flex:none;width:14px;height:14px;background:#c0392b;border-radius:50%;margin-top:15px}}
.foot{{position:absolute;left:80px;right:70px;bottom:52px;border-top:3px solid rgba(245,235,225,.2);padding-top:24px;display:flex;justify-content:space-between;font-size:27px;color:#cfc6bb}}
.foot b{{color:#f5ebe1;letter-spacing:.05em;text-transform:uppercase}}
</style></head><body><div class="photo"></div><div class="fade"></div><div class="bar"></div>
<div class="badge">{MARK}<span>Humankind Movement</span></div>
<div class="txt"><div class="name">Ajith Jagadish</div><div class="role">Founder &middot; Human Biomechanics Coach</div>
<ul><li>Represented India as a national and international athlete</li>
<li>Human Biomechanics course, Pinnacle Performance</li>
<li>Coaching for individuals, families and teams, online + Bengaluru</li></ul></div>
<div class="foot"><span><b>Health before success.</b></span><span>humankindmovement.in</span></div>
</body></html>'''
pathlib.Path("photo.html").write_text(html)
subprocess.run(["/opt/pw-browsers/chromium-1194/chrome-linux/chrome","--headless=new","--no-sandbox","--disable-gpu","--hide-scrollbars","--window-size=1080,1500","--screenshot=4-credibility-photo.png",f"file://{pathlib.Path('photo.html').resolve()}"],check=True,capture_output=True)
Image.open("4-credibility-photo.png").crop((0,0,1080,1350)).save("4-credibility-photo.png")
pathlib.Path("photo.html").unlink()
