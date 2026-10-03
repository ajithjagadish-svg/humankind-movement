# Renders 3 SBC networking-group visuals (1080x1350) in Humankind brand tokens.
import subprocess, pathlib
MARK = '<svg class="mark" viewBox="328 294 152 153" xmlns="http://www.w3.org/2000/svg"><rect x="398.7" y="294.3" width="11.7" height="59.4" fill="#1a1a1a"/><rect x="398.7" y="387" width="11.7" height="59.4" fill="#1a1a1a"/><rect x="328.5" y="364.5" width="59.4" height="11.7" fill="#c0392b"/><rect x="420.3" y="364.5" width="59.4" height="11.7" fill="#c0392b"/></svg>'
CSS = """
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1350px;background:#f5ebe1;font-family:"Helvetica Neue",Helvetica,Arial,"Liberation Sans",sans-serif;color:#1a1a1a;position:relative;overflow:hidden}
.orb{position:absolute;width:820px;height:820px;right:-300px;top:-320px;border-radius:50%;background:radial-gradient(circle at 35% 65%,#c0392b 0%,rgba(192,57,43,.28) 42%,transparent 72%);opacity:.5}
.orb2{position:absolute;width:640px;height:640px;left:-260px;bottom:-260px;border-radius:50%;background:radial-gradient(circle at 65% 35%,#c0392b 0%,rgba(192,57,43,.2) 42%,transparent 72%);opacity:.4}
.bar{position:absolute;left:0;top:0;bottom:0;width:20px;background:#c0392b}
.wrap{position:absolute;inset:0;padding:96px 88px 80px 120px;display:flex;flex-direction:column}
.tag{font-size:26px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#c0392b;margin-bottom:28px}
h1{font-size:92px;line-height:1.03;font-weight:800;letter-spacing:-.02em}
h1 em{font-style:normal;color:#c0392b}
p.sub{font-size:38px;line-height:1.3;color:#3a3a37;margin-top:36px;font-weight:500}
.body{flex:1;display:flex;flex-direction:column;justify-content:center}
.foot{display:flex;align-items:center;gap:20px;border-top:3px solid rgba(26,26,26,.14);padding-top:30px;font-size:28px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.mark{width:46px;height:46px}.url{font-size:25px;font-weight:500;color:#58524a;text-transform:none;letter-spacing:0;margin-left:auto}
.chk{list-style:none;margin-top:44px}
.chk li{display:flex;align-items:center;gap:30px;font-size:46px;font-weight:700;padding:22px 0;border-bottom:3px dashed rgba(26,26,26,.15)}
.chk li:last-child{border-bottom:0}
.box{flex:none;width:58px;height:58px;border:6px solid #1a1a1a;border-radius:12px;background:#fff;position:relative}
.box.on:after{content:"";position:absolute;left:14px;top:2px;width:16px;height:32px;border:solid #c0392b;border-width:0 8px 8px 0;transform:rotate(40deg)}
.chk small{display:block;font-size:28px;font-weight:500;color:#58524a;margin-top:4px}
.callout{margin-top:40px;background:#1a1a1a;color:#f5ebe1;border-radius:24px;padding:34px 40px;font-size:38px;line-height:1.25;font-weight:700}
.callout b{color:#ee8f82}
.step{display:flex;gap:30px;align-items:flex-start;margin-top:30px}
.num{flex:none;width:76px;height:76px;border-radius:50%;background:#c0392b;color:#fff;font-size:40px;font-weight:800;display:flex;align-items:center;justify-content:center}
.step h3{font-size:30px;letter-spacing:.1em;text-transform:uppercase;color:#c0392b;font-weight:800}
.step div div{font-size:42px;line-height:1.2;font-weight:700;margin-top:6px}
.step div div span{font-weight:500;color:#3a3a37}
"""
def page(inner): return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="orb"></div><div class="orb2"></div><div class="bar"></div><div class="wrap">{inner}<div class="foot">{MARK}<span>Humankind Movement</span><span class="url">humankindmovement.in</span></div></div></body></html>'

cards = {
"1-hook": page('''<div class="body"><div class="tag">Saturday, 'off'</div>
<h1>You can delegate payroll, sales and compliance.<br><em>Not your body.</em></h1>
<p class="sub">Every business in this room runs on one founder-sized asset that never shows up on the balance sheet.</p></div>'''),
"2-body-check": page('''<div class="body"><div class="tag">10-second Saturday check-in</div>
<h1>Time off, <em>or just a different screen?</em></h1>
<ul class="chk">
<li><span class="box on"></span><span>Thumb: scrolling WhatsApp</span></li>
<li><span class="box on"></span><span>Shoulders: parked near the ears</span></li>
<li><span class="box on"></span><span>Jaw: clenched about a vendor payment</span></li>
<li><span class="box on"></span><span>Breath: held since the last 'Seen'</span></li>
</ul>
<div class="callout"><b>Step one is just noticing.</b> No fixing. No guilt. Then drop your intro below.</div></div>'''),
"3-intro": page('''<div class="body"><div class="tag">My intro, as requested</div>
<h1 style="font-size:70px">Humankind <em>Movement</em></h1>
<div class="step"><div class="num">1</div><div><h3>Who</h3><div>Ajith Jagadish, human biomechanics coach. <span>Bengaluru + online.</span></div></div></div>
<div class="step"><div class="num">2</div><div><h3>What / for whom</h3><div>Movement coaching and workshops. <span>For individuals, families and teams (corporate and community wellbeing).</span></div></div></div>
<div class="step"><div class="num">3</div><div><h3>Intro I'd love</h3><div>HR / People leads and founders <span>who want their teams to move, sleep and recover better.</span></div></div></div></div>'''),
}
chrome="/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
for name,html in cards.items():
    f=pathlib.Path(f"{name}.html"); f.write_text(html)
    subprocess.run([chrome,"--headless=new","--no-sandbox","--disable-gpu","--hide-scrollbars","--window-size=1080,1500",f"--screenshot={name}.png",f"file://{f.resolve()}"],check=True,capture_output=True)
    f.unlink()
from PIL import Image
for name in cards:
    Image.open(f"{name}.png").crop((0,0,1080,1350)).save(f"{name}.png")
