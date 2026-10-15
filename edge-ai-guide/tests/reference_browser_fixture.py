from pathlib import Path
root=Path(__file__).resolve().parents[1]
for lang,file in [('zh','reference.html'),('en','reference-en.html')]:
 html=(root/file).read_text()
 qa='''<script>window.addEventListener('load',()=>setTimeout(()=>{const failures=[];const check=(ok,s)=>{if(!ok)failures.push(s)};check(document.querySelectorAll('main>section:not([hidden])').length===1,'one chapter visible');check(!/\\.md|原稿/.test(document.body.innerText),'no draft artifacts');check(document.getElementById('reference-language').value===document.documentElement.lang.slice(0,2),'language matches');location.hash='accept-people';navigate();check(document.getElementById('accept-people').open,'deep link opens exact scenario');check(!document.getElementById('validation').hidden,'correct chapter');check(document.documentElement.scrollWidth<=innerWidth,'no page overflow');document.head.innerHTML='';document.body.innerHTML='<pre>'+JSON.stringify({failures,language:document.documentElement.lang})+'</pre>';},150));</script>'''
 (Path('/tmp')/f'reference-{lang}-qa.html').write_text(html.replace('</body>',qa+'</body>'))
