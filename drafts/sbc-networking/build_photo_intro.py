# Photo card with credibility + the SBC intro answers. 1080x1440.
import subprocess, pathlib
from PIL import Image
H=1440
MARK='<svg class="mark" viewBox="328 294 152 153" xmlns="http://www.w3.org/2000/svg"><rect x="398.7" y="294.3" width="11.7" height="59.4" fill="#f5ebe1"/><rect x="398.7" y="387" width="11.7" height="59.4" fill="#f5ebe1"/><rect x="328.5" y="364.5" width="59.4" height="11.7" fill="#e5604f"/><rect x="420.3" y="364.5" width="59.4" height="11.7" fill="#e5604f"/></svg>'
html=f'''<!doctype html><html><head><meta charset="utf-8"><style>
*{{box-sizing:border-box;margin:0}}
body{{width:1080px;height:{H}px;background:#141311;font-family:"Helvetica Neue",Helvetica,Arial,"Liberation Sans",sans-serif;color:#f5ebe1;position:relative;overflow:hidden}}
.photo{{position:absolute;left:0;top:0;width:1080px;height:1080px;background:url(portrait.jpg) 0 -70px/1080px auto no-repeat}}
.fade{{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,19,17,.35) 0%,rgba(20,19,17,0) 14%,rgba(20,19,17,0) 30%,rgba(20,19,17,.88) 41%,#141311 48%)}}
.bar{{position:absolute;left:0;top:0;bottom:0;width:20px;background:#c0392b}}
.badge{{position:absolute;left:80px;top:60px;display:flex;align-items:center;gap:18px;font-size:26px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}}
.mark{{width:46px;height:46px}}
.txt{{position:absolute;left:80px;right:70px;top:560px}}
.name{{font-size:72px;font-weight:800;letter-spacing:-.02em;line-height:1}}
.role{{font-size:32px;font-weight:600;color:#ee8f82;margin-top:10px}}
.cred{{font-size:27px;line-height:1.35;color:#cfc6bb;margin-top:14px;font-weight:500}}
.sec{{margin-top:26px;font-size:24px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#e5604f}}
.q{{display:flex;gap:24px;align-items:flex-start;margin-top:22px}}
.n{{flex:none;width:58px;height:58px;border-radius:50%;background:#c0392b;font-size:30px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:2px}}
.q h3{{font-size:22px;letter-spacing:.12em;text-transform:uppercase;color:#ee8f82;font-weight:800}}
.q p{{font-size:32px;line-height:1.25;font-weight:700;margin-top:4px}}
.q p span{{font-weight:500;color:#d9d0c5}}
.foot{{position:absolute;left:80px;right:70px;bottom:44px;border-top:3px solid rgba(245,235,225,.2);padding-top:20px;display:flex;justify-content:space-between;font-size:26px;color:#cfc6bb}}
.foot b{{color:#f5ebe1;letter-spacing:.05em;text-transform:uppercase}}
</style></head><body><div class="photo"></div><div class="fade"></div><div class="bar"></div>
<div class="badge">{MARK}<span>Humankind Movement</span></div>
<div class="txt"><div class="name">Ajith Jagadish</div><div class="role">Founder &middot; Human Biomechanics Coach</div>
<div class="cred">Represented India as a national and international athlete &middot; Human Biomechanics course, Pinnacle Performance</div>
<div class="sec">My intro</div>
<div class="q"><div class="n">1</div><div><h3>Name &amp; business</h3><p>Ajith Jagadish, Humankind Movement. <span>Movement coaching, Bengaluru + online.</span></p></div></div>
<div class="q"><div class="n">2</div><div><h3>What I sell &amp; who buys</h3><p>Coaching and workshops <span>for individuals, families and teams, including corporate and community wellbeing.</span></p></div></div>
<div class="q"><div class="n">3</div><div><h3>Intro I'd love</h3><p>HR / People leads and founders <span>who want their teams to move, sleep and recover better.</span></p></div></div>
</div>
<div class="foot"><span><b>Health before success.</b></span><span>humankindmovement.in</span></div>
</body></html>'''
pathlib.Path("photo2.html").write_text(html)
subprocess.run(["/opt/pw-browsers/chromium-1194/chrome-linux/chrome","--headless=new","--no-sandbox","--disable-gpu","--hide-scrollbars",f"--window-size=1080,{H+150}","--screenshot=5-photo-with-intro.png",f"file://{pathlib.Path('photo2.html').resolve()}"],check=True,capture_output=True)
Image.open("5-photo-with-intro.png").crop((0,0,1080,H)).save("5-photo-with-intro.png")
pathlib.Path("photo2.html").unlink()
