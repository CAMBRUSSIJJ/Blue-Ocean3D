"""Bundle ES modules in memory for hermetic Chromium tests; no HTTP/file URL needed."""
from pathlib import Path
import re
import base64

def inline_app(root):
    app=Path(root)/'app'
    html=(app/'index.html').read_text()
    styles=(app/'styles-bundle.css').read_text()
    html=re.sub(r'<link rel="stylesheet"[^>]*>', '',html)
    html=html.replace('</head>',f'<style>{styles}</style></head>')
    js=[]
    for name in ('core.mjs','build.mjs','explore.mjs','explore-ui.mjs','environments.mjs','floorplan.mjs','floorplan-navigation.mjs','placement.mjs','studio-actions.mjs','room-style.mjs','room-catalog.mjs','floorplan-ui.mjs','room3d.mjs','site-routing.mjs','spatial.mjs','simulation-poses.mjs','site-traffic.mjs','site3d.mjs','site-overview.mjs','confirm-dialog.mjs','workspace-controls.mjs','journey-flow.mjs','environments-ui.mjs','simulation.mjs','simulation-insights.mjs','simulation3d.mjs','simulation-ui.mjs','tools.mjs','tools-ui.mjs','scene3d.mjs','view3d-ui.mjs','ai-core.mjs','ai-ui.mjs','app.mjs'):
        code=(app/name).read_text()
        code=re.sub(r'^import [^\n]+\n','',code,flags=re.M)
        code=code.replace('export const ','const ').replace('export function ','function ')
        if name=='environments.mjs':
            code=re.sub(r'\buid\b','roomUid',code)
        if name=='floorplan.mjs':
            code=re.sub(r'\buid\b','floorUid',code)
            code=re.sub(r'\bclamp\b','floorClamp',code)
        if name=='floorplan-navigation.mjs':
            code=re.sub(r'\bclamp\b','navClamp',code)
            code=re.sub(r'\bkey\b','navKey',code)
        if name=='placement.mjs':
            code=re.sub(r'\bclamp\b','placeClamp',code)
        if name=='floorplan-ui.mjs':
            code=re.sub(r'\besc\b','floorEsc',code)
            code=code.replace('const $=', 'const floor$=').replace('$(', 'floor$(')
        if name in ('room3d.mjs','simulation3d.mjs','site3d.mjs'):
            code=re.sub(r'\bclamp\b','sim3dClamp' if name=='simulation3d.mjs' else ('site3dClamp' if name=='site3d.mjs' else 'room3dClamp'),code)
            code=re.sub(r'\bcolors\b','room3dColors',code)
            three=base64.b64encode((Path(root)/'vendor/three/three.module.min.js').read_bytes()).decode('ascii')
            code=code.replace("'../vendor/three/three.module.min.js'","'data:text/javascript;base64,"+three+"'")
        if name=='simulation-ui.mjs':
            code=re.sub(r'\besc\b','simEsc',code)
            code=code.replace('const $=', 'const sim$=').replace('$(', 'sim$(')
        if name=='site-routing.mjs':
            code=re.sub(r'\bkey\b','siteRoutingKey',code)
        if name=='simulation-poses.mjs':
            code=re.sub(r'\bclamp\b','poseClamp',code)
        if name=='site-traffic.mjs':
            code=re.sub(r'\besc\b','trafficEsc',code)
            code=re.sub(r'\bclamp\b','trafficClamp',code)
        if name=='site-overview.mjs':
            code=re.sub(r'\besc\b','siteEsc',code)
        if name=='ai-ui.mjs':
            code=code.replace('const $=', 'const ai$=').replace('$(', 'ai$(')
        if name=='environments-ui.mjs':
            code=re.sub(r'\besc\b','roomEsc',code)
            code=code.replace('const $=', 'const room$=').replace('$(', 'room$(')
        js.append(code)
    html=html.replace('<script type="module" src="./app.mjs"></script>', '<script>\n'+'\n'.join(js)+'\n</script>')
    return html
